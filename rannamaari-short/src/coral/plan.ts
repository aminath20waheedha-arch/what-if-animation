// Everything is timed to the narration: words.json is written by voice/tts.py (CI regenerates it), and every shot
// boundary and story beat below is a cue word, so a new take re-times the whole film by itself.
// audio/cues.py resolves the same cues with the same rule (keep them in sync).
import WORDS from "./words.json";

export const FPS = 30;
type W = { w: string; s: number; e: number; line?: number };
const words = WORDS as W[];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");

/** time (s) of the n-th occurrence (1-based) of `word` on script line `line` (0-based) */
export const at = (line: number, word: string, n = 1): number => {
  let k = 0;
  for (const w of words) if ((w.line ?? -1) === line && norm(w.w) === norm(word) && ++k === n) return w.s;
  throw new Error(`plan.ts: cue "${word}" (#${n}) not found on line ${line}`);
};
export const endOf = (line: number, word: string, n = 1): number => {
  let k = 0;
  for (const w of words) if ((w.line ?? -1) === line && norm(w.w) === norm(word) && ++k === n) return w.e;
  throw new Error(`plan.ts: cue "${word}" (#${n}) not found on line ${line}`);
};
const last = words[words.length - 1];
/** the take length + a tail for the end card */
export const DURATION = Math.ceil((last.e + 1.3) * FPS);
/** frame of a time, a few frames early: picture reactions land 0-3 frames before their word */
export const F = (t: number, lead = 2) => Math.max(0, Math.round(t * FPS) - lead);

// ---- cue table (seconds). Names are story beats; audio/cues.py mirrors this list. ----
export const CUE = {
  hook: at(0, "Did"), demon: at(0, "demon"),
  ship: at(1, "Long"), glowing: at(1, "glowing"),
  called: at(2, "The"), sacrifice: at(2, "sacrifice"),
  girl: at(3, "So"), temple: at(3, "temple"),
  morning: at(4, "By"), gone: at(4, "gone"),
  then: at(5, "Then"), traveller: at(5, "traveller"), name: at(5, "His"),
  crying: at(6, "He"), daughter: at(6, "Their"),
  place: at(7, "So"),
  night: at(8, "That"), recited: at(8, "recited"), louder: at(8, "louder"),
  rose: at(9, "The"), closer: at(9, "closer"), stopped: at(9, "stopped"),
  turned: at(10, "Rannamaari"), sank: at(10, "sank"),
  king: at(11, "The"), islam: at(11, "Islam"),
  tomb: at(12, "And"), today: at(12, "today"),
  cta: at(13, "So"), honest: at(13, "honest"), comments: at(13, "comments"),
};
export const END = DURATION;
