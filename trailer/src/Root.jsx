import React from 'react';
import { Composition } from 'remotion';
import { DURATION, Trailer } from './Trailer.jsx';
import { LAST_DUR, LastOrder } from './tt/LastOrder.jsx';
import { RULE_DUR, Rule } from './tt/Rule.jsx';
import { FEATURES_DUR, Features } from './tt/Features.jsx';

const size = { fps: 60, width: 1080, height: 1920 };
export const Root = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={DURATION} {...size} />
    <Composition id="TT1-LastOrder" component={LastOrder} durationInFrames={LAST_DUR} {...size} />
    <Composition id="TT2-Rule" component={Rule} durationInFrames={RULE_DUR} {...size} />
    <Composition id="TT3-Features" component={Features} durationInFrames={FEATURES_DUR} {...size} />
  </>
);
