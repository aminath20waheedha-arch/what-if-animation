// Our cast as lit flat cards in the 3D world (canvas pool, lit cards and unlit effect cards from the template), and
// who does what in every shot of the coral mosque short: the sultan and his courtiers, the master carver and his
// apprentice, builders, divers, townsfolk, today's passers-by, plus the effects (chips, sparks, bubbles, fish, glints,
// drips, drying wisps, dizzy stars).
import * as THREE from "three";
import {
  Pen, bodyFront, Outfit, Expr, FrontOpts, Prop, fxBurst, fxStars, fxPuff, fxContact, fxShadow,
  fxChips, fxBubbles, fxFish, fxGlint, fxWisp, fxDrips, fxSplash, fxRing,
} from "./toon";
import {
  FPS, GY, HY, SHOTS, V3, REEF, SHORE_Z, BENCH, RACKS, PALM_HERO, MINARET, SULTAN_AT, CARVER_AT, KID_AT, KID_CTA, OLD_SULTAN_AT,
  CARVE_HITS, CUT_HITS, BONK, WALL_DROPS, dryAt, smooth, clamp01,
} from "./story";
import { CUE } from "./plan";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool (template) ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = this.mesh.material === this.soft ? 7 : 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean; mirror?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "reef" = "day";
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

// ---------------- life: blinks ----------------
const LEAD = 2 / FPS;
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

// ---------------- our cast ----------------
const SKINS = ["#d9a77c", "#c99067", "#b9805a", "#e2b48a", "#a8724c"];
const SULTAN: Outfit = { jacket: "#8a2232", pants: "#3b2a2a", boots: "#c9a14a", dress: "#7a1f2b", sash: "#e8c45a", hat: "turban", cap: "#e8c45a", beard: "#3a2a20", moustache: "#3a2a20", build: "stout", skin: SKINS[1], buttons: "#e8c45a" };
const OLD_SULTAN: Outfit = { ...SULTAN, beard: "#e6e2da", moustache: "#e6e2da", cap: "#f1e3b8" };
const COURTIER = (v: number): Outfit => ({ jacket: ["#f4efe6", "#e8dcc6"][v % 2], pants: "#3b3f52", boots: SKINS[(v + 2) % 5], sarong: ["#2f4a6b", "#5a3b5e"][v % 2], stripe: "#e8c45a", hat: "kufi", skin: SKINS[(v + 2) % 5], moustache: v % 2 ? "#2a201a" : undefined, buttons: "#c9a14a" });
const CARVER: Outfit = { jacket: "#f4f1e8", pants: "#3b3f52", boots: SKINS[2], sarong: "#8a6a4a", stripe: "#2a1f18", hat: "kufi", beard: "#8f8a84", moustache: "#8f8a84", skin: SKINS[2], buttons: "#cfc6b4" };
const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: SKINS[1], sarong: "#3b5b9a", stripe: "#f4f1e8", hat: "hair", hair: "#2a1f1a", build: "kid", skin: SKINS[1], buttons: "#f6c48a" };
const BUILDER = (v: number): Outfit => ({
  jacket: ["#e9e2d0", "#c9d8e0", "#e8c9a8", "#d6e3c3"][v % 4], pants: "#3b3f52", boots: SKINS[v % 5], skin: SKINS[v % 5],
  sarong: ["#3e5f4a", "#6b3b3b", "#2f4a6b", "#7a6a3a"][v % 4], stripe: "#1f1a16",
  hat: v % 2 ? "kufi" : "hair", hair: "#241a14", moustache: v % 3 === 1 ? "#241a14" : undefined,
});
const DIVER = (v: number): Outfit => ({ jacket: ["#3a6f8f", "#8f5a3a"][v % 2], pants: "#2b3b4f", boots: SKINS[(v + 1) % 5], skin: SKINS[(v + 1) % 5], hat: "hair", hair: "#1e1712" });
const WOMAN = (v: number): Outfit => ({ jacket: ["#c25a7a", "#5a8fc2", "#d9a441", "#4f9a7a"][v % 4], pants: "#3b3f52", boots: SKINS[(v + 3) % 5], dress: ["#c25a7a", "#5a8fc2", "#d9a441", "#4f9a7a"][v % 4], hat: "scarf", cap: ["#f4efe6", "#2f3e5c", "#7b5ac9", "#e8c9a8"][v % 4], skin: SKINS[(v + 3) % 5] });
const MODERN = (v: number): Outfit => v % 3 === 2 ? WOMAN(v + 1) : ({ jacket: ["#3f6fb5", "#e9e2d0", "#2f8a4f", "#d23b3b"][v % 4], pants: ["#2f3e5c", "#5a5a5a", "#c9b38a"][v % 3], boots: "#2a2a2a", skin: SKINS[v % 5], hat: v % 2 ? "hair" : "kufi", hair: "#1e1712" });

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing, sized by distance, lit from the scene's sun (front view: cards always face the lens) */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, fo: FrontOpts, scale = 1, roll = 0, mirror = false): Place => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2 * scale, z)) / scale;
  const [w, h, k] = tier(d);
  const light = light2D(cam, false), seed = (who.i % 7) + 1;
  const f2: FrontOpts = { ...fo, light, seed };
  return { key: `F|${who.okey}|${fkey(f2)}`, x, y, z, scale, roll, mirror, draw: (p) => bodyFront(p, who.o, f2), size: [w, h, k] };
};

