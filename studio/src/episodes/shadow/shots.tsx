import React from 'react';
import {
  Hero, Pose, basePose, poseAt, kf, clamp, lerp, easeOut, easeIn, faceAt, LOOKS, LEG_LEN, HEAD, Look,
  camT, shake, Sparkle, FloatLabel, DizzyStars, FocusRings, walkPose, hipGround, Phone,
  Rooftop, Stairwell, Classroom, Study, Desk, Bedroom, BEDROOM, Kitchen, KitchenIsland, KITCHEN, stand,
  Schematic, DrawOn, Arrow, SchLabel, CountUp, Glow, Foreground, FONT, ShotProps,
} from '../../engine';

// "What if your shadow was always 3 seconds behind you?" Eleven shots. Every shadow is the character redrawn as a
// dark silhouette with the pose from DELAY frames earlier (after the turn: DELAY frames LATER, it moves first).
// The final cut is reframed to 9:16 around the centre of the frame, so every action stays within x ~ 450..1470.
const PIP = LOOKS.pipHood;
const DELAY = 90; // 3 s at 30 fps
const ROOF_HIP = 820 - LEG_LEN; // feet on the roof deck at y 820

/** silhouette filter: every colour to a deep blue-black, edges softened */
const SilDefs: React.FC = () => (
  <defs>
    <filter id="shSil" x="-60%" y="-60%" width="220%" height="220%">
      <feColorMatrix type="matrix" values="0 0 0 0 0.09  0 0 0 0 0.05  0 0 0 0 0.16  0 0 0 1 0" />
      <feGaussianBlur stdDeviation="2.2" />
    </filter>
  </defs>
);
/** the shadow on a wall behind: offset and scaled about the feet; `eyes` lights two red points in its head */
const WallShadow: React.FC<{ pose: Pose; look?: Look; dx?: number; dy?: number; s?: number; o?: number; eyes?: number }> = ({ pose, look = PIP, dx = 150, dy = -40, s = 1.08, o = 0.55, eyes = 0 }) => {
  const foot = pose.y + LEG_LEN * pose.scale;
  const hx = pose.x + dx, hy = foot + dy + (pose.y + HEAD.y * pose.scale - foot) * s;
  return (
    <g>
      <g opacity={o} filter="url(#shSil)" transform={`translate(${dx} ${dy}) translate(${pose.x} ${foot}) scale(${s}) translate(${-pose.x} ${-foot})`}>
        <Hero look={look} pose={{ ...pose, expr: 'neutral', blink: 0 }} shadow={0} />
      </g>
      {eyes > 0 ? [-20, 20].map((ex) => (
        <g key={ex}>
          <circle cx={hx + ex * s * pose.scale} cy={hy} r={16 * s * pose.scale} fill="#FF2A3A" opacity={0.35 * eyes} />
          <circle cx={hx + ex * s * pose.scale} cy={hy} r={6 * s * pose.scale} fill="#FFD6D6" opacity={eyes} />
        </g>
      )) : null}
    </g>
  );
};
/** the shadow lying on the ground, stretched away from a low sun (to screen right and toward the lens) */
const GroundShadow: React.FC<{ pose: Pose; look?: Look; len?: number; skew?: number; o?: number }> = ({ pose, look = PIP, len = 0.42, skew = 58, o = 0.5 }) => {
  const foot = pose.y + LEG_LEN * pose.scale;
  return (
    <g opacity={o} filter="url(#shSil)" transform={`translate(${pose.x} ${foot}) skewX(${skew}) scale(1 ${-len}) translate(${-pose.x} ${-foot})`}>
      <Hero look={look} pose={{ ...pose, expr: 'neutral', blink: 0 }} shadow={0} />
    </g>
  );
};

