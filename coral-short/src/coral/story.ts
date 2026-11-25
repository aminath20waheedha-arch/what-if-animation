// Timeline of the coral mosque short: shots timed to the narration cues (plan.ts), the era of the set per shot, and the
// camera grammar of the skill: continuous slow push-ins, smootherstep glides of 18-40 f, big reframes are cuts,
// impacts are 7-frame kicks that flip sign every frame, no hand-held float.
import { FPS, CUE, F, DURATION } from "./plan";
export { FPS };
export const TOTAL = DURATION;

// ---------------- world layout (metres; y up, the lagoon surface at y = 0) ----------------
export const GY = 0.6; // island ground (sand streets)
export const D0 = GY; // build.ts / paint.ts import D0 as the ground height
export const HY = 1.3; // top of the mosque plinth = hall floor
export const ISLE: V3 = [0, 0, -20]; // island centre; sand to r 62, beach to r 70, then the lagoon
export const ISLE_R = 70;
export const SHORE_Z = ISLE[2] + ISLE_R; // 50: water's edge in front of the town
export const REEF: V3 = [0, -6, 100]; // the reef the coral was cut from
export const MINARET: V3 = [13, GY, 8];
export const BENCH: V3 = [6, GY, 14]; // carving bench (1658)
export const RACKS: V3 = [-6, GY, 13]; // drying blocks (1658)
export const PALM_HERO: V3 = [-6, GY, 43];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "reef";
/** era of the set: build = 1658 building site (low walls, scaffolds, workshop), done = finished hall, minaret from 1675,
 *  today = the modern city around it */
export type Era = "build" | "done" | "done1675" | "today";
export type ShotDef = { id: number; a: number; b: number; light: Light; era: Era; sunAz?: number; sunEl?: number; showSun?: boolean };
const f = F;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: f(CUE.built), light: "reef", era: "done1675" },
  { id: 2, a: f(CUE.built), b: f(CUE.sultan), light: "day", era: "done1675", sunAz: 110 },
  { id: 3, a: f(CUE.sultan), b: f(CUE.problem), light: "day", era: "build" },
  { id: 4, a: f(CUE.problem), b: f(CUE.tallest), light: "day", era: "build" },
  { id: 5, a: f(CUE.tallest), b: f(CUE.builders), light: "day", era: "build", sunAz: 150, sunEl: 55 },
  { id: 6, a: f(CUE.builders), b: f(CUE.reef), light: "day", era: "build" },
  { id: 7, a: f(CUE.reef), b: f(CUE.hauled), light: "reef", era: "build" },
  { id: 8, a: f(CUE.hauled), b: f(CUE.trick), light: "day", era: "build" },
  { id: 9, a: f(CUE.trick), b: f(CUE.sun), light: "day", era: "build" },
  { id: 10, a: f(CUE.sun), b: f(CUE.tooHard), light: "day", era: "build", sunAz: 150, sunEl: 40 },
  { id: 11, a: f(CUE.tooHard), b: f(CUE.blockBy), light: "day", era: "build" },
  { id: 12, a: f(CUE.blockBy), b: f(CUE.graves), light: "day", era: "build" },
  { id: 13, a: f(CUE.graves), b: f(CUE.seventeen), light: "day", era: "done" },
  { id: 14, a: f(CUE.seventeen), b: f(CUE.today), light: "golden", era: "done1675", sunAz: 140, sunEl: 12 },
  { id: 15, a: f(CUE.today), b: f(CUE.cta), light: "golden", era: "today", sunAz: 145, sunEl: 14 },
  { id: 16, a: f(CUE.cta), b: TOTAL, light: "day", era: "build" },
];
/** crossfades (frames) at time jumps; white flashes at the surface burst and after the hook */
export const XFADE: Record<number, number> = { 13: 8, 14: 10, 15: 12, 16: 10 };
export const FLASHES = [f(CUE.built)];

export const shotAt = (fr: number) => SHOTS.find((s) => fr >= s.a && fr < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (fr: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && fr >= s.a - x / 2 && fr < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (fr - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(fr).id, alpha: 1 }];
};

