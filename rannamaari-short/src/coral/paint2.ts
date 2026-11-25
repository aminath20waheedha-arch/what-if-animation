// Hand-painted textures for the Maldives set (same approach as paint.ts: canvases, cached, seamless where tiled):
// coral sand, carved coral frieze, coral-stone walls, palm fronds (alpha cut-out) and trunk rings, palm-leaf thatch
// (cadjan), lacquered wood bands, dhoni planking, sea floor, painted plaster.
import { ctex, jit } from "./paint";

const U = (r: () => number, a: number, b: number) => a + (b - a) * r();

/** soft blotches for painted variation */
const blot = (g: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
};
/** draw at x, and wrapped copies so the tile is seamless */
const wrap = (S: number, x: number, y: number, fn: (x: number, y: number) => void) => {
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(x + dx, y + dy);
};

/** pale coral sand with shell bits and soft ripples; 1024 px = tile */
export const sandHD = (key = "sandHD", base = "#efe3c4") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { const x = U(r, 0, S), y = U(r, 0, S), l = r() > 0.5; wrap(S, x, y, (a, b) => blot(g, a, b, U(r, 40, 140), l ? "255,252,240" : "190,160,110", l ? 0.25 : 0.12)); }
  for (let i = 0; i < 1600; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), s = U(r, 1, 3.2);
    g.fillStyle = r() > 0.6 ? "rgba(255,255,255,0.7)" : r() > 0.5 ? "rgba(170,140,100,0.45)" : "rgba(235,160,140,0.5)";
    g.fillRect(x, y, s, s);
  }
  g.strokeStyle = "rgba(170,140,95,0.16)"; g.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const y0 = U(r, 0, S); g.beginPath();
    for (let x = -20; x <= S + 20; x += 16) g.lineTo(x, y0 + 7 * Math.sin(x * 0.02 + i));
    g.stroke();
  }
});

/** coral stone ashlar: cream-white dressed blocks with tiny pores, some warm ochre/pink stains; 1024 px = tile */
export const coralWallHD = (key = "coralWallHD", cols = ["#f1e7d3", "#ebdfc8", "#f6eee0", "#e4d5bb"], mortar = "#cdbb9c") => ctex(key, 1024, 1024, (g, r) => {
  const S = 1024, RH = 128;
  g.fillStyle = mortar; g.fillRect(0, 0, S, S);
  for (let row = 0; row < S / RH; row++) {
    const y = row * RH, ws: number[] = [];
    let sum = 0;
    while (sum < S) { const w = U(r, 210, 330); ws.push(w); sum += w; }
    const k = S / sum;
    let x = (row % 2) * 150 + U(r, 0, 50);
    for (const w0 of ws) {
      const w = w0 * k, col = jit(r, cols[Math.floor(r() * cols.length)], 0.06, 6, 0.2);
      wrap(S, x, y, (a, b) => {
        g.fillStyle = col; g.beginPath(); g.roundRect(a + 4, b + 4, w - 8, RH - 8, 10); g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(a + 8, b + 6, w - 16, 5);
        g.fillStyle = "rgba(120,95,60,0.18)"; g.fillRect(a + 8, b + RH - 14, w - 16, 6);
      });
      for (let i = 0; i < 26; i++) { const px = x + U(r, 10, w - 10), py = y + U(r, 10, RH - 10); wrap(S, px, py, (a, b) => { g.fillStyle = "rgba(150,125,90,0.35)"; g.beginPath(); g.ellipse(a, b, U(r, 1.5, 4), U(r, 1, 3), 0, 0, 7); g.fill(); }); }
      if (r() < 0.25) wrap(S, x + w / 2, y + RH / 2, (a, b) => blot(g, a, b, U(r, 30, 80), r() > 0.5 ? "214,150,120" : "205,170,100", 0.18));
      x += w;
    }
  }
});

