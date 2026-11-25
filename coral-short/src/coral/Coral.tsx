// "The Mosque Built From the Sea": our original Did-You-Know short in the flat-characters-in-a-3D-toon-world style
// (post chain from the claude-animated-shorts skill): InkPass -> lens blur pre + main -> bloom -> NEUTRAL tone map ->
// colour grade, MSAA. One three.js world (world.ts) posed per frame from the story timeline (story.ts), timed to the
// narration (plan.ts / words.json). Time jumps crossfade by stacking a second canvas; the surface burst flashes white.
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, getRemotionEnvironment, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode, EffectComposer as PPComposer } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TOTAL, FLASHES, SHOTS, layersAt, dofAt } from "./story";

export const CORAL_FRAMES = TOTAL;

type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; msaa: number; composer: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, msaa: 4, composer: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

/** @react-three/postprocessing renders from a priority-1 useFrame and creates its composer in an effect, one React
 *  pass after the canvas: Remotion's single advance() per frame can land before it exists and capture an empty
 *  canvas. Hold every frame until a frame has been drawn THROUGH the composer (all passes attached), advancing again
 *  if needed. */
const useComposedFrame = (f: number, composer: React.RefObject<PPComposer | null> | null) => {
  const { advance } = useThree();
  const drawn = useRef(-1), cur = useRef(f);
  cur.current = f;
  useFrame(() => { if (!composer || (composer.current && composer.current.passes.length > 2)) drawn.current = cur.current; }, 2);
  useEffect(() => {
    if (!getRemotionEnvironment().isRendering) return;
    const h = delayRender(`composed frame ${f}`, { timeoutInMilliseconds: 120000 });
    let tries = 0, raf = 0;
    const tick = () => {
      if (drawn.current === f || tries > 30) { continueRender(h); return; }
      tries++;
      advance(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); continueRender(h); };
  }, [f, advance]);
};

/** one World per canvas, built once (textures are drawn on first use) */
const useWorld = () => {
  const [handle] = useState(() => delayRender("coral world", { timeoutInMilliseconds: 240000 }));
  const world = useMemo(() => new World(), []);
  useEffect(() => { continueRender(handle); }, [handle]);
  return world;
};

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useWorld();
  const on = useMemo(toggles, []);
  const composerRef = useRef<PPComposer | null>(null);
  useComposedFrame(f, on.composer ? composerRef : null);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer ref={composerRef} multisampling={on.msaa}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : null}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : null}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : null}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : null}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : null}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light === "golden" ? "golden" : "day");
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {on.composer ? post : null}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0, preserveDrawingBuffer: true }}
      camera={{ fov: 40, near: 0.15, far: 1500 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const CoralShort: React.FC = () => {
  const f = useCurrentFrame();
  let flash = 0;
  for (const fa of FLASHES) if (f >= fa && f < fa + 5) flash = Math.max(flash, [1, 0.8, 0.55, 0.3, 0.12][f - fa]);
  return (
    <AbsoluteFill style={{ background: "#9fdcea" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
