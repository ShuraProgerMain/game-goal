// Ролик 3 «6 фишек»: плотный обзор под ритм, 18 с. Хук — обещание «Виджет, который превращает заказы в игры»
// и сразу виджет на экране. Дальше 6 фишек по 140 кадров, у каждой номер «N / 6», чтобы зритель ждал следующую,
// и один звук программы. В конце — «Сохрани, чтобы не потерять»: обзоры сохраняют и пересылают.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, HADES, inQuart, mix, p, rub, tile } from '../lib.jsx';
import { Backdrop, Cursor, EndCard, Entry, PlacedWidget, SPOT, Say, Sounds, Toast, W, WB, at, earnedAt, pressAt } from './kit.jsx';

export const FEATURES_DUR = 1080;
const F = [100, 240, 380, 520, 660, 800], END = 940, STEP = 140;
const TITLES = [
  'Любая игра из Steam — цена подтянется сама',
  'Скидка — сразу видно на обложке',
  'Ctrl+Alt+G — запись из любой программы',
  'Свой план на неделю',
  'Карточка для чата в один клик',
  'Итоги года на одной картинке',
];
const QUICK = { text: '1500 превью @Вася', type: F[2] + 30, submit: F[2] + 88 };
const ENTRIES = [
  { absorb: QUICK.submit - 8, amount: 1500 },                                                   // быстрый ввод
  { click: F[3] + 24, absorb: F[3] + 54, amount: 600, label: 'шортсы', who: 'Аня' },          // план недели
];
const PICK = F[0] + 66;
const GAMES = [['hades-header.jpg', 'Hades II', 1100], ['celeste.jpg', 'Celeste', 465], ['hollow.jpg', 'Hollow Knight', 465]];

function Num({ f, i }) {
  const from = F[i], k = p(f, from, 16) * (1 - p(f, from + STEP - 12, 12, inQuart));
  if (f < from || f >= from + STEP) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', opacity: k }}>
      <div style={{ padding: '8px 22px', borderRadius: 30, background: tile(HADES), color: '#fff', fontFamily: FONT, fontSize: 32, fontWeight: 700,
        transform: `scale(${mix(.6, 1, k)})` }}>{i + 1} / 6</div>
    </div>
  );
}

// 1. Поиск игры: строки с ценами, цена появляется после «загрузки», курсор выбирает Hades II
function Search({ f }) {
  const t = f - F[0];
  if (t < 0 || t >= STEP) return null;
  const k = p(t, 4, 24) * (1 - p(t, STEP - 16, 14, inQuart));
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: WB + 40, padding: 20, borderRadius: 32, background: 'rgba(18, 19, 26, .97)', border: `2px solid ${C.line}`,
      opacity: k, transform: `translateY(${(1 - k) * 60}px)`, boxShadow: '0 30px 60px rgba(0,0,0,.5)' }}>
      {GAMES.map(([img, name, price], i) => {
        const priced = p(t, 20 + i * 8, 14), on = i === 0 && f >= PICK;
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 12, borderRadius: 20, background: on ? `${HADES.t2}44` : 'transparent',
            boxShadow: on ? `inset 0 0 0 2px ${HADES.t3}` : 'none', transform: `scale(${1 - (i === 0 ? pressAt(f, PICK) * .03 : 0)})` }}>
            <Img src={staticFile(`img/${img}`)} style={{ width: 150, height: 70, borderRadius: 12, objectFit: 'cover' }} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 38, fontWeight: 600, color: C.text }}>{name}</span>
            <span style={{ position: 'relative', minWidth: 140, textAlign: 'right', fontFamily: FONT, fontSize: 36, fontWeight: 600, color: C.muted }}>
              <span style={{ position: 'absolute', right: 0, top: 8, width: 120, height: 28, borderRadius: 14, background: 'rgba(255,255,255,.08)', opacity: 1 - priced }} />
              <span style={{ opacity: priced }}>{rub(price)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 3. Ctrl + Alt + G
function Keys({ f }) {
  const t = f - F[2];
  if (t < 4 || t >= 70) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: WB + 70, display: 'flex', justifyContent: 'center', gap: 22, opacity: 1 - p(t, 56, 12, inQuart) }}>
      {['Ctrl', 'Alt', 'G'].map((k, i) => {
        const pop = p(t, 6 + i * 5, 18), down = t >= 6 + i * 5 && t < 26 ? .94 : 1;
        return (
          <div key={k} style={{ minWidth: 120, height: 120, padding: '0 30px', borderRadius: 26, background: '#1a1c26', border: '2px solid rgba(255,255,255,.12)',
            borderBottomWidth: 8, display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.text,
            opacity: pop, transform: `translateY(${(1 - pop) * 40}px) scale(${down})`, boxSizing: 'border-box' }}>{k}</div>
        );
      })}
    </div>
  );
}

