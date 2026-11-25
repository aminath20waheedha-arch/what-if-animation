"""Narration for the coral mosque short: free neural TTS (Microsoft Edge voices via edge-tts, no API key) with word
timings, one line at a time so the pauses between sentences are ours, then joined into one take.

Writes
  voice/voice.wav          48 kHz mono 16-bit, the take (the mix reads it)
  src/coral/words.json     [{"w": word, "s": start s, "e": end s}, ...] (the picture is timed to it)

Engines: ElevenLabs (when ELEVENLABS_API_KEY is set; default voice Adam, character timestamps -> word timings), else
edge-tts. Fallbacks, in order: ElevenLabs -> edge-tts -> the committed take (voice/voice.wav + words.json, if present and the script did not
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


ADAM = "pNInz6obpgDQGcFmaJgB"  # ElevenLabs premade voice "Adam"


def eleven_line(text, voice_id, out_mp3, model="eleven_multilingual_v2"):
    """ElevenLabs TTS with character timestamps (key from the environment, never printed) -> word timings"""
    import base64
    import urllib.request
    key = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps({"text": text, "model_id": model,
                       "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True, "speed": float(os.environ.get("ELEVEN_SPEED", "1.12"))}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
                                 data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    open(out_mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    al = d.get("alignment") or d.get("normalized_alignment")
    chars, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur = [], None
    for ch, a, b in zip(chars, cs, ce):
        if ch.isspace():
            if cur:
                words.append(cur); cur = None
            continue
        if cur is None:
            cur = {"w": ch, "s": a, "e": b}
        else:
            cur["w"] += ch; cur["e"] = b
    if cur:
        words.append(cur)
    if not words:
        raise RuntimeError("ElevenLabs returned no alignment")
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
        if engine == "eleven":
            p = os.path.join(tmp, f"l{i:02d}.mp3")
            ws = None
            for attempt in range(3):
                try:
                    ws = eleven_line(text, voice, p)
                    break
                except Exception as e:
                    log(f"line {i} attempt {attempt + 1} failed: {str(e)[:200]}")
                    import time
                    time.sleep(3 * (attempt + 1))
            if ws is None:
                raise RuntimeError("ElevenLabs failed")
            x = decode(p)
        elif engine == "edge":
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
    ap.add_argument("--eleven-voice", default=os.environ.get("ELEVEN_VOICE") or ADAM)
    a = ap.parse_args()
    eleven = bool(os.environ.get("ELEVENLABS_API_KEY"))
    want = ("eleven", a.eleven_voice, "") if eleven else ("edge", a.voice, a.rate)
    stamp_of = lambda w: hashlib.sha1((open(SCRIPT, encoding="utf-8").read() + "|".join(w) + json.dumps(GAPS)).encode()).hexdigest()
    key = stamp_of(want)
    cur = open(STAMP).read().strip() if os.path.exists(STAMP) else ""
    have = os.path.exists(WAV) and os.path.exists(WORDS) and cur == key
    if not eleven and not a.force and cur == stamp_of(("eleven", a.eleven_voice, "")) and os.path.exists(WAV) and os.path.exists(WORDS):
        log("no ElevenLabs key here, but the committed take is an ElevenLabs take of this script: reusing it")
        return
    if have and not a.force:
        log("committed take matches the script, voice and pauses: reusing it")
        return
    if eleven:
        try:
            build("eleven", a.eleven_voice, "")
            open(STAMP, "w").write(key)
            return
        except Exception as e:
            log(f"ElevenLabs unavailable ({str(e)[:200]}), trying edge-tts")
    try:
        build("edge", a.voice, a.rate)
        if not eleven:
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
