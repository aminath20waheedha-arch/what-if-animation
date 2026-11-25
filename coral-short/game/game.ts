// Coral Island 1658: a walk-around game on the set of the coral mosque short, in the short's own look:
// the cast is drawn by the short's toon.ts (bean heads, plum ink, sarongs, kufis, turban, mallet, coral block) on
// camera-facing cards; the world uses the short's painted textures (paint2.ts) and two-tone shading (shade.ts);
// buildings get black ink outlines (inverted hulls, cheap enough for phones).
import * as THREE from "three";
import { Pen, bodyFront, Outfit, Expr, FrontOpts, Prop, fxChips } from "../src/coral/toon";
import { sandHD, coralWallHD, friezeHD, frondTex, trunkTex, thatchHD, seafloorHD, plasterHD, houseFacade, hullTex } from "../src/coral/paint2";
import { TONE, twoTone } from "../src/coral/shade";
import { cloudHD } from "../src/coral/paint";

const $ = (id: string) => document.getElementById(id)!;
const canvas = $("game") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#6aa8e6");
scene.fog = new THREE.Fog("#b8d0ec", 70, 200);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);

// two-tone light, the short's day preset (front-lit tropical noon)
TONE.uLitCol.value.set(1.58, 1.5, 1.33); TONE.uShadeCol.value.set(0.3, 0.29, 0.36); TONE.uShadeLift.value.set(0.05, 0.06, 0.11);
TONE.uLambert.value = 0.35; TONE.uSideK.value = 0.84; TONE.uTerm.value = 0.2; TONE.uSat.value = 1.08;
scene.add(new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55));
const sun = new THREE.DirectionalLight("#fff3e0", 2.8);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

// sky gradient + painted clouds
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "varying vec3 vP; void main(){ float e = clamp(vP.y,0.0,1.0); vec3 h = vec3(0.72,0.82,0.93), t = vec3(0.2,0.45,0.8); gl_FragColor = vec4(mix(h,t,pow(e,0.55)),1.0); }",
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat); scene.add(sky);
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2, m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cloudHD(i % 4), transparent: true, depthWrite: false, fog: false }));
  m.position.set(Math.cos(a) * 380, 70 + (i % 3) * 25, Math.sin(a) * 380); m.scale.set(140, 70, 1); m.lookAt(0, m.position.y, 0); scene.add(m);
}

// ---------- helpers ----------
const lam = (p: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial(p));
const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
const INK = new THREE.MeshBasicMaterial({ color: "#0b0a0c", side: THREE.BackSide, fog: true });
/** ink outline: a slightly bigger back-face copy in near-black (inverted hull) */
const inked = (m: THREE.Mesh, w = 0.05) => {
  m.geometry.computeBoundingBox();
  const s = new THREE.Vector3(); m.geometry.boundingBox!.getSize(s);
  const h = new THREE.Mesh(m.geometry, INK);
  h.scale.set(1 + (2 * w) / Math.max(s.x, 0.05), 1 + (2 * w) / Math.max(s.y, 0.05), 1 + (2 * w) / Math.max(s.z, 0.05));
  m.add(h); return m;
};
const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ink = 0.05) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  if (ink) inked(m, ink); scene.add(m); return m;
};
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- island, lagoon, reef ----------
const ISLE_R = 46, GY = 0.4;
const sand = lam({ map: rep(sandHD(), 10, 10) });
const isle = new THREE.Mesh(new THREE.CylinderGeometry(ISLE_R, ISLE_R + 7, 1.6, 72), sand); isle.position.y = GY - 0.8; isle.receiveShadow = true; scene.add(isle);
const floorM = lam({ map: rep(seafloorHD(), 30, 30) });
const floor = new THREE.Mesh(new THREE.CircleGeometry(300, 48), floorM); floor.rotation.x = -Math.PI / 2; floor.position.y = -3.2; scene.add(floor);
const waterU = { t: { value: 0 } };
const water = new THREE.Mesh(new THREE.CircleGeometry(300, 72), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: waterU,
  vertexShader: "varying vec3 vW; void main(){ vW = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vW,1.0); }",
  fragmentShader: `uniform float t; varying vec3 vW;
    void main(){ float r = length(vW.xz) - ${ISLE_R.toFixed(1)};
      vec3 c = mix(vec3(0.43,0.88,0.88), vec3(0.13,0.71,0.8), smoothstep(2.0,24.0,r)); c = mix(c, vec3(0.08,0.4,0.66), smoothstep(30.0,90.0,r));
      float w = sin(vW.x*0.7+t*1.3)*sin(vW.z*0.6-t*1.1); c += vec3(0.12)*smoothstep(0.75,0.98,w);
      c = mix(c, vec3(1.0), (1.0-smoothstep(0.0,1.8,abs(r)))*0.6);
      gl_FragColor = vec4(c, mix(0.55, 0.92, smoothstep(0.0,40.0,r))); }`,
}));
water.rotation.x = -Math.PI / 2; water.renderOrder = 2; scene.add(water);
const REEF = new THREE.Vector3(0, -3, 62);
const coralCols = ["#e889a8", "#f2a65a", "#9a7fd1", "#f1d36b", "#5cc7b9", "#ef7f6a"];
for (let i = 0; i < 50; i++) {
  const a = rnd() * Math.PI * 2, d = 3 + rnd() * 15;
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + rnd() * 1.2, 2), lam({ color: coralCols[i % 6] }));
  m.position.set(REEF.x + Math.cos(a) * d, -2.9, REEF.z + Math.sin(a) * d * 0.7); m.scale.y = 0.6; inked(m, 0.06); scene.add(m);
}
{ const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lam({ color: "#e6d7b0" })); dome.position.copy(REEF); inked(dome, 0.06); scene.add(dome); }

