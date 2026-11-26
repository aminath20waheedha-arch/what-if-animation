package com.focuscredit.app.ui

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.focuscredit.app.reminders.Notifications
import com.focuscredit.app.reminders.ReminderScheduler

/**
 * Asks for the two things reminders need: permission to show notifications, and
 * permission to fire alarms at an exact time. Hidden once both are granted.
 */
@Composable
fun ReminderPermissionBanner(onExactAlarmsGranted: () -> Unit) {
    val context = LocalContext.current
    var notificationsOk by remember { mutableStateOf(Notifications.hasPermission(context)) }
    var exactOk by remember { mutableStateOf(ReminderScheduler.canScheduleExact(context)) }
    var askedOnce by rememberSaveable { mutableStateOf(false) }

    // Re-check whenever the user comes back from the Settings app.
    LifecycleResumeEffect(Unit) {
        notificationsOk = Notifications.hasPermission(context)
        val nowExact = ReminderScheduler.canScheduleExact(context)
        if (nowExact && !exactOk) onExactAlarmsGranted()
        exactOk = nowExact
        onPauseOrDispose { }
    }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        notificationsOk = granted
        askedOnce = true
    }

    when {
        !notificationsOk -> BannerCard(
            text = "Turn on notifications so Focus Credit can tell you when a task starts and ends.",
            button = "Allow notifications",
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !askedOnce) {
                launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else {
                // Android won't show the popup again after a "Don't allow", so open Settings instead.
                context.startActivity(
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                )
            }
        }

        !exactOk && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> BannerCard(
            text = "Allow \"Alarms & reminders\" so reminders arrive exactly on time instead of a few minutes late.",
            button = "Open settings",
        ) {
            context.startActivity(
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
            )
        }
    }
}

@Composable
private fun BannerCard(text: String, button: String, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(text, style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onClick, modifier = Modifier.padding(top = 8.dp)) { Text(button) }
        }
    }
}
