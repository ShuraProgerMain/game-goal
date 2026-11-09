// Ролик 2 «Правило трёх заказов»: средний темп, 15 с, рассказ от первого лица. Хук — правило, которое зритель
// примеряет на себя: «Hades II — только после 3 заказов». Три пустых слота под обложкой заполняются по ходу ролика —
// это держит до конца. Главный довод: «Игра съест 37% — остальное на жизнь», без чувства вины.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, HADES, inQuart, mix, p, tile } from '../lib.jsx';
import { Backdrop, Cursor, EndCard, Entry, PlacedWidget, SPOT, Say, Shelf, Sounds, W, WY, at, earnedAt, pressAt, unlockAt } from './kit.jsx';

export const RULE_DUR = 900;
const ORDERS = [
  { click: 200, absorb: 236, amount: 1000, label: 'монтаж', who: 'Вася' },
  { click: 300, absorb: 336, amount: 1000, label: 'монтаж', who: 'Аня' },
  { click: 400, absorb: 436, amount: 1000, label: 'монтаж', who: 'Петя' },
];
const HOOK_OUT = 118, U0 = 590, BUY = 712, END = 800;

// Три слота-заказа: пустые в хуке, заполняются, когда запись уходит в виджет
function Slots({ f }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 1250, display: 'flex', justifyContent: 'center', gap: 40, opacity: 1 - p(f, END - 20, 16, inQuart) }}>
      {ORDERS.map((o, i) => {
        const k = p(f, o.absorb, 18);
        return (
          <div key={i} style={{ width: 104, height: 104, borderRadius: 52, display: 'grid', placeItems: 'center', boxSizing: 'border-box', position: 'relative',
            border: `4px dashed rgba(255,255,255,${.35 * (1 - k)})`, fontFamily: FONT, fontSize: 44, fontWeight: 700, color: C.muted }}>
            {i + 1}
            <div style={{ position: 'absolute', inset: -4, borderRadius: 56, background: tile(HADES), display: 'grid', placeItems: 'center', opacity: k, transform: `scale(${mix(.5, 1, k)})` }}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Rule() {
  const f = useCurrentFrame();
  const earned = earnedAt(f, 0, ORDERS);
  const out = p(f, HOOK_OUT, 26, inQuart);                 // обложка улетает в обложку виджета
  const cover = at([80, 47]);
  const w = {
    earned, target: 3000, week: earned, weekGoal: 3000, unlocked: f >= U0,
    addPress: Math.max(...ORDERS.map(o => pressAt(f, o.click))), buyPress: pressAt(f, BUY),
    hlWeek: p(f, 340, 16) * (1 - p(f, 460, 12)), hlShare: p(f, 480, 16) * (1 - p(f, 580, 12)),
    banner: f >= 718 ? { y: p(f, 718, 24), kind: 'На полку', text: 'Hades II' } : null,
    unlock: unlockAt(f, U0, 100),
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop k={p(f, 100, 40)} />

      {/* Хук: правило и обложка */}
      {f < HOOK_OUT + 30 && (
        <AbsoluteFill style={{ opacity: 1 - p(f, HOOK_OUT, 20) }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', fontFamily: FONT, fontSize: 46, fontWeight: 600, color: C.muted }}>Моё правило:</div>
        </AbsoluteFill>
      )}
      <Say f={f} from={-30} to={HOOK_OUT + 12} top={260} size={80} text="Hades II — только после 3 заказов" />
      {f < HOOK_OUT + 30 && (
        <Img src={staticFile('img/hades-poster.jpg')} style={{ position: 'absolute', left: mix(W / 2, cover[0], out) - 210, top: mix(800, cover[1], out) - 315, width: 420, height: 630,
          borderRadius: 34, objectFit: 'cover', opacity: 1 - out, transform: `scale(${mix(1, .25, out)}) rotate(${Math.sin(f / 30) * 1.2}deg)`, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
      )}
      {f >= 56 && f < HOOK_OUT + 20 && (
        <div style={{ position: 'absolute', left: 60, right: 60, top: 1400, textAlign: 'center', fontFamily: FONT, fontSize: 42, color: C.text,
          opacity: p(f, 56, 16) * (1 - p(f, HOOK_OUT, 14)) }}>А то куплю и буду ныть, что денег нет</div>
      )}

      {/* Виджет */}
      {f >= HOOK_OUT && <PlacedWidget f={f} w={w} enter={p(f, HOOK_OUT + 8, 30)} />}
      <Say f={f} from={150} to={330} text="Записываю каждый заказ" />
      <Say f={f} from={334} to={470} text="Виджет считает неделю и цель" />
      <Say f={f} from={474} to={U0} text="Игра съест 37% — остальное на жизнь" size={68} />
      <Say f={f} from={U0 + 4} to={716} text="Правило выполнено" />
      <Say f={f} from={720} to={END} text="Всё это я заработал" />
      {ORDERS.map(o => <Entry key={o.click} f={f} {...o} />)}
      {f < 718 && <Slots f={f} />}
      <Shelf f={f} start={718} />

      <Cursor f={f} show={p(f, 150, 12) * (1 - p(f, 424, 12)) + (f >= 680 ? p(f, 680, 12) * (1 - p(f, 736, 12)) : 0)}
        path={[[0, 700, 1500], [192, ...at(SPOT.plus)], [705, ...at(SPOT.buy)]]} clicks={[...ORDERS.map(o => o.click), BUY]} />

      <EndCard f={f} start={END} lines={['Трекер доходов с игрой-наградой', 'Бесплатно · Windows, macOS, Linux']} />

      <Sounds list={[
        ['tick', 56, .8], ['open', HOOK_OUT + 8],
        ...ORDERS.flatMap(o => [['tick', o.click], ['coin', o.absorb + 2]]),
        ['tick', 342, .7], ['tick', 482, .7], ['unlock', U0 + 24], ['confirm', BUY], ['open', 724], ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
