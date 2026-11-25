// Word-synced captions, bottom middle: short phrases (max 4 words, broken at sentence ends and pauses), the word being
// spoken pops in yellow, each phrase springs in. Timed to words.json like everything else, so a new take re-times them.
// Spoken numbers are shown as digits ("sixteen fifty-eight" -> "1658").
import React from "react";
import { AbsoluteFill, continueRender, delayRender, spring, staticFile, useCurrentFrame } from "remotion";
import WORDS from "./words.json";
import { FPS } from "./plan";

// Montserrat Black, bundled (public/fonts, SIL OFL) so renders never depend on a font CDN
const fontFamily = "CoralCaption";
if (typeof document !== "undefined" && !document.fonts.check(`900 20px ${fontFamily}`)) {
  const h = delayRender("caption font");
  const face = new FontFace(fontFamily, `url(${staticFile("fonts/Montserrat-Black.woff2")}) format("woff2")`, { weight: "900" });
  face.load().then((ff) => { (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); });
}

type W = { w: string; s: number; e: number; line?: number };
type Tok = { text: string; s: number; e: number; line: number; brk: boolean };

/** spoken -> written merges (lower-case word sequences) */
const MERGE: [string[], string][] = [
  [["sixteen", "fifty-eight"], "1658"],
  [["three", "hundred", "and", "fifty"], "350"],
  [["seventeen"], "17"],
];
const SCRIPT_PUNCT = /[.,?!:;]$/;

const tokens = (): Tok[] => {
  const ws = WORDS as W[], out: Tok[] = [];
  for (let i = 0; i < ws.length; i++) {
    let merged = false;
    for (const [seq, rep] of MERGE) {
      const ok = seq.every((x, k) => ws[i + k] && ws[i + k].w.toLowerCase().replace(/[^a-z'-]/g, "") === x);
      if (ok) {
        out.push({ text: rep, s: ws[i].s, e: ws[i + seq.length - 1].e, line: ws[i].line ?? 0, brk: false });
        i += seq.length - 1; merged = true; break;
      }
    }
    if (!merged) out.push({ text: ws[i].w, s: ws[i].s, e: ws[i].e, line: ws[i].line ?? 0, brk: SCRIPT_PUNCT.test(ws[i].w) });
  }
  // punctuation is stripped in words.json: mark breaks at line ends and at pauses > 0.28 s
  for (let i = 0; i < out.length - 1; i++) if (out[i + 1].line !== out[i].line || out[i + 1].s - out[i].e > 0.28) out[i].brk = true;
  return out;
};

type Phrase = { words: Tok[]; s: number; e: number };
const PHRASES: Phrase[] = (() => {
  const t = tokens(), ph: Phrase[] = [];
  let cur: Tok[] = [];
  const push = () => { if (cur.length) ph.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  for (const w of t) {
    cur.push(w);
    const chars = cur.reduce((a, x) => a + x.text.length + 1, 0);
    if (w.brk || cur.length >= 4 || chars > 22) push();
  }
  push();
  // hold each phrase until the next one starts (or 0.5 s after its last word)
  ph.forEach((p, i) => { p.e = Math.min(p.e + 0.5, i + 1 < ph.length ? ph[i + 1].s - 0.04 : p.e + 0.8); });
  return ph;
})();

export const Captions: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const lead = 2 / FPS;
  const p = PHRASES.find((x) => t >= x.s - lead && t < x.e);
  if (!p) return null;
  const pop = spring({ frame: f - Math.round((p.s - lead) * FPS), fps: FPS, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380, pointerEvents: "none" }}>
      <div style={{
        maxWidth: 940, display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 26, rowGap: 4, fontFamily, fontWeight: 900, fontSize: 82, lineHeight: 1.12, letterSpacing: 1,
        textTransform: "uppercase", transform: `scale(${0.82 + 0.18 * pop}) translateY(${(1 - pop) * 22}px)`, opacity: Math.min(1, pop * 1.6),
      }}>
        {p.words.map((w, i) => {
          const cur = p.words.reduce((k, x, j) => (t >= x.s - lead ? j : k), -1);
          const on = i === cur;
          return (
            <span key={i} style={{
              color: on ? "#ffe14d" : "#ffffff",
              WebkitTextStroke: "14px #120c14", paintOrder: "stroke fill",
              textShadow: "0 8px 0 rgba(18,12,20,0.55)",
              display: "inline-block", transform: on ? "scale(1.08)" : "none",
            }}>{w.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
