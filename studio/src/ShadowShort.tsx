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

const FPS = 30;
const K = 1.15, VW = 1920 * K, VH = 1080 * K, TOP = 330;

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
    <div style={{ position: 'absolute', left: 40, right: 40, top: TOP + VH + 60, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, rowGap: 4,
      fontFamily, fontWeight: 800, fontSize: 80, lineHeight: 1.15, transform: `scale(${0.82 + 0.18 * pop}) translateY(${(1 - pop) * 22}px)`, opacity: Math.min(1, pop * 1.6) }}>
      {p.words.map((w, i) => (
        <span key={i} style={{ color: i === cur ? '#FFE14D' : '#FFFFFF', WebkitTextStroke: '10px #000', paintOrder: 'stroke fill', textShadow: '0 5px 14px rgba(0,0,0,.55)',
          display: 'inline-block', transform: i === cur ? 'scale(1.08)' : 'none' }}>{w.w}</span>
      ))}
    </div>
  );
};

const VerticalShort: React.FC<{ ep: { Main: React.FC }; phrases: Phrase[]; title: [string, string] }> = ({ ep, phrases, title }) => {
  const f = useCurrentFrame();
  const titleIn = spring({ frame: f, fps: FPS, config: { damping: 16, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #17121F 0%, #0E0B14 45%, #0E0B14 60%, #1B1424 100%)' }}>
      <div style={{ position: 'absolute', left: -(VW - 1080) / 2, top: TOP, width: 1920, height: 1080, transform: `scale(${K})`, transformOrigin: 'top left', overflow: 'hidden' }}>
        <div style={{ position: 'relative', width: 1920, height: 1080 }}><ep.Main /></div>
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, top: 70, textAlign: 'center', fontFamily: FONT.title, fontWeight: 800, fontSize: 74, lineHeight: 1.05,
        color: '#FFF4E6', letterSpacing: 0.5, transform: `translateY(${(1 - titleIn) * -30}px)`, opacity: titleIn }}>
        {title[0]}<br /><span style={{ color: '#FF5A6A' }}>{title[1]}</span>
      </div>
      <Captions phrases={phrases} />
    </AbsoluteFill>
  );
};
export const ShadowShort: React.FC = () => <VerticalShort ep={shadow} phrases={PH.shadow} title={['WHAT IF YOUR SHADOW', 'WAS 3 SECONDS LATE?']} />;
export const SlowTimeShort: React.FC = () => <VerticalShort ep={slowtime} phrases={PH.slowtime} title={['WHAT IF TIME WAS', '10X SLOWER FOR YOU?']} />;
export const SHADOW_SHORT_FRAMES = shadow.total;
export const SLOWTIME_SHORT_FRAMES = slowtime.total;
