// The whole set as one three.js scene: sky, lagoon (turquoise shallows -> deep blue; seen from below when the lens
// dives), the island (coral sand, town, palms, dhonis), the Friday mosque in its stages (1658 building site with low
// walls, scaffolds and the carvers' workshop -> finished hall with a two-tier roof -> the 1675 minaret -> today's city
// around it), the graveyard, and the reef the coral was cut from (coral heads, the cutting dome, light rays).
// update(id, f, camera) poses everything for shot `id` at frame f (pure function of id + f).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri, Ray } from "./build";
import { ctex, cloudHD, waterNear, waterFar, roofHD } from "./paint";
import { sandHD, coralWallHD, friezeHD, frondTex, trunkTex, thatchHD, lacquerTex, hullTex, seafloorHD, plasterHD, modernFacade, houseFacade, mosqueFront } from "./paint2";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, GY, HY, ISLE, ISLE_R, SHORE_Z, REEF, MINARET, BENCH, RACKS, PALM_HERO, TEMPLE, TOMB, SHOTS, camAt, ShotDef, V3, Era, WALL_DROPS, dryAt, smooth, glowAt } from "./story";

// ---------------- helpers ----------------
const rnd = (seed: number) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const M4 = (x = 0, y = 0, z = 0, yaw = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw), V(s, s, s));
const col = (c: string) => lam("c" + c, () => ({ color: c }));
const tex = (key: string, make: () => THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam(key, () => ({ map: make(), ...extra }));

/** sun disc (soft rim) and halo, as in the template */
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const rayTex = () => ctex("godray", 64, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.5, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  const h = g.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 64, 512);
});

/** horizontal ring / disc in the xz plane: radius r0..r1 at heights y0..y1 (a sloped annulus), uv in metres / tile */
const annulus = (cx: number, cz: number, r0: number, r1: number, y0: number, y1: number, tile: number, n = 96) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    for (const [r, y] of [[r0, y0], [r1, y1]] as const) { pos.push(cx + c * r, y, cz + s * r); uv.push((cx + c * r) / tile, (cz + s * r) / tile); }
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // make sure the faces point up
  const nrm = g.attributes.normal;
  if (nrm.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
};
const disc = (cx: number, cz: number, r: number, y: number, tile: number) => annulus(cx, cz, 0.001, r, y, y, tile, 96);

/** hip roof over a w x d rectangle centred at (cx, cz), eaves at y0, ridge h higher; uv tiled every `tile` m */
const hipRoof = (cx: number, cz: number, w: number, d: number, y0: number, h: number, tile = 2) => {
  const hw = w / 2, hd = d / 2, rl = Math.max(0, hw - hd), y1 = y0 + h;
  const a = V(cx - hw, y0, cz + hd), b = V(cx + hw, y0, cz + hd), c = V(cx + hw, y0, cz - hd), e = V(cx - hw, y0, cz - hd);
  const r0 = V(cx - rl, y1, cz), r1 = V(cx + rl, y1, cz), sl = Math.hypot(hd, h);
  const parts = [quad(a, b, r1, r0, w / tile, sl / tile), quad(c, e, r0, r1, w / tile, sl / tile), tri(b, c, r1), tri(e, a, r0)];
  return parts;
};

/** tapered tube along a curve (palm trunk), uv v in metres */
const trunkGeo = (pts: THREE.Vector3[], r0: number, r1: number, N = 14, R = 9) => {
  const cv = new THREE.CatmullRomCurve3(pts), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const frames = cv.computeFrenetFrames(N, false);
  let len = 0, prev = cv.getPoint(0);
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = cv.getPoint(t), r = r0 + (r1 - r0) * t * t * 0.6 + (r1 - r0) * t * 0.4;
    len += p.distanceTo(prev); prev = p;
    for (let j = 0; j <= R; j++) {
      const a = (j / R) * Math.PI * 2, n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); uv.push(j / R, len / 0.7);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return { g, top: cv.getPoint(1), dir: cv.getTangent(1) };
};
/** one arched, drooping coconut frond along +z, base at the origin (folded slightly into a V) */
const frondGeo = (() => {
  const L = 4.6, W = 1.5, n = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, z = L * t, y = 1.1 * Math.sin(Math.PI * t * 0.55) - 2.3 * t * t;
    for (const s of [-1, 0, 1]) { pos.push((s * W) / 2, y + 0.18 * Math.abs(s) * t, z); uv.push(0.5 + s * 0.5, t); }
  }
  for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 3; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
})();

/** dhoni hull lofted along x (stern at -L/2, bow at +L/2 with the tall curled prow) */
const dhoniGeo = (L = 9) => {
  const NS = 18, prof = [[-1, 1], [-0.95, 0.35], [-0.6, 0.05], [0, -0.05], [0.6, 0.05], [0.95, 0.35], [1, 1]];
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS, x = (t - 0.5) * L, w = 1.05 * Math.sin(Math.PI * Math.min(0.98, Math.max(0.03, t))) ** 0.6;
    const sheer = 0.85 + 1.4 * Math.max(0, t - 0.78) ** 1.6 * 6 + 0.25 * Math.max(0, 0.15 - t) * 6, dep = 0.75 * (1 - 0.6 * Math.abs(t - 0.45) ** 2);
    for (const [px, py] of prof) { pos.push(x, py > 0.9 ? sheer : -dep * (1 - py) + 0.1, px * w); uv.push(t * 4, (py + 1) / 2); }
  }
  const P = prof.length;
  for (let i = 0; i < NS; i++) for (let k = 0; k < P - 1; k++) { const a = i * P + k, b = a + P; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};