// ---------- the mosque building site ----------
const coralM = (x: number, y: number) => lam({ map: rep(coralWallHD(), x, y) });
box(22, 0.6, 14, coralM(11, 0.3), 0, GY + 0.3, -8, 0.04);
const WALL_Y0 = GY + 0.6;
const walls = [box(18, 1, 0.6, coralM(9, 0.5), 0, 0, -2), box(18, 1, 0.6, coralM(9, 0.5), 0, 0, -14), box(0.6, 1, 12.6, coralM(6, 0.5), -9, 0, -8), box(0.6, 1, 12.6, coralM(6, 0.5), 9, 0, -8)];
const frieze = box(18.1, 0.35, 0.62, lam({ map: rep(friezeHD(), 9, 1) }), 0, 0, -2, 0.03);
let wallH = 1.6;
const setWall = (h: number) => { for (const m of walls) { m.scale.y = h; m.position.y = WALL_Y0 + h / 2; } frieze.position.y = WALL_Y0 + h - 0.2; };
setWall(wallH);
const wood = lam({ color: "#9a6a42" }), pole = lam({ color: "#b08a5c" });
for (let x = -8; x <= 8; x += 4) box(0.12, 5.5, 0.12, pole, x, GY + 2.7, -1.0, 0.03);
box(18, 0.12, 0.9, wood, 0, GY + 2.1, -1.0, 0.03);
const BENCHES = [new THREE.Vector3(-8, GY, 8), new THREE.Vector3(-3, GY, 9), new THREE.Vector3(2, GY, 8)];
for (const b of BENCHES) {
  box(2, 0.12, 0.9, wood, b.x, GY + 0.8, b.z, 0.03);
  for (const [dx, dz] of [[-0.85, -0.35], [0.85, -0.35], [-0.85, 0.35], [0.85, 0.35]]) box(0.1, 0.8, 0.1, wood, b.x + dx, GY + 0.4, b.z + dz, 0);
  box(0.7, 0.36, 0.5, lam({ map: friezeHD() }), b.x, GY + 1.04, b.z, 0.03);
}
const RACK = new THREE.Vector3(9, GY, 9);
const dryM = lam({ map: rep(coralWallHD(), 0.3, 0.3), color: "#fffaf0" }), wetM = lam({ map: rep(coralWallHD(), 0.3, 0.3), color: "#c2ad8c" });
for (let r = 0; r < 2; r++) { box(4.6, 0.1, 0.8, wood, RACK.x, GY + 0.35, RACK.z + r * 1.6, 0.03); for (let k = 0; k < 6; k++) box(0.6, 0.32, 0.5, k % 2 ? dryM : wetM, RACK.x - 1.9 + k * 0.76, GY + 0.56, RACK.z + r * 1.6, 0.03); }
const DROP = new THREE.Vector3(-4, GY, 14);
const stack: THREE.Mesh[] = [];
let stackN = 0;
const addToStack = () => { const i = stackN++ % 12; const m = box(0.6, 0.32, 0.5, wetM, DROP.x + (i % 4) * 0.66, GY + 0.16 + Math.floor(i / 4) * 0.34, DROP.z, 0.03); stack.push(m); if (stack.length > 12) scene.remove(stack.shift()!); };
for (let i = 0; i < 6; i++) addToStack();