// ---------------- story beats (seconds) used by the cast and the world ----------------
/** mallet strikes of the master carver (shot 9): a steady rhythm, one landing on "soft" and on "wood" */
export const CARVE_HITS: number[] = (() => {
  const out: number[] = [];
  for (let t = CUE.trick + 0.35; t < CUE.sun - 0.2; t += 0.5) out.push(t);
  return out.concat([CUE.soft, CUE.wood]).sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.18);
})();
/** coral cut under water (shot 7) */
export const CUT_HITS = [CUE.cut + 0.05, CUE.cut + 0.55, CUE.cut + 1.05];
/** the apprentice's one strike on a dry block (shot 11) */
export const BONK = CUE.hard2;
/** blocks dropping into the wall (shot 12), landing on the words */
export const WALL_DROPS = [CUE.blockBy, CUE.block2, CUE.slotted, CUE.slotted + 0.55, CUE.puzzle];
/** drying: 0 wet .. 1 bone dry over shot 10 */
export const dryAt = (t: number) => smooth((t - CUE.sun) / Math.max(0.5, CUE.stone - CUE.sun + 0.3));

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], fr: number) => {
  let cur = full(keys[0].s(fr));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (fr < k.f) break;
    cur = k.cut ? full(k.s(fr)) : mix(cur, full(k.s(fr)), glide((fr - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (fr: number) => fr / FPS;
const pushK = (fr: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, fr - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (fr: number): Shot => ({ ...s(fr), roll });

const S = SHOTS.reduce((o, s) => { o[s.id] = s; return o; }, {} as Record<number, ShotDef>);
const A = (id: number) => S[id].a;

// characters (cast.ts places them at these spots)
export const SULTAN_AT: V3 = [2, GY, 11.6];
export const CARVER_AT: V3 = [BENCH[0] - 0.15, GY, BENCH[2] - 0.75];
export const KID_AT: V3 = [BENCH[0] + 1.4, GY, BENCH[2] + 0.15];
export const KID_CTA: V3 = [BENCH[0] + 0.9, GY, BENCH[2] + 1.4];
export const OLD_SULTAN_AT: V3 = [MINARET[0] - 0.6, GY, MINARET[2] + 3.6];

// ---- framings: each pushes in from the frame its key starts ----
// 1: reef hook, rising slowly toward the light
const S1a = (fr: number): Shot => {
  const u = fr / Math.max(1, A(2));
  return { pos: [2.6 - 1.2 * u, -4.4 + 2.2 * u, REEF[2] + 6.5 - 1.5 * u], look: [0.2, -5.0 + 2.6 * u, REEF[2] - 0.5], fov: 44, roll: -0.03 };
};
// 2: burst out of the water, rising to the wide of the island (sight lines keep houses out of the way)
const S2a = (fr: number): Shot => { const u = glide((fr - A(2)) / 42); return dolly([3 + 11 * u, 0.25 + 15.5 * u, 60 + 10 * u], [0.5, 4.5 + 1.2 * u, 2], pushK(fr, A(2) + 42, 0.0018), { fov: 46 - 4 * u }); };
// 3: the sultan MS, punch on "outlast"
const S3a = (fr: number) => dolly([SULTAN_AT[0] + 0.7, GY + 1.75, SULTAN_AT[2] + 6.6], [SULTAN_AT[0], GY + 1.5, SULTAN_AT[2]], pushK(fr, A(3), 0.0022), { fov: 40 });
const S3b = (fr: number) => dolly([SULTAN_AT[0] - 0.4, GY + 1.75, SULTAN_AT[2] + 4.6], [SULTAN_AT[0], GY + 1.6, SULTAN_AT[2]], pushK(fr, F(CUE.outlast), 0.0015, 0.006, 30), { fov: 38, roll: 0.035 });
// 4: "One problem." worried CU -> aerial of the tiny flat island
const S4a = (fr: number) => dolly([SULTAN_AT[0] + 0.3, GY + 1.95, SULTAN_AT[2] + 3.3], [SULTAN_AT[0], GY + 1.85, SULTAN_AT[2]], pushK(fr, A(4), 0.003), { fov: 36, roll: -0.03 });
const S4b = (fr: number) => zoom([70, 95, 170], [0, -2, -14], 42, pushK(fr, F(CUE.island), 0.0016, 0.004, 30));
const S4c = (fr: number) => zoom([-55, 60, 140], [0, -1, -16], 40, pushK(fr, F(CUE.quarry), 0.0016));
// 5: low angle tilting up the hero palm
const S5a = (fr: number): Shot => {
  const u = glide((fr - A(5)) / 40);
  return { pos: [PALM_HERO[0] + 3.4, GY + 0.45, PALM_HERO[2] + 4.2], look: [PALM_HERO[0] + 0.2, GY + 1.6 + 9.0 * u, PALM_HERO[2] - 0.6], fov: 52, roll: 0.05 * u };
};
// 6: builders at the water's edge, seen from the lagoon; they lean and look down on "down"
const S6a = (fr: number) => dolly([0.8, 1.15, SHORE_Z + 6.2], [0, GY + 1.0, SHORE_Z - 1.2], pushK(fr, A(6), 0.0025), { fov: 40 });
const S6b = (fr: number) => dolly([0.3, 0.75, SHORE_Z + 3.4], [0, GY + 0.9, SHORE_Z - 1.0], pushK(fr, F(CUE.down), 0.002, 0.006, 24), { fov: 38, roll: -0.04 });
// 7: the reef wide, then the divers cutting coral
const S7a = (fr: number) => dolly([-7, -2.2, REEF[2] - 12], [0, -5.2, REEF[2] + 1], pushK(fr, A(7), 0.0025), { fov: 46 });
const S7b = (fr: number) => dolly([3.6, -3.4, REEF[2] - 6.2], [0.2, -4.6, REEF[2] - 0.4], pushK(fr, F(CUE.divers), 0.002), { fov: 42, roll: 0.03 });
const S7c = (fr: number) => dolly([1.6, -4.3, REEF[2] - 3.0], [0, -4.85, REEF[2] - 0.2], pushK(fr, F(CUE.cut), 0.003, 0.006, 20), { fov: 38, roll: -0.03 });
// 8: hauling the blocks up the beach toward the lens, dhoni behind
const S8a = (fr: number) => dolly([-2.6, GY + 1.55, SHORE_Z - 13], [1.8, GY + 1.0, SHORE_Z - 3], pushK(fr, A(8), 0.0022), { fov: 42 });
// 9: the master carver MS -> chisel CU on "soft" -> wide of the workshop on "So they carved"
const S9a = (fr: number) => dolly([BENCH[0] - 0.6, GY + 1.6, BENCH[2] + 4.2], [BENCH[0] + 0.2, GY + 1.25, BENCH[2] - 0.3], pushK(fr, A(9), 0.0025), { fov: 40 });
const S9b = (fr: number) => dolly([BENCH[0] + 0.55, GY + 1.25, BENCH[2] + 1.35], [BENCH[0], GY + 0.98, BENCH[2]], pushK(fr, F(CUE.soft), 0.003), { fov: 36, roll: 0.04 });
const S9c = (fr: number) => dolly([BENCH[0] - 6.5, GY + 2.9, BENCH[2] + 7.5], [BENCH[0] - 1.5, GY + 1.0, BENCH[2] - 0.5], pushK(fr, F(CUE.carved), 0.002), { fov: 42, roll: -0.03 });
// 10: low across the drying blocks into the sun (the sun swings over the shot: a time-lapse)
const S10a = (fr: number) => dolly([RACKS[0] - 2.2, GY + 2.3, RACKS[2] + 4.2], [RACKS[0] + 0.3, GY + 0.45, RACKS[2] - 1.4], pushK(fr, A(10), 0.0025), { fov: 44, roll: 0.03 });
// 11: the apprentice's strike, then the master laughing
const S11a = (fr: number) => dolly([KID_AT[0] + 0.4, GY + 1.45, KID_AT[2] + 3.4], [KID_AT[0] - 0.5, GY + 1.1, KID_AT[2] - 0.2], pushK(fr, A(11), 0.0025), { fov: 40 });
const S11b = (fr: number) => dolly([KID_AT[0] + 0.1, GY + 1.3, KID_AT[2] + 2.2], [KID_AT[0] - 0.2, GY + 1.2, KID_AT[2]], pushK(fr, F(CUE.apprentice), 0.003), { fov: 36, roll: 0.04 });
// 12: the wall rising: blocks drop into the top course
const WALL_LOOK: V3 = [-3.5, HY + 2.5, 5.0];
const S12a = (fr: number) => dolly([WALL_LOOK[0] + 1.8, HY + 4.9, WALL_LOOK[2] + 6.0], WALL_LOOK, pushK(fr, A(12), 0.0025), { fov: 42 });
const S12b = (fr: number) => dolly([WALL_LOOK[0] - 6.5, HY + 6.5, WALL_LOOK[2] + 9.5], [WALL_LOOK[0] + 1, HY + 2.0, WALL_LOOK[2] - 1], pushK(fr, F(CUE.slotted), 0.002), { fov: 44, roll: -0.03 });
// 13: the graveyard: slide along the rows, then the pointed and the rounded stones
const S13a = (fr: number) => { const u = (fr - A(13)) / FPS; return { pos: [-8.2, GY + 1.35, 9.5 - 0.35 * u] as V3, look: [-15, GY + 0.75, 4.5 - 0.35 * u] as V3, fov: 42 }; };
const S13b = (fr: number) => dolly([-12.4, GY + 0.95, 1.6], [-14.6, GY + 0.75, -0.4], pushK(fr, F(CUE.pointed), 0.003), { fov: 36, roll: 0.03 });
const S13c = (fr: number) => dolly([-12.6, GY + 0.95, -2.2], [-14.6, GY + 0.7, -3.6], pushK(fr, F(CUE.rounded), 0.003), { fov: 36, roll: -0.03 });
// 14: the older sultan at the new minaret, crane up the tower on "minaret"
const S14a = (fr: number) => dolly([OLD_SULTAN_AT[0] + 1.6, GY + 1.7, OLD_SULTAN_AT[2] + 5.0], [OLD_SULTAN_AT[0], GY + 1.6, OLD_SULTAN_AT[2]], pushK(fr, A(14), 0.002), { fov: 40 });
const S14b = (fr: number) => dolly([MINARET[0] + 9, GY + 6.0, MINARET[2] + 15], [MINARET[0], GY + 8.5, MINARET[2]], pushK(fr, F(CUE.minaret), 0.002), { fov: 44, roll: 0.03 });
// 15: today: golden aerial orbit over the city, push on "standing"
const S15a = (fr: number): Shot => {
  const u = (fr - A(15)) / FPS, a = -0.55 + 0.035 * u, r = 46;
  return { pos: [Math.sin(a) * r, 24 - 0.4 * u, Math.cos(a) * r + 6], look: [2, 4.5, 0], fov: 44 };
};
const S15b = (fr: number) => dolly([-16, 10, 30], [3, 6.5, 1], pushK(fr, F(CUE.standing), 0.002, 0.005, 30), { fov: 42 });
// 16: the apprentice turns to the lens
const S16a = (fr: number) => dolly([KID_CTA[0] + 0.25, GY + 1.25, KID_CTA[2] + 3.0], [KID_CTA[0], GY + 1.1, KID_CTA[2]], pushK(fr, A(16), 0.0025), { fov: 38 });
const S16b = (fr: number) => dolly([KID_CTA[0] - 0.15, GY + 1.2, KID_CTA[2] + 2.0], [KID_CTA[0], GY + 1.15, KID_CTA[2]], pushK(fr, F(CUE.patience), 0.0025, 0.005, 30), { fov: 36, roll: -0.035 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: A(2), s: S2a }],
  3: [{ f: A(3), s: S3a }, { f: F(CUE.outlast) - 12, dur: 24, s: S3b }],
  4: [{ f: A(4), s: S4a }, { f: F(CUE.island), cut: true, s: S4b }, { f: F(CUE.quarry) - 10, dur: 30, s: S4c }],
  5: [{ f: A(5), s: S5a }],
  6: [{ f: A(6), s: S6a }, { f: F(CUE.down) - 10, dur: 22, s: S6b }],
  7: [{ f: A(7), s: S7a }, { f: F(CUE.divers), cut: true, s: S7b }, { f: F(CUE.cut), cut: true, s: S7c }],
  8: [{ f: A(8), s: S8a }],
  9: [{ f: A(9), s: S9a }, { f: F(CUE.soft), cut: true, s: S9b }, { f: F(CUE.carved), cut: true, s: S9c }],
  10: [{ f: A(10), s: S10a }],
  11: [{ f: A(11), s: S11a }, { f: F(CUE.apprentice), cut: true, s: S11b }],
  12: [{ f: A(12), s: S12a }, { f: F(CUE.slotted) - 10, dur: 26, s: S12b }],
  13: [{ f: A(13), s: S13a }, { f: F(CUE.pointed), cut: true, s: S13b }, { f: F(CUE.rounded) - 9, dur: 20, s: S13c }],
  14: [{ f: A(14), s: S14a }, { f: F(CUE.minaret) - 16, dur: 36, s: S14b }],
  15: [{ f: A(15), s: S15a }, { f: F(CUE.standing) - 14, dur: 30, s: S15b }],
  16: [{ f: A(16), s: S16a }, { f: F(CUE.patience) - 10, dur: 24, s: rolled(S16b, -0.035) }],
};

// impact kicks: the image offset flips sign every frame, decays over 7 f
const KICKS: [number, number][] = [[BONK, 1.2], ...WALL_DROPS.map((t) => [t, 0.55] as [number, number]), [CUT_HITS[0], 0.35]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, fr: number): Cam => {
  const c = run(CAMS[id], fr), a = kickAt(T(fr));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens: depth of field per beat ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyesOf = (p: V3, h = 1.62): (() => V3) => () => [p[0], p[1] + h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 12 },                                           // reef close-up: coral sharp, the blue behind soft
  { f: A(2), cInf: 0 },                                          // surface burst + establishing wide
  { f: A(3), cInf: 11, focus: eyesOf(SULTAN_AT) },               // sultan MS
  { f: A(4), cInf: 13, focus: eyesOf(SULTAN_AT) },               // worried CU
  { f: F(CUE.island), cInf: 0 },                                 // aerials
  { f: A(5), cInf: 0 },                                          // palm tilt
  { f: A(6), cInf: 9, focus: () => [0, GY + 1.5, SHORE_Z - 1.2] }, // builders at the water's edge
  { f: A(7), cInf: 0 },                                          // reef wide
  { f: F(CUE.divers), cInf: 8 },                                 // divers (focus = look)
  { f: A(8), cInf: 7 },                                          // hauling
  { f: A(9), cInf: 11, focus: eyesOf(CARVER_AT) },               // carver MS
  { f: F(CUE.soft), cInf: 14 },                                  // chisel CU
  { f: F(CUE.carved), cInf: 0 },                                 // workshop wide
  { f: A(10), cInf: 6 },                                         // drying blocks
  { f: A(11), cInf: 11, focus: eyesOf(KID_AT, 1.15) },           // apprentice
  { f: A(12), cInf: 0 },                                         // wall
  { f: A(13), cInf: 0 },                                         // graveyard slide
  { f: F(CUE.pointed), cInf: 13 },                               // headstone close-ups (focus = look)
  { f: A(14), cInf: 10, focus: eyesOf(OLD_SULTAN_AT) },          // old sultan
  { f: F(CUE.minaret), cInf: 0 },                                // crane
  { f: A(15), cInf: 0 },                                         // today
  { f: A(16), cInf: 13, focus: eyesOf(KID_CTA, 1.15) },          // CTA close-up
];
export const dofAt = (fr: number) => {
  let i = 0; while (i + 1 < DOF.length && fr >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (fr - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
