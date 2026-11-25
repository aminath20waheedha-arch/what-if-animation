"""Soundtrack of the coral mosque short, all synthesized here (numpy/scipy, the skill's DSP kit), timed to the picture:
  * SFX: underwater beds, the surface burst, lagoon waves, breeze and birds, palm rustle, a comic slide whistle,
    chisel strikes under water, footsteps on sand, mallet-on-chisel carving with coral chips, a drying time-lapse riser,
    the apprentice's CLANG + boing + dizzy birdies + the master's laugh, blocks thumping into the wall, glint chimes,
    city ambience, whooshes on camera moves, a pop and a ding on the call to action.
  * Music: a dark cinematic trap bed in F minor (96 bpm half-time: saturated 808 with slides, dark pads, claps, hat
    rolls) with impacts + swells on the reveals, breakdowns on the comic beats (tape stop), an underwater filter on the
    reef, downbeats re-locked to each cut, and a final impact on the last word.
  * Mix: voice untouched, music ducked under speech and sitting ~8 LU under the voice (measured above 250 Hz, i.e. on a phone speaker), SFX ~9 LU under, master to
    -14 LUFS integrated with a 4x-oversampled look-ahead limiter at -1 dBTP; exact picture length, 48 kHz stereo.
Writes audio/out/mix.wav (+ stems) and audio/out/cues.md.
"""
import os
import sys
import numpy as np
from scipy import ndimage, signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, reson, colored, smooth_noise, fades, modal, pan, st, place, widen,
                 make_ir, convolve_st, integrated, momentary, true_peak, read_wav, write_wav, phase)
import instruments as I
import sfx_gen as G
import cues as Q

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
N = ns(Q.DUR)
C = Q.CUE
TARGET = -14.0
CEIL = -1.0


def log(*a):
    print("[sound]", *a, flush=True)


def buf():
    return np.zeros((2, N))


def seg_env(a, b, fin=0.25, fout=0.35):
    """gain curve (N,) that is 1 between a and b (s) with cosine fades"""
    t = np.arange(N) / SR
    e = np.clip((t - a) / max(fin, 1e-3), 0, 1) * np.clip((b - t) / max(fout, 1e-3), 0, 1)
    return 0.5 - 0.5 * np.cos(np.pi * e)


# ====================================================================== SFX
def underwater(dur, r):
    """muffled underwater room: deep rumble, slow swells, distant bubble plinks"""
    n = ns(dur)
    t = np.arange(n) / SR
    rum = lp(colored(n, r, 1.6), 260, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.25))
    swell = lp(colored(n, r, 1.0), 700, 2) * (0.5 + 0.5 * np.sin(TAU * 0.13 * t + 1.0)) * 0.35
    plinks = G.bubbles(dur, r, 2.2, 400, 1600) * 0.35
    y = rum * 0.9 + swell + lp(plinks, 1800)
    return widen(y / (np.abs(y).max() + 1e-9), r, 13, 0.8)


