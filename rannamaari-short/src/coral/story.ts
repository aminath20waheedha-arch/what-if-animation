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
/** the idol temple by the shore (legend era) and the traveller's tomb (today) */
export const TEMPLE: V3 = [-12, GY, 40];
export const TOMB: V3 = [17, GY, 13];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

// ---------------- shots ----------------
export type Light = "day" | "golden" | "reef" | "night";
/** era of the set: build = 1658 building site (low walls, scaffolds, workshop), done = finished hall, minaret from 1675,
 *  today = the modern city around it */
export type Era = "build" | "done" | "done1675" | "today" | "legend";
export type ShotDef = { id: number; a: number; b: number; light: Light; era: Era; sunAz?: number; sunEl?: number; showSun?: boolean };
const f = F;
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: f(CUE.ship), light: "night", era: "legend", showSun: true, sunAz: 15, sunEl: 12 },
  { id: 2, a: f(CUE.ship), b: f(CUE.called), light: "night", era: "legend", showSun: true, sunAz: -25, sunEl: 14 },
  { id: 3, a: f(CUE.called), b: f(CUE.girl), light: "night", era: "legend" },
  { id: 4, a: f(CUE.girl), b: f(CUE.morning), light: "night", era: "legend" },
  { id: 5, a: f(CUE.morning), b: f(CUE.then), light: "golden", era: "legend", sunAz: 140, sunEl: 10 },
  { id: 6, a: f(CUE.then), b: f(CUE.crying), light: "day", era: "legend" },
  { id: 7, a: f(CUE.crying), b: f(CUE.place), light: "day", era: "legend" },
  { id: 8, a: f(CUE.place), b: f(CUE.night), light: "golden", era: "legend", sunAz: 140, sunEl: 9 },
  { id: 9, a: f(CUE.night), b: f(CUE.rose), light: "night", era: "legend" },
  { id: 10, a: f(CUE.rose), b: f(CUE.turned), light: "night", era: "legend" },
  { id: 11, a: f(CUE.turned), b: f(CUE.king), light: "night", era: "legend", showSun: true, sunAz: -20, sunEl: 14 },
  { id: 12, a: f(CUE.king), b: f(CUE.tomb), light: "day", era: "legend" },
  { id: 13, a: f(CUE.tomb), b: f(CUE.cta), light: "golden", era: "today", sunAz: 145, sunEl: 14 },
  { id: 14, a: f(CUE.cta), b: TOTAL, light: "night", era: "legend" },
];
/** crossfades (frames) at time jumps; white flashes at the surface burst and after the hook */
export const XFADE: Record<number, number> = { 5: 10, 6: 10, 8: 10, 9: 10, 12: 10, 13: 12, 14: 10 };
export const FLASHES = [f(CUE.stopped)];

export const shotAt = (fr: number) => SHOTS.find((s) => fr >= s.a && fr < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (fr: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && fr >= s.a - x / 2 && fr < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (fr - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(fr).id, alpha: 1 }];
};

// ---------------- story beats (seconds) used by the cast and the world ----------------
/** where the demon is: rises far out (shots 1-2), approaches the temple (shot 10), stops, sinks (shot 11) */
export const DEMON_FAR: V3 = [-2, 0, 125];
export const DEMON_NEAR: V3 = [-11, 0, 66];
export const demonAt = (id: number, t: number): { pos: V3; rise: number; scale: number; eyes: number } | null => {
  if (id === 1) return { pos: DEMON_FAR, rise: 0.15 + 0.25 * smooth((t - CUE.hook) / 4), scale: 1, eyes: 0 };
  if (id === 2 || id === 3) { const u = smooth((t - CUE.ship) / 3); return { pos: DEMON_FAR, rise: 0.4 + 0.6 * u, scale: 1, eyes: smooth((t - CUE.glowing) / 1) }; }
  if (id === 10) {
    const u = smooth((t - CUE.rose) / Math.max(0.5, CUE.stopped - CUE.rose));
    const p: V3 = [DEMON_FAR[0] + (DEMON_NEAR[0] - DEMON_FAR[0]) * u, 0, DEMON_FAR[2] + (DEMON_NEAR[2] - DEMON_FAR[2]) * u];
    return { pos: p, rise: 1, scale: 1 + 0.25 * u, eyes: 1 };
  }
  if (id === 11) { const u = smooth((t - CUE.sank + 0.4) / 1.6); return { pos: DEMON_NEAR, rise: 1 - u, scale: 1.25, eyes: 1 - u }; }
  return null;
};
/** the lamp in the temple, the glow of the recitation (shot 9 grows on "louder") */
export const glowAt = (t: number) => 0.4 + 0.6 * smooth((t - CUE.louder + 0.3) / 1.2);

