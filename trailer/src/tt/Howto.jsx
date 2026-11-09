// Ролик-инструкция «Где скачать и как настроить», 25 с — ответ на комментарии «где чо как». Пять шагов под
// счётчиком «Шаг N / 5»: скачать GameGoal.exe с GitHub, запустить (и не испугаться окна SmartScreen — файл
// не подписан), выбрать игру, поставить цель, записывать деньги. Окна — упрощённые схемы с текстом настоящих кнопок.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, GAMES, inQuart, mix, p, rub, tile } from '../lib.jsx';
import { Backdrop, Cursor, EndCard, PlacedWidget, SPOT, Say, Sounds, Toast, W, WB, at, earnedAt, unlockAt } from './kit.jsx';

export const HOWTO_DUR = 1500;
const G = GAMES.terraria;
const STEPS = [120, 360, 630, 820, 956], FINAL = 1254, END = 1400;
const Q1 = { open: 1004, type: 1010, text: '150 карманные', submit: 1056, amount: 150 };
const Q2 = { open: 1124, type: 1130, text: '230 @бабушка', submit: 1176, amount: 230 };
const U0 = 1250, BUY = 1370;

const panel = { position: 'absolute', left: 60, right: 60, borderRadius: 36, background: 'rgba(18, 19, 26, .98)', border: `2px solid ${C.line}`,
  boxShadow: '0 40px 80px rgba(0,0,0,.6)', fontFamily: FONT, color: C.text, overflow: 'hidden' };
const fade = (f, a, b) => p(f, a, 20) * (1 - p(f, b - 14, 14, inQuart));

function StepPill({ f }) {
  const i = STEPS.filter(s => f >= s).length - 1;
  if (i < 0 || f >= FINAL) return null;
  const k = p(f, STEPS[i], 14);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', opacity: 1 - p(f, FINAL - 12, 12, inQuart) }}>
      <div style={{ padding: '8px 24px', borderRadius: 30, background: tile(G.col), color: '#fff', fontFamily: FONT, fontSize: 32, fontWeight: 700,
        transform: `scale(${mix(1.25, 1, k)})` }}>Шаг {i + 1} / 5</div>
    </div>
  );
}