def waves(dur, r, close=1.0):
    """lagoon waves breaking softly on sand: wash in, foam hiss out, every ~4 s"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    k = r.uniform(0, 2)
    while k < dur:
        L = r.uniform(3.2, 4.8)
        a, b = ns(k), min(n, ns(k + L))
        u = np.arange(b - a) / SR / L
        env = np.sin(np.pi * np.clip(u * 1.6, 0, 1)) ** 2 * (u < 0.62) + (u >= 0.62) * np.exp(-(u - 0.62) * 7) * 0.7
        nz = colored(b - a, r, 0.9)
        y[a:b] += bp(nz, 250, 2200 + 2500 * close, 1) * env * r.uniform(0.6, 1.0)
        y[a:b] += hp(nz, 3500) * env * (u > 0.5) * 0.35 * close
        k += L * r.uniform(0.8, 1.05)
    y += lp(colored(n, r, 1.4), 300) * 0.25
    return widen(y / (np.abs(y).max() + 1e-9), r, 17, 0.9)


def slide_whistle(r, f0=1300, f1=380, dur=0.7):
    t = tt(dur)
    f = f0 * (f1 / f0) ** (t / dur) * (1 + 0.012 * np.sin(TAU * 6 * t))
    y = np.sin(phase(f)) + 0.12 * np.sin(2 * phase(f)) + 0.03 * r.standard_normal(len(t))
    return fades(y * np.minimum(1, t / 0.03) * (1 - 0.35 * t / dur), 0.005, 0.08)


def boing(r, f0=95, dur=0.9):
    t = tt(dur)
    f = f0 * (1 + 0.9 * np.exp(-t / 0.12)) * (1 + 0.05 * np.sin(TAU * 13 * t) * np.exp(-t / 0.4))
    y = np.sin(phase(f)) * np.exp(-t / 0.35) + 0.3 * np.sin(2.01 * phase(f)) * np.exp(-t / 0.2)
    return fades(y, 0.002, 0.1)


def clang(r):
    """mallet bounces off bone-dry coral stone: hard 'tock' + ringing iron chisel"""
    d = 1.6
    t = tt(d)
    tock = bp(r.standard_normal(len(t)), 600, 5000, 2) * np.exp(-t / 0.012) * 1.2
    ring = modal(d, [(1480, 1.0, 0.5), (1480 * 2.72, 0.6, 0.3), (1480 * 4.1, 0.35, 0.18), (1480 * 5.9, 0.2, 0.1)], r) * 0.55
    body = modal(d, [(210, 1.0, 0.09), (390, 0.6, 0.06)], r) * 0.6
    return fades(tock + ring + body, 0.0005, 0.2)


def chisel_strike(r, soft=True, under=False):
    """wooden mallet on an iron chisel into coral: knock + short iron ring + crumbly bite (+ chips)"""
    d = 0.6
    t = tt(d)
    knock = modal(d, [(r.uniform(170, 220), 1.0, 0.05), (r.uniform(420, 520), 0.5, 0.03)], r)
    ring = modal(d, [(r.uniform(2100, 2600), 0.35, 0.07), (r.uniform(4800, 5600), 0.15, 0.03)], r)
    bite = bp(r.standard_normal(len(t)), 1200, 6000, 1) * np.exp(-t / (0.03 if soft else 0.01)) * (0.9 if soft else 0.5)
    y = knock + ring * (0.6 if soft else 1.0) + bite
    chips = np.zeros(len(t))
    for _ in range(r.integers(3, 7)):
        k = ns(r.uniform(0.02, 0.25))
        c = G.clink(r, r.uniform(2500, 6000), 0.04, 0.6)
        if k + len(c) < len(t):
            chips[k:k + len(c)] += c * r.uniform(0.15, 0.35)
    y = y + chips
    if under:
        y = lp(y, 900, 2) * 1.6
    return fades(y, 0.0005, 0.05)


def thud(r, big=1.0):
    """a coral block dropping into its slot: heavy stone thump + grit"""
    d = 0.9
    t = tt(d)
    y = modal(d, [(58, 1.0, 0.16), (92, 0.6, 0.1), (160, 0.35, 0.06)], r, glide=0.18, glide_tau=0.02)
    y += lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.03) * 0.6
    y += bp(r.standard_normal(len(t)), 1500, 6000, 1) * np.exp(-t / 0.08) * 0.12 * (t > 0.01)
    return fades(y * big, 0.0005, 0.1)


def laugh(r, base=125, n=5):
    """the master's warm 'ha-ha-ha' (formant vowel 'a', falling pitch per syllable)"""
    out = []
    for k in range(n):
        d = 0.16
        m = ns(d)
        f0 = np.full(m, base * (1.25 - 0.06 * k)) * (1 - 0.15 * np.linspace(0, 1, m))
        forms = np.tile([[750, 1200, 2500, 3500]], (m, 1)).astype(float)
        env = np.sin(np.pi * np.linspace(0, 1, m)) ** 0.7
        y = G.vox(f0, forms, env, r, scale=1.0)
        out.append(y)
        out.append(hp(r.standard_normal(ns(0.06)), 1500) * 0.03)
    y = np.concatenate(out)
    return y / (np.abs(y).max() + 1e-9)


