import React from 'react';
import { Composition } from 'remotion';
import { DURATION, Trailer } from './Trailer.jsx';
import { LAST_DUR, LastOrder } from './tt/LastOrder.jsx';
import { RULE_DUR, Rule } from './tt/Rule.jsx';
import { FEATURES_DUR, Features } from './tt/Features.jsx';
import { MOM_DUR, Mom } from './tt/Mom.jsx';
import { WEEKS_DUR, Weeks } from './tt/Weeks.jsx';
import { FRIENDS_DUR, Friends } from './tt/Friends.jsx';
import { HOWTO_DUR, Howto } from './tt/Howto.jsx';
import { REPO_DUR, Repo } from './tt2/Repo.jsx';
import { TIER_DUR, Tier } from './tt2/Tier.jsx';
import { SPEED_DUR, Speedrun } from './tt2/Speedrun.jsx';

const size = { fps: 60, width: 1080, height: 1920 };
export const Root = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={DURATION} {...size} />
    <Composition id="TT1-LastOrder" component={LastOrder} durationInFrames={LAST_DUR} {...size} />
    <Composition id="TT2-Rule" component={Rule} durationInFrames={RULE_DUR} {...size} />
    <Composition id="TT3-Features" component={Features} durationInFrames={FEATURES_DUR} {...size} />
    <Composition id="TT4-Mom" component={Mom} durationInFrames={MOM_DUR} {...size} />
    <Composition id="TT5-Weeks" component={Weeks} durationInFrames={WEEKS_DUR} {...size} />
    <Composition id="TT6-Friends" component={Friends} durationInFrames={FRIENDS_DUR} {...size} />
    <Composition id="TT7-Howto" component={Howto} durationInFrames={HOWTO_DUR} {...size} />
    <Composition id="TT8-Repo" component={Repo} durationInFrames={REPO_DUR} {...size} />
    <Composition id="TT9-Tier" component={Tier} durationInFrames={TIER_DUR} {...size} />
    <Composition id="TT10-Speedrun" component={Speedrun} durationInFrames={SPEED_DUR} {...size} />
  </>
);