/** carved coral frieze band (repeats along u): lotus-lozenge chain between two rope mouldings; 1024 x 256 */
export const friezeHD = () => ctex("friezeHD", 1024, 256, (g) => {
  g.fillStyle = "#f1e6d0"; g.fillRect(0, 0, 1024, 256);
  const dark = "rgba(110,85,55,0.55)", lite = "rgba(255,255,255,0.6)";
  for (const y of [22, 234]) {
    g.fillStyle = "#e3d2b4"; g.fillRect(0, y - 16, 1024, 32);
    for (let x = 0; x < 1024; x += 32) { g.strokeStyle = dark; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x + 20, y + 14); g.stroke(); }
  }
  for (let i = 0; i < 8; i++) {
    const cx = 64 + i * 128, cy = 128;
    g.fillStyle = "#e6d6b8";
    g.beginPath(); g.moveTo(cx, cy - 78); g.lineTo(cx + 58, cy); g.lineTo(cx, cy + 78); g.lineTo(cx - 58, cy); g.closePath(); g.fill();
    g.strokeStyle = dark; g.lineWidth = 6; g.stroke();
    // lotus: five petals
    for (let k = -2; k <= 2; k++) {
      g.save(); g.translate(cx, cy + 30); g.rotate(k * 0.42);
      g.fillStyle = k === 0 ? "#f7efe0" : "#efe2c8"; g.beginPath(); g.ellipse(0, -34, 11, 30, 0, 0, 7); g.fill();
      g.strokeStyle = dark; g.lineWidth = 3.5; g.stroke(); g.restore();
    }
    g.strokeStyle = lite; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 50, cy - 4); g.lineTo(cx, cy - 70); g.stroke();
    // little roundels between the lozenges
    g.fillStyle = "#e6d6b8"; g.beginPath(); g.arc(cx + 64, cy, 16, 0, 7); g.fill(); g.strokeStyle = dark; g.lineWidth = 4; g.stroke();
  }
});

/** coconut frond, alpha cut-out: rachis along v (base at v = 0), leaflets either side; 512 x 1024 */
export const frondTex = (key = "frond", col = "#5fb048") => ctex(key, 512, 1024, (g, r) => {
  g.clearRect(0, 0, 512, 1024);
  const dark = jit(r, col, 0.0) , deep = "#2f6a2a";
  for (let i = 0; i < 46; i++) {
    const v = 60 + i * 20, w = 230 * Math.sin(Math.PI * Math.min(1, (v - 30) / 960)) ** 0.7, droop = 46 + i * 1.2;
    for (const s of [-1, 1]) {
      g.fillStyle = i % 3 ? col : dark;
      g.beginPath();
      g.moveTo(256, 1024 - v);
      g.quadraticCurveTo(256 + s * w * 0.55, 1024 - v - 24, 256 + s * w, 1024 - v + droop * 0.6);
      g.quadraticCurveTo(256 + s * w * 0.5, 1024 - v + 4, 256, 1024 - v + 12);
      g.fill();
      g.strokeStyle = deep; g.lineWidth = 1.5; g.stroke();
    }
  }
  g.strokeStyle = "#7a8a3a"; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.moveTo(256, 1024); g.lineTo(256, 30); g.stroke();
});

/** palm trunk: warm grey-brown with leaf-scar rings; tiles along v */
export const trunkTex = () => ctex("trunk", 256, 512, (g, r) => {
  g.fillStyle = "#9b8466"; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = jit(r, "#8a7356", 0.08); g.fillRect(0, y, 256, 10);
    g.fillStyle = "rgba(60,45,30,0.5)"; g.fillRect(0, y + 10, 256, 3);
    g.fillStyle = "rgba(255,240,215,0.25)"; g.fillRect(0, y + 14, 256, 4);
  }
  for (let i = 0; i < 60; i++) blot(g, U(r, 0, 256), U(r, 0, 512), U(r, 8, 30), "70,55,40", 0.12);
});

/** cadjan thatch (woven coconut-leaf roof): overlapping dry-leaf rows; tiles */
export const thatchHD = (key = "thatch", col = "#b99561") => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    const y = row * 32;
    for (let x = -10; x < 520; x += 6) {
      g.strokeStyle = jit(r, row % 2 ? "#a7834f" : "#c7a46b", 0.12, 4, 0.2);
      g.lineWidth = U(r, 2, 4.5);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + U(r, -4, 4), y + 38); g.stroke();
    }
    g.fillStyle = "rgba(70,50,25,0.35)"; g.fillRect(0, y + 28, 512, 5);
  }
});

/** Maldivian lacquer work (liyelaa jehun): black ground, red and yellow rings with fine incised lines; tiles along u */
export const lacquerTex = () => ctex("lacquer", 512, 128, (g) => {
  g.fillStyle = "#1c1412"; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 8; i++) {
    const x = i * 64;
    g.fillStyle = "#b8352b"; g.fillRect(x + 6, 14, 52, 100);
    g.fillStyle = "#e6b13c"; g.fillRect(x + 16, 30, 32, 68);
    g.fillStyle = "#1c1412"; g.beginPath(); g.ellipse(x + 32, 64, 9, 22, 0, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,230,170,0.7)"; g.lineWidth = 2; g.strokeRect(x + 10, 18, 44, 92);
  }
});

