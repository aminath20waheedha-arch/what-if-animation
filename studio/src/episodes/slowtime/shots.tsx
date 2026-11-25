import React from 'react';
import {
  Hero, Pose, basePose, kf, clamp, lerp, easeOut, faceAt, LOOKS, LEG_LEN, camT, shake, Sparkle, FloatLabel, FocusRings, walkPose, Phone, PizzaSlice,
  Rooftop, Classroom, Study, Bedroom, BEDROOM, Kitchen, KitchenIsland, KITCHEN, stand, Schematic, DrawOn, Arrow, SchLabel, CountUp, Glow, FONT, Toast, ShotProps,
} from '../../engine';

// "What if time moved 10x slower, but only for you?" Fourteen shots. The world fast-forwards around Pip: clocks
// spin, the sun races, calendars cross themselves off. Framed for the 9:16 reframe (action within x ~ 490..1430).
const PIP = LOOKS.pipHood;
const ROOF_HIP = 820 - LEG_LEN;

/** a wall clock whose hands race (speed = turns of the minute hand per second of shot) */
const FastClock: React.FC<{ x: number; y: number; r?: number; t: number; speed?: number }> = ({ x, y, r = 46, t, speed = 1.5 }) => {
  const m = (t / 30) * speed * 360, h = m / 12;
  return (
    <g>
      <circle cx={x} cy={y} r={r + 6} fill="#2A2232" />
      <circle cx={x} cy={y} r={r} fill="#F4EEE2" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={x - 2} y={y - r + 4} width={4} height={8} fill="#3A3446" transform={`rotate(${i * 30} ${x} ${y})`} />)}
      <line x1={x} y1={y} x2={x} y2={y - r * 0.55} stroke="#3A3446" strokeWidth={6} strokeLinecap="round" transform={`rotate(${h} ${x} ${y})`} />
      <line x1={x} y1={y} x2={x} y2={y - r * 0.85} stroke="#E8553A" strokeWidth={4} strokeLinecap="round" transform={`rotate(${m} ${x} ${y})`} />
      <circle cx={x} cy={y} r={5} fill="#3A3446" />
      {speed > 1 ? <circle cx={x} cy={y} r={r + 14} fill="none" stroke="#FFE7B3" strokeWidth={3} strokeDasharray="8 14" opacity={0.6} transform={`rotate(${-m * 0.3} ${x} ${y})`} /> : null}
    </g>
  );
};
const Big: React.FC<{ x: number; y: number; t: number; text: string; size?: number; color?: string }> = ({ x, y, t, text, size = 84, color = '#FFF1E6' }) =>
  t > 0 ? <text x={x} y={y} textAnchor="middle" fontFamily={FONT.title} fontWeight={800} fontSize={size * (0.85 + 0.15 * clamp(t / 6))} fill={color}
    stroke="#1A1220" strokeWidth={8} paintOrder="stroke" opacity={clamp(t / 5)}>{text}</text> : null;

// ---------- S1: one bite, the pizza is cold ----------
const K1 = stand(KITCHEN, 0.45, 0.4);
export const S1: React.FC<ShotProps> = ({ t }) => {
  const lift = kf(t, [[0, 0], [20, 1], [40, 1], [55, 0.3]]);
  const me: Pose = { ...basePose, x: K1.x, y: K1.y, scale: K1.scale, yaw: 0.2, armR: { a: lerp(15, 120, lift), b: lerp(-8, -95, lift) },
    ...faceAt(t, [[0, 'happy'], [90, 'oops']]), look: t > 90 ? 0.8 : 0 };
  return (
    <g transform={camT(K1.x + 60, 520, kf(t, [[0, 1.5], [125, 1.62]]))}>
      <Kitchen t={t * 12} id="s1" veil={0.45} />
      <FastClock x={K1.x + 230} y={360} t={t} speed={2.5} r={40} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimR" />
      <KitchenIsland />
      <PizzaSlice x={K1.x + 150} y={K1.y + 115} len={120} rot={-20} bite={t > 37 ? 0.25 : 0} />
      {t > 92 ? <FloatLabel x={K1.x + 170} y={K1.y + 20} t={t - 92} text="COLD" color="#9FD8FF" size={60} /> : null}
      {t > 60 ? <FloatLabel x={K1.x - 120} y={K1.y - 120} t={t - 60} text="+2 HRS" size={56} /> : null}
    </g>
  );
};