def chirp_loop(dur, r):
    """cartoon dizzy birdies: high fast tweets circling"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    k = 0.0
    while k < dur - 0.12:
        a = ns(k)
        m = ns(0.09)
        u = np.arange(m) / SR
        f = r.uniform(2600, 3400) * (1 + 0.35 * np.sin(TAU * 18 * u))
        y[a:a + m] += np.sin(phase(f)) * np.sin(np.pi * u / 0.09)
        k += r.uniform(0.11, 0.2)
    return y * 0.5 * (0.6 + 0.4 * np.sin(TAU * 1.1 * t))


def pop(r):
    t = tt(0.25)
    f = 900 * (1 + 1.5 * np.exp(-t / 0.01))
    return fades(np.sin(phase(f)) * np.exp(-t / 0.04) + bp(r.standard_normal(len(t)), 2000, 8000, 1) * np.exp(-t / 0.006) * 0.4, 0.0005, 0.05)


def chime(r, notes=(88, 93, 96), gap=0.07, vel=0.6):
    d = 2.2 + gap * len(notes)
    y = np.zeros(ns(d))
    for i, m in enumerate(notes):
        g = I.glock(I.m2f(m), vel, r, 2.0)
        k = ns(i * gap)
        y[k:k + len(g)] += g
    return y


def riser(dur, r, f0=300, f1=4000):
    n = ns(dur)
    t = np.arange(n) / SR
    nz = colored(n, r, 0.5)
    out = np.zeros(n)
    # sweep a band-pass through blocks (cheap time-varying filter)
    B = 32
    for i in range(B):
        a, b = i * n // B, (i + 1) * n // B
        fc = f0 * (f1 / f0) ** (i / B)
        out[a:b] = bp(nz, fc * 0.7, min(fc * 1.4, 20000), 1)[a:b]
    return out * (t / dur) ** 1.6


def city(dur, r):
    """today's Malé: distant traffic hum, scooters passing, voices, waves"""
    n = ns(dur)
    t = np.arange(n) / SR
    hum = lp(colored(n, r, 1.2), 400) * 0.6
    sc = np.zeros(n)
    k = r.uniform(0.3, 1.5)
    while k < dur:
        L = r.uniform(1.8, 3.0)
        a, b = ns(k), min(n, ns(k + L))
        u = np.arange(b - a) / SR
        f = r.uniform(85, 120) * (1 + 0.08 * np.tanh((u - L / 2) * 2))
        eng = (np.sin(phase(f)) + 0.5 * np.sin(2 * phase(f)) + 0.3 * np.sign(np.sin(phase(f * 0.5)))) * np.exp(-((u - L / 2) / (L / 3)) ** 2)
        sc[a:b] += lp(eng, 1400) * r.uniform(0.15, 0.3)
        k += r.uniform(1.5, 3.5)
    voices = sum(G.babble(dur, r, r.uniform(100, 220), r.uniform(0.9, 1.15), active=0.5) for _ in range(4)) * 0.18
    y = hum + sc + voices
    return widen(y / (np.abs(y).max() + 1e-9), r, 15, 0.9)


def demon_rumble(dur, r):
    """the demon: a huge low groan, creaking timbers and sea surge"""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 38 + 6 * np.sin(TAU * 0.13 * t)
    groan = np.tanh(1.8 * np.sin(phase(f))) * (0.6 + 0.4 * smooth_noise(n, r, 0.6))
    surge = lp(colored(n, r, 1.2), 500) * (0.5 + 0.5 * np.sin(TAU * 0.25 * t) ** 2)
    creak = G.creak(min(dur, 2.0), r) if hasattr(G, "creak") else np.zeros(ns(2.0))
    y = groan * 0.8 + surge * 0.7
    y[: len(creak)] += creak[: n] * 0.25 if len(creak) <= n else creak[:n] * 0.25
    return widen(y / (np.abs(y).max() + 1e-9), r, 15, 0.9)


def glow_tone(dur, r):
    """the recitation's light: a warm rising shimmer (no voice), it swells on 'louder'"""
    n = ns(dur)
    t = np.arange(n) / SR
    y = sum(np.sin(TAU * f * t + r.uniform(0, 6)) * a for f, a in ((220, 0.5), (330, 0.35), (440, 0.25), (660, 0.12)))
    y *= (0.3 + 0.7 * np.clip(t / dur, 0, 1)) * (0.85 + 0.15 * np.sin(TAU * 4.5 * t))
    return widen(lp(y, 2500), r, 12, 0.8)


