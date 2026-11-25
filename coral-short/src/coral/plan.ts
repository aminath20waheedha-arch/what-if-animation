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
  hook: at(0, "Did"),
  built: at(0, "built"),
  floor: at(0, "floor"),
  sultan: at(1, "Sultan"),
  outlast: at(1, "outlast"),
  problem: at(2, "One"),
  island: at(2, "On"),
  quarry: at(2, "quarry"),
  mountain: at(2, "mountain"),
  tallest: at(2, "The"),
  palm: at(2, "palm"),
  builders: at(3, "So"),
  down: at(3, "down"),
  reef: at(3, "reef"),
  divers: at(4, "Divers"),
  cut: at(4, "cut"),
  hauled: at(4, "hauled"),
  beach: at(4, "beach"),
  trick: at(5, "Here's"),
  fresh: at(5, "fresh"),
  soft: at(5, "soft"),
  wood: at(5, "wood"),
  carved: at(6, "So"),
  wet: at(6, "wet"),
  sun: at(6, "and"),
  stone: at(6, "stone"),
  tooHard: at(7, "Too"),
  hard2: at(7, "hard"),
  apprentice: at(7, "apprentice"),
  blockBy: at(8, "Block"),
  block2: at(8, "block"),
  slotted: at(8, "slotted"),
  puzzle: at(8, "puzzle"),
  graves: at(9, "Even"),
  pointed: at(9, "pointed"),
  rounded: at(9, "rounded"),
  seventeen: at(10, "Seventeen"),
  minaret: at(10, "minaret"),
  today: at(11, "And"),
  standing: at(11, "standing"),
  cta: at(12, "So"),
  honest: at(12, "honest"),
  patience: at(12, "patience"),
  time: at(12, "time"),
  comments: at(12, "comments"),
};
export const END = DURATION;
