package com.focuscredit.app.ui.setup

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import com.focuscredit.app.blocker.BlockerSettings
import com.focuscredit.app.reminders.Notifications
import com.focuscredit.app.reminders.ReminderScheduler
import kotlinx.coroutines.delay

private const val TURN_OFF_WAIT_SECONDS = 10

/** Setup tab: blocker switch, permission checklist and the vivo-specific steps. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SetupTab() {
    val context = LocalContext.current
    val settings = remember { BlockerSettings(context) }

    // Re-read everything whenever we come back from the Settings app.
    var refresh by remember { mutableIntStateOf(0) }
    LifecycleResumeEffect(Unit) {
        refresh++
        onPauseOrDispose { }
    }
    val serviceOn = remember(refresh) { DeviceSetup.isBlockerServiceOn(context) }
    val notificationsOn = remember(refresh) { Notifications.hasPermission(context) }
    val exactOn = remember(refresh) { ReminderScheduler.canScheduleExact(context) }
    val batteryOk = remember(refresh) { DeviceSetup.isIgnoringBatteryOptimizations(context) }
    var enabled by remember(refresh) { mutableStateOf(settings.enabled) }
    var askTurnOff by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopAppBar(title = { Text("Setup") }) }) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            BlockerCard(
                enabled = enabled,
                serviceOn = serviceOn,
                onToggle = { wantOn -> if (wantOn) { settings.enabled = true; enabled = true } else askTurnOff = true },
            )

            SectionTitle("Needed for the app to work")
            StepCard(
                done = serviceOn,
                title = "Allow the blocker (Accessibility)",
                body = "Settings → Accessibility → Downloaded / Installed apps → Focus Credit → On. " +
                    "It only notices when TikTok or Instagram opens. It can't read your screen.",
                action = "Open Accessibility",
                onAction = { DeviceSetup.openAccessibilitySettings(context) },
                extra = {
                    Text(
                        "Switch greyed out or \"Restricted setting\"? Android limits apps installed from an APK. " +
                            "Open App info → ⋮ (top right) → Allow restricted settings, then try again.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    TextButton(onClick = { DeviceSetup.openAppDetails(context) }) { Text("Open App info") }
                },
            )
            StepCard(
                done = notificationsOn,
                title = "Allow notifications",
                body = "So you're told when a session starts and when it's quiz time.",
                action = "Open settings",
                onAction = { DeviceSetup.openNotificationSettings(context) },
            )
            StepCard(
                done = exactOn,
                title = "Allow alarms & reminders",
                body = "Makes reminders arrive exactly on time.",
                action = "Open settings",
                onAction = { DeviceSetup.openExactAlarmSettings(context) },
            )
            StepCard(
                done = batteryOk,
                title = "Don't restrict battery",
                body = "Lets reminders and the blocker keep running when the app is closed.",
                action = "Allow",
                onAction = { DeviceSetup.requestIgnoreBatteryOptimizations(context) },
            )

            SectionTitle(if (DeviceSetup.isVivo) "Extra steps for your vivo" else "Extra steps for vivo / iQOO phones")
            Text(
                "vivo phones close background apps aggressively. Do these once, then tick them off. " +
                    "Menu names can differ a little between software versions.",
                style = MaterialTheme.typography.bodyMedium,
            )
            ManualStepCard(
                settings = settings,
                key = "vivo_autostart",
                title = "Turn on Auto-start",
                body = "i Manager → App manager → Auto-start (or Settings → Apps → Autostart) → Focus Credit → On.",
                action = "Try to open it",
                onAction = { DeviceSetup.openVivoAutoStart(context) },
            )
            ManualStepCard(
                settings = settings,
                key = "vivo_background_power",
                title = "Allow background power use",
                body = "Settings → Battery → Background power consumption management → Focus Credit → Allow high background power consumption.",
                action = "Open App info",
                onAction = { DeviceSetup.openAppDetails(context) },
            )
            ManualStepCard(
                settings = settings,
                key = "vivo_lock_recents",
                title = "Lock it in Recent apps",
                body = "Open Recent apps, then pull down on the Focus Credit card (or tap its ⋮ / lock icon) so cleaning won't close it.",
            )

            SectionTitle("Try it")
            OutlinedButton(onClick = { DeviceSetup.previewLockScreen(context) }, modifier = Modifier.fillMaxWidth()) {
                Text("Preview the lock screen")
            }
            Text(
                "The real lock only appears when your credit is 0 and you open TikTok or Instagram.",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }

    if (askTurnOff) {
        TurnOffDialog(
            previousTimes = settings.disableCount,
            onConfirm = { reason ->
                settings.recordDisable(reason)
                enabled = false
                askTurnOff = false
            },
            onCancel = { askTurnOff = false },
        )
    }
}

@Composable
private fun BlockerCard(enabled: Boolean, serviceOn: Boolean, onToggle: (Boolean) -> Unit) {
    val active = enabled && serviceOn
    val colors = MaterialTheme.colorScheme
    Card(colors = CardDefaults.cardColors(containerColor = if (active) colors.primaryContainer else colors.surfaceVariant)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("App blocker", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        when {
                            active -> "On. TikTok and Instagram lock when your credit hits 0."
                            !enabled -> "Off. Nothing gets locked."
                            else -> "Needs permission. Do the Accessibility step below."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                Switch(checked = enabled, onCheckedChange = onToggle)
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun StepCard(
    done: Boolean,
    title: String,
    body: String,
    action: String,
    onAction: () -> Unit,
    extra: @Composable () -> Unit = {},
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    if (done) Icons.Filled.CheckCircle else Icons.Filled.Warning,
                    contentDescription = if (done) "Done" else "To do",
                    tint = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(22.dp),
                )
                Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(start = 8.dp))
            }
            Text(body, style = MaterialTheme.typography.bodyMedium)
            if (!done) {
                OutlinedButton(onClick = onAction) { Text(action) }
                extra()
            }
        }
    }
}

@Composable
private fun ManualStepCard(
    settings: BlockerSettings,
    key: String,
    title: String,
    body: String,
    action: String? = null,
    onAction: () -> Unit = {},
) {
    var done by remember { mutableStateOf(settings.isStepDone(key)) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(start = 4.dp, end = 16.dp, top = 8.dp, bottom = 12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = done, onCheckedChange = { done = it; settings.setStepDone(key, it) })
                Text(title, style = MaterialTheme.typography.titleSmall)
            }
            Column(Modifier.padding(start = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(body, style = MaterialTheme.typography.bodyMedium)
                if (action != null && !done) OutlinedButton(onClick = onAction) { Text(action) }
            }
        }
    }
}

/** Turning off is always allowed, after a 10-second pause to think about it. */
@Composable
private fun TurnOffDialog(previousTimes: Int, onConfirm: (String) -> Unit, onCancel: () -> Unit) {
    var secondsLeft by remember { mutableIntStateOf(TURN_OFF_WAIT_SECONDS) }
    var reason by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        while (secondsLeft > 0) {
            delay(1_000)
            secondsLeft--
        }
    }
    AlertDialog(
        onDismissRequest = onCancel,
        title = { Text("Turn off the blocker?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Take a breath first. Why do you want to turn it off right now?")
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Reason (optional)") },
                    minLines = 2,
                )
                if (previousTimes > 0) {
                    Text(
                        "You've turned it off $previousTimes time${if (previousTimes == 1) "" else "s"} before.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(enabled = secondsLeft == 0, onClick = { onConfirm(reason) }) {
                Text(if (secondsLeft > 0) "Turn off ($secondsLeft)" else "Turn off")
            }
        },
        dismissButton = { TextButton(onClick = onCancel) { Text("Keep it on") } },
    )
}
