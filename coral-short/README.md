# The Mosque Built From the Sea (coral-short)

A ~54 s vertical "Did you know" short about Hukuru Miskiy, the coral stone Friday mosque in Malé, Maldives (1658).
It uses the style of the [claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) skill: flat 2D
cartoon characters in a painted three.js world with ink outlines, lens blur, gliding cameras and a colour grade,
rendered in Remotion. The story, the characters and the Maldivian set are original. Script and sources are in `SCRIPT.md`.

## Render it on GitHub (no local render needed)
Pushing to anything under `coral-short/` runs **Actions → Render coral mosque short**. You can also run it by hand
with *Run workflow*. Tick *force_tts* to re-voice, and pick another edge-tts voice if you like.
1. **sound**: `voice/tts.py` makes the narration with free Microsoft neural TTS (edge-tts, no key) and its word
   timings. `audio/sound.py` then synthesizes every SFX and an original island score, and mixes them to
   -14 LUFS / -1 dBTP.
2. **picture**: 16 parallel jobs each render one slice of the 1080x1920 / 30 fps composition on CPU WebGL (SwiftShader).
3. **assemble**: joins the slices, muxes the mix, and uploads the **`coral-short-final`** artifact (`coral-short.mp4`
   plus a thumbnail and the cue sheet).

The whole picture is timed to the cue words in `src/coral/words.json`. If the script or voice changes, every shot,
SFX and music hit re-times itself (`src/coral/plan.ts` and `audio/cues.py`).

## Work on it locally
```bash
npm ci
npx remotion studio src/index.ts            # preview
node scripts/stills.mjs out/stills 200,640 0.5   # look-check stills (SwiftShader, like CI)
python voice/tts.py && python audio/sound.py     # needs ffmpeg, numpy, scipy, edge-tts
```

| Path | What |
|---|---|
| `src/coral/plan.ts` | cue words → times (the single timing source) |
| `src/coral/story.ts` | shots, eras of the set, cameras, kicks, depth of field |
| `src/coral/world.ts` | lagoon, island, mosque in its stages, minaret, graves, town, palms, dhonis, reef |
| `src/coral/cast.ts`, `toon.ts` | characters (sarong, kufi, turban, headscarf, mallet, coral block) and effects |
| `src/coral/paint2.ts` | Maldives textures: coral stone, carved frieze, fronds, thatch, lacquer, sea floor |
| `ink.ts`, `lensblur.ts`, `grade.ts`, `shade.ts`, `cardshade.ts`, `paint.ts`, `build.ts` | the look, from the skill's templates |
| `audio/` | DSP kit and generators from the skill, plus `sound.py` (SFX, music, mix) and `cues.py` |
