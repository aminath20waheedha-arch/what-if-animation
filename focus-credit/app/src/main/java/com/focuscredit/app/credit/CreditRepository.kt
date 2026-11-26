package com.focuscredit.app.credit

import android.content.Context
import com.focuscredit.app.data.AppDatabase
import com.focuscredit.app.data.QuizResult
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** What a finished quiz did to your credit, shown on the results screen. */
sealed interface CreditOutcome {
    data object Practice : CreditOutcome
    data class Applied(val amount: Int, val newBalance: Int) : CreditOutcome
    data class AlreadyCounted(val existing: CreditKind) : CreditOutcome
}

class CreditRepository(context: Context) {
    private val app = context.applicationContext
    private val db = AppDatabase.get(app)
    private val dao = db.creditEventDao()
    private val prefs = app.getSharedPreferences("focus_credit", Context.MODE_PRIVATE)

    /** The moment credit tracking started (first run of this version). Earlier sessions never count. */
    private fun creditStartMillis(): Long {
        val saved = prefs.getLong(KEY_START, 0L)
        if (saved != 0L) return saved
        val now = System.currentTimeMillis()
        prefs.edit().putLong(KEY_START, now).apply()
        return now
    }

    val balance: Flow<Int> = dao.observeAll().map { CreditRules.balance(it) }

    /** Read the balance right now (used by the blocker). */
    suspend fun currentBalance(): Int = CreditRules.balance(dao.getAll())

    /** Newest first. */
    val history: Flow<List<CreditEvent>> = dao.observeAll().map { it.asReversed() }

    /** Records a penalty for every session whose quiz window closed without a quiz. */
    suspend fun sync() {
        val start = creditStartMillis()
        val zone = ZoneId.systemDefault()
        val now = LocalDateTime.now()
        val since = LocalDate.now().minusDays(CreditRules.LOOKBACK_DAYS).toEpochDay()
        val counted = dao.sessionKeysSince(since).toSet()
        CreditRules.findMissed(db.taskDao().getAll(), counted, start, now, zone).forEach { m ->
            dao.insertIgnore(
                CreditEvent(
                    kind = CreditKind.MISSED,
                    amount = CreditRules.MISSED,
                    subject = m.task.subject,
                    title = m.task.title,
                    taskId = m.task.id,
                    dateEpochDay = m.date.toEpochDay(),
                    atMillis = m.missedAtMillis,
                )
            )
        }
    }

    /** Turns a finished quiz into a credit event (scheduled sessions only, first attempt only). */
    suspend fun recordQuiz(result: QuizResult): CreditOutcome {
        val taskId = result.taskId ?: return CreditOutcome.Practice
        sync() // if the grace window already closed, the session is marked missed first
        val kind = if (result.passed) CreditKind.PASSED else CreditKind.FAILED
        val title = db.taskDao().getById(taskId)?.title ?: result.subject
        val id = dao.insertIgnore(
            CreditEvent(
                kind = kind,
                amount = CreditRules.amount(kind),
                subject = result.subject,
                title = title,
                taskId = taskId,
                dateEpochDay = result.dateEpochDay,
                atMillis = result.finishedAtMillis,
            )
        )
        if (id == -1L) {
            val existing = dao.forSession(taskId, result.dateEpochDay)?.kind ?: kind
            return CreditOutcome.AlreadyCounted(existing)
        }
        return CreditOutcome.Applied(CreditRules.amount(kind), CreditRules.balance(dao.getAll()))
    }

    private companion object {
        const val KEY_START = "credit_start_millis"
    }
}
