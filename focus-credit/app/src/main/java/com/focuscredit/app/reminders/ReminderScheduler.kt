package com.focuscredit.app.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.focuscredit.app.data.AppDatabase
import com.focuscredit.app.data.Task
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Keeps one alarm per task per reminder type (start / end), always pointing at
 * that task's next occurrence. When an alarm fires, [ReminderReceiver] books the
 * following one.
 */
object ReminderScheduler {
    const val EXTRA_TASK_ID = "task_id"
    const val EXTRA_TYPE = "type"

    fun canScheduleExact(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()

    fun schedule(context: Context, task: Task) {
        val now = LocalDateTime.now()
        ReminderType.entries.forEach { scheduleOne(context, task, it, now) }
    }

    fun scheduleOne(context: Context, task: Task, type: ReminderType, after: LocalDateTime) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        val intent = pendingIntent(context, task.id, type)
        val at = ReminderTimes.next(task, type, after)
        if (at == null) {
            alarms.cancel(intent)
            return
        }
        val millis = at.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        if (canScheduleExact(context)) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, intent)
        } else {
            // Without the exact-alarm permission Android may deliver this a few minutes late.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, intent)
        }
    }

    fun cancel(context: Context, taskId: Long) {
        val alarms = context.getSystemService(AlarmManager::class.java)
        ReminderType.entries.forEach { alarms.cancel(pendingIntent(context, taskId, it)) }
    }

    suspend fun rescheduleAll(context: Context) {
        AppDatabase.get(context).taskDao().getAll().forEach { schedule(context, it) }
    }

    fun requestCode(taskId: Long, type: ReminderType): Int = (taskId * 2 + type.ordinal).toInt()

    private fun pendingIntent(context: Context, taskId: Long, type: ReminderType): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java)
            .putExtra(EXTRA_TASK_ID, taskId)
            .putExtra(EXTRA_TYPE, type.ordinal)
        return PendingIntent.getBroadcast(
            context,
            requestCode(taskId, type),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
