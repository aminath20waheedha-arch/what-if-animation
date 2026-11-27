package com.hotspotkeeper

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {

    private lateinit var status: TextView
    private lateinit var toggle: Button

    private val prefs get() = getSharedPreferences(KeeperService.PREFS, Context.MODE_PRIVATE)

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
        }
        fun btn(label: String, onClick: () -> Unit) = Button(this).apply {
            text = label
            setOnClickListener { onClick(); refresh() }
            col.addView(this, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        }

        status = TextView(this).apply { textSize = 16f }
        col.addView(status)

        btn("1. Enable accessibility service") {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
        btn("2. Allow unrestricted battery use") {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        }
        toggle = btn("3. Start keeping hotspot on") {
            val on = !prefs.getBoolean(KeeperService.KEY_ON, false)
            prefs.edit().putBoolean(KeeperService.KEY_ON, on).apply()
            if (on) KeeperService.start(this) else KeeperService.stop(this)
        }
        btn("Test: turn hotspot on now") {
            HotspotAccessibilityService.instance?.enableHotspot()
        }

        setContentView(ScrollView(this).apply { addView(col) })
    }

    override fun onResume() { super.onResume(); refresh() }

    private fun refresh() {
        val a11y = HotspotAccessibilityService.instance != null
        val battery = getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)
        val running = prefs.getBoolean(KeeperService.KEY_ON, false)
        status.text = buildString {
            appendLine("Hotspot now: " + if (HotspotControl.isOn(this@MainActivity)) "ON" else "OFF")
            appendLine("Accessibility service: " + if (a11y) "enabled" else "NOT enabled (step 1)")
            appendLine("Battery unrestricted: " + if (battery) "yes" else "no (step 2)")
            appendLine("Keeper: " + if (running) "running" else "stopped")
        }
        toggle.text = if (running) "3. Stop keeping hotspot on" else "3. Start keeping hotspot on"
    }
}
