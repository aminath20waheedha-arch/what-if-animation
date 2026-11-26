# mc-client

Our own Minecraft Bedrock mod client for Android (no root). Written from scratch.

## Layout
- `core/` – Setting, Module, Registry (config save/load). No game dependency.
- `modules/` – features. `hit_animation.h` is the first one.
- `tests/` – run on any PC: `cmake -S . -B build && cmake --build build && build/test_core`
- (next) `android/` – app + loader that injects our native lib into a patched APK.
- (next) `hooks/` – per-Minecraft-version function hooks (needs your game version).

## Add a feature
Subclass `Module`, declare settings in the constructor with `add(Setting::...)`,
override `onTick`/`onHit`, then `registry.add<YourModule>()`. The menu is generated
from the settings list, so every setting is adjustable automatically.

## Status
Core + hit animation math done and tested. Game hooks and the in-game menu are not built yet.
