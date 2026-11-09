// Ролик B «Сколько недель до Elden Ring?»: загадка, 15 с. Хук — вопрос, на который хочется ответить в комментах.
// Ответ держим до конца: неделя за неделей записываются карманные (первые — руками в быстром вводе), кольцо недели
// закрывается, бабушка дарит на ДР, и в конце — «4 недели вместо 6».
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, mix, p, tile } from '../lib.jsx';
import { Backdrop, Cursor, EndCard, Entry, PlacedWidget, SPOT, Say, Sounds, W, at, earnedAt, pressAt, unlockAt } from './kit.jsx';

export const WEEKS_DUR = 900;
const G = GAMES.elden;
const HOOK_OUT = 120;
const WEEKS = [150, 300, 500, 600];
const QUICK = { open: 160, type: 170, text: '500 карманные', submit: 218 };
const ENTRIES = [
  { absorb: QUICK.submit, amount: 500 },
  { click: 320, absorb: 354, amount: 500, label: 'карманные' },
  { click: 400, absorb: 434, amount: 1000, label: 'на ДР', who: 'бабушка' },
  { click: 516, absorb: 550, amount: 500, label: 'карманные' },
  { click: 616, absorb: 650, amount: 500, label: 'карманные' },
];
const U0 = 716, ANSWER = 736, END = 816;

function WeekPill({ f }) {
  const i = WEEKS.filter(s => f >= s).length - 1;
  if (i < 0 || f >= U0) return null;
  const k = p(f, WEEKS[i], 14);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', opacity: 1 - p(f, U0 - 12, 12, inQuart) }}>
      <div style={{ padding: '10px 28px', borderRadius: 34, background: tile(G.col), color: '#fff', fontFamily: FONT, fontSize: 38, fontWeight: 700,
        transform: `scale(${mix(1.25, 1, k)})` }}>Неделя {i + 1}</div>
    </div>
  );
}

export function Weeks() {
  const f = useCurrentFrame();
  const earned = earnedAt(f, 0, ENTRIES);
  const ws = WEEKS.filter(s => s <= f).pop() ?? 0;
  const before = ENTRIES.filter(e => e.absorb < ws).reduce((a, e) => a + e.amount, 0);
  const typed = QUICK.text.slice(0, Math.max(0, Math.floor((f - QUICK.type) / 3)));
  const out = p(f, HOOK_OUT, 26, inQuart), cover = at([80, 47]);
  const w = {
    game: G, earned, target: G.price, week: Math.max(0, earned - before), weekGoal: 500, unlocked: f >= U0,
    addPress: Math.max(...ENTRIES.map(e => (e.click ? pressAt(f, e.click) : 0))),
    hlWeek: f >= 150 && f < U0 ? .7 : 0,
    quick: f >= QUICK.open && f < QUICK.submit + 6 ? { show: true, text: typed, caret: Math.floor(f / 18) % 2 === 0 } : null,
    unlock: unlockAt(f, U0, 100),
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop img={G.poster} k={p(f, 90, 40)} />

      {/* Хук: вопрос и обложка, которая потом улетает в виджет */}
      <Say f={f} from={-30} to={HOOK_OUT + 10} top={170} size={70} text="Сколько недель копить на Elden Ring с карманных 500 ₽?" />
      {f < HOOK_OUT + 30 && (
        <Img src={staticFile(`img/${G.poster}`)} style={{ position: 'absolute', left: mix(W / 2, cover[0], out) - 200, top: mix(860, cover[1], out) - 300, width: 400, height: 600,
          borderRadius: 30, opacity: 1 - out, transform: `scale(${mix(1, .25, out)})`, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
      )}
      {f >= 40 && f < HOOK_OUT + 20 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1210, display: 'flex', justifyContent: 'center', opacity: p(f, 40, 14) * (1 - p(f, HOOK_OUT, 14)) }}>
          <div style={{ padding: '18px 36px', borderRadius: 40, background: 'rgba(22, 23, 32, .96)', border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 40, fontWeight: 600,
            color: C.text, transform: `scale(${mix(.8, 1, p(f, 40, 20))})` }}>Пиши ответ в комменты</div>
        </div>
      )}

      {f >= HOOK_OUT && <PlacedWidget f={f} w={w} col={G.col} enter={p(f, HOOK_OUT + 8, 30)} />}
      <WeekPill f={f} />
      <Say f={f} from={154} to={390} top={250} size={64} text="Каждую неделю записываю карманные" />
      <Say f={f} from={394} to={500} top={250} size={64} text="Бабушка подарила на ДР!" />
      <Say f={f} from={504} to={U0} top={250} size={64} text="Кольцо закрылось — неделя выполнена" />
      <Say f={f} from={ANSWER} to={END + 16} top={220} size={84} text="Ответ: 4 недели вместо 6" accent="А ты сколько бы копил?" />
      {ENTRIES.filter(e => e.click).map(e => <Entry key={e.click} f={f} col={G.col} {...e} />)}

      <Cursor f={f} show={p(f, 290, 12) * (1 - p(f, 664, 12))} path={[[0, 700, 1450], [314, ...at(SPOT.plus)]]} clicks={ENTRIES.filter(e => e.click).map(e => e.click)} />

      <EndCard f={f} start={END} lines={['Копилка на игру на рабочем столе', 'Бесплатно · Windows, macOS, Linux']} cta="Ищи на GitHub: game-goal" />
      <Sounds list={[
        ['tick', 40, .7], ['open', HOOK_OUT + 8],
        ['tick', QUICK.open], ['confirm', QUICK.submit], ['coin', QUICK.submit + 14],
        ...ENTRIES.filter(e => e.click).flatMap(e => [['tick', e.click], ['coin', e.absorb + 2]]),
        ['confirm', 436, .8], ['unlock', U0 + 24], ['confirm', ANSWER + 4, .8], ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