/** dhoni hull planks: dark varnished wood with a pale waterline band; tiles along u */
export const hullTex = () => ctex("hull", 512, 256, (g, r) => {
  g.fillStyle = "#6e4a2e"; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = jit(r, "#7a5233", 0.1); g.fillRect(0, y + 2, 512, 28);
    g.fillStyle = "rgba(30,18,10,0.6)"; g.fillRect(0, y, 512, 3);
  }
  g.fillStyle = "#e9e0cc"; g.fillRect(0, 214, 512, 14);
  g.fillStyle = "#2f6f8f"; g.fillRect(0, 228, 512, 28);
});

/** sea floor: pale sand with blue caustic net and scattered rubble; 1024 */
export const seafloorHD = () => ctex("seafloorHD", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e3dcc0"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 50; i++) { const x = U(r, 0, S), y = U(r, 0, S); wrap(S, x, y, (a, b) => blot(g, a, b, U(r, 50, 160), r() > 0.5 ? "255,255,245" : "160,150,120", 0.2)); }
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 5;
  for (let i = 0; i < 140; i++) {
    const x = U(r, 0, S), y = U(r, 0, S), a = U(r, 0, 6.28), l = U(r, 30, 90);
    wrap(S, x, y, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a + 1) * l * 0.5, py + Math.sin(a + 1) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); });
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() > 0.5 ? "rgba(140,120,100,0.5)" : "rgba(250,245,235,0.8)"; g.beginPath(); g.ellipse(U(r, 0, S), U(r, 0, S), U(r, 2, 7), U(r, 2, 5), U(r, 0, 3), 0, 7); g.fill(); }
});

/** smooth painted plaster (houses and modern blocks): base colour with soft wash; tiles */
export const plasterHD = (col: string) => ctex("plaster" + col, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) { const x = U(r, 0, 512), y = U(r, 0, 512), l = r() > 0.5; wrap(512, x, y, (a, b) => blot(g, a, b, U(r, 30, 110), l ? "255,255,255" : "120,95,70", l ? 0.12 : 0.07)); }
});

/** modern Malé block: pastel plaster, balconies and window grid, per storey 3 m; w x h metres */
export const modernFacade = (key: string, wm: number, hm: number, col: string) => {
  const PX = 48, W = Math.round(wm * PX), H = Math.round(hm * PX);
  return ctex("modern" + key, W, H, (g, r) => {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) blot(g, U(r, 0, W), U(r, 0, H), U(r, 30, 120), "255,255,255", 0.1);
    const storeys = Math.max(1, Math.round(hm / 3)), bays = Math.max(1, Math.round(wm / 2.6));
    for (let s = 0; s < storeys; s++) for (let b = 0; b < bays; b++) {
      const x0 = (b + 0.2) * (W / bays), ww = 0.6 * (W / bays), y0 = H - (s + 1) * 3 * PX + 0.7 * PX, wh = 1.5 * PX;
      if (s === 0 && b === Math.floor(bays / 2)) { g.fillStyle = "#4a3b33"; g.fillRect(x0, H - 2.4 * PX, ww, 2.4 * PX); continue; }
      g.fillStyle = r() > 0.3 ? "#5f7fa8" : "#3e5470"; g.fillRect(x0, y0, ww, wh);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x0 + ww * 0.15, y0, ww * 0.12, wh);
      if (s > 0 && r() > 0.4) { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(x0 - 6, y0 + wh, ww + 12, 8); g.fillStyle = "rgba(60,60,70,0.6)"; for (let k = 0; k < 6; k++) g.fillRect(x0 + (k * ww) / 5, y0 + wh * 0.55, 2, wh * 0.45); }
    }
    g.fillStyle = "rgba(0,0,0,0.12)"; for (let s = 1; s < storeys; s++) g.fillRect(0, H - s * 3 * PX, W, 4);
  });
};