// ---------- S1: rooftop, he jumps; the shadow on the deck jumps 3 s later ----------
const jumpPose = (t: number) => poseAt(t, [
  { f: 0, p: { x: 960, y: ROOF_HIP, yaw: 0.15, armL: { a: 12, b: -8 }, armR: { a: 12, b: -8 } } },
  { f: 4, p: { squash: 0.14, armL: { a: 30, b: -20 }, armR: { a: 30, b: -20 } } },
  { f: 9, p: { y: ROOF_HIP - 150, squash: -0.12, armL: { a: 160, b: -15 }, armR: { a: 160, b: -15 }, legL: { a: 25, b: 40 }, legR: { a: -10, b: 50 } }, ease: easeOut },
  { f: 15, p: { y: ROOF_HIP - 150 } },
  { f: 21, p: { y: ROOF_HIP, squash: 0.16, armL: { a: 40, b: -10 }, armR: { a: 40, b: -10 }, legL: { a: 5, b: 0 }, legR: { a: -5, b: 0 } }, ease: easeIn },
  { f: 28, p: { squash: 0, armL: { a: 12, b: -8 }, armR: { a: 12, b: -8 } } },
]);
export const S1: React.FC<ShotProps> = ({ t }) => {
  const me = { ...jumpPose(t), ...faceAt(t, [[0, 'neutral'], [8, 'happy'], [96, 'worried']]), look: t > 92 ? 0.8 : 0 };
  return (
    <g transform={`${camT(1040, 640, kf(t, [[0, 1.05], [130, 1.18]]))} ${t > 21 && t < 29 ? shake(t, 21, 8, 6) : ''}`}>
      <SilDefs />
      <Rooftop t={t + 20} sunX={520} sunY={700} />
      <GroundShadow pose={jumpPose(t - DELAY)} len={0.8} skew={38} o={0.8} />
      <Hero look={PIP} pose={me} shadow={0.6} rimId="rimR" />
    </g>
  );
};

// ---------- S2: the stairs, he trips and gets up; the shadow on the wall is still falling ----------
const STAIR_S = 0.9;
const tripPose = (t: number): Pose => {
  if (t < 14) return walkPose(lerp(470, 640, t / 14), t * 0.6, hipGround, STAIR_S, { yaw: 0.6 });
  const g = (x: number) => hipGround(x) - LEG_LEN * STAIR_S;
  return poseAt(t - 14, [
    { f: 0, p: { x: 640, y: g(640), scale: STAIR_S, yaw: 0.6, spin: 0 } },
    { f: 7, p: { x: 720, y: g(720) - 50, spin: 55, armL: { a: 150, b: -10 }, armR: { a: 130, b: -30 }, legL: { a: -30, b: 40 }, legR: { a: 40, b: 20 } }, ease: easeOut },
    { f: 16, p: { x: 810, y: g(810) + 70, spin: 92, armL: { a: 100, b: 0 }, armR: { a: 80, b: 0 } }, ease: easeIn },
    { f: 40, p: { x: 810, y: g(810) + 70, spin: 92 } },
    { f: 56, p: { x: 815, y: g(815), spin: 0, armL: { a: 12, b: -8 }, armR: { a: 12, b: -8 }, legL: { a: 5, b: 0 }, legR: { a: -5, b: 0 } }, ease: easeOut },
  ], { ...basePose, scale: STAIR_S });
};
export const S2: React.FC<ShotProps> = ({ t }) => {
  const me = { ...tripPose(t), ...faceAt(t, [[0, 'neutral'], [16, 'shock'], [30, 'dizzy'], [70, 'oops'], [100, 'worried']]) };
  return (
    <g transform={`${camT(760, 520, kf(t, [[0, 1.15], [150, 1.28]]))} ${t > 30 && t < 40 ? shake(t, 30, 8, 8) : ''}`}>
      <SilDefs />
      <Stairwell t={t + 40} id="s2" />
      <WallShadow pose={tripPose(t - DELAY)} dx={95} dy={-80} s={1.1} o={0.85} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimR" />
      {t > 30 && t < 66 ? <DizzyStars x={815} y={me.y - 60} t={t} rx={70} ry={26} /> : null}
    </g>
  );
};

