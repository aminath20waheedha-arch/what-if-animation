// Look-check stills: node scripts/stills.mjs <outdir> <frames|all-shots> [scale]
//   frames: comma list (e.g. 30,200,640) or "shots" = one still in the middle of every shot (reads the shot table
//   from a bundle-time dump). Renders with SwiftShader (CPU WebGL), the same path the CI uses.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [outDir = "out/stills", framesArg = "0", scaleArg = "0.5"] = process.argv.slice(2);
const scale = Number(scaleArg);
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), onProgress: () => undefined });
const inputProps = { post: { dpr: scale < 1 ? scale : undefined, ...(process.env.STILL_MSAA ? { msaa: Number(process.env.STILL_MSAA) } : {}), ...JSON.parse(process.env.STILL_POST ?? "{}") } };
const composition = await selectComposition({ serveUrl, id: "CoralShort", inputProps, chromiumOptions: { gl: "swangle" } });
let frames = framesArg.split(",").map(Number);
if (framesArg === "shots") frames = JSON.parse(fs.readFileSync("out/shots.json", "utf8")).map((s) => Math.floor((s.a + s.b) / 2));
console.log(`bundle ${((Date.now() - t0) / 1000).toFixed(1)} s, ${composition.durationInFrames} frames total`);
for (const frame of frames) {
  const t = Date.now();
  await renderStill({
    composition, serveUrl, frame, inputProps, scale, imageFormat: "jpeg", jpegQuality: 88,
    onBrowserLog: (l) => { if (l.type !== "debug") console.log("[browser]", l.type, l.text.slice(0, 400)); },
    output: path.join(outDir, `f${String(frame).padStart(4, "0")}.jpg`), chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 300000,
  });
  console.log(`frame ${frame}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
