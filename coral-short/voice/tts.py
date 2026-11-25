"""Narration for the coral mosque short: free neural TTS (Microsoft Edge voices via edge-tts, no API key) with word
timings, one line at a time so the pauses between sentences are ours, then joined into one take.

Writes
  voice/voice.wav          48 kHz mono 16-bit, the take (the mix reads it)
  src/coral/words.json     [{"w": word, "s": start s, "e": end s}, ...] (the picture is timed to it)

Fallbacks, in order: edge-tts -> the committed take (voice/voice.wav + words.json, if present and the script did not
change) -> espeak-ng (robotic, but the pipeline still finishes; word times estimated per line).

usage: python voice/tts.py [--voice en-US-AndrewNeural] [--rate +6%] [--force]
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCRIPT = os.path.join(HERE, "script.txt")
WAV = os.path.join(HERE, "voice.wav")
WORDS = os.path.join(ROOT, "src", "coral", "words.json")
STAMP = os.path.join(HERE, "voice.stamp")
SR = 48000

# pause after each line (s): a beat after the hook, a held beat before "at the reef" lands, a breath before the CTA
GAPS = {0: 0.55, 2: 0.35, 3: 0.45, 7: 0.45, 10: 0.35, 11: 0.6}
GAP = 0.3
LEAD_IN = 0.25
TAIL = 1.4


def log(*a):
    print("[tts]", *a, flush=True)


def lines():
    return [l.strip() for l in open(SCRIPT, encoding="utf-8") if l.strip()]


def decode(path):
    """any audio file -> float mono at SR (ffmpeg)"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0


def trim(x, thr=0.008):
    """indices of the first / last sample above the threshold (10 ms margin)"""
    idx = np.flatnonzero(np.abs(x) > thr)
    if not len(idx):
        return 0, len(x)
    m = int(0.01 * SR)
    return max(0, idx[0] - m), min(len(x), idx[-1] + m)


async def edge_line(text, voice, rate, out_mp3):
    try:  # behind a TLS-inspecting proxy (sandbox), trust its bundle; must happen before edge_tts builds its context
        import certifi
        ca = os.environ.get("SSL_CERT_FILE") or ("/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
        if ca:
            certifi.where = lambda: ca
    except ImportError:
        pass
    import edge_tts
    words = []
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    with open(out_mp3, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                s = ch["offset"] / 1e7
                words.append({"w": ch["text"], "s": s, "e": s + ch["duration"] / 1e7})
    if not words:
        raise RuntimeError("edge-tts returned no word boundaries")
    return words


def espeak_line(text, out_wav):
    exe = shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe:
        raise RuntimeError("no espeak-ng")
    subprocess.run([exe, "-v", "en-us", "-s", "165", "-w", out_wav, text], check=True)
    x = decode(out_wav)
    a, b = trim(x)
    toks = text.split()
    lens = np.array([len(t) + 2 for t in toks], float)
    edges = a / SR + np.concatenate([[0], np.cumsum(lens)]) / lens.sum() * (b - a) / SR
    return [{"w": t, "s": float(edges[i]), "e": float(edges[i + 1]) - 0.03} for i, t in enumerate(toks)]


def build(engine, voice, rate):
    tmp = os.path.join(HERE, "_tmp")
    os.makedirs(tmp, exist_ok=True)
    take, words, t = [np.zeros(int(LEAD_IN * SR))], [], LEAD_IN
    for i, text in enumerate(lines()):
        if engine == "edge":
            p = os.path.join(tmp, f"l{i:02d}.mp3")
            ws = None
            for attempt in range(4):
                try:
                    ws = asyncio.run(edge_line(text, voice, rate, p))
                    break
                except Exception as e:  # network hiccups: retry with backoff
                    log(f"line {i} attempt {attempt + 1} failed: {e}")
                    import time
                    time.sleep(2 * (attempt + 1))
            if ws is None:
                raise RuntimeError("edge-tts failed")
            x = decode(p)
        else:
            p = os.path.join(tmp, f"l{i:02d}.wav")
            ws = espeak_line(text, p)
            x = decode(p)
        a, b = trim(x)
        seg = x[a:b]
        for w in ws:
            words.append({"w": w["w"], "s": round(t + w["s"] - a / SR, 3), "e": round(t + w["e"] - a / SR, 3), "line": i})
        take.append(seg)
        t += len(seg) / SR
        g = GAPS.get(i, GAP)
        take.append(np.zeros(int(g * SR)))
        t += g
    take.append(np.zeros(int(TAIL * SR)))
    y = np.concatenate(take)
    peak = np.max(np.abs(y)) or 1.0
    y = y / peak * 0.89  # -1 dBFS peak; loudness is set in the mix
    with wave.open(WAV, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    # clamp word ends to the next word's start (edge durations can overlap the following word slightly)
    for a_, b_ in zip(words, words[1:]):
        a_["e"] = round(min(a_["e"], b_["s"]), 3)
    for w in words:
        w["w"] = re.sub(r"[^\w'\-]", "", w["w"]) or w["w"]
    json.dump(words, open(WORDS, "w", encoding="utf-8"), indent=1)
    shutil.rmtree(tmp, ignore_errors=True)
    log(f"{engine}: {len(words)} words, {len(y) / SR:.2f} s -> {os.path.relpath(WAV, ROOT)}, {os.path.relpath(WORDS, ROOT)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=os.environ.get("TTS_VOICE", "en-US-AndrewNeural"))
    ap.add_argument("--rate", default=os.environ.get("TTS_RATE", "+6%"))
    ap.add_argument("--force", action="store_true", help="regenerate even when the committed take matches the script")
    a = ap.parse_args()
    key = hashlib.sha1((open(SCRIPT, encoding="utf-8").read() + a.voice + a.rate + json.dumps(GAPS)).encode()).hexdigest()
    have = os.path.exists(WAV) and os.path.exists(WORDS) and os.path.exists(STAMP) and open(STAMP).read().strip() == key
    if have and not a.force:
        log("committed take matches the script, voice and pauses: reusing it")
        return
    try:
        build("edge", a.voice, a.rate)
        open(STAMP, "w").write(key)
        return
    except Exception as e:
        log(f"edge-tts unavailable ({e})")
    if have:
        log("falling back to the committed take")
        return
    log("falling back to espeak-ng (robotic voice)")
    build("espeak", a.voice, a.rate)


if __name__ == "__main__":
    sys.exit(main())
