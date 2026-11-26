# mc-client

Our own Minecraft Bedrock mod client for Android (no root). Written from scratch.

## How it works
1. **Launcher** (`LauncherActivity`) – our own app (`com.mcclient.launcher`).
2. **Loader** (`App` + `GameLoader`) – at startup our `libmcclient.so` loads first, then the
   installed Minecraft's code, native libs and assets are added to *our* process.
   Minecraft itself is never modified or redistributed.
3. **Game** (`GameActivity`) – Minecraft's own `MainActivity`, running inside our app. It has
   its own data and worlds, so the normal Minecraft app stays separate and untouched.
4. **Click GUI** (`ClickGui`) – draggable floating button + panel, generated from the native
   module list. Every setting a module declares shows up automatically.

## Layout
- `core/` – Setting, Module, Registry (config save/load, JSON for the GUI). No game dependency.
- `modules/` – features. `hit_animation.h` (math + settings; not hooked into the game yet).
- `tests/` – PC tests: `cmake -S . -B build && cmake --build build && build/test_core`
- `android/` – the app. Build: `cd android && gradle assembleDebug` (needs Android SDK + NDK 27).
  `debug.keystore` is a throwaway debug key (password `android`) so updates install over each other.

## Add a feature
Subclass `Module`, declare settings with `add(Setting::...)`, override `onTick`/`onHit`,
register it in `android/app/src/main/cpp/jni_bridge.cpp`. It appears in the click GUI.

## Status
- Done: launcher, loader, click GUI, settings save. Builds; not yet tested on a phone.
- Next: game hooks (per Minecraft version) so modules like HitAnimation change the game.
