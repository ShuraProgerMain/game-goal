// Ролик 1 «Последний заказ»: быстрый, 8 с, зациклен. Хук — с первого кадра виджет на 93% и подпись «Последний
// заказ до игры»: зритель хочет досмотреть, как полоса дойдёт до конца. Дальше — награда открыта, «Купил!», полка,
// «Игра съела 34%», карточка. Последние 36 кадров плавно возвращают первый кадр, и ролик крутится по кругу.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, HADES, inQuart, mix, p } from '../lib.jsx';
import { Backdrop, Cursor, Entry, PlacedWidget, SPOT, Say, Shelf, Sounds, Title, W, WB, at, earnedAt, pressAt, unlockAt } from './kit.jsx';

export const LAST_DUR = 480;
const ENTRY = { click: 22, absorb: 56, amount: 400, label: 'монтаж', who: 'Аня' };
const U0 = 120, BUY = 232, CARD = 360, LOOP = 444;

function Scene({ f }) {
  const earned = earnedAt(f, 2800, [ENTRY]);
  const shelf = p(f, 238, 24);
  const card = p(f, CARD, 26), cardOut = 1 - card;
  const w = {
    earned, target: 3000, week: earned, weekGoal: 3000, unlocked: f >= U0,
    addPress: pressAt(f, ENTRY.click), buyPress: pressAt(f, BUY),
    hlShare: p(f, 290, 16) * (1 - p(f, 350, 12)),
    banner: f >= 238 ? { y: shelf, kind: 'На полку', text: 'Hades II' } : null,
    unlock: unlockAt(f, U0, 90),
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      <Say f={f} from={-30} to={U0} text="Последний заказ до игры" />
      <Say f={f} from={U0 + 4} to={284} text="Игра заработана" />
      <Say f={f} from={288} to={CARD} text="Игра съела 34% — на жизнь осталось 2 100 ₽" size={66} />
      <Say f={f} from={CARD + 6} to={LOOP + 30} text="И карточка, чтобы похвастаться" size={66} />

      <div style={{ opacity: cardOut }}>
        <PlacedWidget f={f} w={w} />
        <Shelf f={f} start={238} />
      </div>
      <Entry f={f} {...ENTRY} />

      {/* Карточка «Награда заработана» вылетает снизу поверх виджета */}
      {f >= CARD && (
        <Img src={staticFile('img/style-classic.png')} style={{ position: 'absolute', left: (W - 920) / 2, top: mix(1500, 560, card), width: 920, height: 920 * 1012 / 1800,
          borderRadius: 24, opacity: card, transform: `rotate(${(1 - card) * 6}deg)`, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
      )}
      {f >= CARD + 30 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center', fontFamily: FONT, fontSize: 40, fontWeight: 600, color: C.text, opacity: p(f, CARD + 30, 20) }}>
          Game Goal · ссылка в профиле
        </div>
      )}

      <Cursor f={f} show={1 - p(f, 250, 12)}
        path={[[0, 700, 1400], [20, ...at(SPOT.plus)], [BUY, ...at(SPOT.buy)]]} clicks={[ENTRY.click, BUY]} />
    </AbsoluteFill>
  );
}

export function LastOrder() {
  const f = useCurrentFrame();
  const back = p(f, LOOP, LAST_DUR - LOOP - 1, x => x * x * (3 - 2 * x));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Scene f={f} />
      {f >= LOOP && <AbsoluteFill style={{ opacity: back }}><Scene f={0} /></AbsoluteFill>}
      <Sounds list={[['tick', ENTRY.click], ['coin', ENTRY.absorb + 2], ['unlock', U0 + 24], ['confirm', BUY], ['open', 244], ['tick', 290, .8], ['confirm', CARD + 2]]} />
    </AbsoluteFill>
  );
}
