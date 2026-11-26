package com.focuscredit.app.credit

import com.focuscredit.app.data.Task
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

/** All the numbers and pure logic of the credit system, kept in one place. */
object CreditRules {
    const val START = 100
    const val MAX = 100
    const val MIN = 0

    const val PASSED = 10
    const val FAILED = -5
    const val MISSED = -10

    /** How long after a session ends you can still take its quiz before it counts as missed. */
    const val GRACE_HOURS = 3L

    /** How far back to look for missed sessions (if the app wasn't opened for a while). */
    const val LOOKBACK_DAYS = 14L

    fun amount(kind: CreditKind): Int = when (kind) {
        CreditKind.PASSED -> PASSED
        CreditKind.FAILED -> FAILED
        CreditKind.MISSED -> MISSED
    }

    /** Replays events in time order, keeping the balance between [MIN] and [MAX] at every step. */
    fun balance(events: List<CreditEvent>): Int =
        events.sortedBy { it.atMillis }.fold(START) { b, e -> (b + e.amount).coerceIn(MIN, MAX) }

    data class MissedSession(val task: Task, val date: LocalDate, val missedAtMillis: Long)

    /**
     * Sessions whose quiz window has closed without any credit event. A session only counts if it
     * ended after both the task was created and the credit system was switched on.
     */
    fun findMissed(
        tasks: List<Task>,
        alreadyCounted: Set<SessionKey>,
        creditStartMillis: Long,
        now: LocalDateTime,
        zone: ZoneId,
    ): List<MissedSession> {
        val today = now.toLocalDate()
        val result = mutableListOf<MissedSession>()
        for (task in tasks) {
            val notBefore = maxOf(task.createdAtMillis, creditStartMillis)
            for (back in LOOKBACK_DAYS downTo 0L) {
                val date = today.minusDays(back)
                if (!task.occursOn(date)) continue
                val end = date.atTime(task.endMinute / 60, task.endMinute % 60)
                val missedAt = end.plusHours(GRACE_HOURS)
                if (missedAt.isAfter(now)) continue
                if (end.atZone(zone).toInstant().toEpochMilli() <= notBefore) continue
                if (SessionKey(task.id, date.toEpochDay()) in alreadyCounted) continue
                result += MissedSession(task, date, missedAt.atZone(zone).toInstant().toEpochMilli())
            }
        }
        return result
    }
}