/* Шаг 1. Схема страницы GitHub: «Releases» → GameGoal.exe */
const PT = 480;                                          // верх окон-схем, ниже подписи шага
const REL = [810, 750], EXE = [520, 780], REL_CLICK = 196, EXE_CLICK = 290;
function Browser({ f }) {
  if (f < STEPS[0] || f >= STEPS[1]) return null;
  const k = fade(f, STEPS[0] + 4, STEPS[1]), page2 = f >= REL_CLICK + 10;
  return (
    <div style={{ ...panel, top: PT, height: 860, opacity: k, transform: `translateY(${(1 - k) * 60}px)` }}>
      <div style={{ height: 96, display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', borderBottom: `2px solid ${C.line}` }}>
        {['#ff5f57', '#febc2e', '#28c840'].map(c => <span key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c, opacity: .8 }} />)}
        <div style={{ flex: 1, marginLeft: 12, height: 56, borderRadius: 28, background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', padding: '0 26px',
          fontSize: 28, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>github.com/ShuraProgerMain/game-goal{page2 ? '/releases' : ''}</div>
      </div>
      {!page2 ? (
        <div style={{ padding: '40px 44px' }}>
          <div style={{ fontSize: 46, fontWeight: 700 }}>game-goal</div>
          <div style={{ marginTop: 14, fontSize: 32, color: C.muted, maxWidth: 480, lineHeight: 1.35 }}>Виджет на рабочий стол: копилка на игру</div>
          <div style={{ position: 'absolute', left: REL[0] - 60 - 170, top: REL[1] - PT - 70, width: 340, padding: 26, borderRadius: 24, border: `2px solid ${C.line}`,
            background: f >= REL_CLICK && f < REL_CLICK + 10 ? 'rgba(255,255,255,.08)' : 'transparent' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#58a6ff' }}>Releases</div>
            <div style={{ marginTop: 10, fontSize: 28, color: C.muted }}>Game Goal · Latest</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 44px', opacity: p(f, REL_CLICK + 10, 14) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 46, fontWeight: 700 }}>Game Goal</span>
            <span style={{ padding: '4px 16px', borderRadius: 20, border: '2px solid #3fb950', color: '#3fb950', fontSize: 26, fontWeight: 600 }}>Latest</span>
          </div>
          <div style={{ marginTop: 40, fontSize: 30, fontWeight: 600, color: C.dim, letterSpacing: '.1em' }}>ASSETS</div>
          {[['GameGoal.exe', '6,5 MB', true], ['Source code (zip)', '', false]].map(([n, s, on]) => (
            <div key={n} style={{ marginTop: 16, height: 92, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
              border: `2px solid ${on ? G.col.t3 : C.line}`, background: on ? `${G.col.t2}26` : 'transparent', transform: `scale(${on && f >= EXE_CLICK && f < EXE_CLICK + 10 ? .97 : 1})` }}>
              <span style={{ fontSize: 36, fontWeight: 600, color: on ? '#58a6ff' : C.muted }}>{n}</span><span style={{ fontSize: 30, color: C.dim }}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Шаг 2. Файл на рабочем столе и окно SmartScreen (схема) */
const DBL = [404, 412], MORE = [215, 862], RUN = [445, 1081], MORE_CLICK = 490, RUN_CLICK = 556;
function Launch({ f }) {
  if (f < STEPS[1] || f >= STEPS[2]) return null;
  const file = fade(f, STEPS[1] + 4, 430), dlg = p(f, 424, 18) * (1 - p(f, RUN_CLICK + 8, 12, inQuart)), more = f >= MORE_CLICK + 6;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: W / 2 - 110, top: 560, width: 220, textAlign: 'center', opacity: file, fontFamily: FONT,
        transform: `scale(${f >= DBL[0] && f < DBL[1] + 8 ? .95 : 1})` }}>
        <div style={{ width: 170, height: 170, margin: '0 auto', borderRadius: 34, background: f >= DBL[0] ? 'rgba(255,255,255,.12)' : 'transparent', display: 'grid', placeItems: 'center' }}>
          <Img src={staticFile('img/icon.png')} style={{ width: 130, height: 130 }} />
        </div>
        <div style={{ marginTop: 12, fontSize: 34, color: C.text }}>GameGoal.exe</div>
      </div>
      {dlg > 0 && (
        <div style={{ position: 'absolute', left: 90, right: 90, top: 560, height: 600, padding: '44px 50px', boxSizing: 'border-box', background: '#0b5aa6',
          fontFamily: FONT, color: '#fff', opacity: dlg, transform: `scale(${mix(.94, 1, dlg)})`, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
          <div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.15 }}>Система Windows защитила ваш компьютер</div>
          <div style={{ marginTop: 26, fontSize: 30, lineHeight: 1.4, opacity: .92 }}>Фильтр SmartScreen предотвратил запуск неопознанного приложения.</div>
          {!more ? (
            <div style={{ marginTop: 24, fontSize: 32, textDecoration: 'underline' }}>Подробнее</div>
          ) : (
            <div style={{ marginTop: 24, fontSize: 30, lineHeight: 1.5, opacity: p(f, MORE_CLICK + 6, 12) }}>Приложение: GameGoal.exe<br />Издатель: неизвестный издатель</div>
          )}
          <div style={{ position: 'absolute', right: 50, bottom: 44, display: 'flex', gap: 20 }}>
            {more && <div style={{ padding: '18px 26px', border: '2px solid #fff', fontSize: 30, opacity: p(f, MORE_CLICK + 6, 12),
              background: f >= RUN_CLICK && f < RUN_CLICK + 10 ? 'rgba(255,255,255,.2)' : 'transparent' }}>Выполнить в любом случае</div>}
            <div style={{ padding: '18px 26px', background: 'rgba(255,255,255,.2)', fontSize: 30 }}>Не выполнять</div>
          </div>
        </div>
      )}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 1230, textAlign: 'center', fontFamily: FONT, fontSize: 38, color: C.text,
        opacity: fade(f, 440, STEPS[2]) }}>Так Windows пишет про любые новые программы — это нормально</div>
    </AbsoluteFill>
  );
}

/* Шаги 3–4. Окно настроек: поиск игры в Steam, «Цель = цена игры» */
const PICK = 760, ROW0 = [540, 853], TARGET_BTN = [540, 1240], TARGET_CLICK = 880;
function Settings({ f }) {
  if (f < STEPS[2] || f >= STEPS[4] + 4) return null;
  const k = fade(f, STEPS[2] + 4, STEPS[4] + 4), picked = f >= PICK + 12;
  const typed = 'terraria'.slice(0, Math.max(0, Math.floor((f - 666) / 3)));
  const res = p(f, 700, 16);
  return (
    <div style={{ ...panel, top: PT, height: 900, opacity: k, transform: `translateY(${(1 - k) * 60}px)` }}>
      <div style={{ display: 'flex', gap: 10, padding: '26px 28px', borderBottom: `2px solid ${C.line}` }}>
        {['Награда', 'Доходы', 'Статистика', 'Полка', 'Виджет'].map((t, i) => (
          <span key={t} style={{ padding: '10px 20px', borderRadius: 26, fontSize: 28, fontWeight: 600, background: i ? 'transparent' : tile(G.col), color: i ? C.muted : '#fff' }}>{t}</span>
        ))}
      </div>
      {!picked ? (
        <div style={{ padding: '30px 34px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Steam', 'eShop', 'Своя'].map((t, i) => <span key={t} style={{ padding: '8px 20px', borderRadius: 22, fontSize: 28, border: `2px solid ${i ? C.line : G.col.t3}`,
              color: i ? C.muted : C.text }}>{t}</span>)}
          </div>
          <div style={{ marginTop: 24, height: 88, borderRadius: 44, background: 'rgba(255,255,255,.06)', border: `2px solid ${G.col.t2}`, display: 'flex', alignItems: 'center',
            padding: '0 32px', fontSize: 38 }}>{typed || <span style={{ color: C.dim }}>Найти игру</span>}<span style={{ width: 3, height: 40, marginLeft: 2,
              background: Math.floor(f / 18) % 2 ? C.text : 'transparent' }} /></div>
          {[['terraria-header.jpg', 'Terraria', G.price]].map(([img, n, pr]) => (
            <div key={n} style={{ marginTop: 26, height: 110, borderRadius: 22, display: 'flex', alignItems: 'center', gap: 24, padding: '0 18px', opacity: res,
              background: f >= PICK ? `${G.col.t2}33` : 'rgba(255,255,255,.04)', boxShadow: f >= PICK ? `inset 0 0 0 2px ${G.col.t3}` : 'none' }}>
              <Img src={staticFile(`img/${img}`)} style={{ width: 170, height: 80, borderRadius: 14, objectFit: 'cover' }} />
              <span style={{ flex: 1, fontSize: 38, fontWeight: 600 }}>{n}</span><span style={{ fontSize: 36, color: C.muted }}>{rub(pr)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '34px 34px', opacity: p(f, PICK + 12, 14) }}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <Img src={staticFile(`img/${G.img}`)} style={{ width: 360, height: 168, borderRadius: 22, objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: 26, letterSpacing: '.16em', color: C.dim, fontWeight: 600 }}>НАГРАДА</div>
              <div style={{ marginTop: 6, fontSize: 48, fontWeight: 700 }}>{G.name}</div>
              <div style={{ marginTop: 8, fontSize: 34, color: C.muted }}>Steam · {rub(G.price)}</div>
            </div>
          </div>
          <div style={{ marginTop: 60, fontSize: 30, color: C.dim }}>Цель</div>
          <div style={{ marginTop: 12, height: 88, borderRadius: 44, background: 'rgba(255,255,255,.06)', border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center',
            padding: '0 32px', fontSize: 40, fontWeight: 600 }}>{f >= TARGET_CLICK + 4 ? rub(G.price) : <span style={{ color: C.dim }}>не задана</span>}</div>
          <div style={{ position: 'absolute', left: TARGET_BTN[0] - 60 - 210, top: TARGET_BTN[1] - PT - 44, width: 420, height: 88, borderRadius: 44, background: tile(G.col),
            display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 600, color: '#fff', transform: `scale(${f >= TARGET_CLICK && f < TARGET_CLICK + 10 ? .95 : 1})` }}>Цель = цена игры</div>
        </div>
      )}
    </div>
  );
}

function Keys({ f }) {
  if (f < 1100 || f >= 1160) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: WB + 70, display: 'flex', justifyContent: 'center', gap: 22, opacity: 1 - p(f, 1146, 12, inQuart) }}>
      {['Ctrl', 'Alt', 'G'].map((k, i) => {
        const pop = p(f, 1102 + i * 5, 18), down = f >= 1102 + i * 5 && f < 1124 ? .94 : 1;
        return (
          <div key={k} style={{ minWidth: 120, height: 120, padding: '0 30px', borderRadius: 26, background: '#1a1c26', border: '2px solid rgba(255,255,255,.12)',
            borderBottomWidth: 8, display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.text,
            opacity: pop, transform: `translateY(${(1 - pop) * 40}px) scale(${down})`, boxSizing: 'border-box' }}>{k}</div>
        );
      })}
    </div>
  );
}

export function Howto() {
  const f = useCurrentFrame();
  const hook = 1 - p(f, STEPS[0] - 14, 14, inQuart);
  const quick = [Q1, Q2].find(q => f >= q.open && f < q.submit + 6);
  const earned = f < STEPS[4] ? 230 : earnedAt(f, 0, [{ absorb: Q1.submit, amount: Q1.amount }, { absorb: Q2.submit, amount: Q2.amount }]);
  const w = {
    game: G, earned, target: G.price, week: earned, weekGoal: 0, unlocked: f >= U0,
    addPress: f >= 1000 && f < 1010 ? .8 : 0, buyPress: f >= BUY && f < BUY + 10 ? .8 : 0,
    quick: quick ? { show: true, text: quick.text.slice(0, Math.max(0, Math.floor((f - quick.type) / 3))), caret: Math.floor(f / 18) % 2 === 0 } : null,
    banner: f >= BUY + 6 ? { y: p(f, BUY + 6, 24), kind: 'На полку', text: G.name } : null,
    unlock: unlockAt(f, U0, 100),
  };
  const widgetK = f < STEPS[0] ? hook : p(f, STEPS[4], 26);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop img={G.poster} />
      <Say f={f} from={-30} to={STEPS[0]} top={200} size={74} text="Где скачать и как настроить — за 25 секунд" />
      <StepPill f={f} />
      <Say f={f} from={STEPS[0] + 4} to={STEPS[1]} top={240} size={64} text="Скачай GameGoal.exe с GitHub" accent="Один файл, без установки" />
      <Say f={f} from={STEPS[1] + 4} to={STEPS[2]} top={240} size={64} text="Запусти файл" accent="Окно Windows? «Подробнее» → «Выполнить»" />
      <Say f={f} from={STEPS[2] + 4} to={STEPS[3]} top={240} size={64} text="Выбери игру — цена подтянется сама" />
      <Say f={f} from={STEPS[3] + 4} to={STEPS[4]} top={240} size={64} text="Поставь цель" />
      <Say f={f} from={STEPS[4] + 4} to={1100} top={240} size={64} text="Получил деньги — записал" accent="«+» на виджете, сумма и за что" />
      <Say f={f} from={1100} to={FINAL} top={240} size={64} text="Или Ctrl+Alt+G из любой программы" />
      <Say f={f} from={FINAL + 4} to={END + 16} top={240} size={70} text="Накопил — жми «Купил!»" />

      {(f < STEPS[0] || f >= STEPS[4]) && <PlacedWidget f={f} w={w} col={G.col} enter={widgetK} />}
      <Browser f={f} />
      <Launch f={f} />
      <Settings f={f} />
      <Keys f={f} />
      <Toast f={f} from={EXE_CLICK + 8} to={STEPS[1] - 4} text="GameGoal.exe скачан · 6,5 МБ" top={1360} />

      <Cursor f={f} show={fade(f, STEPS[0] + 30, STEPS[1]) + fade(f, STEPS[1] + 10, RUN_CLICK + 20) + fade(f, 720, TARGET_CLICK + 30) + fade(f, 960, 1020) + fade(f, 1330, 1394)}
        path={[[0, 760, 1500], [REL_CLICK - 4, ...REL], [EXE_CLICK - 6, ...EXE], [DBL[0] - 4, W / 2, 660], [MORE_CLICK - 4, ...MORE], [RUN_CLICK - 4, ...RUN],
          [PICK - 4, ...ROW0], [TARGET_CLICK - 4, ...TARGET_BTN], [996, ...at(SPOT.plus)], [BUY - 4, ...at(SPOT.buy)]]}
        clicks={[REL_CLICK, EXE_CLICK, ...DBL, MORE_CLICK, RUN_CLICK, PICK, TARGET_CLICK, 1000, BUY]} />

      <EndCard f={f} start={END} lines={['Копилка на игру на рабочем столе', 'Бесплатно · для Windows']} cta="Ищи на GitHub: game-goal" />
      <Sounds list={[
        ['open', 2],
        ['tick', STEPS[0]], ['tick', REL_CLICK], ['confirm', EXE_CLICK], ['open', EXE_CLICK + 10],
        ['tick', STEPS[1]], ['tick', DBL[0]], ['tick', DBL[1]], ['remove', 426, .8], ['tick', MORE_CLICK], ['confirm', RUN_CLICK],
        ['tick', STEPS[2]], ['tick', 700, .7], ['confirm', PICK],
        ['tick', STEPS[3]], ['confirm', TARGET_CLICK],
        ['open', STEPS[4] + 4], ['tick', 1000], ['confirm', Q1.submit], ['coin', Q1.submit + 14],
        ['tick', Q2.open], ['confirm', Q2.submit], ['coin', Q2.submit + 14],
        ['unlock', U0 + 24], ['confirm', BUY], ['open', BUY + 12], ['confirm', END + 40],
      ]} />
    </AbsoluteFill>
  );
}
