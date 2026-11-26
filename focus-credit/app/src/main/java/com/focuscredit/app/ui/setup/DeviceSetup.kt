package com.focuscredit.app.ui.setup

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.focuscredit.app.blocker.BlockedActivity
import com.focuscredit.app.blocker.BlockerService

/** Checks and shortcuts into system settings for the setup checklist. */
object DeviceSetup {
    val isVivo: Boolean
        get() = Build.MANUFACTURER.lowercase().let { it.contains("vivo") || it.contains("iqoo") }

    fun isBlockerServiceOn(context: Context): Boolean {
        val am = context.getSystemService(AccessibilityManager::class.java) ?: return false
        return am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK).any {
            val info = it.resolveInfo.serviceInfo
            info.packageName == context.packageName && info.name == BlockerService::class.java.name
        }
    }

    fun isIgnoringBatteryOptimizations(context: Context): Boolean =
        context.getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(context.packageName) == true

    fun openAccessibilitySettings(context: Context) {
        start(context, Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }

    fun openAppDetails(context: Context) {
        start(context, Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
    }

    fun requestIgnoreBatteryOptimizations(context: Context) {
        val ok = start(
            context,
            Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")),
        )
        if (!ok) start(context, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    fun openNotificationSettings(context: Context) {
        start(context, Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName))
    }

    fun openExactAlarmSettings(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            start(context, Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")))
        }
    }

    /** vivo's auto-start page has moved between versions, so try the known ones, then fall back to App info. */
    fun openVivoAutoStart(context: Context) {
        val candidates = listOf(
            ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
            ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
            ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
            ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurviewTabActivity"),
        )
        if (candidates.none { start(context, Intent().setComponent(it)) }) openAppDetails(context)
    }

    fun previewLockScreen(context: Context) {
        start(
            context,
            Intent(context, BlockedActivity::class.java)
                .putExtra(BlockedActivity.EXTRA_APP_NAME, "TikTok")
                .putExtra(BlockedActivity.EXTRA_PREVIEW, true),
        )
    }

    private fun start(context: Context, intent: Intent): Boolean = try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    } catch (_: Exception) {
        false // not on this phone, or not allowed
    }
}
