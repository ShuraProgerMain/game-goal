// Ролик «Тир-лист кооп-игр по неделям карманных», ~25 с, с нейроозвучкой (edge-tts, голос Dmitry). На рабочем
// столе — окно тир-листа и виджет над ним. Курсор берёт обложку, виджет показывает игру и свой прогноз «≈N нед»
// при 200 ₽ в неделю, обложка падает в ряд «1 неделя / 2 недели / 3–4 недели / забудь». Субтитры дублируют голос.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, mix, p } from '../lib.jsx';
import { Brand, Camera, DeskCursor, DeskWidget, Desktop, Meme, Sounds, Win, camAt } from './desk.jsx';

const VO = [6, 315, 572, 721, 893, 1097, 1315];
const VO_LEN = [297, 247, 141, 164, 194, 202, 152];
export const TIER_DUR = 1500;
const LINES = [
  'Оцениваю кооп-игры по тому, сколько недель копить на карманные. По 200 ₽ в неделю.',
  'Content Warning. 190 ₽. Неделя. Изи.',
  'PEAK. Две недели. Норм.',
  'R.E.P.O. Тоже две.',
  'Lethal Company. Три недели, но оно того стоит.',
  "Baldur's Gate 3. Десять недель. Забудь.",
  'Отметь, с кем пойдёшь. И сохрани.',
];
const WPOS = { x: 634, y: 40 };
const TW = { x: 560, y: 290, w: 560, h: 540 }, IN = { x: TW.x, y: TW.y + 34 };
const TIERS = [['1 неделя', '#6fd08c'], ['2 недели', '#c9e265'], ['3–4 недели', '#f2c14e'], ['забудь', '#e86f6f']];
const ITEMS = [
  { name: 'Content Warning', img: 'cw-header.jpg', price: 190, tier: 0, slot: 0, weeks: 1, col: { g1: '#3a7bd5', g2: '#ffd23f', t1: '#2b5fae', t2: '#3a7bd5', t3: '#e8c23a' } },
  { ...GAMES.peak, tier: 1, slot: 0, weeks: 2 },
  { ...GAMES.repo, tier: 1, slot: 1, weeks: 2 },
  { ...GAMES.lethal, tier: 2, slot: 0, weeks: 3 },
  { name: "Baldur's Gate 3", img: 'bg3-header.jpg', price: 2000, tier: 3, slot: 0, weeks: 10, col: { g1: '#8a5a2b', g2: '#e0b56c', t1: '#5a3a1a', t2: '#8a5a2b', t3: '#d4a24c' } },
].map((it, i) => ({ ...it, grab: VO[i + 1] + 4, drop: VO[i + 1] + VO_LEN[i + 1] - 14 }));

const rowY = i => IN.y + 10 + i * 86;
const slotXY = it => [IN.x + 150 + it.slot * 130, rowY(it.tier) + 12];
const poolXY = i => [IN.x + 12 + i * 106, IN.y + 10 + 4 * 86 + 34];
const COVER = { w: 120, h: 56 }, POOL = { w: 96, h: 45 };