/** bumpy coral head (brain / porites), radius r, flattened */
const coralHead = (r: number, seed: number, flat = 0.7) => {
  const g = new THREE.IcosahedronGeometry(r, 3), p = g.attributes.position, R = rnd(seed);
  const ph = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const k = 1 + 0.07 * Math.sin(9 * v.x + ph[0]) * Math.sin(8 * v.z + ph[1]) + 0.05 * Math.sin(13 * v.y + ph[2]);
    p.setXYZ(i, v.x * r * k, Math.max(-0.2 * r, v.y * r * k * flat), v.z * r * k);
  }
  g.computeVertexNormals();
  return g;
};

type Toggle = { o: THREE.Object3D; on: (s: ShotDef) => boolean };
const ERA = {
  build: (s: ShotDef) => s.era === "build",
  done: (s: ShotDef) => s.era === "done" || s.era === "done1675" || s.era === "today",
  legend: (s: ShotDef) => s.era === "legend",
  minaret: (s: ShotDef) => s.era === "done1675" || s.era === "today",
  old: (s: ShotDef) => s.era !== "today",
  today: (s: ShotDef) => s.era === "today",
  graves: (s: ShotDef) => s.era === "done" || s.era === "done1675" || s.era === "today",
  reef: (s: ShotDef) => s.light === "reef",
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private toggles: Toggle[] = [];
  private palms: { crown: THREE.Object3D; k: number }[] = [];
  private drops: { m: THREE.Mesh; y: number; t: number }[] = [];
  private dryMat: THREE.MeshLambertMaterial;
  private rays: THREE.Mesh[] = [];
  private lamp!: THREE.Mesh;
  private dhonis: { o: THREE.Object3D; k: number; y: number }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private sight: Ray[] = [];

  constructor() {
    const R = this.root;
    this.sight = sightLines();
    // ---- sky + light (template) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.3, d = 600 + (i % 3) * 70;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 35;
      m.position.set(Math.cos(a) * d, 70 + (i % 4) * 30, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- island ground, beach, lagoon floor ----
    const ground = new Batch();
    const M = {
      sand: tex("sandHD", () => sandHD()),
      street: tex("streetHD", () => sandHD("streetHD", "#e6d5b2")),
      wetsand: tex("wetSandHD", () => sandHD("wetSandHD", "#d8c49d")),
      floor: tex("seafloorHD", () => seafloorHD()),
      coral: tex("coralWallHD", () => coralWallHD()),
      white: tex("whiteWash", () => plasterHD("#f5f0e4")),
      frieze: tex("friezeHD", () => friezeHD()),
      roof: tex("roofCopper", () => roofHD("#6f8f86", true)),
      thatch: tex("thatch", () => thatchHD()),
      wood: col("#9a6a42"), dark: col("#5b3a24"), pole: col("#b08a5c"),
      lacquer: tex("lacquer", () => lacquerTex()),
      hull: lam("hull", () => ({ map: hullTex(), side: THREE.DoubleSide })),
      sail: lam("sail", () => ({ color: "#f3ead3", side: THREE.DoubleSide })),
      trunk: tex("trunk", () => trunkTex()),
      frond: lam("frond", () => ({ map: frondTex(), alphaTest: 0.5, side: THREE.DoubleSide })),
      frond2: lam("frond2", () => ({ map: frondTex("frond2", "#5daa43"), alphaTest: 0.5, side: THREE.DoubleSide })),
      nut: col("#7b5a2e"), nutG: col("#7a9a3a"),
      blue: col("#3f78b5"), gold: col("#d9b45a"), mint: tex("minaretWhite", () => plasterHD("#f7f4ee")),
    };
    const [ix, , iz] = ISLE;
    ground.add(disc(ix, iz, ISLE_R - 8, GY, 6), M.street);
    ground.add(annulus(ix, iz, ISLE_R - 8, ISLE_R, GY, 0.12, 6), M.sand);
    ground.add(annulus(ix, iz, ISLE_R, ISLE_R + 6, 0.12, -1.6, 6), M.wetsand);
    ground.add(annulus(ix, iz, ISLE_R + 6, ISLE_R + 30, -1.6, -6, 8), M.floor);
    ground.add(annulus(ix, iz, ISLE_R + 30, 900, -6, -6.4, 8), M.floor);
    // the mosque yard is paler swept sand
    ground.add(boxGeo(V(-20, GY - 0.05, -16), V(22, GY + 0.02, 18), 6), M.sand);
    ground.build(R, false);

    // ---- lagoon water: shallow turquoise near the island, deep blue past the reef, the surface from below ----
    const wNear = waterNear(), wFar = waterFar();
    for (const t of [wNear, wFar]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 16; t.needsUpdate = true; }
    this.WU = {
      wShallow: { value: new THREE.Color() }, wMid: { value: new THREE.Color() }, wDeep: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() }, wGlint: { value: new THREE.Color() }, wUnderTop: { value: new THREE.Color() }, wUnderDeep: { value: new THREE.Color() },
      wNearTex: { value: wNear }, wFarTex: { value: wFar }, wTime: { value: 0 }, wIsle: { value: new THREE.Vector3(ix, 0, iz) }, wR: { value: ISLE_R },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", WATER_DECL).replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb;\n  reflectedLight.indirectDiffuse = vec3(0.0);");
    };
    waterM.customProgramCacheKey = () => "lagoon2";
    const wg = new THREE.PlaneGeometry(1800, 1800, 1, 1); wg.rotateX(-Math.PI / 2);
    const wm = new THREE.Mesh(wg, waterM);
    wm.receiveShadow = true;
    R.add(wm);

    // ---- the mosque ----
    const done = new Batch(), build = new Batch();
    // plinth + steps (all eras)
    const plinth = new Batch();
    plinth.add(boxGeo(V(-10.5, GY - 0.1, -6.5), V(10.5, HY, 6.5), 2), M.coral);
    plinth.add(boxGeo(V(-2.2, GY - 0.1, 6.5), V(2.2, GY + 0.35, 7.4), 1), M.coral);
    plinth.build(R);
    // finished hall: 18 x 10, walls 4.2 m, carved frieze band, lacquered beam, two-tier copper roof
    const WH = 4.2, X0 = -9, X1 = 9, Z0 = -5, Z1 = 5, th = 0.6;
    const front = lam("mosqueFront", () => ({ map: mosqueFront(18, WH, 3) }));
    done.add(quad(V(X0, HY, Z1), V(X1, HY, Z1), V(X1, HY + WH, Z1), V(X0, HY + WH, Z1)), front);
    done.add(quad(V(X1, HY, Z0), V(X0, HY, Z0), V(X0, HY + WH, Z0), V(X1, HY + WH, Z0)), front);
    done.add(boxGeo(V(X0, HY, Z0 + 0.01), V(X0 + th, HY + WH, Z1 - 0.01), 2), M.coral);
    done.add(boxGeo(V(X1 - th, HY, Z0 + 0.01), V(X1, HY + WH, Z1 - 0.01), 2), M.coral);
    done.add(boxGeo(V(X0 - 0.12, HY + WH - 0.05, Z0 - 0.12), V(X1 + 0.12, HY + WH + 0.3, Z1 + 0.12), 0), M.lacquer);
    for (const p of hipRoof(0, 0, 21, 13, HY + WH + 0.3, 1.6, 2)) done.add(p, M.roof);
    done.add(boxGeo(V(-6.5, HY + WH + 1.9, -3.6), V(6.5, HY + WH + 2.5, 3.6), 0), M.lacquer);
    for (const p of hipRoof(0, 0, 14.6, 8.4, HY + WH + 2.5, 2.3, 2)) done.add(p, M.roof);
    // veranda posts along the front
    for (let x = -8.5; x <= 8.6; x += 2.125) done.add(new THREE.CylinderGeometry(0.13, 0.15, WH + 0.3, 10), M.dark, M4(x, HY + (WH + 0.3) / 2, 6.25));
    done.add(boxGeo(V(-10.5, HY + WH, 6.0), V(10.5, HY + WH + 0.3, 6.5), 0), M.lacquer);
    for (const p of hipRoof(0, 6.2, 21.4, 1.4, HY + WH + 0.15, 0.25, 2)) done.add(p, M.roof);
    // building site 1658: walls at 2.6 m (the top course on the front wall has a gap the drops fill), scaffolds,
    // carving bench, drying racks, block stacks
    const BH = 2.6;
    build.add(boxGeo(V(X0, HY, Z1 - th), V(X1, HY + BH, Z1), 2), M.coral);
    build.add(boxGeo(V(X0, HY, Z0), V(X1, HY + BH - 0.6, Z0 + th), 2), M.coral);
    build.add(boxGeo(V(X0, HY, Z0), V(X0 + th, HY + BH - 0.3, Z1), 2), M.coral);
    build.add(boxGeo(V(X1 - th, HY, Z0), V(X1, HY + BH - 0.9, Z1), 2), M.coral);
    const CW = 0.6, CH = 0.32, topY = HY + BH;
    const dropX = WALL_DROPS.map((_, i) => -5.7 + i * CW);
    const gap0 = dropX[0], gap1 = dropX[dropX.length - 1] + CW;
    build.add(boxGeo(V(X0, topY, Z1 - th), V(gap0, topY + CH, Z1), 2), M.coral);
    build.add(boxGeo(V(gap1, topY, Z1 - th), V(X1, topY + CH, Z1), 2), M.coral);
    for (let x = X0 + 0.6; x < X1; x += 2.5) {
      if (x > -6.8 && x < -2.0) continue; // keep the drop gap clear
      build.add(new THREE.CylinderGeometry(0.06, 0.07, 5, 6), M.pole, M4(x, HY + 2.5, Z1 + 0.9));
      build.add(new THREE.CylinderGeometry(0.06, 0.07, 5, 6), M.pole, M4(x, HY + 2.5, Z1 + 0.2));
    }
    build.add(boxGeo(V(X0 + 0.4, HY + 1.75, Z1 + 0.1), V(X1 - 0.4, HY + 1.85, Z1 + 1.0), 0), M.wood);
    for (const y of [HY + 1.8]) build.add(new THREE.CylinderGeometry(0.05, 0.05, 18, 6), M.pole, new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(0, y, Z1 + 0.95)));
    // carving bench + a block on it
    const [bx, , bz] = BENCH;
    build.add(boxGeo(V(bx - 1.0, GY + 0.72, bz - 0.4), V(bx + 1.0, GY + 0.82, bz + 0.4), 0), M.wood);
    for (const [dx, dz] of [[-0.9, -0.32], [0.9, -0.32], [-0.9, 0.32], [0.9, 0.32]]) build.add(boxGeo(V(bx + dx - 0.05, GY, bz + dz - 0.05), V(bx + dx + 0.05, GY + 0.72, bz + dz + 0.05)), M.wood);
    build.add(boxGeo(V(bx - 0.32, GY + 0.82, bz - 0.25), V(bx + 0.32, GY + 1.16, bz + 0.25), 0), M.frieze);
    build.add(boxGeo(V(bx + 0.45, GY + 0.82, bz - 0.2), V(bx + 0.85, GY + 1.05, bz + 0.2), 0), M.coral);
    // stacks of fresh blocks around the yard
    for (const [sx, sz, n] of [[10.5, 11.5, 3], [-1.5, 15.5, 2], [12, 15, 2], [-10.5, 10.5, 3]] as const)
      for (let k = 0; k < n; k++) for (let j = 0; j < 3; j++) build.add(boxGeo(V(sx + j * 0.62, GY + k * 0.34, sz), V(sx + j * 0.62 + 0.58, GY + k * 0.34 + 0.32, sz + 0.58)), M.coral);
    // drying racks: low timber frames with blocks whose colour dries from wet tan to bone white over shot 10
    this.dryMat = twoTone(new THREE.MeshLambertMaterial({ map: coralWallHD(), color: "#c2ad8c" }));
    const [rx, , rz] = RACKS, rack = new Batch();
    for (let r = 0; r < 3; r++) {
      const zz = rz - r * 1.5;
      rack.add(boxGeo(V(rx - 2.4, GY + 0.3, zz - 0.4), V(rx + 2.4, GY + 0.38, zz + 0.4), 0), M.wood);
      for (const dx of [-2.3, 0, 2.3]) rack.add(boxGeo(V(rx + dx - 0.05, GY, zz - 0.35), V(rx + dx + 0.05, GY + 0.3, zz + 0.35)), M.wood);
      for (let k = 0; k < 7; k++) rack.add(boxGeo(V(rx - 2.2 + k * 0.64, GY + 0.38, zz - 0.28), V(rx - 2.2 + k * 0.64 + 0.56, GY + 0.7, zz + 0.28)), this.dryMat);
    }
    const buildG = new THREE.Group(), doneG = new THREE.Group();
    build.build(buildG); rack.build(buildG); done.build(doneG);
    R.add(buildG, doneG);
    this.toggles.push({ o: buildG, on: ERA.build }, { o: doneG, on: ERA.done });
    // the drop blocks of shot 12
    const dropGeo = boxGeo(V(-CW / 2 + 0.02, 0, -th / 2), V(CW / 2 - 0.02, CH, th / 2));
    WALL_DROPS.forEach((t, i) => {
      const m = new THREE.Mesh(dropGeo, tex("coralFresh", () => coralWallHD("coralFresh", ["#f8eedb", "#f3e6cc", "#fbf3e4", "#efdfc2"], "#d8c4a2"))); m.castShadow = true; m.receiveShadow = true;
      m.position.set(dropX[i] + CW / 2, topY, Z1 - th / 2); buildG.add(m);
      this.drops.push({ m, y: topY, t });
    });

    // ---- compound wall (segments, culled where a lens looks through them) with a wide gate ----
    const wallB = new Batch();
    const seg = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3));
      for (let k = 0; k < n; k++) {
        const ax = x0 + ((x1 - x0) * k) / n, az = z0 + ((z1 - z0) * k) / n, bx2 = x0 + ((x1 - x0) * (k + 1)) / n, bz2 = z0 + ((z1 - z0) * (k + 1)) / n;
        const mn = V(Math.min(ax, bx2) - 0.2, GY - 0.05, Math.min(az, bz2) - 0.2), mx = V(Math.max(ax, bx2) + 0.2, GY + 1.5, Math.max(az, bz2) + 0.2);
        if (this.blocked(mn, mx)) continue;
        wallB.add(boxGeo(mn, mx, 2), M.white);
        wallB.add(boxGeo(V(mn.x - 0.04, GY + 1.5, mn.z - 0.04), V(mx.x + 0.04, GY + 1.62, mx.z + 0.04), 0), M.coral);
      }
    };
    seg(-20, -16, 22, -16); seg(-20, -16, -20, 18); seg(22, -16, 22, 18); seg(-20, 18, -4.5, 18); seg(4.5, 18, 22, 18);
    for (const x of [-4.5, 4.5]) wallB.add(boxGeo(V(x - 0.35, GY - 0.05, 17.65), V(x + 0.35, GY + 2.3, 18.35), 1), M.white);
    wallB.build(R);

    // ---- minaret (Munnaaru, 1675) ----
    const mn = new Batch(), [mx0, , mz0] = MINARET;
    mn.add(boxGeo(V(mx0 - 1.9, GY - 0.05, mz0 - 1.9), V(mx0 + 1.9, GY + 1.2, mz0 + 1.9), 2), M.coral);
    mn.add(new THREE.CylinderGeometry(1.35, 1.6, 8, 32), M.mint, M4(mx0, GY + 1.2 + 4, mz0));
    for (const y of [GY + 2.6, GY + 5.2, GY + 7.6]) mn.add(new THREE.CylinderGeometry(1.42 - (y - GY) * 0.022, 1.46 - (y - GY) * 0.022, 0.28, 32), M.blue, M4(mx0, y, mz0));
    mn.add(new THREE.CylinderGeometry(2.0, 1.7, 0.35, 32), M.coral, M4(mx0, GY + 9.35, mz0));
    for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; mn.add(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), M.dark, M4(mx0 + Math.cos(a) * 1.9, GY + 9.85, mz0 + Math.sin(a) * 1.9)); }
    mn.add(new THREE.TorusGeometry(1.9, 0.05, 6, 40).rotateX(Math.PI / 2), M.dark, M4(mx0, GY + 10.2, mz0));
    mn.add(new THREE.CylinderGeometry(1.0, 1.1, 2.2, 28), M.mint, M4(mx0, GY + 10.6, mz0));
    mn.add(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 28), M.blue, M4(mx0, GY + 11.6, mz0));
    mn.add(new THREE.SphereGeometry(1.05, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.mint, M4(mx0, GY + 11.7, mz0));
    mn.add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M.gold, M4(mx0, GY + 13.2, mz0));
    mn.add(new THREE.TorusGeometry(0.28, 0.06, 8, 20, Math.PI * 1.4).rotateZ(-0.2), M.gold, M4(mx0, GY + 13.9, mz0));
    mn.add(boxGeo(V(mx0 - 0.5, GY + 1.2, mz0 + 1.35), V(mx0 + 0.5, GY + 3.2, mz0 + 1.62)), M.dark);
    const minG = new THREE.Group(); mn.build(minG); R.add(minG);
    this.toggles.push({ o: minG, on: ERA.minaret });

    // ---- graveyard: carved coral headstones, pointed for men, rounded for women ----
    const gv = new Batch();
    const stone = (pointed: boolean) => {
      const s = new THREE.Shape(), w = 0.22, h = pointed ? 0.62 : 0.66;
      s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, h);
      if (pointed) { s.quadraticCurveTo(w, h + 0.18, 0.02, h + 0.42); s.lineTo(-0.02, h + 0.42); s.quadraticCurveTo(-w, h + 0.18, -w, h); }
      else s.absarc(0, h, w, 0, Math.PI, false);
      s.lineTo(-w, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 12 });
      g.translate(0, 0, -0.06);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
      return g;
    };
    const SP = stone(true), SR = stone(false);
    const heroes: [number, number, boolean][] = [[-14.6, -0.4, true], [-14.6, -3.6, false]];
    const goldStone = lam("goldStone", () => ({ map: coralWallHD("goldStone", ["#e9c97a", "#e2bd68", "#f0d38b", "#d9b45a"], "#b8914a") }));
    for (const [x, z, p] of heroes) gv.add(p ? SP : SR, M.coral, M4(x, GY, z, 0.25 * (p ? 1 : -1), 1.25));
    const gr = rnd(7);
    for (let cx = -18.2; cx <= -11.4; cx += 1.35) for (let cz = -12; cz <= 13; cz += 1.25) {
      const x = cx + (gr() - 0.5) * 0.3, z = cz + (gr() - 0.5) * 0.3;
      if (heroes.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < 1.0)) continue;
      if (gr() < 0.15) continue;
      const p = gr() < 0.55;
      gv.add(p ? SP : SR, gr() < 0.06 ? goldStone : M.coral, M4(x, GY, z, (gr() - 0.5) * 0.3, 0.85 + gr() * 0.35));
    }
    const graveG = new THREE.Group(); gv.build(graveG); R.add(graveG);
    this.toggles.push({ o: graveG, on: ERA.graves });

    // ---- town: traditional coral houses with thatch (1658-1675), pastel blocks (today) ----
    const oldT = new Batch(), newT = new Batch();
    const tr = rnd(11);
    const walls = ["#f3ece0", "#efe3cf", "#f6f1e7", "#ead9c2"], doors = ["#5b3a24", "#2f5f6a", "#7a3b2e", "#3f5a2a"];
    const pastel = ["#f2b8a2", "#9ed3c8", "#f6dd8e", "#c9b6e4", "#a9c8ec", "#f4f0e6", "#f7c9d6", "#b9e0a5"];
    const lots: [number, number][] = [];
    for (let gx = -64; gx <= 64; gx += 10.5) for (let gz = -88; gz <= 42; gz += 10) {
      const x = gx + (tr() - 0.5) * 3, z = gz + (tr() - 0.5) * 3, r = Math.hypot(x - ix, z - iz);
      if (r > ISLE_R - 13) continue;
      if (x > -27 && x < 29 && z > -23 && z < 25) continue; // around the mosque yard
      if (Math.abs(x - 0.5) < 3.5 || Math.abs(z + 30) < 3) continue; // two lanes
      lots.push([x, z]);
    }
    const palmSpots: [number, number, number][] = [];
    lots.forEach(([x, z], i) => {
      const yaw = Math.round(tr() * 4) * (Math.PI / 2) + (tr() - 0.5) * 0.15;
      if (tr() < 0.18) { palmSpots.push([x, z, 1]); return; }
      // old house
      const w = 5 + tr() * 2.5, d = 4 + tr() * 2, h = 2.6 + tr() * 0.6;
      const mnb = V(x - w / 2 - 0.5, GY, z - d / 2 - 0.5), mxb = V(x + w / 2 + 0.5, GY + h + 2.5, z + d / 2 + 0.5);
      if (!this.blocked(mnb, mxb)) {
        const m = M4(x, 0, z, yaw), fk = i % 4;
        const fm = lam("houseF" + fk, () => ({ map: houseFacade(String(fk), 6, 3, walls[fk], doors[fk]) }));
        oldT.add(boxGeo(V(-w / 2, GY, -d / 2), V(w / 2, GY + h, d / 2), 2), M.white, m);
        oldT.add(quad(V(-w / 2, GY, d / 2 + 0.01), V(w / 2, GY, d / 2 + 0.01), V(w / 2, GY + h, d / 2 + 0.01), V(-w / 2, GY + h, d / 2 + 0.01)), fm, m);
        for (const p of hipRoof(0, 0, w + 0.9, d + 0.9, GY + h, 1.5 + tr() * 0.4, 2)) oldT.add(p, M.thatch, m);
      }
      // modern block on the same lot
      const W = 8 + tr() * 2, D = 7 + tr() * 2, H = 3 * (3 + Math.floor(tr() * 4));
      const mn2 = V(x - W / 2 - 0.5, GY, z - D / 2 - 0.5), mx2 = V(x + W / 2 + 0.5, GY + H + 1, z + D / 2 + 0.5);
      if (!this.blocked(mn2, mx2)) {
        const m = M4(x, 0, z, yaw), c = pastel[i % pastel.length];
        const fm = lam("modF" + c + Math.round(H), () => ({ map: modernFacade(c + H, 9, H, c) }));
        const hw = W / 2, hd = D / 2, y0 = GY, y1 = GY + H;
        for (const [a, b, c2, d2] of [[V(-hw, y0, hd), V(hw, y0, hd), V(hw, y1, hd), V(-hw, y1, hd)], [V(hw, y0, -hd), V(-hw, y0, -hd), V(-hw, y1, -hd), V(hw, y1, -hd)],
          [V(-hw, y0, -hd), V(-hw, y0, hd), V(-hw, y1, hd), V(-hw, y1, -hd)], [V(hw, y0, hd), V(hw, y0, -hd), V(hw, y1, -hd), V(hw, y1, hd)]] as const)
          newT.add(quad(a, b, c2, d2), fm, m);
        newT.add(boxGeo(V(-hw - 0.1, y1, -hd - 0.1), V(hw + 0.1, y1 + 0.6, hd + 0.1), 0), lam("modTop" + c, () => ({ map: plasterHD(c) })), m);
      }
    });
    const oldG = new THREE.Group(), newG = new THREE.Group();
    oldT.build(oldG); newT.build(newG); R.add(oldG, newG);
    this.toggles.push({ o: oldG, on: ERA.old }, { o: newG, on: ERA.today });

    // ---- palms: around the beach ring, in the yard corners, the hero palm ----
    const pr = rnd(23);
    for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2 + pr() * 0.1, r = ISLE_R - 6 - pr() * 6; palmSpots.push([ix + Math.cos(a) * r, iz + Math.sin(a) * r, 1]); }
    for (const [x, z] of [[-17, 16], [19, -13], [-17, -13], [17, 15.5], [-8, 16.5], [9, -13.5]] as const) palmSpots.push([x, z, 0.9]);
    palmSpots.push([PALM_HERO[0], PALM_HERO[2], 1.15]);
    const trunkB = new Batch();
    palmSpots.forEach(([x, z, s], i) => {
      const hero = i === palmSpots.length - 1;
      if (!hero && this.blocked(V(x - 1.5, GY, z - 1.5), V(x + 1.5, GY + 10, z + 1.5))) return;
      const h = (7 + pr() * 4) * s, lean = (pr() - 0.5) * 0.25 + (Math.hypot(x - ix, z - iz) > ISLE_R - 14 ? 0.18 : 0);
      const ang = Math.atan2(z - iz, x - ix) + (pr() - 0.5) * 0.6;
      const lx = Math.cos(ang) * lean * h, lz = Math.sin(ang) * lean * h;
      const pts = [V(x, GY - 0.2, z), V(x + lx * 0.15, GY + h * 0.35, z + lz * 0.15), V(x + lx * 0.55, GY + h * 0.75, z + lz * 0.55), V(x + lx, GY + h, z + lz)];
      const { g, top } = trunkGeo(pts, 0.24 * s, 0.15 * s);
      trunkB.add(g, M.trunk);
      const crown = new THREE.Group(); crown.position.copy(top);
      const fb = new Batch(), nf = 9 + Math.floor(pr() * 3);
      for (let k = 0; k < nf; k++) {
        const yaw = (k / nf) * Math.PI * 2 + pr() * 0.4, tilt = -0.15 + pr() * 0.4, sc = (0.85 + pr() * 0.3) * s;
        const m = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(tilt)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
        fb.add(frondGeo, k % 2 ? M.frond : M.frond2, m);
      }
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; fb.add(new THREE.SphereGeometry(0.17 * s, 10, 8), k % 2 ? M.nut : M.nutG, M4(Math.cos(a) * 0.25 * s, -0.25 * s, Math.sin(a) * 0.25 * s)); }
      fb.build(crown);
      R.add(crown);
      this.palms.push({ crown, k: pr() * 6 });
    });
    trunkB.build(R);

    // ---- dhonis: on the lagoon (sails up) and one pulled up on the beach ----
    const hull = dhoniGeo();
    for (const [x, z, yaw, sail, y] of [[-16, SHORE_Z + 9, 0.4, 1, 0.05], [22, SHORE_Z + 18, -0.3, 1, 0.05], [9.5, SHORE_Z + 3.2, 1.2, 0, 0.12], [-34, SHORE_Z + 26, 0.9, 1, 0.05], [40, SHORE_Z + 40, 2.4, 1, 0.05]] as const) {
      if (this.blocked(V(x - 5, y - 1, z - 5), V(x + 5, y + 6, z + 5), true)) continue;
      const g = new THREE.Group(), b = new Batch();
      b.add(hull, M.hull);
      b.add(new THREE.CylinderGeometry(0.07, 0.09, 6.5, 8), M.dark, M4(0.6, 3.2, 0));
      if (sail) b.add(quad(V(0.6, 1.2, -1.6), V(0.6, 1.2, 1.6), V(0.6, 5.8, 1.9), V(0.6, 5.8, -1.9)), M.sail);
      b.add(boxGeo(V(-4.3, 0.7, -0.6), V(-3.2, 0.9, 0.6)), M.wood);
      b.build(g);
      g.position.set(x, y, z); g.rotation.y = yaw;
      R.add(g);
      this.dhonis.push({ o: g, k: x * 0.37, y });
    }

    // ---- the idol temple by the shore (legend era): coral walls, thatch, a dark doorway facing the sea, a lamp ----
    {
      const tb = new Batch(), [tx, , tz] = TEMPLE;
      tb.add(boxGeo(V(tx - 2.6, GY - 0.05, tz - 2), V(tx + 2.6, GY + 0.35, tz + 2.2), 2), M.coral);
      tb.add(boxGeo(V(tx - 2.2, GY + 0.35, tz - 1.6), V(tx + 2.2, GY + 2.9, tz + 1.8), 2), M.coral);
      tb.add(boxGeo(V(tx - 0.65, GY + 0.35, tz + 1.8), V(tx + 0.65, GY + 2.2, tz + 1.86)), col("#120d0a"));
      tb.add(boxGeo(V(tx - 0.8, GY + 2.2, tz + 1.8), V(tx + 0.8, GY + 2.4, tz + 1.95)), M.lacquer);
      for (const p of hipRoof(tx, tz + 0.1, 5.4, 4.4, GY + 2.9, 1.9, 2)) tb.add(p, M.thatch);
      const tg = new THREE.Group(); tb.build(tg); R.add(tg);
      this.toggles.push({ o: tg, on: ERA.legend });
      this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.4, 0.9) }));
      this.lamp.position.set(tx, GY + 1.05, tz + 2.05); this.lamp.layers.set(NOINK); R.add(this.lamp);
      // the traveller's tomb (Medhu Ziyaaraiy), seen today next to the mosque
      const mb = new Batch(), [mx, , mz] = TOMB;
      mb.add(boxGeo(V(mx - 1.4, GY - 0.05, mz - 1.4), V(mx + 1.4, GY + 2.2, mz + 1.4), 2), M.white);
      mb.add(new THREE.SphereGeometry(1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.white, M4(mx, GY + 2.2, mz));
      mb.add(boxGeo(V(mx - 0.4, GY, mz + 1.4), V(mx + 0.4, GY + 1.5, mz + 1.45)), col("#2f5f6a"));
      const mg = new THREE.Group(); mb.build(mg); R.add(mg);
      this.toggles.push({ o: mg, on: (s) => s.era === "today" });
    }

    // ---- the reef: coral heads, branching and table corals, the cutting dome with its cut faces ----
    const reef = new Batch(), [rx0, ry0, rz0] = REEF, rr = rnd(31);
    const cols = ["#e889a8", "#f2a65a", "#9a7fd1", "#f1d36b", "#5cc7b9", "#ef7f6a", "#c8e07a"];
    for (let i = 0; i < 70; i++) {
      const a = rr() * Math.PI * 2, d = 2.5 + rr() * 24, x = rx0 + Math.cos(a) * d, z = rz0 + Math.sin(a) * d * 0.8 - 2;
      const kind = rr(), c = cols[Math.floor(rr() * cols.length)];
      if (kind < 0.5) reef.add(coralHead(0.5 + rr() * 1.3, i, 0.55 + rr() * 0.3), col(c), M4(x, ry0 - 0.15, z, rr() * 6));
      else if (kind < 0.8) for (let k = 0; k < 6; k++) {
        const bx2 = x + (rr() - 0.5) * 0.8, bz2 = z + (rr() - 0.5) * 0.8, h = 0.5 + rr() * 0.9;
        reef.add(new THREE.CylinderGeometry(0.05, 0.08, h, 6), col(c), new THREE.Matrix4().makeRotationZ((rr() - 0.5) * 0.7).premultiply(new THREE.Matrix4().makeTranslation(bx2, ry0 + h / 2, bz2)));
        reef.add(new THREE.SphereGeometry(0.09, 8, 6), col(c), M4(bx2, ry0 + h, bz2));
      }
      else { const r2 = 0.6 + rr() * 1.0; reef.add(new THREE.CylinderGeometry(r2, r2 * 0.9, 0.12, 20), col(c), M4(x, ry0 + 0.5 + rr() * 0.4, z)); reef.add(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), col(c), M4(x, ry0 + 0.25, z)); }
    }
    // the cutting dome: massive porites coral, with clean rectangular cut faces where blocks came out
    reef.add(coralHead(2.6, 99, 0.42), col("#d9c9a2"), M4(rx0, ry0 - 0.2, rz0));
    for (const [dx, dz] of [[-0.9, 0.7], [0.4, 1.1], [1.1, -0.2]]) reef.add(boxGeo(V(rx0 + dx - 0.32, ry0 + 0.62, rz0 + dz - 0.32), V(rx0 + dx + 0.32, ry0 + 0.72, rz0 + dz + 0.32)), col("#efe5cd"));
    const reefG = new THREE.Group(); reef.build(reefG); R.add(reefG);
    // light rays from the surface (additive, unlit, never inked)
    const rayM = new THREE.MeshBasicMaterial({ map: rayTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.55, 0.85, 0.95), fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + (i % 3), 9), rayM);
      m.position.set(rx0 - 8 + i * 2.1, -3.2, rz0 - 4 + (i % 4) * 2.5); m.rotation.z = 0.32;
      m.layers.set(NOINK); m.renderOrder = 6; m.visible = false;
      this.rays.push(m); R.add(m);
    }
    this.toggles.push({ o: reefG, on: () => true });
  }

  /** does any sight line of the film pass through this box? (palms / dhonis: centre lines only) */
  private blocked(mn: THREE.Vector3, mx: THREE.Vector3, coreOnly = false) {
    for (const { o, d, len, core } of this.sight) {
      if (coreOnly && !core) continue;
      let t0 = 0, t1 = len;
      for (const [oo, dd, a, b] of [[o.x, d.x, mn.x, mx.x], [o.y, d.y, mn.y, mx.y], [o.z, d.z, mn.z, mx.z]]) {
        if (Math.abs(dd) < 1e-9) { if (oo < a || oo > b) t0 = Infinity; continue; }
        const ta = (a - oo) / dd, tb = (b - oo) / dd;
        t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
      }
      if (t0 <= t1) return true;
    }
    return false;
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset, t: number) {
    let v = this.sunCache.get(id);
    if (!v) {
      let fx = 0, fz = 0;
      for (let f = s.a; f < s.b; f += 3) {
        const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
        fx += x / n; fz += z / n;
      }
      const n = Math.hypot(fx, fz) || 1;
      v = new THREE.Vector3(fx / n, 0, fz / n);
      this.sunCache.set(id, v);
    }
    // shot 10 is a time-lapse: the sun swings across the sky while the blocks dry
    const swing = s.id === 10 ? -35 + 70 * dryAt(t) : 0;
    const az = THREE.MathUtils.degToRad((s.sunAz ?? L.az) + swing), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const fx = v.x, fz = v.z;
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.15; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L, t);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 110);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = s.light === "day" ? Math.max(L.fogFar, 420) : L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden" || !!s.showSun;
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(s.showSun ? 2.4 : 1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(s.light === "night" ? "#9fb4e6" : s.showSun ? "#fff2c8" : L.sunDisc).multiplyScalar(s.light === "night" ? 0.35 : 1.3);
      if (s.light === "night") { this.sunDisc.scale.multiplyScalar(0.7); this.sunHalo.scale.multiplyScalar(0.45); (this.sunDisc.material as THREE.SpriteMaterial).color.setRGB(1.6, 1.7, 2.0); }
      else (this.sunDisc.material as THREE.SpriteMaterial).color.setRGB(6.0, 4.4, 2.4);
    }
    const ck = s.light === "golden" ? "golden" : "day";
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i];
      m.visible = s.light !== "reef";
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[ck][i % 4];
      (m.material as THREE.MeshBasicMaterial).color.setScalar(s.light === "night" ? 0.32 : 1.1);
    }
    // ---- lagoon colours ----
    const W = this.WU, golden = s.light === "golden", night = s.light === "night";
    untone(night ? "#24577a" : golden ? "#5fc1c4" : "#6fe0e0", W.wShallow.value); untone(night ? "#163a63" : golden ? "#2f8fae" : "#22b5cc", W.wMid.value); untone(night ? "#0d1f3e" : golden ? "#284f86" : "#1466a8", W.wDeep.value);
    untone(night ? "#7f9fd0" : golden ? "#ffd9a8" : "#eafcff", W.wCrest.value); untone(night ? "#e4ecff" : golden ? "#ffe2b0" : "#ffffff", W.wGlint.value);
    untone("#bff4ff", W.wUnderTop.value); untone("#2aa6cf", W.wUnderDeep.value);
    W.wTime.value = t;
    // ---- eras ----
    for (const g of this.toggles) g.o.visible = g.on(s);
    this.lamp.visible = s.era === "legend" && s.light !== "day";
    this.lamp.scale.setScalar(s.id === 9 ? 0.8 + 1.4 * glowAt(t) : 1);
    for (const r of this.rays) { r.visible = s.light === "reef"; r.rotation.z = 0.32 + 0.05 * Math.sin(t * 0.6 + r.position.z); }
    // wall drops (shot 12): fall 2.4 m with gravity, land on the cue word; before shot 12 the gap is open
    for (const d of this.drops) {
      const fall = 0.42, u = (t - (d.t - fall)) / fall;
      if (id < 12 || (id === 12 && u < 0)) { d.m.visible = false; continue; }
      d.m.visible = true;
      const k = id > 12 ? 1 : Math.min(1, u);
      d.m.position.y = d.y + 2.4 * (1 - k * k);
      const sq = id === 12 && t >= d.t && t < d.t + 0.15 ? 1 - 0.12 * Math.sin(((t - d.t) / 0.15) * Math.PI) : 1;
      d.m.scale.set(1 + (1 - sq) * 0.6, sq, 1);
    }
    // drying blocks
    const dk = s.id < 10 ? 0 : s.id === 10 ? dryAt(t) : 1;
    this.dryMat.color.set("#b39d7c").lerp(new THREE.Color("#fbf6ea"), dk);
    // palms sway, dhonis bob
    for (const p of this.palms) { p.crown.rotation.z = 0.035 * Math.sin(t * 1.3 + p.k); p.crown.rotation.x = 0.025 * Math.sin(t * 1.1 + p.k * 1.7); }
    for (const d of this.dhonis) { d.o.position.y = d.y + (d.y < 0.1 ? 0.06 * Math.sin(t * 1.4 + d.k) : 0); d.o.rotation.z = d.y < 0.1 ? 0.03 * Math.sin(t * 1.1 + d.k) : 0; }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.mirror ? -p.w : p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

