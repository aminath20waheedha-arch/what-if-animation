package com.focuscredit.app.reminders

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.focuscredit.app.MainActivity
import com.focuscredit.app.R
import com.focuscredit.app.data.Task
import com.focuscredit.app.quiz.QuizRequest
import com.focuscredit.app.ui.formatMinute
import java.time.LocalDate

object Notifications {
    private const val CHANNEL_ID = "task_reminders"

    fun hasPermission(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    fun ensureChannel(context: Context) {
        val channel = NotificationChannel(CHANNEL_ID, "Task reminders", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Alerts when a scheduled task starts and ends"
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun showReminder(context: Context, task: Task, type: ReminderType) {
        if (!hasPermission(context)) return
        ensureChannel(context)

        val launch = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (type == ReminderType.END) {
            // Tapping "Time's up" opens today's quiz for this task.
            QuizRequest(task.subject, task.id, LocalDate.now().toEpochDay()).writeTo(launch)
        }
        val open = PendingIntent.getActivity(
            context,
            ReminderScheduler.requestCode(task.id, type),
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val time = "${formatMinute(task.startMinute)}–${formatMinute(task.endMinute)}"
        val (title, text) = when (type) {
            ReminderType.START -> "Time to start: ${task.title}" to "${task.subject} · $time. Put the phone down!"
            ReminderType.END -> "Time's up: ${task.title}" to "Tap to take your ${task.subject} quiz."
        }

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(ReminderScheduler.requestCode(task.id, type), notification)
        } catch (_: SecurityException) {
            // Permission was revoked between the check and the post; nothing to do.
        }
    }
}
