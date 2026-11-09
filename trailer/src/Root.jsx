import React from 'react';
import { Composition } from 'remotion';
import { DURATION, Trailer } from './Trailer.jsx';

export const Root = () => (
  <Composition id="Trailer" component={Trailer} durationInFrames={DURATION} fps={60} width={1080} height={1920} />
);
