package com.hotspotkeeper

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Android does not let normal apps toggle the hotspot. This service does what you would do by hand:
 * opens the hotspot settings screen and taps the switch. It only touches the Settings app.
 */
class HotspotAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile var instance: HotspotAccessibilityService? = null
        private const val WINDOW_MS = 25_000L
        private val HOTSPOT = Regex("(?i)hotspot|tethering")
        private val HOTSPOT_ROW = Regex("(?i)(portable|mobile|wi-?fi)\\s*hotspot|hotspot")
    }

    private val handler = Handler(Looper.getMainLooper())
    @Volatile private var deadline = 0L
    private var lastRowClick = 0L

    private val ticker = object : Runnable {
        override fun run() {
            if (System.currentTimeMillis() > deadline) return
            attempt()
            handler.postDelayed(this, 1000)
        }
    }

    override fun onServiceConnected() { instance = this }

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }

    override fun onInterrupt() {}

    /** Called by KeeperService when the hotspot is found off. */
    fun enableHotspot() {
        if (System.currentTimeMillis() < deadline) return // already working on it
        deadline = System.currentTimeMillis() + WINDOW_MS
        openTetherSettings()
        handler.removeCallbacks(ticker)
        handler.postDelayed(ticker, 1500)
    }

    private fun openTetherSettings() {
        val candidates = listOf(
            Intent().setComponent(ComponentName("com.android.settings", "com.android.settings.TetherSettings")),
            Intent().setComponent(ComponentName("com.android.settings", "com.android.settings.Settings\$TetherSettingsActivity")),
            Intent(Settings.ACTION_WIRELESS_SETTINGS)
        )
        for (i in candidates) {
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            if (i.resolveActivity(packageManager) != null) {
                try { startActivity(i); return } catch (_: Throwable) {}
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (System.currentTimeMillis() <= deadline) attempt()
    }

    private fun attempt() {
        if (HotspotControl.isOn(this)) { finish(); return }
        val root = rootInActiveWindow ?: return
        if (root.packageName?.contains("settings", ignoreCase = true) != true) return

        // 1) A hotspot switch that is visible and off -> flip it.
        val sw = findHotspotSwitch(root)
        if (sw != null) {
            if (!sw.isChecked) click(sw)
            return
        }
        // 2) Otherwise open the hotspot row (e.g. Pixel: "Hotspot & tethering" -> "Wi-Fi hotspot").
        val now = System.currentTimeMillis()
        if (now - lastRowClick < 2500) return
        findNode(root) { !it.isCheckable && it.text?.let { t -> HOTSPOT_ROW.containsMatchIn(t) } == true }
            ?.let { lastRowClick = now; click(it) }
    }

    private fun finish() {
        deadline = 0
        handler.removeCallbacks(ticker)
        handler.postDelayed({ performGlobalAction(GLOBAL_ACTION_HOME) }, 800)
    }

    private fun findHotspotSwitch(root: AccessibilityNodeInfo): AccessibilityNodeInfo? =
        findNode(root) { n ->
            n.isCheckable && labelNear(n).let { HOTSPOT.containsMatchIn(it) }
        }

    /** Text of the node plus its row (parent subtree) so a bare Switch can be matched to its label. */
    private fun labelNear(n: AccessibilityNodeInfo): String {
        val sb = StringBuilder()
        var cur: AccessibilityNodeInfo? = n
        repeat(3) {
            cur?.let { collectText(it, sb, 0) }
            cur = cur?.parent
        }
        return sb.toString()
    }

    private fun collectText(n: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        n.text?.let { sb.append(it).append(' ') }
        n.contentDescription?.let { sb.append(it).append(' ') }
        if (depth >= 3) return
        for (i in 0 until n.childCount) n.getChild(i)?.let { collectText(it, sb, depth + 1) }
    }

    private fun findNode(n: AccessibilityNodeInfo, pred: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo? {
        if (pred(n)) return n
        for (i in 0 until n.childCount) {
            val c = n.getChild(i) ?: continue
            findNode(c, pred)?.let { return it }
        }
        return null
    }

    private fun click(n: AccessibilityNodeInfo) {
        var cur: AccessibilityNodeInfo? = n
        while (cur != null) {
            if (cur.isClickable && cur.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return
            cur = cur.parent
        }
    }
}
