# Focus Credit

An Android app that helps you stick to your study schedule. You lose credit when you skip tasks. When credit hits 0, TikTok and Instagram get locked until you pass a quiz on what you studied.

## Status

| Step | Feature | Done |
|------|---------|------|
| 1 | Schedule screen (add / edit / delete tasks, weekly repeat) | ✅ |
| 2 | Reminders at task start and end | ✅ |
| 3 | Flashcards per subject | ✅ |
| 4 | Quiz after each task (≥40% right = +credit, otherwise −credit) | ⬜ |
| 5 | Credit balance (start 100, missed −10, failed −5, passed +10) | ⬜ |
| 6 | Blocker for TikTok + Instagram at 0 credit | ⬜ |
| 7 | vivo setup guide (auto-start, battery, permissions) | ⬜ |

## Getting the app on your phone

1. On GitHub, open the **Actions** tab and click the latest **Focus Credit APK** run.
2. Under **Artifacts**, download `focus-credit-debug-apk`. It downloads as a zip, so unzip it.
3. Send `app-debug.apk` to your phone and open it. Allow "Install unknown apps" if Android asks.

## Building it yourself (optional)

Requires JDK 17+ and the Android SDK (or Android Studio).

```
cd focus-credit
./gradlew assembleDebug
```

Tech: Kotlin, Jetpack Compose (Material 3), Room database. minSdk 26, targetSdk 35.
