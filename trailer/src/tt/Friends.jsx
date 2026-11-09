// Ролик C «3 игры с друзьями»: список, 18 с, ритм. Хук — обещание полезного списка (его сохраняют) и три обложки.
// Каждая игра — свой виджет в цветах обложки: две записи (карманные и подработка) заполняют полосу, и видно,
// что на игру реально накопить самому за пару недель.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, mix, p, rub, tile } from '../lib.jsx';
import { Backdrop, Cursor, EndCard, Entry, PlacedWidget, SPOT, Say, Sounds, W, at, earnedAt, pressAt } from './kit.jsx';

export const FRIENDS_DUR = 1080;
const SEG = [120, 390, 660], LEN = 270, END = 930;
const LIST = [
  { g: GAMES.peak, note: '≈ 2 недели карманных', extra: [150, 'сэкономил на обедах'] },
  { g: GAMES.lethal, note: 'карманные + продал старые наушники', extra: [220, 'продал наушники'] },
  { g: GAMES.repo, note: 'карманные + помог соседу', extra: [180, 'помог соседу'] },
];
const C1 = 50, C2 = 120;                                       // клики по «+» внутри отрезка

function Segment({ f, i }) {
  const s = SEG[i], t = f - s, { g, note, extra } = LIST[i];
  if (t < 0 || t >= LEN) return null;
  const entries = [
    { click: s + C1, absorb: s + C1 + 34, amount: 200, label: 'карманные' },
    { click: s + C2, absorb: s + C2 + 34, amount: extra[0], label: extra[1] },
  ];
  const earned = earnedAt(f, 0, entries);
  const enter = p(t, 0, 26), exit = p(t, LEN - 16, 14, inQuart);
  const w = {
    game: g, earned, target: g.price, week: earned, weekGoal: 0, unlocked: earned >= g.price - .5,
    addPress: Math.max(...entries.map(e => pressAt(f, e.click))),
  };
  return (
    <AbsoluteFill>
      <Backdrop img={g.poster} k={enter * (1 - exit)} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', opacity: enter * (1 - exit) }}>
        <div style={{ padding: '8px 22px', borderRadius: 30, background: tile(g.col), color: '#fff', fontFamily: FONT, fontSize: 32, fontWeight: 700 }}>{i + 1} / 3</div>
      </div>
      <Say f={f} from={s + 4} to={s + LEN} top={240} size={76} text={`${g.name} — ${rub(g.price)}`} accent={note} />
      <div style={{ position: 'absolute', inset: 0, opacity: enter * (1 - exit), transform: `translateX(${(1 - enter) * 500 - exit * 500}px)` }}>
        <PlacedWidget f={f} w={w} col={g.col} />
      </div>
      {entries.map(e => <Entry key={e.click} f={f} col={g.col} {...e} />)}
      <Cursor f={f} show={p(t, 20, 10) * (1 - p(t, C2 + 40, 10))} path={[[s, 760, 1450], [s + C1 - 6, ...at(SPOT.plus)]]} clicks={entries.map(e => e.click)} />
    </AbsoluteFill>
  );
}

export function Friends() {
  const f = useCurrentFrame();
  const hookOut = p(f, SEG[0] - 14, 14, inQuart);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {f < SEG[0] && (
        <AbsoluteFill style={{ opacity: 1 - hookOut }}>
          <Backdrop img={GAMES.lethal.poster} k={.8} />
          <Say f={f} from={-30} to={SEG[0]} top={170} size={74} text="3 игры с друзьями, на которые накопишь за месяц" />
          {LIST.map(({ g }, i) => {
            const k = p(f, i * 4 - 12, 18);                     // все три видны уже на первом кадре
            return (
              <Img key={g.img} src={staticFile(`img/${g.img}`)} style={{ position: 'absolute', left: (W - 600) / 2 + [-40, 40, -20][i], top: 560 + i * 260, width: 600, height: 280,
                borderRadius: 26, objectFit: 'cover', boxShadow: '0 30px 60px rgba(0,0,0,.6)', opacity: k,
                transform: `rotate(${[-4, 3, -2][i]}deg) scale(${mix(1.15, 1, k)})` }} />
            );
          })}
        </AbsoluteFill>
      )}
      {LIST.map((_, i) => <Segment key={i} f={f} i={i} />)}

      <EndCard f={f} start={END} lines={['У каждого друга — свой виджет', 'Бесплатно · Windows, macOS, Linux']} cta="Ищи на GitHub: game-goal" note="Сохрани, чтобы не потерять" />
      <Sounds list={[
        ['open', 2], ['tick', 10, .6], ['tick', 16, .6],
        ...SEG.flatMap(s => [['open', s + 4, .8], ['tick', s + C1], ['coin', s + C1 + 36], ['tick', s + C2], ['coin', s + C2 + 36], ['confirm', s + C2 + 96]]),
        ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