// ---------- palms (painted fronds, ringed trunks), thatched houses, dhonis ----------
const frondM = lam({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide });
const trunkM = lam({ map: trunkTex() });
const frondGeo = (() => {
  const L = 4.2, n = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, z = L * t, y = 1.0 * Math.sin(Math.PI * t * 0.55) - 2.1 * t * t; for (const s of [-1, 0, 1]) { pos.push(s * 0.7, y + 0.15 * Math.abs(s) * t, z); uv.push(0.5 + s * 0.5, t); } }
  for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
})();
const palms: THREE.Group[] = [];
const palm = (x: number, z: number, h: number) => {
  const g = new THREE.Group(); g.position.set(x, GY, z);
  const lean = (rnd() - 0.5) * 0.5, cv = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(lean * 0.3, h * 0.5, 0), new THREE.Vector3(lean, h, 0)]);
  const tr = new THREE.Mesh(new THREE.TubeGeometry(cv, 10, 0.2, 8), trunkM); tr.castShadow = true; inked(tr, 0.04); g.add(tr);
  const top = new THREE.Group(); top.position.set(lean, h, 0); g.add(top);
  for (let k = 0; k < 9; k++) { const f = new THREE.Mesh(frondGeo, frondM); f.rotation.set(-0.15 + rnd() * 0.3, (k / 9) * Math.PI * 2, 0); f.castShadow = true; top.add(f); }
  for (let k = 0; k < 4; k++) top.add(inked(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lam({ color: k % 2 ? "#7b5a2e" : "#7a9a3a" })), {}), 0.03).translateX(Math.cos(k * 1.6) * 0.25).translateY(-0.25).translateZ(Math.sin(k * 1.6) * 0.25));
  scene.add(g); palms.push(g);
};
for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2 + rnd() * 0.1, r = ISLE_R - 3 - rnd() * 5; palm(Math.cos(a) * r, Math.sin(a) * r, 6.5 + rnd() * 3); }
for (const [x, z] of [[-15, 4], [14, -2], [-14, -16], [16, 14], [-20, 18], [22, -18], [-24, -4]]) palm(x, z, 7.5);
const thatchM = lam({ map: rep(thatchHD(), 2, 2) }), wallW = lam({ map: rep(plasterHD("#f5f0e4"), 1, 1) });
for (let i = 0; i < 14; i++) {
  const a = (i / 14) * Math.PI * 2 + 0.2, r = 29 + rnd() * 7, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (z > 20 && Math.abs(x) < 14) continue;
  const g = new THREE.Group(); g.position.set(x, GY, z); g.rotation.y = Math.atan2(-x, -z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.7, 4), [wallW, wallW, wallW, wallW, lam({ map: houseFacade(String(i % 4), 5, 2.7, ["#f3ece0", "#efe3cf", "#f6f1e7", "#ead9c2"][i % 4], ["#5b3a24", "#2f5f6a", "#7a3b2e", "#3f5a2a"][i % 4]) }), wallW]);
  body.position.y = 1.35; body.castShadow = body.receiveShadow = true; inked(body, 0.05); g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2, 4), thatchM); roof.position.y = 3.7; roof.rotation.y = Math.PI / 4; roof.castShadow = true; inked(roof, 0.06); g.add(roof);
  scene.add(g);
}
const hullM = lam({ map: hullTex(), side: THREE.DoubleSide }), sailM = lam({ color: "#f3ead3", side: THREE.DoubleSide });
const dhonis: THREE.Group[] = [];
for (const [x, z, yaw] of [[-10, 56, 0.3], [14, 66, -0.5], [30, 42, 1.2]]) {
  const g = new THREE.Group(); g.position.set(x, 0.1, z); g.rotation.y = yaw;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 1.8), hullM); inked(hull, 0.05); g.add(hull);
  const prow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2, 0.4), hullM); prow.position.set(3, 0.8, 0); prow.rotation.z = -0.4; inked(prow, 0.04); g.add(prow);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), wood); mast.position.y = 2.8; g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), sailM); sail.position.y = 3; sail.rotation.y = Math.PI / 2; g.add(sail);
  scene.add(g); dhonis.push(g);
}

