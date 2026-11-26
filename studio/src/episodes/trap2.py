"""A harder trap kit for the What If Shorts (v2 of the episode beats): layered kick + distorted sliding 808 with a
bounce pattern, stacked snare/clap with a plate tail and ghost notes, velocity-accented 16th hats with 32nd and
triplet rolls that pitch up, open hats, a dark bell/pluck hook + counter line, pads that pump with the kick, risers,
reverse crashes, pre-drop silences with a filter sweep, bus saturation. Built on the coral short's DSP kit.

Use: import trap2 as T; M = T.Song(duration_s); M.section(a, b, kind, energy); M.drop(t); M.stop(t); M.render() -> (2, n)
"""
import os, sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "coral-short", "audio"))
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, colored, fades, modal, pan, st, place, widen, make_ir, convolve_st, phase
import instruments as I

BPM = 142
B = 60 / BPM
ROOT = 40  # E2
# Em - C - Am - B  (harmonic minor turn on the B for tension)
PROG = [(0, "m"), (-4, "M"), (5, "m"), (7, "M")]
r = rng(42)


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- drums
def kick(vel=1.0):
    t = tt(0.45)
    f = 52 + 140 * np.exp(-t / 0.028)
    body = np.sin(phase(f)) * np.exp(-t / 0.16)
    click = bp(r.standard_normal(len(t)), 2000, 8000, 2) * np.exp(-t / 0.003) * 0.8
    return fades(np.tanh(2.2 * (body + click)) * vel, 0.0003, 0.03)


def b808(f0, dur, glide_to=None, vel=1.0, drive=3.2):
    t = tt(dur)
    f = f0 * (1 + 0.5 * np.exp(-t / 0.015))
    if glide_to:
        k = np.clip((t - (dur - 0.16)) / 0.16, 0, 1)
        f = f * (glide_to / f0) ** (k ** 1.5)
    y = np.sin(phase(f)) + 0.18 * np.sin(2 * phase(f))
    y *= np.exp(-t / max(0.5, dur * 0.9))
    y = np.tanh(drive * y) / np.tanh(drive)  # harmonics phones can hear
    return fades(y * vel, 0.002, 0.05)


def snare(vel=1.0):
    t = tt(0.5)
    body = modal(0.5, [(185, 1.0, 0.07), (330, 0.6, 0.05), (480, 0.25, 0.03)], r)
    nz = bp(r.standard_normal(len(t)), 1800, 11000, 2) * np.exp(-t / 0.09)
    clap = sum(bp(r.standard_normal(len(t)), 1000, 5000, 2) * np.exp(-np.maximum(t - k * 0.008, 0) / (0.01 if k < 3 else 0.12)) * (t >= k * 0.008) for k in range(4))
    return fades((body * 0.6 + nz * 0.9 + clap * 0.7) * vel, 0.0003, 0.05)


def hat(vel=0.5, open_=False, pitch=1.0):
    d = 0.32 if open_ else 0.05
    t = tt(d)
    y = sum(np.sign(np.sin(TAU * f * pitch * t + k)) for k, f in enumerate((3120, 4280, 5600, 6800, 8340, 9910)))
    y = hp(y + r.standard_normal(len(t)) * 1.5, 7000, 2) * np.exp(-t / (0.11 if open_ else 0.012))
    return y * vel * 0.12


def rim(vel=0.5):
    t = tt(0.12)
    return (modal(0.12, [(1700, 1.0, 0.02), (2400, 0.5, 0.012)], r) + bp(r.standard_normal(len(t)), 2000, 6000, 2) * np.exp(-t / 0.004)) * vel * 0.5


# ---------------------------------------------------------------- melodic
def bell(f, vel=0.6, dur=1.2):
    g = I.glock(f, vel, r, dur) * 0.7
    pl = I.pluck(f, vel, r, dur * 0.6, bright=0.8) * 0.5
    g[: len(pl)] += pl[: len(g)]
    return g


def lead(f, dur, vel=0.5):
    t = tt(dur)
    y = sum(np.sin(TAU * f * k * t + k * 0.7) / k for k in range(1, 10)) * np.exp(-t / 0.3)
    y += 0.4 * sum(np.sin(TAU * f * 1.006 * k * t) / k for k in range(1, 6)) * np.exp(-t / 0.3)
    return fades(lp(y, 3800) * vel, 0.004, 0.06)


HOOK = [(0.0, 7), (0.5, 10), (1.0, 12), (1.75, 10), (2.5, 7), (3.0, 5), (3.5, 3), (4.0, 7), (4.5, 10), (5.0, 15), (5.75, 14), (6.5, 12), (7.0, 10)]
COUNTER = [(0, 19), (2, 17), (4, 15), (6, 14)]
B808 = [(0.0, 0, 1.5), (1.75, 0, 0.6), (2.5, 12, 0.5), (3.0, 0, 1.0)]  # (beat, semitone, length in beats): the bounce


class Song:
    def __init__(self, dur):
        self.N = ns(dur)
        self.dur = dur
        self.drums = np.zeros((2, self.N)); self.bass = np.zeros((2, self.N)); self.mel = np.zeros((2, self.N)); self.pads = np.zeros((2, self.N))
        self.fx = np.zeros((2, self.N)); self.kicks = []; self.lp_spans = []; self.mutes = []

    def section(self, a, b, kind="full", e=1.0):
        """kind: full (everything), drums (no melody), tension (hats + 808 + pads), dark (full, hook down an octave),
        intro (pads + bell + filtered hats), under (filtered later via lowpass())"""
        k = 0
        while True:
            tb = a + k * B
            if tb >= b - 0.03:
                break
            bar, bt = divmod(k, 4)
            root, q = PROG[bar % 4]
            nxt = PROG[(bar + 1) % 4][0]
            if bt == 0 and kind != "intro":
                for beat, semi, L in B808:
                    t0 = tb + beat * B
                    if t0 >= b - 0.05:
                        continue
                    last = beat == 3.0
                    gl = m2f(ROOT + nxt) if (last and bar % 2 == 1) else None
                    place(self.bass, st(b808(m2f(ROOT + root + semi), min(L * B, b - t0), gl, 0.95 * e)), t0)
            if kind in ("full", "drums", "dark", "under"):
                if bt == 0 or (bt == 1 and bar % 2 == 1 and True) or (bt == 3 and bar % 4 == 3):
                    t0 = tb + (0.75 * B if bt == 1 else 0)
                    place(self.drums, st(kick(1.0 * e)), t0); self.kicks.append(t0)
                if bt == 2:
                    place(self.drums, pan(snare(1.0 * e), 0.03), tb)
                if bt == 3 and bar % 2 == 0:
                    place(self.drums, pan(snare(0.25 * e), 0.1), tb + 0.75 * B)  # ghost
                if bt in (1, 3):
                    place(self.drums, pan(rim(0.35 * e), -0.35), tb + 0.5 * B)
            if kind in ("full", "drums", "dark", "tension", "under", "intro"):
                roll32 = bar % 2 == 1 and bt == 3
                trip = bar % 4 == 2 and bt == 3
                if roll32:
                    steps = [i / 8 for i in range(8)]
                elif trip:
                    steps = [i / 6 for i in range(6)]
                else:
                    steps = [0, 0.25, 0.5, 0.75]
                for i, s_ in enumerate(steps):
                    v = (0.55 if s_ in (0, 0.5) else 0.32) * e * (0.7 if kind == "intro" else 1)
                    p = 1 + (0.12 * i / len(steps) if roll32 or trip else 0)
                    place(self.drums, pan(hat(v, pitch=p), 0.28), tb + s_ * B)
                if bt == 1 and kind in ("full", "dark", "drums"):
                    place(self.drums, pan(hat(0.32 * e, open_=True), -0.25), tb + 0.5 * B)
            if bt == 0 and kind != "drums":
                third = 3 if q == "m" else 4
                fr = [m2f(ROOT + 24 + root + x) for x in (0, third, 7, 12 + third)]
                dur = min(4 * B, b - tb)
                if dur > 0.3:
                    place(self.pads, lp(I.pad(fr, dur, 0.38 * e, r, att=0.2, rel=0.4, warm=1600, detune=11), 3000), tb)
            if kind in ("full", "dark", "intro") and bt == 0 and bar % 2 == 0:
                octave = -12 if kind == "dark" else 0
                for beat, semi in HOOK:
                    t0 = tb + beat * B
                    if t0 < b - 0.05:
                        place(self.mel, pan(bell(m2f(ROOT + 24 + semi + octave), 0.55 * e), 0.2), t0)
                if kind != "intro":
                    for beat, semi in COUNTER:
                        t0 = tb + beat * B
                        if t0 < b - 0.05:
                            place(self.mel, pan(lead(m2f(ROOT + 12 + semi), 1.6 * B, 0.22 * e), -0.3), t0)
            k += 1

    def drop(self, t, lead=1.4):
        """riser + reverse crash into an impact on t, with a beat of silence and a filter sweep before it"""
        n = ns(lead)
        u = np.arange(n) / n
        riser = widen(hp(colored(n, r, 0.4), 800) * u ** 2.2, r, 9, 0.9)
        cr = I.cymbal(0.7, r, lead)
        rev = cr[:, ::-1] if cr.ndim == 2 else st(cr[::-1])
        place(self.fx, riser * 0.25 + rev * 0.35, t - lead)
        tb = np.arange(ns(1.2)) / SR
        boom = np.sin(phase(48 * (1 + 1.5 * np.exp(-tb / 0.06)))) * np.exp(-tb / 0.5) + bp(r.standard_normal(len(tb)), 200, 4000, 1) * np.exp(-tb / 0.04)
        place(self.fx, st(np.tanh(1.8 * boom)) * 0.6, t)
        place(self.fx, I.cymbal(0.6, r, 2.4) * 0.3, t)
        self.mutes.append((t - B, t - 0.01))      # the gap right before the drop
        self.lp_spans.append((t - 4 * B, t - B))  # filter sweep into the gap

    def stop(self, t):
        """dead stop (tape stop down to silence)"""
        self.mutes.append((t, t + 0.01))
        d = tt(0.45)
        f = 110 * (1 - d / 0.45) ** 2 + 20
        place(self.fx, st(np.sin(phase(f)) * (1 - d / 0.45)) * 0.5, t - 0.02)

    def impact(self, t, size=1.0):
        tb = np.arange(ns(1.6)) / SR
        boom = np.sin(phase(45 * (1 + 1.2 * np.exp(-tb / 0.07)))) * np.exp(-tb / 0.7)
        place(self.fx, st(np.tanh(1.6 * boom)) * 0.6 * size, t)

    def lowpass(self, a, b, f=700):
        """the 'under water' version of a section (muffled)"""
        i, j = ns(a), ns(b)
        for buf in (self.drums, self.bass, self.mel, self.pads):
            buf[:, i:j] = lp(buf[:, i:j], f, 2) * 1.3

    def render(self):
        N = self.N
        # pads + melody pump with the kick (sidechain)
        env = np.ones(N)
        for t0 in self.kicks:
            i = ns(t0)
            m = ns(0.22)
            if i < N:
                seg = 1 - 0.65 * np.exp(-np.arange(min(m, N - i)) / SR / 0.07)
                env[i:i + len(seg)] = np.minimum(env[i:i + len(seg)], seg)
        self.pads *= env[None, :]; self.mel *= (0.5 + 0.5 * env)[None, :]
        # filter sweeps before drops
        for a, b in self.lp_spans:
            i, j = max(0, ns(a)), min(N, ns(b))
            if j > i + 10:
                for buf in (self.drums, self.mel, self.pads):
                    x = buf[:, i:j]
                    blocks = 8
                    out = np.zeros_like(x)
                    for k in range(blocks):
                        s0, s1 = k * x.shape[1] // blocks, (k + 1) * x.shape[1] // blocks
                        out[:, s0:s1] = lp(x, 4000 * (0.08 ** (k / blocks)), 2)[:, s0:s1]
                    buf[:, i:j] = out
        mel_wet = convolve_st(self.mel, make_ir(1.6, 7, pre=0.02, hf=1.6)) * 0.25
        dr_wet = convolve_st(hp(self.drums, 400, 2), make_ir(0.9, 9, pre=0.01, hf=2.0)) * 0.08
        M = self.drums * 1.0 + dr_wet + self.bass * 0.95 + self.mel * 0.8 + mel_wet + self.pads * 0.5 + self.fx
        for a, b in self.mutes:
            i, j = max(0, ns(a)), min(N, ns(b))
            if b - a < 0.05:  # a stop: everything after is silenced until the next section writes again
                continue
            M[:, i:j] = self.fx[:, i:j]
        M = np.tanh(1.3 * M) / np.tanh(1.3)  # bus glue / soft clip
        return hp(M, 28, 2)