// ---------- S2: he blinks in class; the day is gone ----------
export const S2: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: 700, yaw: 0.1, ...faceAt(t, [[0, 'neutral'], [40, 'oops']]), blink: t >= 2 && t < 10 ? 1 : 0, look: t > 40 ? 0.7 : 0 };
  const dusk = clamp((t - 8) / 30);
  return (
    <g transform={camT(960, 500, kf(t, [[0, 1.3], [89, 1.4]]))}>
      <Classroom t={t * 10} id="s2" />
      <FastClock x={1250} y={250} t={t} speed={3} r={42} />
      <rect x={0} y={0} width={1920} height={1080} fill="#0B0A1E" opacity={0.55 * dusk} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimR" />
      {t > 20 ? <Toast x={960} y={330} t={t - 20} text="SCHOOL'S OUT" hold={60} /> : null}
    </g>
  );
};

// ---------- S3: he ties his shoe, the sun races down ----------
export const S3: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: ROOF_HIP + 40, yaw: 0.6, tilt: 28, legL: { a: 60, b: 80 }, legR: { a: -10, b: 100 }, armL: { a: 40, b: -30 }, armR: { a: 50, b: -40 },
    squash: 0.1, ...faceAt(t, [[0, 'neutral'], [40, 'oops']]), look: t > 40 ? -0.6 : 0.6 };
  return (
    <g transform={camT(980, 600, kf(t, [[0, 1.05], [68, 1.12]]))}>
      <Rooftop t={t * 10} sunX={1150} sunY={kf(t, [[0, 520], [60, 900]], easeOut)} red={clamp((t - 20) / 40) * 0.6} cityLit={1 + clamp((t - 30) / 30)} />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
    </g>
  );
};

// ---------- S4: the title: the sun is a clock, spinning ----------
export const S4: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: ROOF_HIP, yaw: 0, ...faceAt(t, [[0, 'neutral'], [60, 'happy']]), look: 0, headTilt: -10 };
  return (
    <g transform={camT(980, 560, kf(t, [[0, 0.95], [170, 1.05]]))}>
      <Rooftop t={t + 100} sunX={960} sunY={460} clock spin={t * 6} />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
      <Sparkle x={960} y={460} t={t} s={1.2} />
    </g>
  );
};

// ---------- S5: the three-hour ride is over before his song ends ----------
export const S5: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 900, y: 700, yaw: 0.3, armR: { a: 95, b: -80 }, tilt: 3 * Math.sin(t * 0.4), ...faceAt(t, [[0, 'cool']]), look: 0.5 };
  return (
    <g transform={camT(980, 520, kf(t, [[0, 1.25], [112, 1.35]]))}>
      <Study t={t * 8} id="s5" />
      <FastClock x={1200} y={330} t={t} speed={4} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimR" />
      <Phone x={985} y={560} w={60} rot={-10} on={1} caller="♪ SONG 1/1" f={t} />
      {t > 30 ? <FloatLabel x={1000} y={430} t={t - 30} text="3 HRS → 18 MIN" size={44} /> : null}
    </g>
  );
};

// ---------- S6: waiting for the birthday: the calendar crosses itself off ----------
const B6 = stand(BEDROOM, 0.6, 0.5);
export const S6: React.FC<ShotProps> = ({ t }) => {
  const hop = t > 40 ? Math.max(0, Math.sin((t - 40) * 0.35)) * 40 : 0;
  const me: Pose = { ...basePose, x: B6.x, y: B6.y - hop, scale: B6.scale, yaw: 0, armL: { a: t > 40 ? 150 : 15, b: -10 }, armR: { a: t > 40 ? 150 : 15, b: -10 },
    ...faceAt(t, [[0, 'neutral'], [40, 'happy']]) };
  return (
    <g transform={camT(B6.x - 80, 500, kf(t, [[0, 1.3], [90, 1.4]]))}>
      <Bedroom t={t * 8} id="s6" crossed={Math.min(28, Math.floor(t / 1.5))} lamp={0.8} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimR" />
      {t > 40 ? <Big x={B6.x - 60} y={330} t={t - 40} text="BIRTHDAY!" size={70} color="#FFE14D" /> : null}
    </g>
  );
};

