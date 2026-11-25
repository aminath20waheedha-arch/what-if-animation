// The 9:16 Short of the shadow episode: the landscape episode framed in the middle (scaled 1.15, centre crop), the
// title on top, word-synced captions underneath (Poppins ExtraBold, the spoken word in yellow). Audio comes from
// the episode itself.
import React from 'react';
import { AbsoluteFill, continueRender, delayRender, spring, staticFile, useCurrentFrame } from 'remotion';
import { FONT } from './engine';
import { shadow } from './episodes/shadow';
import { slowtime } from './episodes/slowtime';
import SHADOW_WORDS from './episodes/shadow/words.json';
import SLOW_WORDS from './episodes/slowtime/words.json';
import SHADOW_TL from './episodes/shadow/timeline.json';
import SLOW_TL from './episodes/slowtime/timeline.json';

const FPS = 30;
// the episode scaled to fill the 9:16 frame (1.68: 1814 px tall, the middle 643 world units of width), title and captions on top
const K = 1.68, VW = 1920 * K, VH = 1080 * K, TOP = (1920 - 1080 * 1.68) / 2;

const fontFamily = 'ShortCaption';
if (typeof document !== 'undefined' && !(window as unknown as { __shortFont?: boolean }).__shortFont) {
  (window as unknown as { __shortFont?: boolean }).__shortFont = true;
  const h = delayRender('caption font');
  new FontFace(fontFamily, `url(${staticFile('fonts/Poppins-ExtraBold.woff2')}) format("woff2")`, { weight: '800' })
    .load().then((f) => { (document.fonts as unknown as { add: (x: FontFace) => void }).add(f); continueRender(h); })
    .catch(() => continueRender(h));
}

type W = { w: string; s: number; e: number; p?: string };
type Phrase = { words: W[]; s: number; e: number };
const phrasesOf = (WORDS: W[]): Phrase[] => {
  const ws = WORDS, out: Phrase[] = [];
  let cur: W[] = [];
  const push = () => { if (cur.length) out.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  ws.forEach((w, i) => {
    cur.push(w);
    const gap = i + 1 < ws.length ? ws[i + 1].s - w.e : 1;
    if (/[.,?!]/.test(w.p ?? '') || gap > 0.28 || cur.length >= 4) push();
  });
  push();
  out.forEach((p, i) => { p.e = Math.min(p.e + 0.5, i + 1 < out.length ? out[i + 1].s - 0.04 : p.e + 0.8); });
  return out;
};
const PH: Record<string, Phrase[]> = { shadow: phrasesOf(SHADOW_WORDS as W[]), slowtime: phrasesOf(SLOW_WORDS as W[]) };

const Captions: React.FC<{ phrases: Phrase[] }> = ({ phrases: PHRASES }) => {
  const f = useCurrentFrame(), t = f / FPS, lead = 2 / FPS;
  const p = PHRASES.find((x) => t >= x.s - lead && t < x.e);
  if (!p) return null;
  const pop = spring({ frame: f - Math.round((p.s - lead) * FPS), fps: FPS, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const cur = p.words.reduce((k, x, j) => (t >= x.s - lead ? j : k), -1);
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: 1380, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, rowGap: 4,
      fontFamily, fontWeight: 800, fontSize: 80, lineHeight: 1.15, transform: `scale(${0.82 + 0.18 * pop}) translateY(${(1 - pop) * 22}px)`, opacity: Math.min(1, pop * 1.6) }}>
      {p.words.map((w, i) => (
        <span key={i} style={{ color: i === cur ? '#FFE14D' : '#FFFFFF', WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', textShadow: '0 5px 14px rgba(0,0,0,.55)',
          display: 'inline-block', transform: i === cur ? 'scale(1.08)' : 'none' }}>{w.w}</span>
      ))}
    </div>
  );
};

const VerticalShort: React.FC<{ ep: { Main: React.FC; timeline?: unknown }; phrases: Phrase[]; title: [string, string]; titleUntil: number }> = ({ ep, phrases, title, titleUntil }) => {
  const f = useCurrentFrame();
  // the title drops in, then fades away once the premise line has been said
  const titleIn = spring({ frame: f, fps: FPS, config: { damping: 16, stiffness: 160 } }) * (1 - Math.min(1, Math.max(0, (f - titleUntil) / 12)));
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #17121F 0%, #0E0B14 45%, #0E0B14 60%, #1B1424 100%)' }}>
      <div style={{ position: 'absolute', left: -(VW - 1080) / 2, top: TOP, width: 1920, height: 1080, transform: `scale(${K})`, transformOrigin: 'top left', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: 1920, height: 1080 }}><ep.Main /></div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 110, textAlign: 'center', fontFamily: FONT.title, fontWeight: 800, fontSize: 74, lineHeight: 1.05,
        color: '#FFF4E6', letterSpacing: 0.5, WebkitTextStroke: '8px #120E18', paintOrder: 'stroke fill', textShadow: '0 6px 18px rgba(0,0,0,.6)', transform: `translateY(${(1 - titleIn) * -30}px)`, opacity: titleIn }}>
        {title[0]}<br /><span style={{ color: '#FF5A6A' }}>{title[1]}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 380, background: 'linear-gradient(180deg, rgba(14,11,20,.75), rgba(14,11,20,0))', opacity: titleIn }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 640, background: 'linear-gradient(0deg, rgba(14,11,20,.7), rgba(14,11,20,0))' }} />
      <Captions phrases={phrases} />
    </AbsoluteFill>
  );
};
const after = (tl: { shots: { id: string; first: number }[] }, id: string) => tl.shots.find((x) => x.id === id)?.first ?? 300;
export const ShadowShort: React.FC = () => <VerticalShort ep={shadow} phrases={PH.shadow} titleUntil={after(SHADOW_TL, 'S5')} title={['WHAT IF YOUR SHADOW', 'WAS 3 SECONDS LATE?']} />;
export const SlowTimeShort: React.FC = () => <VerticalShort ep={slowtime} phrases={PH.slowtime} titleUntil={after(SLOW_TL, 'S5')} title={['WHAT IF TIME WAS', '10X SLOWER FOR YOU?']} />;
export const SHADOW_SHORT_FRAMES = shadow.total;
export const SLOWTIME_SHORT_FRAMES = slowtime.total;
