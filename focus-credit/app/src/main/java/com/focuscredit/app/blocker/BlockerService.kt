package com.focuscredit.app.blocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import com.focuscredit.app.credit.CreditRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Watches only for TikTok / Instagram coming to the front (see res/xml/blocker_service.xml,
 * which limits events to those packages). It never reads screen content. At 0 credit it sends
 * you home and shows the lock screen.
 */
class BlockerService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private lateinit var settings: BlockerSettings
    private lateinit var credit: CreditRepository
    private var lastSyncAt = 0L
    private var lastBlockAt = 0L

    override fun onServiceConnected() {
        settings = BlockerSettings(this)
        credit = CreditRepository(this)
        scope.launch { credit.sync() }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg !in BlockRules.BLOCKED_APPS || !settings.enabled) return

        scope.launch {
            // Catch up on skipped sessions at most once a minute, then check the real balance.
            val now = SystemClock.elapsedRealtime()
            if (now - lastSyncAt > SYNC_INTERVAL_MS) {
                lastSyncAt = now
                credit.sync()
            }
            if (BlockRules.shouldBlock(pkg, credit.currentBalance(), settings.enabled)) block(pkg)
        }
    }

    private fun block(pkg: String) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastBlockAt < 1_500) return // one lock screen per app launch
        lastBlockAt = now
        performGlobalAction(GLOBAL_ACTION_HOME)
        startActivity(
            Intent(this, BlockedActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(BlockedActivity.EXTRA_APP_NAME, BlockRules.label(pkg))
        )
    }

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    private companion object {
        const val SYNC_INTERVAL_MS = 60_000L
    }
}