// ---------- S7: 1905 on the board: the faster you move, the slower your time ----------
export const S7: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 1210, y: 700, yaw: -0.4, facing: -1, armL: { a: t > 80 ? 120 : 15, b: -10 }, handL: 'point', ...faceAt(t, [[0, 'happy'], [263, 'worried'], [321, 'smug']]), look: -0.7 };
  const board = (
    <g>
      {t > 80 ? <text x={840} y={280} textAnchor="middle" fontFamily={FONT.hand} fontSize={86} fill="#F4F1EA" opacity={clamp((t - 80) / 8)}>1905</text> : null}
      {t > 170 ? <>
        <FastClock x={700} y={420} r={52} t={t} speed={0.15} />
        <text x={700} y={510} textAnchor="middle" fontFamily={FONT.hand} fontSize={34} fill="#F4F1EA">FAST</text>
        <FastClock x={920} y={420} r={52} t={t} speed={1.2} />
        <text x={920} y={510} textAnchor="middle" fontFamily={FONT.hand} fontSize={34} fill="#F4F1EA">STILL</text>
        <DrawOn d="M 640 330 L 760 330" t={t - 170} dur={10} color="#FFD27A" width={6} />
      </> : null}
      {t > 263 ? <text x={1000} y={280} textAnchor="middle" fontFamily={FONT.hand} fontSize={80} fill="#FF8A7A" opacity={clamp((t - 263) / 6)}>?</text> : null}
    </g>
  );
  return (
    <g transform={camT(900, 460, kf(t, [[0, 1.15], [377, 1.3]]))}>
      <Classroom t={t + 300} id="s7" board={board} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimL" />
      {t > 321 ? <Big x={900} y={640} t={t - 321} text="1971" size={110} color="#FFE14D" /> : null}
    </g>
  );
};

// ---------- S8: 1971, atomic clocks fly around the world ----------
export const S8: React.FC<ShotProps> = ({ t }) => {
  const a = (t / 160) * Math.PI * 2 - Math.PI / 2, px = 960 + Math.cos(a) * 270, py = 520 + Math.sin(a) * 270 * 0.45;
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.0], [368, 1.08]]))}>
      <Schematic t={t} id="s8" />
      <DrawOn d="M 960 520 m -180 0 a 180 180 0 1 0 360 0 a 180 180 0 1 0 -360 0" t={t} dur={16} color="#7FD1FF" width={7} />
      <DrawOn d="M 780 520 Q 960 470 1140 520 M 800 440 Q 960 400 1120 440 M 800 600 Q 960 640 1120 600" t={t - 8} dur={14} color="#7FD1FF" width={3} />
      <ellipse cx={960} cy={520} rx={270} ry={122} fill="none" stroke="#FFE7B3" strokeWidth={2} strokeDasharray="10 12" opacity={0.6} />
      <g transform={`translate(${px} ${py}) rotate(${(a * 180) / Math.PI + 90})`}>
        <path d="M 0 -34 L 8 -6 L 34 6 L 34 14 L 8 8 L 6 26 L 14 32 L 14 38 L 0 34 L -14 38 L -14 32 L -6 26 L -8 8 L -34 14 L -34 6 L -8 -6 Z" fill="#F4EEE2" stroke="#1A1220" strokeWidth={3} />
      </g>
      <FastClock x={px + 46} y={py - 40} r={20} t={t} speed={0.5} />
      <SchLabel x={960} y={230} t={t - 4} text="1971 · ATOMIC CLOCKS ON PLANES" size={26} />
      {t > 165 ? <SchLabel x={960} y={810} t={t - 165} text="CLOCKS DISAGREE" size={40} color="#FFB347" /> : null}
      {t > 226 ? <SchLabel x={960} y={880} t={t - 226} text="BY BILLIONTHS OF A SEC" size={34} color="#FFB347" /> : null}
      {t > 281 ? <SchLabel x={960} y={960} t={t - 281} text="EINSTEIN WAS RIGHT ✓" size={40} color="#7CFFB2" /> : null}
    </g>
  );
};

