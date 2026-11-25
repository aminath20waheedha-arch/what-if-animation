import React from 'react';
import { defineEpisode, Timeline, LookDef, HudChip, Dial } from '../../engine';
import timeline from './timeline.json';
import { S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14 } from './shots';

// While the world fast-forwards: warmer, a little streaky, a TIME x0.1 chip and a dial racing round (kept inside the
// centre so it survives the 9:16 reframe).
const timeLook: LookDef = {
  grade: (lv) => `saturate(${1 + 0.1 * lv}) contrast(${1 + 0.08 * lv}) sepia(${0.12 * lv})`,
  jitter: 2,
  Overlay: ({ f }) => {
    const p = (f % 20) / 20;
    return (
      <g>
        <HudChip x={680} y={210} f={f} label="TIME x0.1" icon="skip" />
        <Dial x={1220} y={240} r={52} size={30} p={p} readout={`x10`} />
      </g>
    );
  },
};

export const slowtime = defineEpisode('SlowTime', {
  timeline: timeline as Timeline,
  shots: { S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14 },
  looks: { time: timeLook },
});
