package com.focuscredit.app.blocker

import android.content.Context

/** Small on-device settings for the blocker and the setup checklist. */
class BlockerSettings(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("blocker", Context.MODE_PRIVATE)

    /** The in-app switch. The blocker also needs its Accessibility permission to actually work. */
    var enabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    val disableCount: Int get() = prefs.getInt(KEY_DISABLE_COUNT, 0)

    /** Turning the blocker off is always allowed, but each time is counted (with an optional reason). */
    fun recordDisable(reason: String) {
        prefs.edit()
            .putBoolean(KEY_ENABLED, false)
            .putInt(KEY_DISABLE_COUNT, disableCount + 1)
            .putString(KEY_LAST_REASON, reason.trim())
            .putLong(KEY_LAST_DISABLED_AT, System.currentTimeMillis())
            .apply()
    }

    /** Manual setup steps the app can't detect itself (e.g. vivo auto-start). */
    fun isStepDone(key: String): Boolean = prefs.getBoolean("step_$key", false)
    fun setStepDone(key: String, done: Boolean) = prefs.edit().putBoolean("step_$key", done).apply()

    private companion object {
        const val KEY_ENABLED = "enabled"
        const val KEY_DISABLE_COUNT = "disable_count"
        const val KEY_LAST_REASON = "last_disable_reason"
        const val KEY_LAST_DISABLED_AT = "last_disabled_at"
    }
}