// ---------- S9: GPS: +38 microseconds a day, 10 km a day ----------
export const S9: React.FC<ShotProps> = ({ t }) => {
  const a = (t / 200) * Math.PI * 2, sx = 960 + Math.cos(a) * 330, sy = 600 + Math.sin(a) * 140;
  const drift = clamp((t - 300) / 40) * 160;
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.0], [380, 1.08]]))}>
      <Schematic t={t} id="s9" />
      <DrawOn d="M 960 600 m -140 0 a 140 140 0 1 0 280 0 a 140 140 0 1 0 -280 0" t={t} dur={14} color="#7FD1FF" width={7} />
      <ellipse cx={960} cy={600} rx={330} ry={140} fill="none" stroke="#FFE7B3" strokeWidth={2} strokeDasharray="10 12" opacity={0.6} />
      <g transform={`translate(${sx} ${sy})`}>
        <rect x={-16} y={-12} width={32} height={24} fill="#E9E2D2" stroke="#1A1220" strokeWidth={3} />
        <rect x={-58} y={-8} width={38} height={16} fill="#5F9FD8" stroke="#1A1220" strokeWidth={3} />
        <rect x={20} y={-8} width={38} height={16} fill="#5F9FD8" stroke="#1A1220" strokeWidth={3} />
      </g>
      <SchLabel x={960} y={250} t={t - 80} text="GPS SATELLITE CLOCKS" size={34} />
      {t > 130 ? <CountUp x={960} y={350} t={t - 130} to={38} dur={30} size={64} color="#FFB347" format={(v) => `+${Math.round(v)} µs / DAY`} /> : null}
      {t > 196 ? <SchLabel x={960} y={430} t={t - 196} text="THAT'S REAL." size={44} color="#7CFFB2" /> : null}
      {t > 296 ? <>
        <circle cx={960} cy={470} r={14} fill="#7CFFB2" />
        <path d={`M ${960 + drift} 456 q -16 -28 0 -40 q 16 12 0 40 Z`} fill="#FF5A6A" stroke="#1A1220" strokeWidth={3} />
        <SchLabel x={960} y={900} t={t - 300} text="OFF BY 10 KM A DAY" size={42} color="#FF5A6A" />
      </> : null}
    </g>
  );
};

// ---------- S10: the twins: a year in space, about 5 ms younger ----------
export const S10: React.FC<ShotProps> = ({ t }) => {
  const earthTwin: Pose = { ...basePose, x: 790, y: 640, scale: 0.85, yaw: 0.3, ...faceAt(t, [[0, 'happy'], [197, 'smug']]) };
  const spaceTwin: Pose = { ...basePose, x: 1130, y: 560 + Math.sin(t / 14) * 14, scale: 0.85, yaw: -0.3, spin: Math.sin(t / 30) * 8, armL: { a: 70, b: 0 }, armR: { a: 70, b: 0 },
    ...faceAt(t, [[0, 'happy'], [141, 'cool']]) };
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.0], [230, 1.08]]))}>
      <Schematic t={t} id="s10" />
      <SchLabel x={790} y={300} t={t - 10} text="EARTH" size={30} />
      <SchLabel x={1130} y={300} t={t - 30} text="1 YR IN SPACE" size={30} />
      <Hero look={LOOKS.mo} pose={earthTwin} shadow={0} rimId="rimR" />
      <Hero look={LOOKS.mo} pose={spaceTwin} shadow={0} rimId="rimL" />
      <circle cx={1130} cy={spaceTwin.y - 150} r={78} fill="#BFE6FF" opacity={0.18} stroke="#BFE6FF" strokeWidth={4} />
      {t > 141 ? <CountUp x={960} y={880} t={t - 141} to={5} dur={20} size={52} color="#FFB347" format={(v) => `−${Math.round(v)} MS YOUNGER`} /> : null}
    </g>
  );
};

