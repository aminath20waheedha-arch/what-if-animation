import { Config } from "@remotion/cli/config";

// three.js needs WebGL: on CPU-only CI runners Chrome renders it with SwiftShader through ANGLE.
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