const CONTACT: Record<"day" | "golden" | "reef", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], reef: [0.25, 0.4, 0.5] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};
const stand = (out: Stage, cam: CamInfo, who: Who, x: number, z: number, fo: FrontOpts, scale = 1, y = GY, mirror = false) => {
  out.places.push(person(cam, who, x, y, z, fo, scale, 0, mirror));
  blob(out, x, y, z, scale);
};

/** mallet: 0 raised .. 1 struck; 4 f wind-up, held at the top, 1-frame strike on the beat, 5 f recovery */
const malletK = (t: number, hits: number[]) => {
  let k = 0.15;
  for (const th of hits) {
    const n = (t - th) * FPS;
    if (n >= -6 && n < -2) k = Math.max(0, 0.15 - 0.15 * smooth((n + 6) / 4));
    else if (n >= -2 && n < 0) k = 0;
    else if (n >= 0 && n < 2) k = 1;
    else if (n >= 2 && n < 7) k = Math.min(k, 1 - 0.85 * smooth((n - 2) / 5));
  }
  return k;
};
const hitFx = (out: Stage, t: number, hits: number[], at: V3, size = 0.5, chips = true, col = "#fff3b0") => {
  for (const th of hits) if (t >= th && t < th + 0.3) {
    const u = (t - th) / 0.3;
    if (chips) out.fx.push({ key: `chips${q(u, 30)}`, cw: 300, ch: 300, draw: (p) => fxChips(p, q(u, 30)), x: at[0], y: at[1] + 0.1, z: at[2] + 0.05, w: size * 1.3, h: size * 1.3 });
    if (u < 0.55) out.fx.push({ key: `burst${col}${q(u / 0.55, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u / 0.55, 30), col), x: at[0], y: at[1], z: at[2] + 0.08, w: size, h: size });
  }
};

// ---------------- reef life ----------------
const FISH: [string, string, boolean][] = [["#f2a65a", "#e2453c", true], ["#5ab4e8", "#f1d36b", false], ["#f1d36b", "#3f78b5", true], ["#9a7fd1", "#f7c6d9", false], ["#ef7f6a", "#f4f1e8", true]];
const fishSchool = (out: Stage, t: number, n: number, c: V3, spread: number) => {
  for (let i = 0; i < n; i++) {
    const sp = 0.35 + hh(i, 2) * 0.4, a = t * sp + hh(i) * 6.28, r = spread * (0.4 + hh(i, 3) * 0.6);
    const x = c[0] + Math.cos(a) * r, z = c[2] + Math.sin(a) * r * 0.6, y = c[1] + 0.5 + hh(i, 4) * 2.2 + 0.2 * Math.sin(t * 1.5 + i);
    const dir = -Math.sin(a) >= 0, kind = i % FISH.length, k = q(Math.sin(t * 9 + i * 1.7), 4), s = 0.3 + hh(i, 5) * 0.25;
    const [b, fn, st] = FISH[kind];
    out.fx.push({ key: `fish${kind}${k}`, cw: 300, ch: 180, draw: (p) => fxFish(p, b, fn, k, st), x, y, z, w: s, h: s * 0.6, mirror: !dir });
  }
};
const bubbles = (out: Stage, t: number, at: V3, i: number, s = 0.35) => {
  const u = q((t * 0.7 + hh(i)) % 1, 24);
  out.fx.push({ key: `bub${u}${i % 3}`, cw: 200, ch: 400, draw: (p) => fxBubbles(p, u, i % 3), x: at[0], y: at[1] + s, z: at[2], w: s, h: s * 2, soft: true });
};

// ---------------- the shots ----------------
const S = (id: number) => SHOTS[id - 1];
const sultan = (out: Stage, cam: CamInfo, t: number, id: number) => {
  const worried = id === 4 || (id === 5);
  const expr: Expr = id === 3 ? (t < CUE.outlast - LEAD ? "smile" : "grin") : worried ? "nervous" : "smile";
  const look = id === 4 ? (Math.sin(t * 3) > 0 ? 1 : -1) : 0;
  stand(out, cam, { i: 10, o: SULTAN, okey: "sultan" }, SULTAN_AT[0], SULTAN_AT[2], { mode: "stand", expr, look, blink: lidAt(t, 10, [CUE.outlast, CUE.problem]), facing: id === 4 ? 0 : 0 });
  if (id === 3) {
    stand(out, cam, { i: 11, o: COURTIER(0), okey: "c0" }, SULTAN_AT[0] - 1.6, SULTAN_AT[2] - 1.4, { mode: "stand", expr: "smile_closed", blink: lidAt(t, 11), facing: 1 });
    stand(out, cam, { i: 12, o: COURTIER(1), okey: "c1" }, SULTAN_AT[0] + 1.7, SULTAN_AT[2] - 1.6, { mode: "stand", expr: "neutral", blink: lidAt(t, 12), facing: -1 });
    // builders carrying blocks across the yard behind
    for (let k = 0; k < 2; k++) {
      const x = -6 + ((t - CUE.sultan) * 0.9 + k * 5) % 14, z = 7.6 + k * 0.6;
      stand(out, cam, { i: 20 + k, o: BUILDER(k), okey: `b${k}` }, x, z, { mode: "stroll", phase: q(((t * 0.9) / 0.7 + k * 0.5) % 1), prop: "block", expr: "neutral", blink: lidAt(t, 20 + k) });
    }
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = S(id);
  LNAME = s.light;
  if (cam.sun) SUN.copy(cam.sun).normalize();
  switch (id) {
    case 1: {
      fishSchool(out, t, 12, [REEF[0], REEF[1], REEF[2] - 1], 6);
      for (let i = 0; i < 3; i++) bubbles(out, t, [REEF[0] - 1.5 + i * 1.4, REEF[1] + 0.6, REEF[2] + 1.5 - i], i, 0.3);
      break;
    }
    case 2: {
      // the surface burst: a splash crown right in front of the lens on the first frames
      const u = (t - CUE.built) / 0.8;
      if (u >= 0 && u < 1) out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x: 3.2, y: -0.4, z: 57.5, w: 3.6, h: 3.6 });
      for (let k = 0; k < 5; k++) {
        const x = -4 + k * 2.2 + Math.sin(t * 0.5 + k) * 0.6, z = 9 + (k % 2) * 1.2;
        stand(out, cam, { i: 60 + k, o: k % 3 ? BUILDER(k) : WOMAN(k), okey: `w${k}` }, x, z, { mode: "stroll", phase: q((t * 0.8 + k * 0.3) % 1), expr: "smile", blink: 0 });
      }
      break;
    }
    case 3: sultan(out, cam, t, 3); break;
    case 4: sultan(out, cam, t, 4); break;
    case 5: {
      const x = PALM_HERO[0] + 1.3, z = PALM_HERO[2] + 1.2;
      stand(out, cam, { i: 10, o: SULTAN, okey: "sultan" }, x, z, { mode: "stand", expr: "nervous", look: -1, headTilt: -6, blink: lidAt(t, 10) }, 0.95);
      break;
    }
    case 6: {
      const down = t > CUE.down - LEAD, reef = t > CUE.reef - LEAD - 0.2;
      const crew: [Outfit, string, number, number][] = [[BUILDER(0), "b0", -1.7, 1], [CARVER, "carver", -0.4, 1], [KID, "kid", 0.75, 0.8], [BUILDER(2), "b2", 1.9, 1]];
      crew.forEach(([o, key, dx, sc], i) => {
        const lean = down ? smooth((t - (CUE.down - LEAD)) / 0.25) * (10 + i * 2) : 0;
        const expr: Expr = reef ? "grin" : down ? "neutral" : i === 2 ? "smile" : "neutral";
        stand(out, cam, { i: 30 + i, o, okey: key }, dx, SHORE_Z - 1.2 - (i % 2) * 0.5, { mode: "stand", expr, tilt: 0, headTilt: lean, look: down ? 0 : (i % 2 ? 1 : -1), blink: lidAt(t, 30 + i, [CUE.down]) }, sc);
      });
      break;
    }
    case 7: {
      fishSchool(out, t, 10, [REEF[0] + 2, REEF[1], REEF[2] + 2], 8);
      if (t >= CUE.divers - LEAD) {
        // two divers swim down toward the cutting dome, then one works the coral with mallet and chisel
        const u = clamp01((t - CUE.divers) / 0.9);
        const swim: [number, number, number, number][] = [[-1.8 + 1.0 * u, -1.0 - 2.6 * u, REEF[2] - 0.8, -1.35], [2.6 - 0.6 * u, -0.8 - 2.2 * u, REEF[2] + 0.6, 1.3]];
        swim.forEach(([x, y, z, roll], i) => {
          if (i === 0 && t >= CUE.cut - 0.25) return;
          const kick = Math.sin(t * 7 + i * 2) * 0.08;
          out.places.push(person(cam, { i: 40 + i, o: DIVER(i), okey: `d${i}` }, x, y, z, { mode: "fall", expr: i ? "grin" : "neutral", blink: 0 }, 0.95, roll + kick));
          bubbles(out, t, [x, y + 0.4, z], 40 + i, 0.3);
        });
        if (t >= CUE.cut - 0.25) {
          const k = malletK(t, CUT_HITS), at: V3 = [REEF[0] - 0.9, REEF[1] + 0.75, REEF[2] + 0.7];
          out.places.push(person(cam, { i: 40, o: DIVER(0), okey: "d0" }, at[0] + 0.35, REEF[1] + 0.35 + 0.04 * Math.sin(t * 2), at[2] - 0.25, { mode: "stand", expr: "stern", prop: ["mallet", q(k, 30)], blink: 0, facing: -1 }, 0.95));
          hitFx(out, t, CUT_HITS, at, 0.55);
          bubbles(out, t, [at[0] + 0.35, REEF[1] + 1.9, at[2] - 0.25], 44, 0.32);
        }
      }
      break;
    }
    case 8: {
      // two men carry fresh blocks up from the water's edge toward the lens; a diver surfaces behind
      for (let k = 0; k < 2; k++) {
        const z = SHORE_Z - 1.5 - (t - CUE.hauled) * 0.85 - k * 1.6, x = 0.6 + k * 1.5;
        stand(out, cam, { i: 50 + k, o: BUILDER(k + 1), okey: `b${k + 1}` }, x, z, { mode: "stroll", phase: q(((t - CUE.hauled) * 1.25 + k * 0.5) % 1), prop: "block", expr: k ? "grin" : "neutral", blink: lidAt(t, 50 + k) });
      }
      const sy = -1.25 + 0.5 * smooth((t - CUE.hauled - 0.2) / 0.6);
      out.places.push(person(cam, { i: 41, o: DIVER(1), okey: "d1" }, 4.2, sy, SHORE_Z + 5.5, { mode: "stand", expr: "grin", blink: lidAt(t, 41) }));
      out.fx.push({ key: `ring${q((t * 0.6) % 1, 30)}`, cw: 600, ch: 600, draw: (p) => fxRing(p, q((t * 0.6) % 1, 30)), x: 4.2, y: 0.03, z: SHORE_Z + 5.5, w: 2.2, h: 2.2, flat: true });
      break;
    }
    case 9: {
      const k = malletK(t, CARVE_HITS), at: V3 = [BENCH[0], GY + 1.18, BENCH[2] + 0.18];
      stand(out, cam, { i: 2, o: CARVER, okey: "carver" }, CARVER_AT[0], CARVER_AT[2], { mode: "stand", expr: t > CUE.trick + 0.4 ? "smile" : "neutral", prop: ["mallet", q(k, 30)], blink: lidAt(t, 2) });
      hitFx(out, t, CARVE_HITS, at, 0.42);
      const kidExpr: Expr = t < CUE.soft - LEAD ? "smile" : t < CUE.wood ? "shock" : "grin";
      stand(out, cam, { i: 3, o: KID, okey: "kid" }, KID_AT[0], KID_AT[2], { mode: "stand", expr: kidExpr, look: -1, blink: lidAt(t, 3, [CUE.soft, CUE.wood]), facing: -1 }, 0.8);
      if (t > CUE.carved - LEAD) {
        // two more carvers at the stacks, on their own beats
        for (let j = 0; j < 2; j++) {
          const hits = CARVE_HITS.map((h) => h + 0.17 + j * 0.21);
          const px = BENCH[0] - 4.4 - j * 2.6, pz = BENCH[2] + 0.4 - j * 0.8;
          stand(out, cam, { i: 22 + j, o: BUILDER(j + 2), okey: `b${j + 2}` }, px, pz, { mode: "stand", expr: "smile", prop: ["mallet", q(malletK(t, hits), 30)], blink: lidAt(t, 22 + j) });
          hitFx(out, t, hits, [px + 0.25, GY + 0.95, pz + 0.3], 0.35);
        }
      }
      break;
    }
    case 10: {
      const dk = dryAt(t);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k += 2) {
        const x = RACKS[0] - 1.9 + k * 0.64, z = RACKS[2] - r * 1.5, i = r * 7 + k;
        if (dk < 0.45) { const u = q((t * 0.9 + hh(i)) % 1, 20); out.fx.push({ key: `drip${u}`, cw: 200, ch: 300, draw: (p) => fxDrips(p, u), x, y: GY + 0.45, z: z + 0.3, w: 0.28, h: 0.42 }); }
        else if (dk < 0.9) { const u = q((t * 0.5 + hh(i, 2)) % 1, 20); out.fx.push({ key: `wisp${u}`, cw: 300, ch: 400, draw: (p) => fxWisp(p, u), x, y: GY + 1.1, z, w: 0.5, h: 0.7, soft: true }); }
        else if (hh(i, 3) < 0.5) { const u = q(clamp01((t - CUE.stone + 0.2 + hh(i) * 0.3) / 0.5), 20); out.fx.push({ key: `glint${u}`, cw: 240, ch: 240, draw: (p) => fxGlint(p, u), x, y: GY + 0.85, z: z + 0.3, w: 0.45, h: 0.45 }); }
      }
      break;
    }
    case 11: {
      // the apprentice tries a dry block: wind-up, the strike on "hard", the mallet bounces, dizzy stars
      const n = (t - BONK) * FPS;
      const k = n < -9 ? 0.2 : n < -3 ? 0.2 - 0.2 * smooth((n + 9) / 6) : n < 0 ? 0 : n < 3 ? 1 : 1 - 0.9 * smooth((n - 3) / 4);
      const shake = n >= 0 && n < 12 ? (n % 2 ? -1 : 1) * 3 * (1 - n / 12) : 0;
      const expr: Expr = n < 0 ? "stern" : t < CUE.apprentice - LEAD ? "shock" : "dazed";
      stand(out, cam, { i: 3, o: KID, okey: "kid" }, KID_AT[0], KID_AT[2], { mode: "stand", expr, prop: ["mallet", q(k, 30)], tilt: shake, blink: lidAt(t, 3, [BONK]) }, 0.8, GY, true);
      const at: V3 = [BENCH[0] + 0.72, GY + 1.02, BENCH[2] + 0.25];
      if (n >= 0 && n < 9) { const u = n / 9; out.fx.push({ key: `bonk${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 30), "#fff6d0", 12, 40, 240), x: at[0], y: at[1], z: at[2] + 0.1, w: 0.9, h: 0.9 }); }
      if (t > CUE.apprentice - 0.3) { const u = q((t * 1.1) % 1, 30); out.fx.push({ key: `stars${u}`, cw: 420, ch: 210, draw: (p) => fxStars(p, u), x: KID_AT[0], y: GY + 1.45, z: KID_AT[2] + 0.05, w: 0.62, h: 0.31 }); }
      stand(out, cam, { i: 2, o: CARVER, okey: "carver" }, BENCH[0] - 1.45, BENCH[2] + 0.3, { mode: "stand", expr: t > CUE.apprentice ? "laugh" : "smile", blink: lidAt(t, 2, [CUE.apprentice]), facing: 1 });
      break;
    }
    case 12: {
      // builders on the scaffold plank beside the gap, a puff on every landing
      for (let k = 0; k < 2; k++) out.places.push(person(cam, { i: 24 + k, o: BUILDER(k), okey: `b${k}` }, k ? -2.0 : -6.9, HY + 1.85, 5.65, { mode: "stand", expr: t > WALL_DROPS[0] ? "grin" : "smile", blink: lidAt(t, 24 + k), facing: k ? -1 : 1 }));
      WALL_DROPS.forEach((td, i) => {
        const u = (t - td) / 0.4;
        if (u >= 0 && u < 1) out.fx.push({ key: `puff${q(u, 30)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 30)), x: -5.4 + i * 0.6, y: HY + 2.6, z: 5.15, w: 0.9, h: 0.9, soft: true });
      });
      break;
    }
    case 13: {
      if (t < CUE.pointed - LEAD) stand(out, cam, { i: 3, o: KID, okey: "kid" }, -12.6, 6.0 - 0.35 * (t - CUE.graves), { mode: "stroll", phase: q((t * 1.3) % 1), expr: "smile", facing: -1, blink: lidAt(t, 3) }, 0.8);
      for (const [cue, sz] of [[CUE.pointed, -0.4], [CUE.rounded, -3.6]] as const) {
        const u = (t - cue) / 0.7;
        if (u >= 0 && u < 1) out.fx.push({ key: `glint${q(u, 20)}`, cw: 240, ch: 240, draw: (p) => fxGlint(p, q(u, 20)), x: -14.6, y: GY + (sz < -1 ? 1.15 : 1.35), z: sz + 0.15, w: 0.55, h: 0.55 });
      }
      stand(out, cam, { i: 70, o: WOMAN(1), okey: "w1" }, -16.4, 6.5, { mode: "stand", expr: "smile_closed", blink: lidAt(t, 70) });
      break;
    }
    case 14: {
      stand(out, cam, { i: 15, o: OLD_SULTAN, okey: "oldsultan" }, OLD_SULTAN_AT[0], OLD_SULTAN_AT[2], { mode: "stand", expr: t > CUE.minaret - LEAD ? "smile_closed" : "smile", headTilt: -4, blink: lidAt(t, 15) });
      stand(out, cam, { i: 13, o: COURTIER(1), okey: "c1" }, OLD_SULTAN_AT[0] - 1.6, OLD_SULTAN_AT[2] - 1.0, { mode: "stand", expr: "smile", blink: lidAt(t, 13), facing: 1 });
      break;
    }
    case 15: {
      for (let k = 0; k < 9; k++) {
        const sp = 0.6 + hh(k) * 0.5, x = -12 + ((t * sp + k * 3.1) % 24), z = 8.5 + (k % 3) * 2.4 + (k > 5 ? 9 : 0);
        stand(out, cam, { i: 80 + k, o: MODERN(k), okey: `m${k}` }, x, z, { mode: "stroll", phase: q((t * sp * 1.4 + hh(k, 2)) % 1), expr: "smile", blink: 0 });
      }
      break;
    }
    case 16: {
      const expr: Expr = t < CUE.honest - LEAD ? "smile_closed" : t < CUE.patience - LEAD ? "smile" : t < CUE.comments - LEAD ? "grin" : "relief_open";
      const prop: Prop = t > CUE.comments - 0.4 ? "point" : "block";
      stand(out, cam, { i: 3, o: KID, okey: "kid" }, KID_CTA[0], KID_CTA[2], { mode: "stand", expr, prop, headTilt: t > CUE.honest && t < CUE.patience ? 6 : 0, blink: lidAt(t, 3, [CUE.honest, CUE.patience, CUE.comments]) }, 0.8);
      stand(out, cam, { i: 2, o: CARVER, okey: "carver" }, CARVER_AT[0], CARVER_AT[2], { mode: "stand", expr: "smile", prop: ["mallet", q(malletK(t, [CUE.time, CUE.time + 0.5]), 30)], blink: lidAt(t, 2) });
      break;
    }
  }
  return out;
};
export { FPS, MINARET };