// ---------- the cast: the short's own drawings on camera-facing cards ----------
const SU = 0.00216; // metres per design unit (1000 units = 2.16 m), as in the short
const CARD = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const texCache = new Map<string, THREE.CanvasTexture>();
const LIGHT = (-120 * Math.PI) / 180;
const drawCard = (key: string, o: Outfit, opts: FrontOpts) => {
  let t = texCache.get(key);
  if (!t) {
    const cv = document.createElement("canvas"); cv.width = 360; cv.height = 600;
    const g = cv.getContext("2d")!; g.setTransform(0.6, 0, 0, 0.6, 0, 0);
    bodyFront(new Pen(g), o, { light: LIGHT, ...opts });
    t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
};
const SK = ["#d9a77c", "#c99067", "#b9805a", "#e2b48a", "#a8724c"];
const BUILDER = (v: number): Outfit => ({ jacket: ["#e9e2d0", "#c9d8e0", "#e8c9a8", "#d6e3c3"][v % 4], pants: "#3b3f52", boots: SK[v % 5], skin: SK[v % 5],
  sarong: ["#3e5f4a", "#6b3b3b", "#2f4a6b", "#7a6a3a"][v % 4], stripe: "#1f1a16", hat: v % 2 ? "kufi" : "hair", hair: "#241a14", moustache: v % 3 === 1 ? "#241a14" : undefined });
const DIVER = (v: number): Outfit => ({ jacket: ["#3a6f8f", "#8f5a3a"][v % 2], pants: "#2b3b4f", boots: SK[(v + 1) % 5], skin: SK[(v + 1) % 5], hat: "hair", hair: "#1e1712" });
const CARVER = (v: number): Outfit => ({ jacket: "#f4f1e8", pants: "#3b3f52", boots: SK[(v + 2) % 5], sarong: ["#8a6a4a", "#5a3b5e", "#3e5f4a"][v % 3], stripe: "#2a1f18", hat: "kufi", beard: v === 0 ? "#8f8a84" : undefined, moustache: "#8f8a84", skin: SK[(v + 2) % 5] });
const WOMAN = (v: number): Outfit => { const c = ["#c25a7a", "#5a8fc2", "#d9a441", "#4f9a7a"][v % 4]; return { jacket: c, pants: "#3b3f52", boots: SK[(v + 3) % 5], dress: c, hat: "scarf", cap: ["#f4efe6", "#2f3e5c", "#7b5ac9", "#e8c9a8"][v % 4], skin: SK[(v + 3) % 5] }; };
const SULTAN: Outfit = { jacket: "#8a2232", pants: "#3b2a2a", boots: "#c9a14a", dress: "#7a1f2b", sash: "#e8c45a", hat: "turban", cap: "#e8c45a", beard: "#3a2a20", moustache: "#3a2a20", build: "stout", skin: SK[1], buttons: "#e8c45a" };
const KID: Outfit = { jacket: "#f08a2c", pants: "#3b5b9a", boots: SK[1], sarong: "#3b5b9a", stripe: "#f4f1e8", hat: "hair", hair: "#2a1f1a", build: "kid", skin: SK[1], buttons: "#f6c48a" };

type Role = "diver" | "hauler" | "carver" | "builder" | "bystander" | "sultan";
type NPC = { m: THREE.Mesh; o: Outfit; okey: string; role: Role; name: string; pos: THREE.Vector3; t: number; state: number; timer: number; home: THREE.Vector3; goal?: THREE.Vector3;
  met: boolean; talking: boolean; moving: boolean; roll: number; prop: Prop; mode: FrontOpts["mode"]; phase: number; expr: Expr; scale: number; laid?: boolean; chip?: boolean; plank?: boolean };
const cardMat = () => new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, transparent: false });
const blobM = new THREE.MeshBasicMaterial({ color: "#2b2440", transparent: true, opacity: 0.28, depthWrite: false });
const npcs: NPC[] = [];
const TALK: Record<Role, { role: string; work: string[]; more: string[] }> = {
  diver: { role: "Coral diver", work: ["I dive out on the reef and cut blocks of living coral with a chisel. The big porites domes cut clean.", "Out on the reef. I hold my breath, chip a block loose and swim it up to the dhoni. Three or four before lunch!"],
    more: ["Fresh coral is soft. If you leave it in the sun it sets hard as rock, so we bring it in fast.", "The sea gives us our stone. There isn't a single rock on this island."] },
  hauler: { role: "Block carrier", work: ["I carry the fresh blocks from the boats up the beach to the carvers. Wet coral is heavy!", "The divers hand me the blocks at the water's edge and I haul them to the pile by the workshop."],
    more: ["Mind the wet sand. I dropped one on my toe already. Only once!", "The sultan wants the walls up before the monsoon comes."] },
  carver: { role: "Stone carver", work: ["I carve the coral while it's still wet and soft. Mallet, chisel, tap tap tap: lotus flowers and diamonds for the walls.", "I shape every block so it locks into the next one like a puzzle. Cut it right and you need no mortar."],
    more: ["Once the sun dries it, it's hard as stone and you can't carve it any more. My apprentice found that out the hard way!", "See this band of lotus flowers? It runs along the top of every wall."] },
  builder: { role: "Wall builder", work: ["I lay the dried blocks on the walls, course by course. Each one slots into its neighbour.", "I'm up on the scaffold all day lifting blocks into place. The walls grow a little every hour."],
    more: ["When it's done this will be the Friday Mosque of Malé. People will pray here for centuries, inshallah.", "The blocks interlock, so the wall holds itself together. Clever, no?"] },
  bystander: { role: "Islander", work: ["Me? I sell breadfruit and dried fish at the market. I just came to watch the mosque go up.", "I'm a fisherman. Tuna, mostly. The sea is calm today, so I'm watching the builders.", "I twist coir rope from coconut husk. The builders buy it for the scaffolds!"],
    more: ["They say the sultan comes to check the work every Friday.", "My grandfather prayed in the old mosque on this very spot. This one will be grander."] },
  sultan: { role: "Sultan Ibrahim Iskandar", work: ["My work? I rule these islands, and I have ordered a Friday mosque of coral stone that will outlast me.", "I am building this mosque for Malé: coral from our own reef, carved by our own people."],
    more: ["One day I will add a tall white minaret beside it. Patience.", "Not one rock on this island, yet we build in stone. The sea provides."] },
};
const NAMES = ["Ali", "Hassan", "Ibrahim", "Moosa", "Ahmed", "Hussain", "Mohamed", "Yoosuf", "Ismail", "Abdulla", "Shareef", "Adam"], WNAMES = ["Aishath", "Mariyam", "Fathimath", "Hawwa"];
const add = (role: Role, o: Outfit, x: number, z: number, extra: Partial<NPC> = {}) => {
  const m = new THREE.Mesh(CARD, cardMat()); m.castShadow = true; scene.add(m);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), blobM); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; m.userData.blob = blob; scene.add(blob);
  const i = npcs.length, female = o.hat === "scarf";
  const n: NPC = { m, o, okey: role + i, role, name: role === "sultan" ? "Sultan Ibrahim" : female ? WNAMES[i % 4] : NAMES[(i * 5) % 12], pos: new THREE.Vector3(x, GY, z), t: rnd() * 10, state: 0, timer: rnd() * 3,
    home: new THREE.Vector3(x, GY, z), met: false, talking: false, moving: false, roll: 0, prop: null, mode: "stand", phase: 0, expr: "smile", scale: 1, ...extra };
  npcs.push(n); return n;
};
for (let k = 0; k < 4; k++) add("diver", DIVER(k), REEF.x - 6 + k * 4, REEF.z - 4 + (k % 2) * 4);
for (let k = 0; k < 3; k++) add("hauler", BUILDER(k + 1), -2 + k * 2, 30 + k * 6);
BENCHES.forEach((b, k) => add("carver", CARVER(k), b.x, b.z - 0.75));
for (let k = 0; k < 3; k++) add("builder", BUILDER(k), -6 + k * 6, -0.9, { plank: k !== 1 });
for (let k = 0; k < 5; k++) add("bystander", k % 2 ? WOMAN(k) : BUILDER(k + 2), -16 + k * 8, 18 + (k % 2) * 6);
add("sultan", SULTAN, 6, 13);
$("total").textContent = String(npcs.length);

