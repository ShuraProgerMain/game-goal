// Ролик «Спидран: накопить на Lethal Company до пятницы», 15 с. Поверх рабочего стола — таймер со сплитами, как у
// спидраннеров: Пн / Ср / Чт / Пт. Каждый сплит — запись в быстром вводе (карманные, бутылки, помог соседу), между
// ними промотка дней. В пятницу в 19:58 — «Купил!», таймер встаёт, WORLD RECORD, друзья в чате: «WR??».
import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, mix, p } from '../lib.jsx';
import { Brand, Camera, Chat, DeskCursor, DeskWidget, Desktop, Keys, Later, SPOT, Sounds, WIDGET, camAt, pressAt, sent, typed, wpt } from './desk.jsx';

export const SPEED_DUR = 900;
const G = GAMES.lethal;
const Q = [
  { keys: 78, open: 84, type: 88, text: '200 карманные', enter: 120, amount: 200 },
  { keys: 204, open: 210, type: 214, text: '120 сдал бутылки', enter: 250, amount: 120 },
  { keys: 324, open: 330, type: 334, text: '100 помог соседу', enter: 370, amount: 100 },
];
const U0 = 420, BUY = 520, BACK = 590;
const DRAFTS = [{ from: 604, text: 'успел 😎 19:58', send: 634 }];
const MSGS = [
  { at: -1, name: 'Тёма', text: 'пт 20:00 Lethal, без опозданий' },
  { at: -1, name: 'Лёха', text: 'у кого нет игры — тот лох 😂' },
  ...sent(DRAFTS),
  { at: 654, name: 'Тёма', text: 'WR?? 🏆' },
  { at: 676, name: 'Лёха', text: 'го в лобби' },
];
const SPLITS = [
  { name: 'Пн · карманные', at: Q[0].enter + 8, t: 47, delta: '−0:13' },
  { name: 'Ср · бутылки', at: Q[1].enter + 8, t: 2952, delta: '−1:02' },
  { name: 'Чт · помог соседу', at: Q[2].enter + 8, t: 4470, delta: '−0:40' },
  { name: 'Пт · «Купил!»', at: BUY, t: 6058, delta: 'WR' },
];
// Время забега в минутах: понедельник 15:00 → пятница 19:58, с промотками между днями
const KEYS = [[0, 0], [128, 47], [168, 60], [200, 2880], [258, 2952], [288, 2990], [320, 4300], [378, 4470], [460, 6000], [BUY, 6058]];
const runMin = f => interpolate(f, KEYS.map(k => k[0]), KEYS.map(k => k[1]), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const fmt = (m, f, stopped) => {
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = Math.floor(m % 60);
  const cs = stopped ? '31' : String(Math.floor((f * 1.7) % 100)).padStart(2, '0');
  return `${d}д ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}.${cs}`;
};

function Splits({ f }) {
  const done = f >= BUY;
  const cur = SPLITS.findIndex(s => f < s.at);
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: 100, borderRadius: 26, background: 'rgba(8, 9, 14, .92)', border: '2px solid rgba(255,255,255,.12)', padding: '22px 30px',
      fontFamily: FONT, color: C.text, zIndex: 50, boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
      <div style={{ fontSize: 34, fontWeight: 800 }}>Lethal Company до пятницы</div>
      <div style={{ fontSize: 24, color: C.muted, marginTop: 2 }}>Any% · только карманные · попытка #1</div>
      <div style={{ marginTop: 14 }}>
        {SPLITS.map((s, i) => {
          const isDone = f >= s.at, isCur = i === cur;
          const k = isDone ? p(f, s.at, 12) : 0;
          const gold = s.delta === 'WR';
          return (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', height: 50, padding: '0 14px', borderRadius: 12, fontSize: 28,
              background: isCur ? 'rgba(76, 140, 255, .25)' : gold && isDone ? `rgba(255, 210, 60, ${.25 * k})` : 'transparent' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
              {isDone && <span style={{ marginRight: 22, fontWeight: 800, color: gold ? '#ffd23f' : '#4be38a', opacity: k, transform: `scale(${mix(1.4, 1, k)})` }}>{s.delta}</span>}
              <span style={{ width: 210, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDone ? C.text : C.dim }}>{isDone ? fmt(s.t, f, true).slice(0, -3) : '—'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right', fontSize: 84, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        color: done ? '#ffd23f' : '#4be38a', textShadow: done ? '0 0 30px rgba(255,210,60,.6)' : 'none' }}>{fmt(runMin(f), f, done)}</div>
    </div>
  );
}

export function Speedrun() {
  const f = useCurrentFrame();
  const quick = Q.find(q => f >= q.open && f < q.enter + 4);
  const earned = Q.reduce((a, q) => a + q.amount * p(f, q.enter + 4, 40), 0);
  const lean = f < U0 + 42 ? 7 * p(f, U0 + 24, 18, x => x * x * (3 - 2 * x)) : 7 * (1 - p(f, U0 + 42, 6, x => x));
  const w = {
    game: G, earned, target: G.price, week: earned, weekGoal: 0, unlocked: f >= U0, buyPress: pressAt(f, BUY),
    quick: quick ? { show: true, text: typed(f, quick.type, quick.text), caret: Math.floor(f / 15) % 2 === 0 } : null,
    banner: f >= BUY + 6 ? { y: p(f, BUY + 6, 20), kind: 'На полку', text: G.name } : null,
    unlock: { show: p(f, U0, 12) * (1 - p(f, U0 + 84, 14, inQuart)), jc: { lean, gap: 150 * p(f, U0 + 48, 50), scale: .6 + .4 * p(f, U0, 24) }, glow: p(f, U0 + 48, 20) * .8, text: p(f, U0 + 70, 20) },
  };
  const shake = f >= U0 + 42 && f < U0 + 60 ? 1 - p(f, U0 + 42, 18, x => x) : f >= BUY && f < BUY + 16 ? .8 * (1 - p(f, BUY, 16, x => x)) : 0;
  const cam = camAt(f, [
    { f: 0, x: 330, y: 380, s: 2.0 },
    { f: 56, x: 1356, y: WIDGET.y + 150, s: 2.35, d: 18 },
    { f: BACK, x: 330, y: 380, s: 2.0, d: 22 },
  ], shake);
  const wr = p(f, BUY + 4, 14);
  return (
    <AbsoluteFill style={{ background: '#07080b' }}>
      <Camera cam={cam}>
        <Desktop clock={fmt(runMin(f), f, true).slice(0, 2) === '4д' ? '19:58' : '15:00'}>
          <Chat f={f} msgs={MSGS} drafts={DRAFTS} title="пати 🎮 Lethal" />
          <DeskWidget f={f} w={w} col={G.col} />
          <DeskCursor f={f} show={f >= 470 && f < 560 ? 1 : 0} path={[[0, WIDGET.x + 200, WIDGET.y + 400], [BUY - 4, ...wpt(SPOT.buy)]]} clicks={[BUY]} />
        </Desktop>
      </Camera>
      <Splits f={f} />
      {Q.map(q => <Keys key={q.keys} f={f} from={q.keys} top={1560} />)}
      <Later f={f} from={170} dur={32} text={'⏩ среда'} />
      <Later f={f} from={290} dur={32} text={'⏩ четверг'} />
      {f >= BUY + 4 && f < BACK + 20 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1240, textAlign: 'center', fontFamily: FONT, fontSize: 120, fontWeight: 900, color: '#ffd23f', fontStyle: 'italic',
          WebkitTextStroke: '6px #3a2600', paintOrder: 'stroke fill', opacity: wr * (1 - p(f, BACK + 6, 14, inQuart)), transform: `rotate(-5deg) scale(${mix(2, 1, wr)})`, zIndex: 70 }}>WORLD<br />RECORD</div>
      )}
      <Brand f={f} from={740} top={1640} />

      <Audio src={staticFile('music/level3.mp3')} volume={t => interpolate(t, [0, 10, SPEED_DUR - 30, SPEED_DUR], [0, .3, .3, 0], { extrapolateRight: 'clamp' })} />
      <Sounds list={[
        ...Q.flatMap(q => [['tick', q.open], ['confirm', q.enter], ['coin', q.enter + 12]]),
        ['open', 172, .7], ['open', 292, .7],
        ['unlock', U0 + 24], ['confirm', BUY], ['coin', BUY + 4], ['unlock', BUY + 6, .7],
        ['tick', DRAFTS[0].send], ['confirm', 654, .8], ['tick', 676, .7],
      ]} />
    </AbsoluteFill>
  );
}
