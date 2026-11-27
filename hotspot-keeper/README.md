# Hotspot Keeper (Android)

Keeps your phone's Wi-Fi hotspot on. Checks every 20 s (and on hotspot state changes); when it finds the hotspot off, it wakes the screen, opens the hotspot settings and taps the switch. Starts again automatically after a reboot.

## Get the APK
Push to GitHub -> Actions -> "Build Hotspot Keeper APK" -> download artifact `HotspotKeeper-debug-apk`, then install `app-debug.apk` on the phone (allow "install unknown apps").

## Set up on the phone (one time)
1. Open the app -> **1.** enable *Hotspot Keeper* under Accessibility (Android may require Settings -> Apps -> Hotspot Keeper -> ⋮ -> "Allow restricted settings" first).
2. **2.** allow unrestricted battery use.
3. Turn your hotspot on once by hand, set a screen-lock that is "None"/"Swipe" if you can, then press **3. Start keeping hotspot on**.
4. Use **Test** after manually turning the hotspot off to confirm it works on your phone.

## Limits (be aware)
- Normal apps can't toggle the hotspot on Android 8+; this uses an Accessibility Service that taps the Settings UI, so it depends on your phone's Settings layout (Pixel/Samsung-style screens handled; others may need tweaks in `HotspotAccessibilityService.kt`).
- It cannot work while the phone is locked with PIN/pattern/fingerprint, nor before you unlock after a reboot. Set the lock to none/swipe for an unattended phone.
- Untested on a real device so far.
