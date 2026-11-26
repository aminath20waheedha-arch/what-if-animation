# Focus Credit

An Android app that helps you stick to your study schedule. Plan your study sessions and classes. After each one, take a 10-question quiz on what you studied. Pass and you earn credit; skip and you lose it. When credit hits 0, TikTok and Instagram get locked until you earn some back.

## Status

| Step | Feature | Done |
|------|---------|------|
| 1 | Schedule screen (add / edit / delete tasks, weekly repeat) | ✅ |
| 2 | Reminders at task start and end | ✅ |
| 3 | Flashcards per subject | ✅ |
| 4 | Quiz after each task (type answer, compare, self-mark; pass = ≥4 of 10) | ✅ |
| 5 | Credit balance (start 100, missed −10 after 3h grace, failed −5, passed +10, cap 100) | ✅ |
| 6 | Blocker for TikTok + Instagram at 0 credit (easy to turn off after a 10-second pause) | ✅ |
| 7 | Setup tab with permission checklist and vivo guide | ✅ |

## Getting the app on your phone

1. On GitHub, open the **Actions** tab and click the latest **Focus Credit APK** run.
2. Under **Artifacts**, download `focus-credit-debug-apk`. It downloads as a zip, so unzip it.
3. Send `app-debug.apk` to your phone and open it. Allow "Install unknown apps" if Android asks.
4. Installing a newer APK over the old one keeps all your tasks, cards and credit.

## First-time setup (do this once)

Open the **Setup** tab and work down the list until everything has a green tick:

1. **Allow the blocker (Accessibility).** Settings → Accessibility → Downloaded apps → Focus Credit → On.
   If the switch is greyed out ("Restricted setting"), open App info → ⋮ → **Allow restricted settings**, then try again. Android does this for every app installed from an APK.
2. **Allow notifications** and **Alarms & reminders**.
3. **Don't restrict battery.**
4. **vivo extras:** turn on Auto-start, allow high background power use, and lock the app in Recent apps. Tick each one off when done.
5. Tap **Preview the lock screen** to see what a locked app looks like.

## How to use it

1. **Schedule:** add your classes and study sessions. Weekly ones only need adding once.
2. **Flashcards:** each subject needs at least 10 question/answer cards before quizzes work.
3. **When a session ends**, tap the "Time's up" notification and take the quiz. Type each answer, compare it with the real one, and mark yourself honestly.
4. **Credit:**

   | What happens | Credit |
   |---|---|
   | Pass a session's quiz (4+ of 10 right) | +10 (max 100) |
   | Fail it | −5 |
   | No quiz within 3 hours of the session ending | −10 |
   | Practice quiz (Flashcards tab) | no change |

5. **At 0 credit**, TikTok and Instagram show a lock screen instead of opening. To earn credit back, do a scheduled session and pass its quiz.
6. **Turning the blocker off** is always possible from the Setup tab. It asks you to wait 10 seconds and say why first.

## Known limits

- TikTok and Instagram in a web browser are not blocked, only the apps.
- If the phone kills the app in the background (common on vivo), reminders can be late. The Setup tab steps fix this.
- The quiz relies on you marking yourself honestly.

## Building it yourself (optional)

Requires JDK 17+ and the Android SDK (or Android Studio).

```
cd focus-credit
./gradlew assembleDebug        # build the APK
./gradlew testDebugUnitTest    # run the unit tests
```

Tech: Kotlin, Jetpack Compose (Material 3), Room database, AccessibilityService for the blocker. minSdk 26, targetSdk 35.