// ---------------- camera ----------------
/** (coral-short leftovers the shared world code still reads) */
export const WALL_DROPS: number[] = [];
export const dryAt = (_t: number) => 1;

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
export const BEACH: V3 = [-4, GY, 46];
export const TRAV_AT: V3 = [-3, GY, 45];
export const FAMILY_AT: V3 = [-20, GY, 30];
export const KID_CTA: V3 = [TEMPLE[0] + 1.2, GY, TEMPLE[2] + 3.2];

const T0 = TEMPLE;
// 1: low over the night sea, a far glow on the horizon
const S1a = (fr: number) => dolly([2, 1.1, 56], [-2, 4, 125], pushK(fr, 0, 0.0018), { fov: 44, roll: -0.02 });
// 2: from the beach: the ship of lights rising far out at sea
const S2a = (fr: number) => dolly([-1, GY + 1.8, 38], [-2, 8, 125], pushK(fr, A(2), 0.002, 0.004, 30), { fov: 40 });
// 3: the islanders on the beach, scared; push on "sacrifice"
const S3a = (fr: number) => dolly([BEACH[0] + 0.5, GY + 1.7, BEACH[2] - 8.0], [BEACH[0], GY + 1.5, BEACH[2]], pushK(fr, A(3), 0.0025), { fov: 40 });
const S3b = (fr: number) => dolly([BEACH[0] - 0.3, GY + 1.6, BEACH[2] - 4.2], [BEACH[0], GY + 1.55, BEACH[2]], pushK(fr, F(CUE.sacrifice), 0.003, 0.006, 24), { fov: 36, roll: 0.04 });
// 4: the girl walks along the shore to the temple
const S4a = (fr: number) => dolly([T0[0] + 7, GY + 1.6, T0[2] + 7], [T0[0] + 1.5, GY + 1.3, T0[2] + 1.8], pushK(fr, A(4), 0.002), { fov: 42 });
// 5: dawn, the empty temple
const S5a = (fr: number) => dolly([T0[0] + 1.2, GY + 1.5, T0[2] + 8], [T0[0], GY + 1.3, T0[2] + 1.6], pushK(fr, A(5), 0.003), { fov: 40 });
// 6: a dhoni lands, the traveller on the beach; CU on "His name"
const S6a = (fr: number) => dolly([TRAV_AT[0] + 5, GY + 2.0, TRAV_AT[2] - 6], [TRAV_AT[0], GY + 1.4, TRAV_AT[2] + 2], pushK(fr, A(6), 0.002), { fov: 42 });
const S6b = (fr: number) => dolly([TRAV_AT[0] + 0.3, GY + 1.75, TRAV_AT[2] - 3.2], [TRAV_AT[0], GY + 1.65, TRAV_AT[2]], pushK(fr, F(CUE.name), 0.003), { fov: 36, roll: -0.03 });
// 7: the family crying at their house, the traveller listening
const S7a = (fr: number) => dolly([FAMILY_AT[0] + 3.5, GY + 1.5, FAMILY_AT[2] + 6], [FAMILY_AT[0] + 0.5, GY + 1.25, FAMILY_AT[2]], pushK(fr, A(7), 0.0025), { fov: 40 });
const S7b = (fr: number) => dolly([FAMILY_AT[0] + 0.4, GY + 1.2, FAMILY_AT[2] + 3.0], [FAMILY_AT[0] + 0.5, GY + 1.0, FAMILY_AT[2]], pushK(fr, F(CUE.daughter), 0.003, 0.005, 24), { fov: 36, roll: 0.03 });
// 8: dusk: he walks to the temple door
const S8a = (fr: number) => dolly([T0[0] - 2.5, GY + 1.5, T0[2] + 8], [T0[0] + 0.3, GY + 1.3, T0[2] + 2], pushK(fr, A(8), 0.0025), { fov: 40 });
// 9: night: he sits in the doorway reciting, the glow grows; push on "louder"
const S9a = (fr: number) => dolly([T0[0] + 0.6, GY + 1.3, T0[2] + 6.5], [T0[0], GY + 1.1, T0[2] + 2.3], pushK(fr, A(9), 0.0025), { fov: 40 });
const S9b = (fr: number) => dolly([T0[0] + 0.2, GY + 1.15, T0[2] + 4.2], [T0[0], GY + 1.1, T0[2] + 2.3], pushK(fr, F(CUE.louder), 0.0025, 0.007, 30), { fov: 36, roll: -0.04 });
// 10: low behind the temple, the demon comes in from the sea; hard stop on "stopped"
const S10a = (fr: number) => dolly([T0[0] + 2.5, GY + 0.6, T0[2] - 4], [-10, 9, 80], pushK(fr, A(10), 0.0022), { fov: 50, roll: 0.03 });
const S10b = (fr: number) => dolly([T0[0] + 1.2, GY + 0.4, T0[2] - 2.5], [-11, 21, 70], pushK(fr, F(CUE.closer), 0.002, 0.005, 30), { fov: 58, roll: -0.04 });
// 11: it turns and sinks: wide from the beach
const S11a = (fr: number) => dolly([T0[0] + 6, GY + 2.2, T0[2] - 3], [-11, 5, 66], pushK(fr, A(11), 0.0018), { fov: 46 });
// 12: day: the king and the island cheer the traveller
const S12a = (fr: number) => dolly([BEACH[0] + 1, GY + 2.2, BEACH[2] - 9], [BEACH[0], GY + 1.3, BEACH[2]], pushK(fr, A(12), 0.0022), { fov: 44 });
// 13: today: the mosque compound and the tomb
const S13a = (fr: number): Shot => { const u = (fr - A(13)) / FPS, a = 0.35 + 0.035 * u, r = 34; return { pos: [TOMB[0] + Math.sin(a) * r, 15 - 0.3 * u, TOMB[2] + Math.cos(a) * r], look: [TOMB[0] - 4, 3, TOMB[2] - 4], fov: 44 }; };
// 14: the question: the girl with a lamp at the temple
const S14a = (fr: number) => dolly([KID_CTA[0] + 0.25, GY + 1.25, KID_CTA[2] + 4.4], [KID_CTA[0], GY + 1.05, KID_CTA[2]], pushK(fr, A(14), 0.0025), { fov: 38 });
const S14b = (fr: number) => dolly([KID_CTA[0] - 0.15, GY + 1.2, KID_CTA[2] + 3.2], [KID_CTA[0], GY + 1.1, KID_CTA[2]], pushK(fr, F(CUE.honest), 0.0025, 0.005, 30), { fov: 36, roll: -0.035 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: A(2), s: S2a }],
  3: [{ f: A(3), s: S3a }, { f: F(CUE.sacrifice) - 10, dur: 22, s: S3b }],
  4: [{ f: A(4), s: S4a }],
  5: [{ f: A(5), s: S5a }],
  6: [{ f: A(6), s: S6a }, { f: F(CUE.name), cut: true, s: S6b }],
  7: [{ f: A(7), s: S7a }, { f: F(CUE.daughter), cut: true, s: S7b }],
  8: [{ f: A(8), s: S8a }],
  9: [{ f: A(9), s: S9a }, { f: F(CUE.louder) - 10, dur: 26, s: S9b }],
  10: [{ f: A(10), s: S10a }, { f: F(CUE.closer), cut: true, s: S10b }],
  11: [{ f: A(11), s: S11a }],
  12: [{ f: A(12), s: S12a }],
  13: [{ f: A(13), s: S13a }],
  14: [{ f: A(14), s: S14a }, { f: F(CUE.honest) - 10, dur: 24, s: rolled(S14b, -0.035) }],
};

const KICKS: [number, number][] = [[CUE.stopped, 1.4], [CUE.sank, 0.8], [CUE.sacrifice, 0.4]];
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

export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const eyesOf = (p: V3, h = 1.62): (() => V3) => () => [p[0], p[1] + h, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: A(3), cInf: 11, focus: eyesOf(BEACH) },
  { f: A(4), cInf: 6 },
  { f: A(5), cInf: 8 },
  { f: A(6), cInf: 0 },
  { f: F(CUE.name), cInf: 12, focus: eyesOf(TRAV_AT) },
  { f: A(7), cInf: 10, focus: eyesOf(FAMILY_AT, 1.3) },
  { f: A(8), cInf: 6 },
  { f: A(9), cInf: 12 },
  { f: A(10), cInf: 0 },
  { f: A(14), cInf: 13, focus: eyesOf(KID_CTA, 1.15) },
];
export const dofAt = (fr: number) => {
  let i = 0; while (i + 1 < DOF.length && fr >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (fr - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