// the player: the apprentice from the short
const me = add("bystander", KID, 0, 24, { name: "You", scale: 0.85 });
npcs.pop();

// ---------- input ----------
const keys: Record<string, boolean> = {};
let near: NPC | null = null, talkingTo: NPC | null = null;
addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; if (e.key.toLowerCase() === "e" && near && !talkingTo) openTalk(near); });
addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
const joy = $("joy"), knob = $("knob");
let jx = 0, jy = 0, joyId: number | null = null;
const joyMove = (e: PointerEvent) => { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy), mx = 44; if (L > mx) { dx *= mx / L; dy *= mx / L; } jx = dx / mx; jy = dy / mx; knob.style.transform = `translate(${dx}px, ${dy}px)`; };
joy.addEventListener("pointerdown", (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.stopPropagation(); });
joy.addEventListener("pointermove", (e) => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = (e: PointerEvent) => { if (e.pointerId === joyId) { joyId = null; jx = jy = 0; knob.style.transform = ""; } };
joy.addEventListener("pointerup", joyEnd); joy.addEventListener("pointercancel", joyEnd);
let camYaw = 0, camPitch = 0.38, dragId: number | null = null, lx = 0, ly = 0;
canvas.addEventListener("pointerdown", (e) => { dragId = e.pointerId; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); $("help").hidden = true; });
canvas.addEventListener("pointermove", (e) => { if (e.pointerId !== dragId) return; camYaw -= (e.clientX - lx) * 0.006; camPitch = Math.max(0.1, Math.min(1.05, camPitch + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; });
const dragEnd = (e: PointerEvent) => { if (e.pointerId === dragId) dragId = null; };
canvas.addEventListener("pointerup", dragEnd); canvas.addEventListener("pointercancel", dragEnd);
joy.hidden = !matchMedia("(pointer: coarse)").matches;
addEventListener("touchstart", () => { joy.hidden = false; }, { once: true, passive: true });

// ---------- dialogue ----------
const pick = (a: string[], n: NPC) => a[Math.floor(n.t * 7) % a.length];
const say = (s: string) => { $("dSay").textContent = s; };
const options = (list: [string, () => void, boolean?][]) => { const b0 = $("opts"); b0.textContent = ""; for (const [label, fn, bye] of list) { const b = document.createElement("button"); b.className = "opt" + (bye ? " bye" : ""); b.textContent = label; b.addEventListener("click", fn); b0.appendChild(b); } };
const close = () => { if (talkingTo) talkingTo.talking = false; talkingTo = null; $("dlg").hidden = true; };
function openTalk(n: NPC) {
  talkingTo = n; n.talking = true;
  if (!n.met) { n.met = true; $("met").textContent = String(npcs.filter((x) => x.met).length); }
  $("dName").textContent = n.name; $("dRole").textContent = TALK[n.role].role;
  say(n.role === "sultan" ? "Peace be upon you, young apprentice. You stand on my building site." : ["Hello there!", "Assalaamu alaikum!", "Oh, the apprentice!", "Kihineh? How are you?"][Math.floor(n.t * 3) % 4]);
  options([["What do you do for work?", () => { say(pick(TALK[n.role].work, n)); options([["Tell me more", () => { say(pick(TALK[n.role].more, n)); options([["Thanks!", close, true]]); }], ["Bye", close, true]]); }], ["Bye", close, true]]);
  $("dlg").hidden = false;
}
$("talk").addEventListener("click", () => { if (near) openTalk(near); });

// ---------- behaviour ----------
const tmp = new THREE.Vector3();
const SHORE = new THREE.Vector3(0, GY, 44);
const walkTo = (n: NPC, target: THREE.Vector3, speed: number, dt: number) => {
  tmp.subVectors(target, n.pos); tmp.y = 0; const d = tmp.length();
  if (d < 0.15) return true;
  n.pos.addScaledVector(tmp.normalize(), Math.min(d, speed * dt)); n.moving = true; return false;
};
let laid = 0;
const chips: { m: THREE.Mesh; v: THREE.Vector3; life: number; u: number }[] = [];
const chipTex = Array.from({ length: 6 }, (_, k) => { const cv = document.createElement("canvas"); cv.width = cv.height = 150; const g = cv.getContext("2d")!; g.scale(0.5, 0.5); fxChips(new Pen(g), k / 6); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; });
const spawnChips = (p: THREE.Vector3) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: chipTex[0], transparent: true, depthWrite: false })); m.position.copy(p); scene.add(m); chips.push({ m, v: new THREE.Vector3(), life: 0.3, u: 0 }); };
function update(n: NPC, dt: number, time: number) {
  n.moving = false; n.t += dt; n.roll = 0; n.prop = null; n.mode = "stand"; n.expr = n.talking ? "grin" : "smile";
  if (n.talking) { /* hold still and listen */ }
  else if (n.role === "diver") {
    const cyc = (n.t * 0.18) % 1, depth = cyc < 0.35 ? 0 : cyc < 0.5 ? (cyc - 0.35) / 0.15 : cyc < 0.75 ? 1 : 1 - (cyc - 0.75) / 0.25;
    n.pos.y = -1.35 - depth * 1.5 + Math.sin(time * 2 + n.t) * 0.05;
    if (depth > 0.02 && depth < 0.98) { n.mode = "fall"; n.roll = cyc < 0.5 ? 1.35 : -1.35; } else if (depth >= 0.98) { n.prop = ["mallet", Math.max(0, Math.sin(time * 6 + n.t))]; n.expr = "stern"; }
    if (cyc > 0.75) n.prop = "block";
  } else if (n.role === "hauler") {
    if (walkTo(n, n.state === 0 ? SHORE : DROP, 2.2, dt)) { n.timer += dt; if (n.timer > 1.1) { n.timer = 0; if (n.state === 1) addToStack(); n.state = 1 - n.state; } }
    if (n.state === 1) n.prop = "block";
  } else if (n.role === "carver") {
    const k = Math.max(0, Math.sin(time * 5 + n.t * 3));
    n.prop = ["mallet", k > 0.9 ? 1 : k > 0.5 ? 0.5 : 0];
    if (k > 0.97 && !n.chip) { n.chip = true; spawnChips(new THREE.Vector3(n.pos.x + 0.25, GY + 1.2, n.pos.z + 0.8)); } if (k < 0.5) n.chip = false;
  } else if (n.role === "builder") {
    const cyc = (n.t * 0.35) % 1;
    if (cyc < 0.6) n.prop = "block"; else n.expr = "grin";
    n.pos.y = n.plank ? GY + 2.16 : GY;
    if (cyc > 0.6 && !n.laid) { n.laid = true; laid++; $("laid").textContent = String(laid); wallH = Math.min(4.2, 1.6 + laid * 0.02); setWall(wallH); }
    if (cyc < 0.1) n.laid = false;
  } else {
    n.timer -= dt;
    if (!n.goal || n.timer <= 0) { n.goal = n.home.clone().add(new THREE.Vector3((rnd() - 0.5) * 10, 0, (rnd() - 0.5) * 8)); n.timer = 4 + rnd() * 5; }
    walkTo(n, n.goal, n.role === "sultan" ? 0.9 : 1.2, dt);
  }
  if (n.moving) { n.mode = "stroll"; n.phase = (n.phase + dt * 1.3) % 1; }
}
/** pose the card: the short's drawing for this exact pose (cached), facing the lens */
const MOOD = { blink: 0 };
function pose(n: NPC) {
  const ph = n.mode === "stroll" ? Math.round(n.phase * 8) / 8 : 0;
  const pr = Array.isArray(n.prop) ? (["mallet", Math.round(n.prop[1] * 2) / 2] as Prop) : n.prop;
  const opts: FrontOpts = { mode: n.mode, phase: ph, expr: n.expr, prop: pr, blink: MOOD.blink, seed: (npcs.indexOf(n) % 7) + 1 };
  const mat = n.m.material as THREE.MeshBasicMaterial, tex = drawCard(n.okey + JSON.stringify(opts), n.o, opts);
  if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
  n.m.position.copy(n.pos);
  n.m.rotation.set(0, Math.atan2(camera.position.x - n.pos.x, camera.position.z - n.pos.z), n.roll, "YXZ");
  n.m.scale.setScalar(n.scale);
  const b = n.m.userData.blob as THREE.Mesh; b.visible = n.pos.y > 0; b.position.set(n.pos.x, n.pos.y + 0.03, n.pos.z);
}