def build_sfx():
    r = rng(7)
    S = buf()
    sh = Q.shot_t
    for i, (a, b, light) in Q.SHOTS.items():
        a, b = a / 30, b / 30
        d = b - a + 0.6
        if light == "night":
            place(S, waves(d, r, 0.7) * 0.5, a - 0.3)
            place(S, pan(G.crickets(d, r), 0.2) * 0.25, a - 0.3)
            place(S, G.breeze(d, r, 0.6, 0.3, 700) * 0.4, a - 0.3)
        elif light == "golden" and i != 13:
            place(S, waves(d, r, 0.6) * 0.45, a - 0.3)
            place(S, pan(G.bird_chirps(d, r, 0.6), -0.3) * 0.35, a - 0.3)
        else:
            place(S, waves(d, r, 0.8) * 0.45, a - 0.3)
            place(S, pan(G.bird_chirps(d, r, 0.35), 0.3) * 0.3, a - 0.3)
    a, b = sh(13)
    place(S, city(b - a + 0.8, r) * 0.55, a - 0.3)
    # the ship of lights rises: rumble from the first word, a swell on "glowing"
    place(S, demon_rumble(sh(2)[1] + 1.0, r) * 0.45, 0.0)
    place(S, widen(riser(1.2, r, 200, 3000), r) * 0.35, C["glowing"] - 0.6)
    # islanders murmur, a gasp on "sacrifice"
    a, b = sh(3)
    place(S, widen(sum(G.babble(b - a + 0.4, r, r.uniform(110, 200), r.uniform(0.95, 1.1), active=0.5) for _ in range(4)), r) * 0.14, a)
    place(S, G.oof(r, "oh") * 0.25, C["sacrifice"] + 0.25)
    # footsteps on sand to the temple, a door creak; "gone": a cold wind gust
    for k in range(5):
        place(S, lp(G.stroll_step(r, 0.9), 2200) * 0.25, C["girl"] + 0.3 + k * 0.55)
    place(S, G.breeze(1.6, r, 1.2, 0.6, 1800) * 0.6, C["gone"] - 0.2)
    # the traveller arrives by dhoni: hull on sand, gulls
    place(S, thud(r, 0.6) * 0.4, C["then"] + 0.2)
    # the family crying (soft sobs: breathy falling vowels)
    for k in range(3):
        place(S, pan(G.oof(r, "oh") * 0.18, -0.3), C["crying"] + 0.3 + k * 0.7)
    # he takes her place: steps, door
    for k in range(3):
        place(S, lp(G.stroll_step(r, 0.9), 2200) * 0.25, C["place"] + 0.2 + k * 0.45)
    # the recitation's glow, swelling on "louder"
    a, b = sh(9)
    place(S, glow_tone(sh(11)[1] - a, r) * 0.35, a)
    # the demon comes: rumble growing, then the hard stop (impact + silence) on "stopped"
    a, b = sh(10)
    place(S, demon_rumble(C["stopped"] - a + 0.1, r) * np.linspace(0.4, 1.0, ns(C["stopped"] - a + 0.1))[None, :] * 0.8, a)
    place(S, impact(r, 1.0) * 0.6, C["stopped"])
    # it turns and sinks: a long surge and a big splash
    place(S, demon_rumble(1.8, r) * np.linspace(1, 0, ns(1.8))[None, :] * 0.6, C["turned"])
    place(S, widen(G.splash_big(r), r) * 0.6, C["sank"])
    # the island cheers
    a, b = sh(12)
    for k in range(10):
        place(S, pan(G.hurrah(r, r.uniform(110, 230), r.uniform(0.95, 1.12)), r.uniform(-0.7, 0.7)) * 0.2, C["islam"] - 0.3 + r.uniform(0, 0.8))
    place(S, widen(G.applause(2.4, r, 24), r) * 0.25 if np.ndim(G.applause(0.1, r, 2)) == 1 else G.applause(2.4, r, 24) * 0.25, C["islam"] + 0.2)
    # the question: a ding on "comments"
    place(S, chime(r, (86, 93, 98), 0.08, 0.55) * 0.4, C["comments"] + 0.45)
    for tc in Q.CUTS:
        place(S, widen(G.whoosh(0.5, r, peak=0.55, f_lo=500, f_hi=2600), r) * 0.16, tc - 0.3)
    return S


# ====================================================================== MUSIC
BPM = 104
BEAT = 60 / BPM
ROOT = 50  # D3


def marimba(f, vel=0.7, r=None, dur=0.9):
    r = r or rng(0)
    t = tt(dur)
    y = modal(dur, [(f, 1.0, 0.45 * (220 / f) ** 0.3), (f * 3.93, 0.22 * vel, 0.06), (f * 9.2, 0.05 * vel, 0.015)], r)
    y += lp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * 0.12 * vel
    return fades(y * vel, 0.0005, 0.04)


def dum(vel=0.9, r=None):
    """bodu beru open bass stroke"""
    r = r or rng(0)
    d = 0.8
    t = tt(d)
    y = modal(d, [(68, 1.0, 0.28), (68 * 1.6, 0.35, 0.12), (68 * 2.3, 0.15, 0.07)], r, glide=0.22, glide_tau=0.03)
    y += lp(r.standard_normal(len(t)), 500) * np.exp(-t / 0.012) * 0.5
    return fades(y * vel, 0.0005, 0.08)


def tak(vel=0.7, r=None):
    """bodu beru rim / slap stroke"""
    r = r or rng(0)
    d = 0.25
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 900, 5000, 2) * np.exp(-t / 0.018) + modal(d, [(330, 0.8, 0.05), (520, 0.4, 0.03)], r)
    return fades(y * vel, 0.0003, 0.04)


def shaker(vel=0.4, r=None):
    r = r or rng(0)
    d = 0.12
    t = tt(d)
    y = bp(r.standard_normal(len(t)), 4000, 12000, 2) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return y * vel


# chord loop (4 bars): D - G - Bm - A ; riff degrees in semitones over the chord root
CHORDS = [0, 5, -3, 7]
TRIADS = {0: [0, 4, 7], 5: [0, 4, 7], -3: [0, 3, 7], 7: [0, 4, 7]}
RIFF = [(0, 12), (0.75, 16), (1.5, 19), (2.0, 16), (2.5, 12), (3.0, 14), (3.5, 16)]  # (beat, semitone over chord root, +D4)


