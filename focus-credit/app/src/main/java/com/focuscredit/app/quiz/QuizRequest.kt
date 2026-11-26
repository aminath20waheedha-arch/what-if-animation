package com.focuscredit.app.quiz

import android.content.Intent
import java.time.LocalDate

/** Which quiz to run: a subject, and optionally the scheduled task (and day) it is for. */
data class QuizRequest(val subject: String, val taskId: Long?, val dateEpochDay: Long) {

    fun writeTo(intent: Intent): Intent = intent
        .putExtra(EXTRA_SUBJECT, subject)
        .putExtra(EXTRA_TASK_ID, taskId ?: -1L)
        .putExtra(EXTRA_DATE, dateEpochDay)

    companion object {
        private const val EXTRA_SUBJECT = "quiz_subject"
        private const val EXTRA_TASK_ID = "quiz_task_id"
        private const val EXTRA_DATE = "quiz_date"

        fun practice(subject: String) = QuizRequest(subject, null, LocalDate.now().toEpochDay())

        fun fromIntent(intent: Intent?): QuizRequest? {
            val subject = intent?.getStringExtra(EXTRA_SUBJECT) ?: return null
            val taskId = intent.getLongExtra(EXTRA_TASK_ID, -1L).takeIf { it >= 0 }
            val date = intent.getLongExtra(EXTRA_DATE, LocalDate.now().toEpochDay())
            return QuizRequest(subject, taskId, date)
        }
    }
}
