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
    hook=at(0, "Did"), demon=at(0, "demon"), ship=at(1, "Long"), glowing=at(1, "glowing"), called=at(2, "The"),
    sacrifice=at(2, "sacrifice"), girl=at(3, "So"), temple=at(3, "temple"), morning=at(4, "By"), gone=at(4, "gone"),
    then=at(5, "Then"), traveller=at(5, "traveller"), name=at(5, "His"), crying=at(6, "He"), daughter=at(6, "Their"),
    place=at(7, "So"), night=at(8, "That"), recited=at(8, "recited"), louder=at(8, "louder"), rose=at(9, "The"),
    closer=at(9, "closer"), stopped=at(9, "stopped"), turned=at(10, "Rannamaari"), sank=at(10, "sank"), king=at(11, "The"),
    islam=at(11, "Islam"), tomb=at(12, "And"), today=at(12, "today"), cta=at(13, "So"), honest=at(13, "honest"),
    comments=at(13, "comments"),
)
C = CUE
_starts = [0] + [F(C[k]) for k in ("ship", "called", "girl", "morning", "then", "crying", "place", "night", "rose", "turned", "king", "tomb", "cta")]
_lights = ["night", "night", "night", "night", "golden", "day", "day", "golden", "night", "night", "night", "day", "golden", "night"]
SHOTS = {i + 1: (a, (_starts[i + 1] if i + 1 < len(_starts) else TOTAL), _lights[i]) for i, a in enumerate(_starts)}


def shot_t(i):
    a, b, _ = SHOTS[i]
    return fr(a), fr(b)


CUTS = [fr(SHOTS[i][0]) for i in range(2, 15)] + [fr(F(C["name"])), fr(F(C["daughter"])), fr(F(C["closer"]))]


def speech_spans(merge=0.3):
    sp = []
    for w in WORDS:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp
