"""Picture timeline mirrored (read-only) from src/coral/plan.ts + story.ts, so every sound lands on its frame.
Everything is resolved from words.json with the same rules as the TypeScript side (keep them in sync)."""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
WORDS = json.load(open(os.path.join(ROOT, "src", "coral", "words.json"), encoding="utf-8"))


def _norm(s):
    return "".join(c for c in s.lower() if c.isalnum() or c in "'-")


def at(line, word, n=1, end=False):
    k = 0
    for w in WORDS:
        if w.get("line", -1) == line and _norm(w["w"]) == _norm(word):
            k += 1
            if k == n:
                return w["e"] if end else w["s"]
    raise KeyError(f"cue {word!r} #{n} not found on line {line}")


TOTAL = math.ceil((WORDS[-1]["e"] + 1.3) * FPS)
DUR = TOTAL / FPS


def F(t, lead=2):
    return max(0, round(t * FPS) - lead)


def fr(f):
    return f / FPS


CUE = dict(
    hook=at(0, "Did"), built=at(0, "built"), floor=at(0, "floor"), sultan=at(1, "Sultan"), outlast=at(1, "outlast"),
    problem=at(2, "One"), island=at(2, "On"), quarry=at(2, "quarry"), mountain=at(2, "mountain"), tallest=at(2, "The"),
    palm=at(2, "palm"), builders=at(3, "So"), down=at(3, "down"), reef=at(3, "reef"), divers=at(4, "Divers"), cut=at(4, "cut"),
    hauled=at(4, "hauled"), beach=at(4, "beach"), trick=at(5, "Here's"), fresh=at(5, "fresh"), soft=at(5, "soft"),
    wood=at(5, "wood"), carved=at(6, "So"), wet=at(6, "wet"), sun=at(6, "and"), stone=at(6, "stone"), tooHard=at(7, "Too"),
    hard2=at(7, "hard"), apprentice=at(7, "apprentice"), blockBy=at(8, "Block"), block2=at(8, "block"), slotted=at(8, "slotted"),
    puzzle=at(8, "puzzle"), graves=at(9, "Even"), pointed=at(9, "pointed"), rounded=at(9, "rounded"), seventeen=at(10, "Seventeen"),
    minaret=at(10, "minaret"), today=at(11, "And"), standing=at(11, "standing"), cta=at(12, "So"), honest=at(12, "honest"),
    patience=at(12, "patience"), time=at(12, "time"), comments=at(12, "comments"),
)
C = CUE

# shot id -> (first frame, end frame, light, era), as story.ts SHOTS
_starts = [0, F(C["built"]), F(C["sultan"]), F(C["problem"]), F(C["tallest"]), F(C["builders"]), F(C["reef"]), F(C["hauled"]),
           F(C["trick"]), F(C["sun"]), F(C["tooHard"]), F(C["blockBy"]), F(C["graves"]), F(C["seventeen"]), F(C["today"]), F(C["cta"])]
_lights = ["reef", "day", "day", "day", "day", "day", "reef", "day", "day", "day", "day", "day", "day", "golden", "golden", "day"]
SHOTS = {i + 1: (a, (_starts[i + 1] if i + 1 < len(_starts) else TOTAL), _lights[i]) for i, a in enumerate(_starts)}


def shot_t(i):
    a, b, _ = SHOTS[i]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, _) in SHOTS.items():
        if a <= f < b:
            return i
    return 16


# story beats (story.ts)
CARVE_HITS = []
_t = C["trick"] + 0.35
while _t < C["sun"] - 0.2:
    CARVE_HITS.append(_t)
    _t += 0.5
CARVE_HITS = sorted(CARVE_HITS + [C["soft"], C["wood"]])
CARVE_HITS = [t for i, t in enumerate(CARVE_HITS) if i == 0 or t - CARVE_HITS[i - 1] > 0.18]
CUT_HITS = [C["cut"] + 0.05, C["cut"] + 0.55, C["cut"] + 1.05]
BONK = C["hard2"]
WALL_DROPS = [C["blockBy"], C["block2"], C["slotted"], C["slotted"] + 0.55, C["puzzle"]]
# extra carvers in the wide (cast.ts): the same beats offset by 0.17 and 0.38 s, after "So they carved"
WIDE_CARVERS = [[h + 0.17 + j * 0.21 for h in CARVE_HITS if h + 0.17 + j * 0.21 > C["carved"]] for j in range(2)]
# camera cuts that get a whoosh (move-in glides and hard reframes)
CUTS = [fr(SHOTS[i][0]) for i in range(2, 17)] + [fr(F(C["island"])), fr(F(C["divers"])), fr(F(C["soft"])), fr(F(C["carved"])),
                                                   fr(F(C["apprentice"])), fr(F(C["pointed"]))]


def speech_spans(merge=0.3):
    sp = []
    for w in WORDS:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp
