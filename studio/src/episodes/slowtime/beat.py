"""The slowtime episode's music: a hard trap beat (145 bpm, half-time feel), synthesized with the coral short's DSP kit
and locked to the edit: a cold-open hit, the drop on the title, full energy for the party, a stripped science
section, tension for the suit, a dead stop on the turn (S9, the genre's rule), a dark heavy return for the
cliffhanger, a final hit on the last word. Writes public/shadow/music.wav and sets its volume in timeline.json.

python src/episodes/shadow/beat.py   (from the studio folder)
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(os.path.dirname(STUDIO), "coral-short", "audio"))
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, colored, fades, modal, pan, st, place, widen, make_ir, convolve_st, integrated, read_wav, write_wav, phase, dbg
import sound as K  # kick, clap, hat, bass808, impact, swell, tape_stop

tl = json.load(open(os.path.join(HERE, "timeline.json")))
FPS = tl["fps"]
DUR = tl["total"] / FPS
N = ns(DUR)
S = {s["id"]: s["first"] / FPS for s in tl["shots"]}
END = {s["id"]: (s["first"] + s["len"]) / FPS for s in tl["shots"]}
BPM = 145
B = 60 / BPM
ROOT = 40  # E2: dark trap key, E minor
PROG = [0, 0, 3, -2]  # Em Em G D (as 808 roots)
r = rng(21)


def buf():
    return np.zeros((2, N))


def lead(f, dur, vel=0.6):
    """dark plucked saw lead (the hook)"""
    t = tt(dur)
    y = sum(np.sin(TAU * f * k * t + k) / k for k in range(1, 9)) * np.exp(-t / 0.22)
    return fades(lp(y, 3200) * vel, 0.002, 0.04)


HOOK = [(0, 12), (0.75, 15), (1.5, 19), (2.0, 17), (3.0, 15), (3.5, 12)]  # beats, semitones over ROOT+12


def beat(M, a, b, kind="full", vel=1.0):
    """kinds: full (808, kick, clap on 3, hats 8ths with 16th/triplet rolls, hook), drums, tension (hats + 808), dark"""
    k = 0
    while True:
        tb = a + k * B
        if tb >= b - 0.03:
            break
        bar, bt = divmod(k, 4)
        root = ROOT + PROG[bar % 4]
        if bt == 0:
            dur = min(4 * B, b - tb)
            glide = K.I.m2f(ROOT + PROG[(bar + 1) % 4]) if (bar % 2 and dur > 4 * B - 0.01) else None
            place(M, st(K.bass808(K.I.m2f(root), dur, r, glide, 0.95 * vel)), tb)
        if kind in ("full", "drums", "dark"):
            if bt == 0 or (bt == 2 and bar % 2 == 1) or (bt == 1 and bar % 4 == 3):
                place(M, st(K.kick(1.0 * vel, r)), tb + (B / 2 if bt == 1 else 0))
            if bt == 2:
                place(M, pan(K.clap(1.0 * vel, r), 0.04), tb)
                place(M, pan(K.snare_lofi(0.6 * vel, r), 0.04), tb)
        if kind in ("full", "drums", "tension", "dark"):
            roll = (bar % 2 == 1 and bt == 3)
            steps = [0, 0.25, 0.5, 0.75] if (roll or kind == "tension") else [0, 0.5]
            if roll and kind == "full":
                steps = [i / 6 for i in range(6)]  # triplet 16th roll
            for q in steps:
                place(M, pan(K.hat((0.55 if q else 0.42) * vel, r), 0.3), tb + q * B)
            if kind == "full" and bt == 3 and bar % 4 == 3:
                place(M, pan(K.hat(0.4 * vel, r, open_=True), -0.3), tb + B / 2)
        if kind in ("full", "dark") and bt == 0 and bar % 2 == 0:
            for q, semi in HOOK:
                tn = tb + q * B
                if tn < b - 0.05:
                    place(M, pan(lead(K.I.m2f(ROOT + 12 + semi + (-12 if kind == "dark" else 0)), 0.5, 0.55 * vel), -0.25 + 0.5 * (q > 1.5)), tn)
        k += 1


def main():
    M = buf()
    # cold open: impact on frame 0, drums + 808 under the fast-forward demos
    place(M, K.impact(r, 1.0) * 0.7, 0.0)
    beat(M, 0.0, S["S4"] - 0.05, "drums", 0.95)
    # the title drop, full beat with the hook through the fun part
    K.hit(M, S["S4"], r, 1.1, 1.0)
    beat(M, S["S4"], S["S7"] - 0.05, "full", 1.05)
    # the history: 1905 stripped (hats + 808), the beat builds back for 1971 and hits full on "Einstein was right"
    beat(M, S["S7"], S["S8"] - 0.05, "tension", 0.85)
    K.roll(M, S["S8"] - 1.2, S["S8"] - 0.06, r, 0.2, 0.8)
    beat(M, S["S8"], S["S9"] - 0.05, "drums", 0.95)
    # GPS and the twins: full again (the modern payoff)
    K.hit(M, S["S9"], r, 0.8, 0.8)
    beat(M, S["S9"], S["S11"] - 0.05, "full", 1.0)
    # the suit and the walk home: tension, a roll into the turn
    beat(M, S["S11"], S["S13"] - 0.05, "tension", 0.9)
    K.roll(M, S["S13"] - 1.4, S["S13"] - 0.06, r, 0.2, 0.9)
    # the turn: dead stop when he walks in
    K.tape_stop(M, S["S13"] - 0.05, r, 0.4)
    # the cliffhanger: dark and heavy, final hit on the last word
    K.hit(M, S["S14"], r, 1.2, 0.8)
    beat(M, S["S14"], DUR - 0.6, "dark", 1.0)
    place(M, K.impact(r, 1.0) * 0.6, DUR - 0.6)
    M = M + convolve_st(M, make_ir(1.0, 3, pre=0.01, hf=1.6)) * 0.12
    M = hp(M, 30, 2)
    # level: set against the voice on what phones play (> 250 Hz), loud enough to feel ("fire"), voice still on top
    v, sr = read_wav(os.path.join(STUDIO, "public", "slowtime", "voice.wav"))
    Lv = integrated(st(v.mean(0)))
    M *= dbg(Lv - 7.0 - integrated(hp(M, 250, 2)))
    # duck under the words (-4 dB, fast attack, slow release) so the voice cuts through the 808s
    words = json.load(open(os.path.join(HERE, "words.json")))
    ctrl = 1000
    va = np.zeros(int(DUR * ctrl) + 2)
    for w in words:
        va[max(0, int((w["s"] - 0.06) * ctrl)): int((w["e"] + 0.12) * ctrl)] = 1
    env, e = np.zeros_like(va), 0.0
    for i, x in enumerate(va):
        e += (x - e) * (0.25 if x > e else 0.004)
        env[i] = e
    M *= dbg(np.interp(np.arange(N) / SR, np.arange(len(env)) / ctrl, -4.0 * env))[None, :]
    peak = np.abs(M).max()
    if peak > 0.98:
        M *= 0.98 / peak
    write_wav(os.path.join(STUDIO, "public", "slowtime", "music.wav"), M)
    tl["audio"]["music"] = "slowtime/music.wav"
    tl["audio"]["musicVol"] = round(float(tl["audio"]["voiceVol"]), 4)  # same gain as the voice: the level is in the file
    json.dump(tl, open(os.path.join(HERE, "timeline.json"), "w"), indent=1)
    print(f"music.wav {DUR:.1f} s, voice {Lv:.1f} LUFS, music {integrated(M):.1f} LUFS (>250 Hz {integrated(hp(M, 250, 2)):.1f})")


if __name__ == "__main__":
    main()