export function Tier() {
  const f = useCurrentFrame();
  const cur = ITEMS.filter(it => f >= it.grab).pop();
  const w = cur
    ? { game: cur, earned: 0, target: cur.price, week: 0, weekGoal: 0, unlocked: false, forecast: f >= cur.grab + 26 ? `≈${cur.weeks} нед` : null }
    : { game: null, earned: 0, target: 0, week: 0, weekGoal: 0, unlocked: false };
  const keys = [{ f: 0, x: 840, y: 470, s: 1.62 }];
  ITEMS.forEach(it => { keys.push({ f: it.grab + 6, x: 840, y: 150, s: 2.35, d: 14 }, { f: it.grab + 58, x: 840, y: 470, s: 1.62, d: 16 }); });
  keys.push({ f: VO[6], x: 840, y: 500, s: 1.5, d: 30 });
  const cam = camAt(f, keys);
  // Курсор: к обложке в пуле, затем с обложкой к ряду
  const path = [[0, 900, 760]];
  ITEMS.forEach((it, i) => { const [px, py] = poolXY(i); path.push([it.grab, px + 48, py + 22]); const [sx, sy] = slotXY(it); path.push([it.drop, sx + 60, sy + 28]); });
  const sub = LINES.findIndex((_, i) => f >= VO[i] && f < VO[i] + VO_LEN[i] + 8);
  return (
    <AbsoluteFill style={{ background: '#07080b' }}>
      <Camera cam={cam}>
        <Desktop clock="16:20">
          <DeskWidget f={f} w={w} col={cur ? cur.col : { g1: '#4a6beb', g2: '#ed99db', t1: '#385cf2', t2: '#8f70f2', t3: '#f294d1' }} at={WPOS} />
          <Win x={TW.x} y={TW.y} w={TW.w} h={TW.h} title="тир-лист: кооп за карманные (200 ₽/нед)">
            {TIERS.map(([label, col], i) => {
              const hit = ITEMS.find(it => it.tier === i && f >= it.drop && f < it.drop + 14);
              return (
                <div key={label} style={{ position: 'absolute', left: 10, right: 10, top: 10 + i * 86, height: 80, borderRadius: 10, background: 'rgba(255,255,255,.04)' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, borderRadius: 10, background: col, display: 'grid', placeItems: 'center',
                    fontSize: 17, fontWeight: 800, color: '#14151c', transform: `scale(${hit ? 1.08 : 1})` }}>{label}</div>
                </div>
              );
            })}
            <div style={{ position: 'absolute', left: 12, top: 10 + 4 * 86 + 8, fontSize: 13, color: C.dim }}>игры</div>
          </Win>
          {ITEMS.map((it, i) => {
            const [px, py] = poolXY(i), [sx, sy] = slotXY(it);
            let x = px, y = py, wd = POOL.w, ht = POOL.h, lift = 0;
            if (f >= it.grab && f < it.drop) {
              const k = p(f, it.grab, 8);
              const t = p(f, it.drop - 16, 16);
              x = mix(px, sx, t); y = mix(py, sy, t) - 8 * k * (1 - t); wd = mix(POOL.w, COVER.w, Math.max(k * .6, t)); ht = wd * 47 / 100; lift = k * (1 - t);
            } else if (f >= it.drop) { x = sx; y = sy; wd = COVER.w; ht = COVER.h; }
            const land = f >= it.drop ? 1 + .12 * (1 - p(f, it.drop, 10)) : 1;
            return (
              <Img key={it.name} src={staticFile(`img/${it.img}`)} style={{ position: 'absolute', left: x, top: y, width: wd, height: ht, borderRadius: 8, objectFit: 'cover', zIndex: lift ? 15 : 6,
                transform: `scale(${land * (1 + lift * .06)}) rotate(${lift * -3}deg)`, boxShadow: lift ? '0 16px 30px rgba(0,0,0,.6)' : '0 4px 10px rgba(0,0,0,.4)' }} />
            );
          })}
          <DeskCursor f={f} path={path} clicks={ITEMS.flatMap(it => [it.grab, it.drop])} show={f >= 280 && f < VO[6] ? 1 : 0} />
        </Desktop>
      </Camera>

      <Meme f={f} from={-1} to={300} text="тир-лист кооп-игр по неделям карманных" size={60} top={110} />
      <Meme f={f} from={VO[6]} to={TIER_DUR} text="отметь, с кем пойдёшь 👇" size={64} top={110} />
      {sub >= 0 && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1520, textAlign: 'center', fontFamily: FONT, fontSize: 44, fontWeight: 700, lineHeight: 1.2, color: '#ffe14d',
          WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}>{LINES[sub]}</div>
      )}
      <Brand f={f} from={VO[6] + 70} top={1660} />

      <Audio src={staticFile('music/level1.mp3')} volume={t => interpolate(t, [0, 10, TIER_DUR - 30, TIER_DUR], [0, .13, .13, 0], { extrapolateRight: 'clamp' })} />
      {VO.map((at, i) => <Sequence key={i} from={at} durationInFrames={VO_LEN[i] + 20}><Audio src={staticFile(`vo/vo${i}.wav`)} /></Sequence>)}
      <Sounds list={ITEMS.flatMap((it, i) => [['tick', it.grab, .6], [i === 4 ? 'remove' : 'confirm', it.drop, .7]])} />
    </AbsoluteFill>
  );
}
