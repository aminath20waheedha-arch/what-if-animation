import React from 'react';
import { defineEpisode, Timeline, LookDef, HudChip, Dial } from '../../engine';
import timeline from './timeline.json';
import { S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11 } from './shots';

// The power's look while the delay shows: cooler, a touch of contrast, a SHADOW -3s chip and a dial ticking 3 s,
// placed inside the centre so they survive the 9:16 reframe.
const delayLook: LookDef = {
  grade: (lv) => `saturate(${1 - 0.15 * lv}) contrast(${1 + 0.06 * lv}) hue-rotate(${-6 * lv}deg)`,
  jitter: 0,
  Overlay: ({ f }) => {
    const p = (f % 90) / 90;
    return (
      <g>
        <HudChip x={680} y={210} f={f} label="SHADOW -3.0s" icon="dot" />
        <Dial x={1220} y={240} r={52} size={32} p={p} readout={`-${(3 * (1 - p)).toFixed(1)}s`} />
      </g>
    );
  },
};

export const shadow = defineEpisode('Shadow', {
  timeline: timeline as Timeline,
  shots: { S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11 },
  looks: { delay: delayLook },
});
