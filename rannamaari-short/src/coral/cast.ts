// Our cast as lit flat cards in the 3D world (canvas pool, lit cards and unlit effect cards from the template), and
// who does what in every shot of the coral mosque short: the sultan and his courtiers, the master carver and his
// apprentice, builders, divers, townsfolk, today's passers-by, plus the effects (chips, sparks, bubbles, fish, glints,
// drips, drying wisps, dizzy stars).
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, Prop, fxStars, fxContact, fxShadow, fxSplash, fxRing, fxDemon, fxHalo } from "./toon";
import { FPS, GY, SHOTS, V3, TEMPLE, TOMB, BEACH, TRAV_AT, FAMILY_AT, KID_CTA, demonAt, glowAt, smooth, clamp01 } from "./story";
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
let LNAME: "day" | "golden" | "reef" | "night" = "day";
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

const CONTACT: Record<"day" | "golden" | "reef" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], reef: [0.25, 0.4, 0.5], night: [0.15, 0.17, 0.3] };
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

// ---------------- the cast of the legend ----------------
const TRAVELLER: Outfit = { jacket: "#ece5d6", pants: "#3b3f52", boots: "#8a6a4a", dress: "#e4dccb", sash: "#6b8f5a", hat: "turban", cap: "#f4f1e8", beard: "#4a4038", moustache: "#4a4038", skin: SKINS[1], buttons: "#c9b48e" };
const KING: Outfit = SULTAN;
const GIRL: Outfit = { jacket: "#d9a441", pants: "#3b3f52", boots: SKINS[3], dress: "#d9a441", hat: "scarf", cap: "#c25a7a", build: "kid", skin: SKINS[3] };
const MOTHER = WOMAN(1), FATHER = BUILDER(2);
const SK = (i: number) => i % 3 === 1 ? WOMAN(i) : BUILDER(i);