// ---------- loop ----------
const clock = new THREE.Clock();
const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix(); };
addEventListener("resize", resize); resize();
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3(), tgt = new THREE.Vector3();
function tick() {
  const dt = Math.min(0.05, clock.getDelta()), time = clock.elapsedTime;
  let ix = jx, iy = jy;
  if (keys.w || keys.arrowup) iy -= 1; if (keys.s || keys.arrowdown) iy += 1; if (keys.a || keys.arrowleft) ix -= 1; if (keys.d || keys.arrowright) ix += 1;
  const mag = Math.min(1, Math.hypot(ix, iy)), p = me.pos;
  const inWater = Math.hypot(p.x, p.z) > ISLE_R - 0.5;
  me.moving = false; me.mode = "stand"; me.prop = null; me.expr = talkingTo ? "grin" : "smile";
  if (mag > 0.08 && !talkingTo) {
    fwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)); right.set(-fwd.z, 0, fwd.x);
    mv.copy(fwd).multiplyScalar(-iy).addScaledVector(right, ix).normalize();
    p.addScaledVector(mv, (inWater ? 2.4 : 5) * mag * dt); me.mode = "stroll"; me.phase = (me.phase + dt * 2.2 * mag) % 1;
  }
  const rr = Math.hypot(p.x, p.z); if (rr > 85) p.multiplyScalar(85 / rr);
  if (p.x > -9.6 && p.x < 9.6 && p.z > -14.6 && p.z < -1.4) { const d = [Math.abs(p.z + 1.4), Math.abs(p.z + 14.6), Math.abs(p.x + 9.6), Math.abs(p.x - 9.6)], m = Math.min(...d); if (m === d[0]) p.z = -1.4; else if (m === d[1]) p.z = -14.6; else if (m === d[2]) p.x = -9.6; else p.x = 9.6; }
  const wr = Math.hypot(p.x, p.z); p.y = wr > ISLE_R ? Math.max(-1.35, GY - (wr - ISLE_R) * 0.35) : GY;
  // blink everyone together every ~3 s (cheap, keeps the cache small)
  MOOD.blink = time % 3.1 < 0.12 ? 1 : 0;
  near = null; let best = 2.6;
  for (const n of npcs) { update(n, dt, time); const d = n.pos.distanceTo(p); if (d < best) { best = d; near = n; } }
  if (talkingTo && talkingTo.pos.distanceTo(p) > 4) close();
  const show = !!near && !talkingTo;
  $("talk").hidden = !show; $("prompt").hidden = !show;
  if (show && near) $("prompt").textContent = `${near.name} · ${TALK[near.role].role}`;
  for (const c of chips) { c.u += dt / c.life; (c.m.material as THREE.MeshBasicMaterial).map = chipTex[Math.min(5, Math.floor(c.u * 6))]; c.m.quaternion.copy(camera.quaternion); }
  for (let i = chips.length - 1; i >= 0; i--) if (chips[i].u >= 1) { scene.remove(chips[i].m); chips.splice(i, 1); }
  palms.forEach((g, i) => { (g.children[1] as THREE.Group).rotation.z = Math.sin(time * 1.2 + i) * 0.05; });
  dhonis.forEach((d, i) => { d.position.y = 0.1 + Math.sin(time * 1.3 + i) * 0.08; d.rotation.z = Math.sin(time + i) * 0.03; });
  waterU.t.value = time;
  const dist = innerWidth < innerHeight ? 10 : 8.5;
  tgt.set(p.x, Math.max(p.y, -0.5) + 1.5, p.z);
  camera.position.set(tgt.x + Math.sin(camYaw) * Math.cos(camPitch) * dist, tgt.y + Math.sin(camPitch) * dist, tgt.z + Math.cos(camYaw) * Math.cos(camPitch) * dist);
  if (camera.position.y < 0.7) camera.position.y = 0.7;
  camera.lookAt(tgt);
  sky.position.copy(camera.position);
  sun.position.set(p.x + 25, 45, p.z + 35); sun.target.position.copy(p);
  for (const n of npcs) pose(n);
  pose(me);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