// ---------- S3: classroom, he waves at his crush, she waves back, his shadow waves 3 s late ----------
const wavePose = (t: number) => {
  const k = clamp((t - 4) / 6) * (1 - clamp((t - 30) / 6));
  return poseAt(0, [{ f: 0, p: { x: 790, y: 700, yaw: 0.45, facing: 1 } }], basePose) as Pose && {
    ...basePose, x: 790, y: 700, yaw: 0.45,
    armR: { a: lerp(12, 150 + 15 * Math.sin(t * 0.7), k), b: lerp(-8, -30 + 25 * Math.sin(t * 0.7), k) },
  } as Pose;
};
export const S3: React.FC<ShotProps> = ({ t }) => {
  const me = { ...wavePose(t), ...faceAt(t, [[0, 'happy'], [96, 'oops']]), look: t > 96 ? -0.7 : 0.6 };
  const kb = clamp((t - 34) / 6) * (1 - clamp((t - 58) / 6));
  const her: Pose = {
    ...basePose, x: 1150, y: 700, yaw: -0.45, facing: -1,
    armL: { a: lerp(12, 150 + 15 * Math.sin(t * 0.7 + 1), kb), b: lerp(-8, -30 + 25 * Math.sin(t * 0.7 + 1), kb) },
    ...faceAt(t, [[0, 'neutral'], [32, 'happy'], [104, 'worried']]), look: t > 100 ? -0.8 : -0.6,
  };
  return (
    <g transform={camT(970, 520, kf(t, [[0, 1.28], [140, 1.4]]))}>
      <SilDefs />
      <Classroom t={t + 60} id="s3" />
      <WallShadow pose={wavePose(t - DELAY)} dx={120} dy={-110} s={1.15} o={0.8} />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
      <Hero look={LOOKS.sis} pose={her} shadow={0.5} rimId="rimL" />
      {t > 104 ? <FocusRings x={1150} y={460} t={t - 104} r0={40} /> : null}
    </g>
  );
};

// ---------- S4: the title wide: the sun low, the long shadow ----------
export const S4: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: ROOF_HIP, yaw: 0, ...faceAt(t, [[0, 'neutral']]), look: 0.5 };
  return (
    <g transform={camT(980, 600, kf(t, [[0, 0.92], [110, 1.02]]))}>
      <SilDefs />
      <Rooftop t={t + 140} sunX={560} sunY={660} />
      <GroundShadow pose={me} len={0.85} skew={38} o={0.8} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimR" />
      <Sparkle x={560} y={640} t={t} s={1.4} />
    </g>
  );
};

// ---------- S5: rooftop party, he dances, his shadow does the replay, Mo films and laughs ----------
const dancePose = (t: number): Pose => {
  const move = Math.floor(Math.max(0, t) / 24) % 4, u = t * 0.42;
  const p: Pose = { ...basePose, x: 880, y: ROOF_HIP, yaw: 0.1 };
  if (move === 0) return { ...p, armL: { a: 150 + 20 * Math.sin(u), b: -20 }, armR: { a: 150 - 20 * Math.sin(u), b: -20 }, tilt: 8 * Math.sin(u), squash: 0.05 * Math.sin(u * 2) };
  if (move === 1) return { ...p, armR: { a: 165, b: 0 }, handR: 'point', armL: { a: 30, b: -40 }, tilt: -10, legL: { a: 25, b: 10 }, legR: { a: -15, b: 0 } };
  if (move === 2) return { ...p, y: ROOF_HIP + 40, squash: 0.18, armL: { a: 70, b: -60 }, armR: { a: 70, b: -60 }, legL: { a: 40, b: 60 }, legR: { a: -40, b: 60 } };
  return { ...p, spin: (t % 24) * 15, armL: { a: 90, b: 0 }, armR: { a: 90, b: 0 } };
};
export const S5: React.FC<ShotProps> = ({ t }) => {
  const me = { ...dancePose(t), ...faceAt(t, [[0, 'happy'], [48, 'cool']]) };
  const mo: Pose = { ...basePose, x: 1260, y: ROOF_HIP, yaw: -0.5, facing: -1, armL: { a: 95, b: -70 }, armR: { a: 20, b: -10 }, tilt: t > 36 ? 6 * Math.sin(t * 0.5) : 0,
    ...faceAt(t, [[0, 'happy']]), look: -0.7 };
  return (
    <g transform={camT(1050, 600, kf(t, [[0, 1.05], [170, 1.15]]))}>
      <SilDefs />
      <Rooftop t={t + 220} sunX={540} sunY={700} cityLit={1.6} />
      <GroundShadow pose={dancePose(t - DELAY)} len={0.8} skew={36} o={0.8} />
      <Hero look={PIP} pose={me} shadow={0.4} rimId="rimR" />
      <Hero look={LOOKS.mo} pose={mo} shadow={0.4} rimId="rimL" />
      <Phone x={1178} y={600} w={70} rot={-12} on={1} caller="REC" f={t} />
      {t > 40 ? <FloatLabel x={1150} y={420} t={t - 40} text="HAHA" size={52} /> : null}
    </g>
  );
};

