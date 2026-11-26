package com.focuscredit.app.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.focuscredit.app.data.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.LocalDateTime

/** Fires when a task starts or ends: shows the notification and books the next one. */
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getLongExtra(ReminderScheduler.EXTRA_TASK_ID, -1)
        val type = ReminderType.entries.getOrNull(intent.getIntExtra(ReminderScheduler.EXTRA_TYPE, -1)) ?: return
        val app = context.applicationContext
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val task = AppDatabase.get(app).taskDao().getById(taskId) ?: return@launch
                Notifications.showReminder(app, task, type)
                // Small buffer so we never re-book the alarm that just fired.
                ReminderScheduler.scheduleOne(app, task, type, LocalDateTime.now().plusSeconds(30))
            } finally {
                pending.finish()
            }
        }
    }
}
