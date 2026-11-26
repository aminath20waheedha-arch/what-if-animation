package com.focuscredit.app.blocker

import com.focuscredit.app.credit.CreditRules

object BlockRules {
    /**
     * Apps that get locked at 0 credit (package name to display name).
     * Keep in sync with android:packageNames in res/xml/blocker_service.xml.
     */
    val BLOCKED_APPS: Map<String, String> = mapOf(
        "com.zhiliaoapp.musically" to "TikTok",
        "com.ss.android.ugc.trill" to "TikTok",
        "com.zhiliaoapp.musically.go" to "TikTok Lite",
        "com.ss.android.ugc.tiktok.lite" to "TikTok Lite",
        "com.instagram.android" to "Instagram",
        "com.instagram.lite" to "Instagram Lite",
    )

    fun shouldBlock(packageName: String?, balance: Int?, enabled: Boolean): Boolean =
        enabled && balance != null && balance <= CreditRules.MIN && packageName in BLOCKED_APPS

    fun label(packageName: String?): String = BLOCKED_APPS[packageName] ?: "This app"
}
