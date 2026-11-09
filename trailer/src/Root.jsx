import React from 'react';
import { Composition } from 'remotion';
import { Trailer } from './Trailer.jsx';

export const Root = () => (
  <Composition id="Trailer" component={Trailer} durationInFrames={1860} fps={60} width={1080} height={1920} />
);