// ---------- S11: the man in a suit wants to send him to space ----------
export const S11: React.FC<ShotProps> = ({ t }) => {
  const sx = kf(t, [[0, 1450], [24, 1450], [60, 1230]]);
  const suit: Pose = { ...walkPose(sx, t > 24 && t < 60 ? t * 0.6 : 0, 840, 1, { yaw: -0.6 }, -1), ...faceAt(t, [[0, 'smug']]), look: -0.8, armR: { a: 40, b: -70 } };
  const me: Pose = { ...basePose, x: 780, y: 700, yaw: 0.5, ...faceAt(t, [[0, 'neutral'], [30, 'worried'], [93, 'shock']]), look: 0.8 };
  return (
    <g transform={camT(1010, 560, kf(t, [[0, 1.12], [123, 1.22]]))}>
      <Study t={t + 300} id="s11" />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
      <Hero look={LOOKS.suit} pose={suit} shadow={0.5} rimId="rimL" />
      <g transform={`rotate(-14 ${suit.x - 40} ${suit.y})`}>
        <rect x={suit.x - 70} y={suit.y - 40} width={58} height={74} rx={6} fill="#E9E2D2" stroke="#3A3446" strokeWidth={5} />
        <path d={`M ${suit.x - 41} ${suit.y - 30} l 9 22 l -18 0 Z M ${suit.x - 47} ${suit.y - 8} h 12 v 22 h -12 Z`} fill="#E8553A" />
      </g>
    </g>
  );
};

// ---------- S12: he walks home for dinner: one hour, for him ----------
const D12 = stand(KITCHEN, 0.3, 0.45);
export const S12: React.FC<ShotProps> = ({ t }) => {
  const x = kf(t, [[0, 1500], [60, D12.x + 40]], easeOut);
  const me: Pose = { ...walkPose(x, t < 60 ? t * 0.6 : 0, D12.y + LEG_LEN * D12.scale, D12.scale, { yaw: -0.5 }, -1), ...faceAt(t, [[0, 'happy']]) };
  return (
    <g transform={camT(1000, 520, kf(t, [[0, 1.25], [116, 1.32]]))}>
      <Kitchen t={t + 200} id="s12" veil={0.45} />
      <FastClock x={1300} y={340} t={t} speed={0.4} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimR" />
      <KitchenIsland />
      {t > 66 ? <FloatLabel x={1250} y={420} t={t - 66} text="1 HOUR" size={56} /> : null}
    </g>
  );
};

// ---------- S13: his little sister is taller than him ----------
const P13 = stand(KITCHEN, 0.36, 0.5), S13p = stand(KITCHEN, 0.6, 0.5);
export const S13: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: P13.x, y: P13.y, scale: P13.scale, yaw: 0.4, ...faceAt(t, [[0, 'happy'], [30, 'shock']]), look: 0.9 };
  const k = 1.18;
  const sis: Pose = { ...basePose, x: S13p.x, y: S13p.y - LEG_LEN * P13.scale * (k - 1), scale: P13.scale * k, yaw: -0.4, facing: -1, ...faceAt(t, [[0, 'smug']]), look: -0.7,
    armL: { a: 30, b: -60 } };
  return (
    <g transform={`${camT((P13.x + S13p.x) / 2, 500, kf(t, [[0, 1.4], [30, 1.4], [40, 1.6], [137, 1.7]], easeOut))} ${t > 30 && t < 40 ? shake(t, 30, 10, 10) : ''}`}>
      <Kitchen t={t + 260} id="s13" veil={0.45} red={0.3 * clamp((t - 30) / 20)} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimR" />
      <Hero look={LOOKS.sis} pose={sis} shadow={0} rimId="rimL" />
      {t > 30 ? <FocusRings x={P13.x} y={P13.y - 190 * P13.scale} t={t - 30} r0={50} /> : null}
      {t > 80 ? <FloatLabel x={(P13.x + S13p.x) / 2 + 40} y={S13p.y - 330 * P13.scale} t={t - 80} text="+10 YEARS" size={52} color="#FF5A6A" /> : null}
    </g>
  );
};

// ---------- S14: red sky, the clock sun cracked: PART 1 ----------
export const S14: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: ROOF_HIP, yaw: 0, ...faceAt(t, [[0, 'worried'], [54, 'shock']]), look: t > 50 ? -0.4 : 0 };
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.55], [231, 1.9]]))}>
      <Rooftop t={t + 600} sunX={960} sunY={470} clock spin={t * 0.5} red={1} crack={clamp((t - 10) / 30)} lightsOut={1} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimRed" />
      <Glow x={960} y={470} r={300} kind="red" o={0.35} />
      {t > 8 ? <Big x={960} y={300} t={t - 8} text="PART 1" size={96} /> : null}
    </g>
  );
};
