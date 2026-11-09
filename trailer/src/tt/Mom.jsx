// Ролик A «Мама, я сам»: мем, 8 с. Хук — знакомый каждому школьнику вопрос мамы и ответ «Я:» — виджет с Terraria
// на 84%. Под виджетом список записей: карманные, бабушка, выгулял собаку — видно, что деньги свои и записаны
// руками. Последнюю запись набирают в быстром вводе, награда открывается, «Не прошу. Накопил сам.»
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, p } from '../lib.jsx';
import { Backdrop, EndCard, Ledger, PlacedWidget, Say, Sounds, WX, WY, earnedAt, unlockAt } from './kit.jsx';

export const MOM_DUR = 480;
const G = GAMES.terraria;
const QUICK = { open: 136, type: 146, text: '60 сдал бутылки', submit: 206 };
const U0 = 268, PUNCH = 330, END = 384;

export function Mom() {
  const f = useCurrentFrame();
  const earned = earnedAt(f, 320, [{ absorb: QUICK.submit, amount: 60 }]);
  const typed = QUICK.text.slice(0, Math.max(0, Math.floor((f - QUICK.type) / 3)));
  const w = {
    game: G, earned, target: G.price, week: earned, weekGoal: 0, unlocked: f >= U0,
    quick: f >= QUICK.open && f < QUICK.submit + 6 ? { show: true, text: typed, caret: Math.floor(f / 18) % 2 === 0 } : null,
    unlock: unlockAt(f, U0, 90),
  };
  const rows = [
    { at: QUICK.submit + 4, amount: 60, label: 'сдал бутылки', when: 'сегодня', hl: true },
    { at: 46, amount: 150, label: 'карманные', when: 'пн' },
    { at: 62, amount: 100, label: '@бабушка', when: 'ср' },
    { at: 78, amount: 70, label: 'выгулял собаку соседей', when: 'пт' },
  ];
  const me = 1 - p(f, PUNCH - 14, 12, inQuart);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop img={G.poster} />
      <Say f={f} from={-30} to={PUNCH} top={170} size={62} text="Мама: опять деньги на игры просить будешь?" />
      <div style={{ position: 'absolute', left: WX + 6, top: WY - 110, fontFamily: FONT, fontSize: 72, fontWeight: 700, color: C.text, opacity: me }}>Я:</div>
      <Say f={f} from={PUNCH} to={END + 16} top={250} size={88} text="Не прошу. Накопил сам." />

      <PlacedWidget f={f} w={w} col={G.col} />
      <Ledger f={f} rows={rows} col={G.col} show={p(f, 38, 16) * (1 - p(f, U0 - 8, 14, inQuart))} />

      <EndCard f={f} start={END} lines={['Копилка на игру на рабочем столе', 'Бесплатно · Windows, macOS, Linux']} cta="Ищи на GitHub: game-goal" />
      <Sounds list={[
        ['tick', 46, .7], ['tick', 62, .7], ['tick', 78, .7],
        ['tick', QUICK.open], ['confirm', QUICK.submit], ['coin', QUICK.submit + 14],
        ['unlock', U0 + 24], ['confirm', PUNCH + 2, .8], ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
