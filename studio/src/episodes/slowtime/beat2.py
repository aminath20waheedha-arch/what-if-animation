"""v2 beat for the slow-time Short (trap2 kit): arrangement locked to the edit, ducked under the voice.
python src/episodes/slowtime/beat2.py   (from the studio folder; writes public/slowtime/music.wav)"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); STUDIO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.dirname(HERE))
import trap2 as T
from dsp import SR, ns, hp, st, integrated, read_wav, write_wav, dbg

tl = json.load(open(os.path.join(HERE, "timeline.json")))
FPS = tl["fps"]; DUR = tl["total"] / FPS
S = {s["id"]: s["first"] / FPS for s in tl["shots"]}
song = T.Song(DUR)
song.impact(0.0, 1.0)
song.section(0.0, S["S4"] - T.B, "drums", 0.95)            # the fast-forward demos
song.drop(S["S4"])                                          # the title
song.section(S["S4"], S["S7"] - 0.05, "full", 1.05)        # the fun part
song.section(S["S7"], S["S8"] - 0.05, "tension", 0.85)     # 1905
song.section(S["S8"], S["S9"] - T.B, "drums", 0.95)         # 1971
song.impact(S["S8"] + 281 / FPS, 0.8)                      # "Einstein was right"
song.drop(S["S9"])                                          # GPS: the modern payoff
song.section(S["S9"], S["S11"] - 0.05, "full", 1.0)
song.section(S["S11"], S["S13"] - 0.06, "tension", 0.9)    # the suit, the walk home
song.stop(S["S13"] - 0.05)                                  # the turn: dead stop
song.drop(S["S14"])                                         # cliffhanger
song.section(S["S14"], DUR - 0.6, "dark", 1.0)
song.impact(DUR - 0.6, 1.0)
M = song.render()
words = json.load(open(os.path.join(HERE, "words.json")))
ctrl = 1000; va = np.zeros(int(DUR * ctrl) + 2)
for w in words:
    va[max(0, int((w["s"] - 0.06) * ctrl)): int((w["e"] + 0.12) * ctrl)] = 1
env, e = np.zeros_like(va), 0.0
for i, x in enumerate(va):
    e += (x - e) * (0.25 if x > e else 0.004); env[i] = e
M *= dbg(np.interp(np.arange(M.shape[1]) / SR, np.arange(len(env)) / ctrl, -4.0 * env))[None, :]
v, _ = read_wav(os.path.join(STUDIO, "public", "slowtime", "voice.wav"))
Lv = integrated(st(v.mean(0)))
M *= dbg(Lv - 6.5 - integrated(hp(M, 250, 2)))
M *= min(1.0, 0.98 / np.abs(M).max())
write_wav(os.path.join(STUDIO, "public", "slowtime", "music.wav"), M)
print(f"music v2: {DUR:.1f} s, voice {Lv:.1f}, music {integrated(M):.1f} LUFS (>250 Hz {integrated(hp(M, 250, 2)):.1f})")