def groove(M, a, b, r, layers, vel=1.0, beat0=None):
    """lay the groove between a and b (s); layers: set of 'drums', 'shaker', 'bass', 'riff', 'pad', 'arp'"""
    b0 = beat0 if beat0 is not None else a
    k0 = int(np.ceil((a - b0) / BEAT - 1e-6))
    k = k0
    while True:
        tb = b0 + k * BEAT
        if tb >= b - 0.02:
            break
        bar, bt = divmod(k, 4)
        ch = CHORDS[bar % 4]
        rootm = ROOT + ch
        if "drums" in layers:
            if bt in (0, 2):
                place(M, pan(dum(0.9 * vel, r), -0.1), tb)
            if bt == 3:
                place(M, pan(dum(0.55 * vel, r), -0.1), tb + BEAT / 2)
            for off in (0.5, 1.5) if bt in (1, 3) else (0.5,):
                place(M, pan(tak(0.55 * vel, r), 0.25), tb + off * BEAT / 1.0 - (0.5 * BEAT if off == 1.5 else 0) + (BEAT if off == 1.5 else 0) * 0)
            if bt in (1, 3):
                place(M, pan(tak(0.75 * vel, r), 0.25), tb)
        if "shaker" in layers:
            for q in range(4):
                place(M, pan(shaker((0.5 if q % 2 else 0.3) * vel, r), 0.45), tb + q * BEAT / 4)
        if "bass" in layers and bt in (0, 2, 3):
            off = 0 if bt != 3 else 0.5
            place(M, pan(I.pluck(I.m2f(rootm - 12 + (7 if bt == 2 else 0)), 0.8 * vel, r, 0.7, 0.3), 0) * 1.2, tb + off * BEAT)
        if "riff" in layers and bt == 0:
            for rb, semi in RIFF:
                tn = tb + rb * BEAT
                if tn < b - 0.05:
                    place(M, pan(marimba(I.m2f(rootm + semi), 0.6 * vel, r), 0.3), tn)
        if "arp" in layers:
            for q in range(2):
                tri_ = TRIADS[ch]
                place(M, pan(marimba(I.m2f(rootm + 12 + tri_[(bt * 2 + q) % 3]), 0.4 * vel, r, 0.6), -0.35), tb + q * BEAT / 2)
        if "pad" in layers and bt == 0:
            fr_ = [I.m2f(rootm + x) for x in (TRIADS[ch][0], TRIADS[ch][1] + 12, TRIADS[ch][2])]
            dur_ = min(4 * BEAT, b - tb)
            if dur_ > 0.3:
                place(M, I.pad(fr_, dur_, 0.35 * vel, r, att=0.4, rel=0.6, warm=1100) * 0.5, tb)
        k += 1


def stinger(M, t, r, notes=(50, 45), gap=0.22, vel=0.8):
    for i, m in enumerate(notes):
        place(M, marimba(I.m2f(m), vel, r, 1.0) + 0 * 1, t + i * gap)
        place(M, st(dum(0.6, r)), t + i * gap)


# ---- lo-fi kit ----
def kick(vel=1.0, r=None):
    r = r or rng(0)
    d = 0.5
    t = tt(d)
    f = 48 + 110 * np.exp(-t / 0.035)
    y = np.sin(phase(f)) * np.exp(-t / 0.22) + 1.1 * bp(r.standard_normal(len(t)), 1500, 5000, 1) * np.exp(-t / 0.006)
    return fades(np.tanh(1.6 * y) * vel, 0.0003, 0.05)


def snare_lofi(vel=0.8, r=None):
    r = r or rng(0)
    d = 0.3
    t = tt(d)
    body = modal(d, [(190, 1.0, 0.06), (330, 0.5, 0.04)], r)
    nz = bp(r.standard_normal(len(t)), 1500, 9000, 2) * np.exp(-t / 0.07)
    clap = sum(bp(r.standard_normal(len(t)), 900, 4000, 2) * np.exp(-np.maximum(t - k * 0.009, 0) / 0.012) * (t >= k * 0.009) for k in range(3)) * 0.5
    return fades(lp(body * 0.7 + nz + clap, 7000) * vel, 0.0003, 0.05)


def hat(vel=0.4, r=None, open_=False):
    r = r or rng(0)
    d = 0.25 if open_ else 0.06
    t = tt(d)
    y = hp(r.standard_normal(len(t)), 7000, 2) * np.exp(-t / (0.08 if open_ else 0.015))
    return y * vel


def sub(f, dur, vel=0.8):
    t = tt(dur)
    y = np.sin(TAU * f * t) + 0.15 * np.sin(2 * TAU * f * t)
    return fades(y * vel * np.minimum(1, t / 0.01) * np.exp(-t / (dur * 1.5)), 0.003, 0.06)


def crackle(dur, r):
    n = ns(dur)
    y = np.zeros(n)
    idx = r.integers(0, n, int(dur * 40))
    y[idx] = r.uniform(-1, 1, len(idx))
    return lp(hp(y, 1500), 9000) * 0.25 + lp(colored(n, r, 1.0), 400) * 0.02