// ---------- S6: the clip goes viral ----------
export const S6: React.FC<ShotProps> = ({ t }) => (
  <g>
    <rect width={1920} height={1080} fill="#14101C" />
    <Glow x={960} y={540} r={520} kind="warm" o={0.5} />
    <g transform={`translate(960 560) scale(${kf(t, [[0, 0.9], [10, 1.05], [40, 1.0]], easeOut)}) translate(-960 -560)`}>
      <Phone x={960} y={560} w={360} on={1} caller="2.4M VIEWS" buzz={t < 30 ? 1 : 0} f={t} />
    </g>
    {[0, 6, 12, 18, 24].map((d, i) => (t > d ? <FloatLabel key={i} x={720 + i * 120} y={460 - (i % 2) * 60} t={t - d} text={['+1M', '♥', '+500K', '♥', 'VIRAL'][i]} size={i === 4 ? 70 : 56} color={i % 2 ? '#FF5A6A' : '#FFE27A'} /> : null))}
  </g>
);

// ---------- S7: the science: sunlight is 8 minutes old; yours is 3 s older ----------
export const S7: React.FC<ShotProps> = ({ t }) => {
  const sun = 'M 720 430 m -70 0 a 70 70 0 1 0 140 0 a 70 70 0 1 0 -140 0';
  const earth = 'M 1200 430 m -50 0 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0';
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.0], [260, 1.08]]))}>
      <Schematic t={t} id="s7" />
      <DrawOn d={sun} t={t} dur={14} color="#FFB347" width={7} />
      {t > 8 ? <DrawOn d={earth} t={t - 8} dur={12} color="#7FD1FF" width={7} /> : null}
      {t > 16 ? <Arrow x0={800} y0={430} x1={1140} y1={430} t={t - 16} dur={20} color="#FFE7B3" bend={0} /> : null}
      <SchLabel x={720} y={550} t={t - 6} text="SUN" />
      <SchLabel x={1200} y={530} t={t - 14} text="YOU" />
      {t > 118 ? <CountUp x={960} y={330} t={t - 118} to={8.33} dur={34} size={64} format={(v) => `${Math.floor(v)} MIN ${String(Math.round((v % 1) * 60)).padStart(2, '0')} S`} /> : null}
      <SchLabel x={960} y={250} t={t - 118} text="SUNLIGHT IS THIS OLD" size={30} />
      {t > 194 ? <SchLabel x={960} y={700} t={t - 194} text="THAT'S REAL." size={64} color="#FFB347" /> : null}
      {t > 216 ? <SchLabel x={960} y={800} t={t - 216} text="YOUR SHADOW: +3 S" size={44} color="#FF5A6A" /> : null}
    </g>
  );
};

// ---------- S8: the man in a suit at the door ----------
export const S8: React.FC<ShotProps> = ({ t }) => {
  const sx = kf(t, [[0, 1500], [30, 1500], [70, 1250]]);
  const suit: Pose = { ...walkPose(sx, t > 30 && t < 70 ? t * 0.6 : 0, 840, 1, { yaw: -0.6 }, -1), ...faceAt(t, [[0, 'smug']]), look: -0.8,
    armR: { a: 40, b: -70 } };
  const me: Pose = { ...basePose, x: 760, y: 700, yaw: 0.5, ...faceAt(t, [[0, 'neutral'], [12, 'worried']]), look: 0.8 };
  return (
    <g transform={`${camT(1030, 560, kf(t, [[0, 1.08], [150, 1.2]]))} ${t > 10 && t < 30 ? shake(t, 10 + Math.floor((t - 10) / 7) * 7, 5, 4) : ''}`}>
      <SilDefs />
      <Study t={t + 300} id="s8" />
      <WallShadow pose={me} dx={-110} dy={-70} s={1.1} o={0.7} />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
      <Hero look={LOOKS.suit} pose={suit} shadow={0.5} rimId="rimL" />
      <rect x={suit.x - 70} y={suit.y - 40} width={58} height={74} rx={6} fill="#E9E2D2" stroke="#3A3446" strokeWidth={5} transform={`rotate(-14 ${suit.x - 40} ${suit.y})`} />
    </g>
  );
};