/** traditional coral-stone house front with a carved wooden door and small shuttered windows; w x h metres */
export const houseFacade = (key: string, wm: number, hm: number, wall: string, door: string) => {
  const PX = 64, W = Math.round(wm * PX), H = Math.round(hm * PX);
  return ctex("house" + key, W, H, (g, r) => {
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) blot(g, U(r, 0, W), U(r, 0, H), U(r, 20, 90), r() > 0.5 ? "255,255,255" : "140,110,80", 0.1);
    g.fillStyle = "rgba(120,95,65,0.25)"; g.fillRect(0, H - 0.35 * PX, W, 0.35 * PX);
    const dw = 0.95 * PX, dh = 1.9 * PX, dx = W / 2 - dw / 2;
    g.fillStyle = door; g.fillRect(dx, H - dh, dw, dh);
    g.strokeStyle = "rgba(30,20,10,0.7)"; g.lineWidth = 4; g.strokeRect(dx, H - dh, dw, dh);
    g.beginPath(); g.moveTo(W / 2, H - dh); g.lineTo(W / 2, H); g.stroke();
    for (const s of [-1, 1]) if (wm > 3) {
      const wx = W / 2 + s * 1.5 * PX - 0.3 * PX, wy = H - 1.75 * PX;
      g.fillStyle = "#3b2c22"; g.fillRect(wx, wy, 0.6 * PX, 0.7 * PX);
      g.fillStyle = "#6c8a7a"; g.fillRect(wx + 3, wy + 3, 0.6 * PX - 6, 0.7 * PX - 6);
      g.strokeStyle = "rgba(30,20,10,0.6)"; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(wx, wy + (k * 0.7 * PX) / 4); g.lineTo(wx + 0.6 * PX, wy + (k * 0.7 * PX) / 4); g.stroke(); }
    }
  });
};

/** the mosque's front: coral ashlar with carved wooden doors and lattice windows; w x h metres (front wall) */
export const mosqueFront = (wm: number, hm: number, doors: number) => {
  const PX = 64, W = Math.round(wm * PX), H = Math.round(hm * PX);
  const base = coralWallHD().image as HTMLCanvasElement;
  return ctex("mosqueFront" + wm + "x" + hm, W, H, (g) => {
    for (let y = 0; y < H; y += 128) for (let x = 0; x < W; x += 128) g.drawImage(base, 0, 0, 1024, 1024, x, y, 128, 128);
    const fr = friezeHD().image as HTMLCanvasElement, fh = 0.55 * PX;
    for (let x = 0; x < W; x += fh * 4) g.drawImage(fr, 0, 0, 1024, 256, x, 0.12 * PX, fh * 4, fh);
    const lac = lacquerTex().image as HTMLCanvasElement;
    for (let i = 0; i < doors; i++) {
      const cx = ((i + 0.5) * W) / doors, dw = 1.1 * PX, dh = 2.5 * PX;
      g.fillStyle = "#5b3a24"; g.fillRect(cx - dw / 2, H - dh, dw, dh);
      g.drawImage(lac, 0, 0, 512, 128, cx - dw / 2, H - dh - 0.32 * PX, dw, 0.3 * PX);
      g.strokeStyle = "rgba(25,15,8,0.85)"; g.lineWidth = 5; g.strokeRect(cx - dw / 2, H - dh, dw, dh);
      g.strokeStyle = "rgba(230,180,90,0.55)"; g.lineWidth = 3;
      for (let k = 0; k < 3; k++) g.strokeRect(cx - dw / 2 + 8, H - dh + 8 + (k * (dh - 16)) / 3, dw / 2 - 12, (dh - 16) / 3 - 6), g.strokeRect(cx + 4, H - dh + 8 + (k * (dh - 16)) / 3, dw / 2 - 12, (dh - 16) / 3 - 6);
      if (i < doors - 1) { // lattice window between doors
        const wx = ((i + 1) * W) / doors - 0.45 * PX, wy = H - 2.3 * PX;
        g.fillStyle = "#3a2a1e"; g.fillRect(wx, wy, 0.9 * PX, 1.2 * PX);
        g.strokeStyle = "#c89a5a"; g.lineWidth = 3;
        for (let k = -6; k < 12; k++) { g.beginPath(); g.moveTo(wx + k * 10, wy); g.lineTo(wx + k * 10 + 1.2 * PX, wy + 1.2 * PX); g.stroke(); g.beginPath(); g.moveTo(wx + k * 10, wy + 1.2 * PX); g.lineTo(wx + k * 10 + 1.2 * PX, wy); g.stroke(); }
        g.strokeStyle = "rgba(25,15,8,0.85)"; g.lineWidth = 5; g.strokeRect(wx, wy, 0.9 * PX, 1.2 * PX);
      }
    }
  });
};
