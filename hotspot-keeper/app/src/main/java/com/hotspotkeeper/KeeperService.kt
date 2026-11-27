package com.hotspotkeeper

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager

/** Foreground service: checks the hotspot every 20s (and on state-change broadcasts) and re-enables it. */
class KeeperService : Service() {

    companion object {
        const val PREFS = "keeper"
        const val KEY_ON = "enabled"
        private const val CHANNEL = "keeper"
        private const val CHECK_MS = 20_000L
        private const val RETRY_COOLDOWN_MS = 45_000L

        fun start(ctx: Context) {
            val i = Intent(ctx, KeeperService::class.java)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }

        fun stop(ctx: Context) { ctx.stopService(Intent(ctx, KeeperService::class.java)) }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var lastAttempt = 0L
    private var wake: PowerManager.WakeLock? = null

    private val loop = object : Runnable {
        override fun run() { check(); handler.postDelayed(this, CHECK_MS) }
    }

    private val apReceiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { handler.postDelayed({ check() }, 3000) }
    }

    override fun onCreate() {
        super.onCreate()
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Hotspot Keeper", NotificationManager.IMPORTANCE_LOW))
        val n = Notification.Builder(this, CHANNEL)
            .setContentTitle("Hotspot Keeper is running")
            .setContentText("Keeping your hotspot on")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(1, n)
        }
        registerReceiver(apReceiver, IntentFilter("android.net.wifi.WIFI_AP_STATE_CHANGED"))
        handler.post(loop)
    }

    private fun check() {
        if (HotspotControl.isOn(this)) return
        val now = System.currentTimeMillis()
        if (now - lastAttempt < RETRY_COOLDOWN_MS) return
        val svc = HotspotAccessibilityService.instance ?: return // user hasn't enabled the accessibility service
        lastAttempt = now
        wakeScreen()
        svc.enableHotspot()
    }

    @Suppress("DEPRECATION")
    private fun wakeScreen() {
        val pm = getSystemService(PowerManager::class.java)
        if (pm.isInteractive) return
        wake?.takeIf { it.isHeld }?.release()
        wake = pm.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "hotspotkeeper:wake"
        ).also { it.acquire(30_000) }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        try { unregisterReceiver(apReceiver) } catch (_: Throwable) {}
        wake?.takeIf { it.isHeld }?.release()
        super.onDestroy()
    }

    override fun onBind(i: Intent?): IBinder? = null
}