LBPM = 92
LB = 60 / LBPM


def beat(M, a, b, r, beat0=None, kind="full", vel=1.0):
    """lo-fi hip-hop beat between a and b; downbeat locked to beat0 (default a = the cut)"""
    b0 = a if beat0 is None else beat0
    k = int(np.ceil((a - b0) / LB - 1e-6))
    while True:
        tb = b0 + k * LB
        if tb >= b - 0.03:
            break
        bar, bt = divmod(k, 4)
        ch = CHORDS[bar % 4]
        sw = 0.11 * LB  # swing on the off-beat 8th
        if kind in ("full", "half", "under"):
            if bt == 0 or (kind == "full" and bt == 2 and bar % 2 == 0) or (kind != "half" and bt == 2 and bar % 2):
                place(M, st(kick(0.95 * vel, r)), tb)
            if kind == "full" and bt == 1 and bar % 2 == 1:
                place(M, st(kick(0.6 * vel, r)), tb + LB / 2 + sw)
            if (kind != "half" and bt in (1, 3)) or (kind == "half" and bt == 2):
                place(M, pan(snare_lofi(0.95 * vel, r), 0.05), tb)
            for q in range(2):
                tq = tb + q * LB / 2 + (sw if q else 0)
                if tq < b:
                    place(M, pan(hat((0.55 if q else 0.4) * vel, r, open_=(kind == "full" and bt == 3 and q == 1)), 0.35), tq)
        if kind in ("full", "half", "under", "light") and bt == 0:
            place(M, st(sub(I.m2f(ROOT - 12 + ch), min(4 * LB, b - tb), 0.7 * vel)), tb)
            fr_ = [I.m2f(ROOT + 12 + ch + x) for x in (TRIADS[ch][1], TRIADS[ch][2], 11 if TRIADS[ch][1] == 4 else 10)]
            dur_ = min(4 * LB, b - tb)
            if dur_ > 0.3:
                place(M, lp(I.pad(fr_, dur_, 0.3 * vel, r, att=0.25, rel=0.5, warm=1500), 2500) * 0.45, tb)
        if kind in ("full", "light") and bt in (0, 2):
            for q, semi in enumerate((12, 16) if bt == 0 else (19, 14)):
                tn = tb + q * LB * 0.75
                if tn < b - 0.05:
                    place(M, pan(marimba(I.m2f(ROOT + 12 + ch + semi), 0.6 * vel, r, 0.8), -0.3 + 0.6 * q), tn)
        k += 1


def roll(M, a, b, r, v0=0.25, v1=0.8):
    n = int((b - a) / (LB / 4))
    for i in range(n):
        u = i / max(1, n - 1)
        place(M, pan(snare_lofi(v0 + (v1 - v0) * u, r), 0.05), a + i * (LB / 4) * (1 - 0.35 * u))


def tape_stop(M, t, r, dur=0.45):
    """the beat slows to a halt (pitch-dropping thud + noise) on a comic stop"""
    tt_ = tt(dur)
    f = 90 * (1 - tt_ / dur) ** 2 + 20
    y = np.sin(phase(f)) * (1 - tt_ / dur) + lp(r.standard_normal(len(tt_)), 600) * 0.2 * (1 - tt_ / dur)
    place(M, st(fades(y, 0.002, 0.05)) * 0.6, t)


# ---- cinematic trap kit (the "What if" explainer bed: 808, dark pads, half-time claps, hat rolls, impacts) ----
TBPM = 96
TB = 60 / TBPM
FROOT = 41  # F2
# F minor: i - VI - III - VII  (Fm - Db - Ab - Eb), as (root offset from F, minor?)
TCH = [(0, True), (-4, False), (3, False), (-2, False)]


def bass808(f0, dur, r, glide_to=None, vel=1.0):
    """808: sine with a pitch-drop attack, optional slide into the next note, saturated so phones hear its harmonics"""
    t = tt(dur)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.02))
    if glide_to:
        k = np.clip((t - (dur - 0.12)) / 0.12, 0, 1)
        f = f * (glide_to / f0) ** (k * k)
    y = np.sin(phase(f)) * np.exp(-t / max(0.6, dur))
    y = np.tanh(2.4 * y) / np.tanh(2.4)
    return fades(y * vel, 0.002, 0.06)


def clap(vel=0.8, r=None):
    r = r or rng(0)
    t = tt(0.4)
    y = sum(bp(r.standard_normal(len(t)), 900, 6000, 2) * np.exp(-np.maximum(t - k * 0.011, 0) / (0.012 if k < 3 else 0.09)) * (t >= k * 0.011) for k in range(4))
    return fades(y * vel * 0.6, 0.0003, 0.05)


