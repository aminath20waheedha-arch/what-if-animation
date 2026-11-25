import React from "react";
import { Composition } from "remotion";
import { CoralShort, CORAL_FRAMES } from "./coral/Coral";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="CoralShort" component={CoralShort} durationInFrames={CORAL_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