// ---------- S9: one morning, his shadow moves first ----------
const B9 = stand(BEDROOM, 0.55, 0.5);
const morningPose = (t: number): Pose => {
  const k = clamp((t - 110) / 8) * (1 - clamp((t - 150) / 8));
  return { ...basePose, x: B9.x, y: B9.y, scale: B9.scale, yaw: 0, armR: { a: lerp(10, 150 + 15 * Math.sin(t * 0.6), k), b: lerp(-8, -25, k) } };
};
export const S9: React.FC<ShotProps> = ({ t }) => {
  const me = { ...morningPose(t), ...faceAt(t, [[0, 'tired'], [50, 'neutral'], [66, 'shock']]), look: t > 50 ? -0.8 : 0 };
  return (
    <g transform={camT(B9.x - 60, 520, kf(t, [[0, 1.2], [60, 1.25], [70, 1.45], [140, 1.55]], easeOut))}>
      <SilDefs />
      <Bedroom t={t + 400} id="s9" lamp={0.6} />
      <WallShadow pose={morningPose(t + DELAY)} dx={-150} dy={-90} s={1.25} o={0.85} eyes={clamp((t - 64) / 12)} />
      <Hero look={PIP} pose={me} shadow={0.5} rimId="rimR" />
      <Glow x={B9.x - 230} y={360} r={360} kind="red" o={0.4 * clamp((t - 64) / 20)} />
    </g>
  );
};

// ---------- S10: it reaches for his little sister; he hasn't moved ----------
const P10 = stand(KITCHEN, 0.32, 0.42), K10 = stand(KITCHEN, 0.66, 0.42);
export const S10: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: P10.x, y: P10.y, scale: P10.scale, yaw: 0.3, ...faceAt(t, [[0, 'worried'], [44, 'shock']]), look: 0.8 };
  const reach = clamp((t - 8) / 40);
  const shadowPose: Pose = { ...me, yaw: 0.5, armR: { a: lerp(10, 92, easeOut(reach)), b: lerp(-8, 0, reach) }, handR: 'open', tilt: 10 * reach };
  const sis: Pose = { ...basePose, x: K10.x, y: K10.y + 40, scale: K10.scale * 0.72, yaw: -0.4, facing: -1, ...faceAt(t, [[0, 'happy'], [60, 'worried']]), look: -0.5,
    armR: { a: 50, b: -40 } };
  return (
    <g transform={camT((P10.x + K10.x) / 2, 520, kf(t, [[0, 1.3], [160, 1.45]]))}>
      <SilDefs />
      <Kitchen t={t + 500} id="s10" veil={0.5} red={0.35 * reach} />
      <WallShadow pose={shadowPose} dx={110 + 140 * reach} dy={-150} s={1.25 + 0.35 * reach} o={0.66} eyes={reach} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimR" />
      <Hero look={LOOKS.sis} pose={sis} shadow={0} rimId="rimL" />
      <KitchenIsland />
    </g>
  );
};

// ---------- S11: red sky; his shadow stands behind him, eyes lit; PART 1 ----------
export const S11: React.FC<ShotProps> = ({ t }) => {
  const me: Pose = { ...basePose, x: 960, y: ROOF_HIP, yaw: 0, ...faceAt(t, [[0, 'worried'], [60, 'shock']]), look: t > 50 ? -0.6 : 0 };
  const behind: Pose = { ...me, x: 960, y: ROOF_HIP, armL: { a: 30, b: -10 }, armR: { a: 30, b: -10 }, headTilt: -8 };
  return (
    <g transform={camT(960, 520, kf(t, [[0, 1.7], [200, 2.1]]))}>
      <SilDefs />
      <Rooftop t={t + 600} sunX={960} sunY={700} red={1} lightsOut={1} />
      <WallShadow pose={behind} dx={-170} dy={-40} s={1.32} o={0.85} eyes={clamp((t - 20) / 20)} />
      <Hero look={PIP} pose={me} shadow={0} rimId="rimRed" />
      {t > 8 ? (
        <text x={960} y={300} textAnchor="middle" fontFamily={FONT.title} fontWeight={800} fontSize={96} fill="#FFF1E6" opacity={clamp((t - 8) / 8)}
          stroke="#2A0A10" strokeWidth={8} paintOrder="stroke">PART 1</text>
      ) : null}
    </g>
  );
};