def dark_pad(root_m, minor, dur, r, vel=0.5):
    third = 3 if minor else 4
    fr_ = [I.m2f(root_m + x) for x in (0, 7, 12 + third, 19, 24 + (10 if minor else 11))]
    y = I.pad(fr_, dur, 0.4 * vel, r, att=0.5, rel=0.8, warm=1300, detune=9)
    return lp(y, 3200)


def impact(r, size=1.0):
    """cinematic boom: sub drop + noise crack + long dark tail"""
    t = tt(3.0)
    boom = np.sin(phase(70 * (1 + 1.2 * np.exp(-t / 0.05)))) * np.exp(-t / 0.7)
    crack = bp(r.standard_normal(len(t)), 200, 5000, 1) * np.exp(-t / 0.05)
    y = np.tanh(1.5 * (boom + 0.5 * crack))
    tail = convolve_st(y * 0.6, make_ir(2.5, 5, pre=0.02, hf=2.0))
    return (st(y) + tail * 0.5) * size


def swell(dur, r):
    """reverse-cymbal style swell that lands on the impact"""
    n = ns(dur)
    u = np.arange(n) / n
    y = hp(colored(n, r, 0.3), 2500) * u ** 3
    return widen(y, r, 9, 0.9)


def trap(M, a, b, r, kind="full", vel=1.0, beat0=None):
    """half-time trap groove (downbeat locked to beat0 / the cut): 808 + kick on 1, clap on 3, 8th hats with a triplet
    roll into each 2nd bar; kind: full | hats (no clap) | pad (pads + 808 only) | under (filtered later)"""
    b0 = a if beat0 is None else beat0
    k = int(np.ceil((a - b0) / TB - 1e-6))
    while True:
        tb = b0 + k * TB
        if tb >= b - 0.03:
            break
        bar, bt = divmod(k, 4)
        rt, mn = TCH[bar % 4]
        if bt == 0:
            dur = min(4 * TB, b - tb)
            nxt = TCH[(bar + 1) % 4][0]
            place(M, st(bass808(I.m2f(FROOT + rt), dur, r, I.m2f(FROOT + nxt) if dur >= 4 * TB - 0.01 and bar % 2 else None, 0.85 * vel)), tb)
            if dur > 0.4:
                place(M, dark_pad(FROOT + 12 + rt, mn, dur, r, vel), tb)
            if kind != "pad":
                place(M, st(kick(0.9 * vel, r)), tb)
        if kind in ("full", "under") and bt == 2:
            place(M, pan(clap(0.9 * vel, r), 0.05), tb)
        if kind in ("full", "hats", "under"):
            roll_ = bar % 2 == 1 and bt == 3
            steps = [0, 1 / 3, 2 / 3] if roll_ else [0, 0.5]
            for q in steps:
                tq = tb + q * TB
                if tq < b:
                    place(M, pan(hat((0.5 if q else 0.38) * vel, r), 0.3), tq)
        if kind == "full" and bt == 1 and bar % 2 == 0:
            place(M, st(kick(0.55 * vel, r)), tb + TB * 0.75)
        k += 1


def bell_line(M, a, notes, r, step=TB, vel=0.45):
    for i, m in enumerate(notes):
        place(M, pan(I.glock(I.m2f(m), vel, r, 1.6), 0.25 * (-1) ** i) * 0.6, a + i * step)


def hit(M, t, r, size=1.0, lead=1.2):
    place(M, impact(r, size) * 0.6, t)
    place(M, swell(lead, r) * 0.35, t - lead)