// 5. Карточка уходит в чат как отправленное сообщение, приходит ответ
function Chat({ f }) {
  const t = f - F[4];
  if (t < 0 || t >= STEP) return null;
  const k = p(t, 4, 24) * (1 - p(t, STEP - 14, 12, inQuart)), sent = p(t, 50, 26), reply = p(t, 86, 20);
  const cw = mix(900, 700, sent), ch = cw * 1012 / 1800;
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 430, height: 1000, borderRadius: 40, background: 'rgba(18, 19, 26, .97)', border: `2px solid ${C.line}`,
        opacity: sent }}>
        <div style={{ padding: '26px 36px', borderBottom: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 34, fontWeight: 600, color: C.text }}>Чат с друзьями</div>
      </div>
      <div style={{ position: 'absolute', left: mix((W - 900) / 2, 1020 - 24 - cw, sent), top: mix(560, 560, sent), width: cw, padding: mix(0, 12, sent), borderRadius: 30,
        background: `rgba(30, 118, 88, ${sent})`, boxSizing: 'content-box' }}>
        <Img src={staticFile('img/style-classic.png')} style={{ display: 'block', width: cw, height: ch, borderRadius: 22, boxShadow: `0 30px 60px rgba(0,0,0,${.5 * (1 - sent)})` }} />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 560 + 700 * 1012 / 1800 + 70, padding: '22px 32px', borderRadius: 30, background: '#23252f', fontFamily: FONT,
        fontSize: 40, color: C.text, opacity: reply, transform: `translateY(${(1 - reply) * 30}px)` }}>ого, поздравляю! что за виджет?</div>
    </AbsoluteFill>
  );
}

export function Features() {
  const f = useCurrentFrame();
  const earned = earnedAt(f, 1500, ENTRIES);
  const typed = QUICK.text.slice(0, Math.max(0, Math.floor((f - QUICK.type) / 3)));
  const widgetOut = p(f, F[4], 14, inQuart);
  const w = {
    earned, target: 5000, week: earned, weekGoal: 3000, unlocked: false,
    addPress: pressAt(f, ENTRIES[1].click),
    sale: f >= F[1] + 20 ? p(f, F[1] + 20, 14) : 0, salePercent: 40,
    hlWeek: p(f, F[3] + 6, 16) * (1 - p(f, F[3] + 128, 12)),
    quick: f >= QUICK.type - 14 && f < QUICK.submit + 6 ? { show: true, text: typed, caret: Math.floor(f / 18) % 2 === 0 } : null,
  };
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop />
      <Say f={f} from={-30} to={F[0]} text="Виджет, который превращает заказы в игры" />
      {f < F[0] && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: WB + 80, textAlign: 'center', fontFamily: FONT, fontSize: 44, fontWeight: 600, color: C.muted,
          opacity: p(f, 36, 16) * (1 - p(f, F[0] - 12, 12, inQuart)) }}>6 фишек за 18 секунд</div>
      )}
      {F.map((from, i) => <React.Fragment key={i}><Num f={f} i={i} /><Say f={f} from={from + 4} to={from + STEP} top={250} size={64} text={TITLES[i]} /></React.Fragment>)}

      <div style={{ opacity: 1 - widgetOut }}>
        <PlacedWidget f={f} w={w} enter={p(f, -8, 26)} />
      </div>
      <Search f={f} />

      {/* 2. Скидка: подсказка под виджетом */}
      {f >= F[1] + 30 && f < F[2] && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: WB + 70, display: 'flex', justifyContent: 'center',
          opacity: p(f, F[1] + 30, 18) * (1 - p(f, F[2] - 14, 12, inQuart)) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '20px 34px', borderRadius: 50, background: 'rgba(22, 23, 32, .96)', border: `2px solid ${C.line}`,
            fontFamily: FONT, fontSize: 42, color: C.text }}>
            <span style={{ padding: '4px 16px', borderRadius: 24, background: C.red, color: '#fff', fontWeight: 700 }}>−40%</span>
            <b>660 ₽</b><span style={{ color: C.dim, textDecoration: 'line-through' }}>1 100 ₽</span>
          </div>
        </div>
      )}

      <Keys f={f} />
      <Entry f={f} {...ENTRIES[1]} />
      <Chat f={f} />

      {/* 6. Итоги года */}
      {f >= F[5] && f < END + 20 && (
        <Img src={staticFile('img/year-story.png')} style={{ position: 'absolute', left: (W - 560) / 2, top: 420, width: 560, height: 996, borderRadius: 24,
          opacity: p(f, F[5] + 4, 20) * (1 - p(f, F[5] + STEP - 12, 12, inQuart)), transform: `translateY(${(1 - p(f, F[5] + 4, 30)) * 120}px)`,
          boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
      )}
      <Toast f={f} from={F[4] + 20} to={F[4] + 76} text="Картинка скопирована — вставь её в чат" top={1300} />

      <Cursor f={f} show={p(f, F[0] + 30, 10) * (1 - p(f, F[0] + 96, 10)) + (f >= F[3] ? p(f, F[3], 10) * (1 - p(f, F[3] + 60, 10)) : 0)}
        path={[[0, 760, 1500], [PICK - 4, 260, WB + 100], [F[3] + 20, ...at(SPOT.plus)]]} clicks={[PICK, ENTRIES[1].click]} />

      <EndCard f={f} start={END} lines={['Трекер доходов с игрой-наградой', 'Бесплатно · Windows, macOS, Linux']} note="Сохрани, чтобы не потерять" />

      <Sounds list={[
        ['open', 2], ['tick', 36, .7],
        ['tick', F[0] + 20, .6], ['tick', F[0] + 28, .6], ['tick', F[0] + 36, .6], ['confirm', PICK],
        ['coin', F[1] + 20],
        ['tick', F[2] + 16], ['confirm', QUICK.submit], ['coin', QUICK.submit + 6],
        ['tick', ENTRIES[1].click], ['coin', ENTRIES[1].absorb + 2], ['confirm', F[3] + 116],
        ['open', F[4] + 6], ['confirm', F[4] + 20], ['tick', F[4] + 86],
        ['open', F[5] + 6],
        ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