const demon = (out: Stage, id: number, t: number) => {
  const d = demonAt(id, t);
  if (!d || d.rise <= 0.01) return;
  const w = 26 * d.scale, h = w * 1.3, e = q(d.eyes, 10);
  out.fx.push({ key: `demon${e}`, cw: 1000, ch: 1300, draw: (p) => fxDemon(p, e), x: d.pos[0], y: -h * (1 - d.rise) + h / 2 - 1.2, z: d.pos[2], w, h });
  if (id === 11) { const u = q((t * 0.7) % 1, 30); out.fx.push({ key: `ring${u}`, cw: 600, ch: 600, draw: (p) => fxRing(p, u), x: d.pos[0], y: 0.04, z: d.pos[2] - 2, w: 26, h: 26, flat: true }); }
};
const halo = (out: Stage, at: V3, k: number, size = 1.4) => { const kq = q(k, 20); out.fx.push({ key: `halo${kq}`, cw: 300, ch: 300, draw: (p) => fxHalo(p, kq), x: at[0], y: at[1], z: at[2], w: size, h: size, soft: true }); };
const crowd = (out: Stage, cam: CamInfo, t: number, n: number, c: V3, expr: (i: number) => Expr, spread = 5) => {
  for (let i = 0; i < n; i++) {
    const x = c[0] - spread / 2 + (i % 5) * (spread / 4) + (hh(i) - 0.5) * 0.6, z = c[2] - 1.2 - Math.floor(i / 5) * 1.3 + (hh(i, 2) - 0.5) * 0.5;
    stand(out, cam, { i: 40 + i, o: SK(i), okey: `p${i % 6}` }, x, z, { mode: "stand", expr: expr(i), look: (i % 3) - 1, blink: lidAt(t, 40 + i) });
  }
};

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  if (cam.sun) SUN.copy(cam.sun).normalize();
  const lampAt: V3 = [TEMPLE[0], GY + 1.05, TEMPLE[2] + 2.1];
  demon(out, id, t);
  switch (id) {
    case 3: crowd(out, cam, t, 7, [BEACH[0], GY, BEACH[2] + 0.6], (i) => (t > CUE.sacrifice - LEAD ? (i % 2 ? "shock" : "nervous") : "nervous"), 2.8); break;
    case 4: {
      const u = clamp01((t - CUE.girl) / Math.max(0.5, CUE.morning - CUE.girl - 0.3));
      const x = TEMPLE[0] + 4.5 - 4.3 * u, z = TEMPLE[2] + 4 - 1.6 * u;
      stand(out, cam, { i: 5, o: GIRL, okey: "girl" }, x, z, { mode: u < 1 ? "stroll" : "stand", phase: q((t * 1.1) % 1), expr: "nervous", look: -1, blink: lidAt(t, 5) }, 0.8);
      halo(out, lampAt, 0.8, 1.6);
      break;
    }
    case 5: break; // the empty temple at dawn
    case 6: {
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, TRAV_AT[0], TRAV_AT[2], { mode: "stand", expr: t > CUE.name - LEAD ? "smile_closed" : "smile", blink: lidAt(t, 1, [CUE.name]) });
      for (let k = 0; k < 2; k++) stand(out, cam, { i: 60 + k, o: SK(k + 2), okey: `p${k + 2}` }, TRAV_AT[0] - 3 + k * 1.6, TRAV_AT[2] - 2.5, { mode: "stand", expr: "smile", blink: lidAt(t, 60 + k) });
      break;
    }
    case 7: {
      const sob = t > CUE.daughter - LEAD;
      stand(out, cam, { i: 6, o: MOTHER, okey: "mother" }, FAMILY_AT[0] - 0.4, FAMILY_AT[2], { mode: "stand", expr: "pained", blink: lidAt(t, 6) });
      stand(out, cam, { i: 7, o: FATHER, okey: "father" }, FAMILY_AT[0] + 1.3, FAMILY_AT[2] - 0.2, { mode: "stand", expr: sob ? "pained" : "nervous", blink: lidAt(t, 7) });
      stand(out, cam, { i: 5, o: GIRL, okey: "girl" }, FAMILY_AT[0] + 0.5, FAMILY_AT[2] + 0.4, { mode: "stand", expr: "nervous", blink: lidAt(t, 5, [CUE.daughter]) }, 0.8);
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, FAMILY_AT[0] + 3.0, FAMILY_AT[2] + 0.8, { mode: "stand", expr: sob ? "stern" : "neutral", facing: -1, blink: lidAt(t, 1) });
      break;
    }
    case 8: {
      const u = clamp01((t - CUE.place) / 1.1);
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, TEMPLE[0] - 1.8 + 1.8 * u, TEMPLE[2] + 4.5 - 1.8 * u, { mode: u < 1 ? "stroll" : "stand", phase: q((t * 1.2) % 1), expr: "stern", blink: lidAt(t, 1) });
      stand(out, cam, { i: 5, o: GIRL, okey: "girl" }, TEMPLE[0] - 3.2, TEMPLE[2] + 5.4, { mode: "stand", expr: "relief", look: 1, blink: lidAt(t, 5) }, 0.8);
      halo(out, lampAt, 0.6, 1.4);
      break;
    }
    case 9: {
      const k = glowAt(t);
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, TEMPLE[0], TEMPLE[2] + 2.3, { mode: "stand", expr: t > CUE.louder - LEAD ? "stern" : "smile_closed", prop: "book", blink: 0 });
      halo(out, [TEMPLE[0], GY + 1.25, TEMPLE[2] + 2.45], k, 1.4 + 1.6 * k);
      break;
    }
    case 10: {
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, TEMPLE[0], TEMPLE[2] + 2.3, { mode: "stand", expr: "stern", prop: "book", blink: 0 });
      halo(out, [TEMPLE[0], GY + 1.25, TEMPLE[2] + 2.45], 1, 3.2);
      break;
    }
    case 11: {
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, TEMPLE[0], TEMPLE[2] + 2.3, { mode: "stand", expr: t > CUE.sank ? "relief" : "stern", prop: "book", blink: 0 });
      halo(out, [TEMPLE[0], GY + 1.25, TEMPLE[2] + 2.45], 1, 3.0);
      const u = (t - CUE.sank) / 1.1;
      if (u >= 0 && u < 1) out.fx.push({ key: `splash${q(u, 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(u, 30)), x: -11, y: 4, z: 64, w: 20, h: 20 });
      break;
    }
    case 12: {
      stand(out, cam, { i: 1, o: TRAVELLER, okey: "trav" }, BEACH[0] - 0.8, BEACH[2], { mode: "stand", expr: "smile_closed", prop: "book", blink: lidAt(t, 1) });
      stand(out, cam, { i: 9, o: KING, okey: "king" }, BEACH[0] + 1.0, BEACH[2] - 0.4, { mode: "stand", expr: t > CUE.islam - LEAD ? "grin" : "shock", blink: lidAt(t, 9, [CUE.islam]) });
      stand(out, cam, { i: 5, o: GIRL, okey: "girl" }, BEACH[0] - 2.2, BEACH[2] - 0.3, { mode: "stand", expr: "relief_open", blink: lidAt(t, 5) }, 0.8);
      crowd(out, cam, t, 8, [BEACH[0], GY, BEACH[2] - 1.5], (i) => (["grin", "laugh", "relief", "smile"] as Expr[])[i % 4], 7);
      break;
    }
    case 13: {
      for (let k = 0; k < 6; k++) { const x = TOMB[0] - 6 + ((t * 0.7 + k * 2.3) % 10), z = TOMB[2] + 3 + (k % 2) * 1.6; stand(out, cam, { i: 80 + k, o: SK(k), okey: `p${k % 6}` }, x, z, { mode: "stroll", phase: q((t * 1.1 + k * 0.3) % 1), expr: "smile", blink: 0 }); }
      break;
    }
    case 14: {
      const expr: Expr = t < CUE.honest - LEAD ? "smile" : t < CUE.comments - LEAD ? "nervous" : "grin";
      stand(out, cam, { i: 5, o: GIRL, okey: "girl" }, KID_CTA[0], KID_CTA[2], { mode: "stand", expr, prop: t > CUE.comments - 0.4 ? "point" : null, headTilt: t > CUE.honest ? 6 : 0, look: t < CUE.honest ? 1 : 0, blink: lidAt(t, 5, [CUE.honest, CUE.comments]) }, 0.8);
      halo(out, lampAt, 0.8, 1.8);
      break;
    }
  }
  return out;
};
export { FPS };
