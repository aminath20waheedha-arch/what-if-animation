package com.hotspotkeeper

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val on = context.getSharedPreferences(KeeperService.PREFS, Context.MODE_PRIVATE)
            .getBoolean(KeeperService.KEY_ON, false)
        if (on) KeeperService.start(context)
    }
}
