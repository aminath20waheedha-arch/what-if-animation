package com.hotspotkeeper

import android.content.Context
import android.net.wifi.WifiManager
import java.net.Inet4Address
import java.net.NetworkInterface

object HotspotControl {

    /** True if the phone's Wi-Fi hotspot (AP) is currently running. */
    fun isOn(ctx: Context): Boolean {
        try {
            val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val m = WifiManager::class.java.getDeclaredMethod("isWifiApEnabled")
            m.isAccessible = true
            return m.invoke(wm) as Boolean
        } catch (_: Throwable) {
            // hidden API blocked on this Android version -> fall back to interface scan
        }
        return apInterfaceUp()
    }

    private fun apInterfaceUp(): Boolean = try {
        NetworkInterface.getNetworkInterfaces().toList().any { ni ->
            ni.isUp &&
                (ni.name.startsWith("ap") || ni.name.startsWith("swlan") || ni.name == "wlan1") &&
                ni.inetAddresses.toList().any { it is Inet4Address }
        }
    } catch (_: Throwable) {
        false
    }
}