/** every lens position of the film looking at its subject: centre, sides and top of frame */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a - 6; f < s.b + 6; f += 3) {
    const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
    if (c.pos[1] < 0) continue; // under water: nothing on the island can block
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wShallow, wMid, wDeep, wCrest, wGlint, wUnderTop, wUnderDeep, wIsle;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime, wR;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  vec2 wp = vWP.xz + vec2(0.18 * wTime, 0.07 * wTime);
  vec4 mk = mix(texture2D(wNearTex, wp / 7.0), texture2D(wFarTex, wp / 36.0 + 0.37), smoothstep(20.0, 80.0, wd));
  vec3 wc;
  if (cameraPosition.y < 0.0) {
    // the surface seen from below: bright overhead, darker toward the edges of the window
    float up = clamp(-wV.y / wd, 0.0, 1.0);
    wc = mix(wUnderDeep, wUnderTop, smoothstep(0.15, 0.85, up));
    wc = mix(wc, vec3(1.0), mk.r * 0.45 * up);
  } else {
    float r = length(vWP.xz - wIsle.xz) - wR;                       // metres past the shoreline
    wc = mix(wShallow, wMid, smoothstep(2.0, 26.0, r));
    wc = mix(wc, wDeep, smoothstep(30.0, 90.0, r));
    float graze = 1.0 - smoothstep(0.0, 0.45, asin(clamp(-wV.y / wd, 0.0, 1.0)));
    wc = mix(wc, wDeep * 1.1, graze * 0.35);
    wc = mix(wc, wCrest, mk.r * 0.55);
    wc = mix(wc, wGlint, mk.b * (0.25 + 0.5 * graze));
    wc = mix(wc, vec3(1.0), (1.0 - smoothstep(0.0, 1.6, abs(r))) * (0.55 + 0.25 * sin(wTime * 1.7 + vWP.x * 0.4)));  // surf line
  }
  diffuseColor.rgb = wc;`;