def build_music():
    r = rng(11)
    M = buf()
    sh = Q.shot_t
    # cold open: impact on frame 0, dark pads + 808 only while the lights rise, hats creep in on "glowing"
    place(M, impact(r, 1.0) * 0.7, 0.0)
    trap(M, 0.0, C["glowing"] - 0.05, r, kind="pad", beat0=0.0, vel=0.85)
    trap(M, C["glowing"] - 0.03, C["called"] - 0.05, r, kind="hats", beat0=C["glowing"] - 0.03, vel=0.9)
    hit(M, C["called"], r, 0.8, 0.9)
    trap(M, C["called"] - 0.02, C["morning"] - 0.08, r, kind="full", beat0=C["called"] - 0.02)
    # "gone": dead stop, then a fragile bell line over the empty temple at dawn
    tape_stop(M, C["morning"] - 0.08, r, 0.35)
    bell_line(M, C["morning"] + 0.3, [72, 75, 79, 77, 75], r, TB * 0.75, 0.35)
    # the traveller: a hopeful lift (pads + light hats), the family's sorrow (pads only)
    hit(M, C["then"], r, 0.6, 0.8)
    trap(M, C["then"] - 0.02, C["crying"] - 0.05, r, kind="hats", beat0=C["then"] - 0.02, vel=0.85)
    trap(M, C["crying"] - 0.02, C["night"] - 0.05, r, kind="pad", beat0=C["crying"] - 0.02, vel=0.75)
    # the night of recitation: tension builds, full beat as the demon comes, everything cuts on "stopped"
    trap(M, C["night"] - 0.02, C["rose"] - 0.05, r, kind="hats", beat0=C["night"] - 0.02, vel=0.9)
    place(M, swell(C["rose"] - C["louder"] + 0.2, r) * 0.35, C["louder"] - 0.2)
    trap(M, C["rose"] - 0.02, C["stopped"] - 0.05, r, kind="full", beat0=C["rose"] - 0.02, vel=1.05)
    hit(M, C["stopped"], r, 1.1, 0.4)
    # it sinks: pads only, then the triumphant drop on the king
    trap(M, C["turned"] - 0.02, C["king"] - 0.05, r, kind="pad", beat0=C["turned"] - 0.02, vel=0.8)
    hit(M, C["king"], r, 0.9, 1.0)
    trap(M, C["king"] - 0.02, C["cta"] - 0.08, r, kind="full", beat0=C["king"] - 0.02)
    # the question: hats + pads, final impact on the last word
    trap(M, C["cta"] - 0.05, C["comments"] - 0.05, r, kind="hats", beat0=C["cta"] - 0.05, vel=0.85)
    hit(M, C["comments"], r, 1.0, 1.0)
    ir = make_ir(1.4, 3, pre=0.012, hf=1.6)
    M = M + convolve_st(M, ir) * 0.16
    return M


# ====================================================================== MIX
def duck_curve(depth_db=-4.0, pre=0.08, post=0.15, att=0.06, rel=0.4):
    ctrl = 1000
    nc = int(Q.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in Q.speech_spans():
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        e += (va[i] - e) * (ka if va[i] > e else kr)
        env[i] = e
    return dbg(np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth_db * env))


def limiter(x, ceil_db=CEIL, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    # release: grow back toward 1 at most by the one-pole rate (vectorised via a running max over a decaying kernel)
    g2 = g1.copy()
    kr = 1 - np.exp(-1 / (rel * SR))
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3


def main():
    os.makedirs(OUT, exist_ok=True)
    x, sr = read_wav(os.path.join(Q.ROOT, "voice", "voice.wav"))
    assert sr == SR, sr
    v1 = x.mean(0)
    V = np.zeros(N)
    V[: min(N, len(v1))] = v1[:N]
    V = st(V)
    Lv = integrated(V)
    log(f"voice {Lv:.1f} LUFS, {Q.DUR:.2f} s, {Q.TOTAL} frames")
    log("sfx ...")
    S = build_sfx()
    log("music ...")
    M = build_music()
    # levels relative to the voice (integrated), music ducked under speech
    # level set on what a phone speaker plays (> 250 Hz), so the beat is audible on phones, not only on headphones
    M = hp(M, 32, 2)
    M *= dbg(Lv - 10.0 - integrated(hp(M, 250, 2)))
    M *= duck_curve(-3.0)[None, :]
    S *= dbg(Lv - 9.5 - integrated(S))
    mix = V + M + S
    g = dbg(TARGET - integrated(mix))
    mix, V, M, S = mix * g, V * g, M * g, S * g
    out, gr = limiter(mix)
    out = fades(out, 0.002, 0.05) if out.ndim == 1 else np.stack([fades(c, 0.002, 0.05) for c in out])
    Li, tp = integrated(out), true_peak(out)
    log(f"mix {Li:.1f} LUFS integrated, true peak {tp:.1f} dBTP, limiter max GR {-20 * np.log10(gr.min() + 1e-12):.1f} dB")
    write_wav(os.path.join(OUT, "mix.wav"), out)
    for name, s_ in (("voice", V), ("music", M), ("sfx", S)):
        write_wav(os.path.join(OUT, f"stem_{name}.wav"), s_)
    with open(os.path.join(OUT, "cues.md"), "w") as f:
        f.write(f"# Coral mosque short: sound report\n\n- length {Q.DUR:.3f} s ({Q.TOTAL} frames at 30 fps), 48 kHz stereo 24-bit\n")
        f.write(f"- mix {Li:.1f} LUFS integrated, true peak {tp:.1f} dBTP\n- stems at mix gain: voice {integrated(V):.1f}, music {integrated(M):.1f}, sfx {integrated(S):.1f} LUFS\n\n")
        f.write("| cue | time s | frame |\n|---|---|---|\n")
        for k, t in sorted(C.items(), key=lambda kv: kv[1]):
            f.write(f"| {k} | {t:.2f} | {round(t * 30)} |\n")
    log("wrote audio/out/mix.wav, stems, cues.md")


if __name__ == "__main__":
    main()
