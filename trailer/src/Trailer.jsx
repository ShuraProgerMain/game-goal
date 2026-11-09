// Трейлер Game Goal, 9:16, ~31 с при 60 к/с. Game Goal — трекер доходов с игрой-наградой: доход записывает сам
// пользователь (курсор жмёт «+», Ctrl+Alt+G), виджет считает, сколько осталось. Сцены: заставка с Joy-Con →
// «Хочешь игру? Копи на неё с каждого заказа» → виджет (записи, быстрый ввод, награда открыта, «Купил!» →
// «Карточка») → окно карточки со стилями → итоги года → финальный кадр. Музыка своя (scripts/music.mjs).
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { BRAND, C, FONT, HADES, JoyCons, Rise, inQuart, mix, p, rub, smooth, tile } from './lib.jsx';
import { Widget } from './Widget.jsx';

const W = 1080, H = 1920;
export const DURATION = 1880;
const sfx = (name, at, volume = 1) => <Sequence key={`${name}-${at}`} from={at} durationInFrames={160}><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>;

// Уход сцены: последние n кадров — затухание и лёгкий подъём (x⁴, вдвое быстрее входа)
const exitOf = (f, dur, n = 16) => { const k = p(f, dur - n, n, inQuart); return { opacity: 1 - k, transform: `translateY(${-k * 40}px)` }; };
// Нажатие кнопки: 5 кадров вниз, 5 обратно
const pressAt = (f, c) => (f >= c && f < c + 10 ? smooth(p(f, c, 5, x => x)) * (1 - p(f, c + 5, 5, x => x)) : 0);

function Glow({ col = BRAND, y = .42, k = 1 }) {
  return <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% ${y * 100}%, ${col.t2}38, transparent 70%)`, opacity: k }} />;
}
function Caption({ f, eyebrow, title, start = 0, top = 300 }) {
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top, textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '.22em', color: C.muted, opacity: p(f, start, 20) }}>{eyebrow}</div>
      <div style={{ marginTop: 22, fontSize: 66, fontWeight: 700, lineHeight: 1.12, color: C.text }}><Rise text={title} f={f} start={start + 6} step={1.1} /></div>
    </div>
  );
}

// Курсор мыши: путь — точки [кадр прихода, x, y], до каждой он едет 22 кадра; клики — кадры нажатий
function Cursor({ f, path, clicks = [], show }) {
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [at, nx, ny] = path[i];
    if (f < at - 22) break;
    const k = p(f, at - 22, 22);
    x = mix(x, nx, k); y = mix(y, ny, k);
  }
  const press = clicks.reduce((a, c) => Math.max(a, pressAt(f, c)), 0);
  const c0 = clicks.find(c => f >= c && f < c + 24);
  const ripple = c0 == null ? null : p(f, c0, 24);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: show, zIndex: 50 }}>
      {ripple != null && (
        <div style={{ position: 'absolute', left: -50 * ripple, top: -50 * ripple, width: 100 * ripple, height: 100 * ripple, borderRadius: '50%',
          border: `4px solid rgba(255,255,255,${.6 * (1 - ripple)})` }} />
      )}
      <svg width="58" height="58" viewBox="0 0 24 24" style={{ position: 'absolute', left: -6, top: -3, transform: `scale(${1 - press * .15})`, transformOrigin: '6px 3px',
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.5))' }}>
        <path d="M4 2.5v17.2l4.6-4.4 3 6.9 3-1.3-3-6.8h6.2z" fill="#fff" stroke="#111" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------- 1. Заставка: Joy-Con сцепляются, замах 3:1, расходятся и открывают название ---------- */
function Intro() {
  const f = useCurrentFrame(), dur = 180;
  const enter = p(f, 0, 48), lean = f < 62 ? 7 * smooth(p(f, 44, 18, x => x)) : 7 * (1 - p(f, 62, 6, x => x));
  const gap = 340 * p(f, 68, 70);
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur, 20) }}>
      <Glow k={p(f, 60, 60)} y={.4} />
      <JoyCons h={360} lean={lean} gap={gap} style={{ left: W / 2, top: 760 - 180 + (1 - enter) * 800, transform: `rotate(${(1 - enter) * -16}deg)` }} />
      <div style={{ position: 'absolute', top: 696, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 112, fontWeight: 700, color: C.text }}>
        <Rise text="Game Goal" f={f} start={80} step={1.6} />
      </div>
      <div style={{ position: 'absolute', top: 1000, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 46, color: C.muted }}>
        <Rise text="копилка на игру" f={f} start={104} step={1.2} />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 2. «Хочешь игру? Копи на неё с каждого заказа» ---------- */
function Premise() {
  const f = useCurrentFrame(), dur = 240;
  const drop = p(f, 46, 40), chip = p(f, 96, 26);
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur) }}>
      <Glow col={HADES} y={.45} k={p(f, 40, 50)} />
      <div style={{ position: 'absolute', top: 210, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 108, fontWeight: 700, color: C.text }}>
        <Rise text="Хочешь игру?" f={f} start={8} step={1.4} />
      </div>
      <div style={{ position: 'absolute', left: W / 2 - 240, top: mix(-900, 420, drop), width: 480, height: 720, borderRadius: 40, overflow: 'hidden',
        transform: `rotate(${(1 - drop) * -6}deg)`, boxShadow: '0 50px 90px rgba(0,0,0,.55)' }}>
        <Img src={staticFile('img/hades-poster.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: W / 2 + 110, top: 1060, padding: '18px 34px', borderRadius: 50, background: tile(HADES), color: '#fff',
        fontFamily: FONT, fontSize: 52, fontWeight: 700, opacity: chip, transform: `scale(${mix(.6, 1, chip)}) rotate(-4deg)`, boxShadow: '0 20px 40px rgba(0,0,0,.45)' }}>1 100 ₽</div>
      <div style={{ position: 'absolute', top: 1260, left: 60, right: 60, textAlign: 'center', fontFamily: FONT, fontSize: 88, fontWeight: 700, lineHeight: 1.1, color: C.text }}>
        <Rise text="Копи на неё с каждого заказа" f={f} start={136} step={1} />
      </div>
      <div style={{ position: 'absolute', top: 1540, left: 80, right: 80, textAlign: 'center', fontFamily: FONT, fontSize: 40, color: C.muted, opacity: p(f, 172, 24),
        transform: `translateY(${(1 - p(f, 172, 30)) * 20}px)` }}>
        Game Goal — трекер доходов с игрой-наградой
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 3–5. Виджет: записываешь доход, быстрый ввод, награда открыта, «Купил!» → «Карточка» ---------- */
const S = 2.3, WX = (W - 412 * S) / 2, WY = 700;
const at = (x, y) => [WX + x * S, WY + y * S];       // точка внутри виджета → координаты кадра
const PLUS = at(377, 175), BUY = at(318, 78), CARD_BTN = at(344, 34);
const INCOME = [
  { click: 60, at: 94, amount: 1500, label: 'превью', who: 'Вася' },
  { click: 150, at: 184, amount: 800, label: 'шортсы', who: 'Аня' },
];
const QUICK = { type: 410, submit: 470, text: '700 монтаж @Аня', amount: 700 };
const BUY_CLICK = 796, CARD_CLICK = 836;
const WIDGET_DUR = 860;

function WidgetStory() {
  const f = useCurrentFrame();
  const earned = INCOME.reduce((a, e) => a + e.amount * p(f, e.at + 12, 50), 0) + QUICK.amount * p(f, QUICK.submit + 12, 50);
  const typed = QUICK.text.slice(0, Math.max(0, Math.floor((f - QUICK.type) / 3)));
  const bannerIn = p(f, 540, 24), bannerOut = p(f, 640, 12, inQuart);
  const shelfIn = p(f, 806, 24);
  // Награда открыта: появление, замах наружу 9×2 кадров, щелчок 3×2, расхождение
  const u0 = 660, lean = f < u0 + 42 ? 7 * smooth(p(f, u0 + 24, 18, x => x)) : 7 * (1 - p(f, u0 + 42, 6, x => x));
  const w = {
    earned, target: 3000, week: earned, weekGoal: 3000, unlocked: f >= u0,
    addPress: Math.max(...INCOME.map(e => pressAt(f, e.click))), buyPress: pressAt(f, BUY_CLICK),
    quick: f >= 400 && f < 482 ? { show: true, text: typed, caret: Math.floor(f / 18) % 2 === 0 } : null,
    banner: f >= 806 ? { y: shelfIn, kind: 'На полку', text: 'Hades II', action: 'Карточка', press: pressAt(f, CARD_CLICK) }
      : { y: bannerIn * (1 - bannerOut), kind: 'Достижение', text: 'Цель' },
    unlock: {
      show: p(f, u0, 12) * (1 - p(f, 760, 16, inQuart)),
      jc: { lean, gap: 150 * p(f, u0 + 48, 50), scale: mix(.6, 1, p(f, u0, 24)) },
      glow: p(f, u0 + 48, 20) * .8, text: p(f, u0 + 70, 20),
    },
  };
  const cap = f < 340 ? 0 : f < 650 ? 1 : 2;
  const caps = [
    ['ТРЕКЕР ДОХОДОВ', 'Записал заказ — виджет посчитал, сколько осталось', 0],
    ['БЫСТРЫЙ ВВОД', 'Ctrl+Alt+G — запись из любой программы', 340],
    ['ЦЕЛЬ НАБРАНА', 'Накопил — покупай с чистой совестью', 650],
  ];
  const capOut = [p(f, 324, 14, inQuart), p(f, 634, 14, inQuart), 0][cap];
  // Переход к карточке: наезд на кнопку «Карточка» и уход в темноту
  const zoom = p(f, CARD_CLICK + 4, 20, inQuart);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{ transform: `scale(${1 + zoom * .8})`, transformOrigin: `${CARD_BTN[0]}px ${CARD_BTN[1]}px`, opacity: 1 - zoom }}>
        {/* «Рабочий стол»: размытый арт игры и затемнение */}
        <AbsoluteFill style={{ opacity: p(f, 0, 40) }}>
          <Img src={staticFile('img/hades-poster.jpg')} style={{ position: 'absolute', inset: -120, width: W + 240, height: H + 240, objectFit: 'cover', filter: 'blur(70px) saturate(140%)', opacity: .55 }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,9,13,.88), rgba(8,9,13,.35) 45%, rgba(8,9,13,.9))' }} />
        </AbsoluteFill>
        <div style={{ opacity: 1 - capOut, transform: `translateY(${-capOut * 30}px)` }}>
          <Caption key={cap} f={f} eyebrow={caps[cap][0]} title={caps[cap][1]} start={caps[cap][2] + (cap ? 4 : 10)} top={250} />
        </div>

        <div style={{ position: 'absolute', left: WX, top: WY, opacity: p(f, 10, 30), transform: `translateY(${(1 - p(f, 10, 40)) * 80}px)`,
          filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.6))' }}>
          <Widget f={f} w={w} col={HADES} scale={S} />
        </div>

        {/* Запись дохода: после клика по «+» вылезает запись и уходит в виджет */}
        {INCOME.map(e => {
          const k = p(f, e.click + 2, 24), fly = p(f, e.at, 14, inQuart);
          if (f < e.click + 2 || fly >= 1) return null;
          return (
            <div key={e.at} style={{ position: 'absolute', left: 0, right: 0, top: mix(PLUS[1], 1250, k) - fly * 220, display: 'flex', justifyContent: 'center',
              opacity: Math.min(1, k * 2) * (1 - fly), transform: `translateX(${(1 - k) * (PLUS[0] - W / 2)}px) scale(${mix(.4, 1, k) * (1 - fly * .3)})` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 30px 16px 16px', borderRadius: 60, background: 'rgba(22, 23, 32, .96)',
                border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 44, color: C.text, boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
                <span style={{ width: 60, height: 60, borderRadius: 30, background: tile(HADES), display: 'grid', placeItems: 'center' }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                <span style={{ fontSize: 30, color: C.dim }}>записано</span>
                <b style={{ color: C.plus }}>+{rub(e.amount)}</b><span>{e.label}</span>
                <span style={{ padding: '6px 16px', borderRadius: 30, background: `${HADES.t2}33`, color: HADES.g2, fontSize: 32, fontWeight: 600 }}>{e.who}</span>
              </div>
            </div>
          );
        })}

        {/* Ctrl + Alt + G */}
        {f >= 376 && f < 500 && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, display: 'flex', justifyContent: 'center', gap: 22, opacity: 1 - p(f, 482, 14, inQuart) }}>
            {['Ctrl', 'Alt', 'G'].map((k, i) => {
              const pop = p(f, 380 + i * 6, 20), down = f >= 380 + i * 6 && f < 404 ? .94 : 1;
              return (
                <div key={k} style={{ minWidth: 120, height: 120, padding: '0 30px', borderRadius: 26, background: '#1a1c26', border: '2px solid rgba(255,255,255,.12)',
                  borderBottomWidth: 8, display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.text,
                  opacity: pop, transform: `translateY(${(1 - pop) * 40}px) scale(${down})`, boxSizing: 'border-box' }}>{k}</div>
              );
            })}
          </div>
        )}

        {/* Полка: купленная игра встаёт первой */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1320, display: 'flex', justifyContent: 'center', gap: 20, opacity: shelfIn }}>
          {['hades-header', 'celeste', 'hollow', 'stardew'].map((img, i) => {
            const k = i === 0 ? p(f, 812, 28) : 1;
            return (
              <div key={img} style={{ width: 210, height: 98, borderRadius: 18, overflow: 'hidden', border: i === 0 ? `3px solid ${HADES.t3}` : `2px solid ${C.line}`,
                transform: `translateY(${(1 - k) * -220}px) scale(${mix(1.3, 1, k)})`, boxShadow: '0 14px 30px rgba(0,0,0,.45)' }}>
                <Img src={staticFile(`img/${img}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1460, textAlign: 'center', fontFamily: FONT, fontSize: 32, color: C.dim, opacity: shelfIn }}>Полка</div>

        <Cursor f={f} show={p(f, 30, 12) * (1 - p(f, 214, 12)) + (f >= 760 ? p(f, 760, 12) : 0)}
          path={[[0, 760, 1620], [56, PLUS[0], PLUS[1]], [740, 820, 1330], [790, BUY[0], BUY[1]], [830, CARD_BTN[0], CARD_BTN[1]]]}
          clicks={[...INCOME.map(e => e.click), BUY_CLICK, CARD_CLICK]} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- 6. Окно карточки: стили на вкладках, «Скопировать» ---------- */
const TABS = [
  { name: 'Обычная', w: 196 }, { name: 'Сторис', w: 214, pro: true }, { name: 'Минимал', w: 236, pro: true }, { name: 'Ретро', w: 196, pro: true },
];
const TAB_Y = 420, TAB_H = 72, TAB_GAP = 14;
const TAB_X0 = (W - TABS.reduce((a, t) => a + t.w, 0) - TAB_GAP * 3) / 2;
const tabX = i => TAB_X0 + TABS.slice(0, i).reduce((a, t) => a + t.w + TAB_GAP, 0);
const tabC = i => [tabX(i) + TABS[i].w / 2, TAB_Y + TAB_H / 2];
const PREVIEW = { top: 530, h: 860 };
const CARD_SEQ = [
  { tab: 0, img: 'style-classic', ar: 1800 / 1012, at: 0 },
  { tab: 1, img: 'style-story', ar: 1080 / 1920, at: 70 },
  { tab: 3, img: 'style-retro', ar: 1800 / 1012, at: 140 },
];
const COPY = { x: 120, y: 1450, w: 330, h: 88 }, COPY_CLICK = 220;

function Cards() {
  const f = useCurrentFrame(), dur = 300;
  const panel = p(f, 0, 26);
  const cur = CARD_SEQ.filter(c => f >= c.at).length - 1;
  const toast = p(f, COPY_CLICK + 6, 20) * (1 - p(f, 284, 12, inQuart));
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur) }}>
      <Glow col={HADES} y={.5} />
      <Caption f={f} eyebrow="ПОДЕЛИСЬ ПОКУПКОЙ" title="Карточка в один клик" start={4} top={100} />
      <div style={{ position: 'absolute', left: 60, top: 300, width: 960, height: 1290, borderRadius: 44, background: '#15161d', border: `2px solid ${C.line}`,
        boxShadow: '0 40px 90px rgba(0,0,0,.6)', opacity: panel, transform: `scale(${mix(.9, 1, panel)})`, boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', left: 50, top: 36, fontFamily: FONT, fontSize: 44, fontWeight: 600, color: C.text }}>Карточка</div>
        <div style={{ position: 'absolute', right: 50, top: 46, fontFamily: FONT, fontSize: 30, color: C.dim }}>Hades II · куплена</div>
      </div>
      {/* Вкладки стилей */}
      {TABS.map((t, i) => {
        const on = CARD_SEQ[cur].tab === i;
        return (
          <div key={t.name} style={{ position: 'absolute', left: tabX(i), top: TAB_Y, width: t.w, height: TAB_H, borderRadius: 36, boxSizing: 'border-box',
            background: on ? tile(HADES) : 'rgba(255,255,255,.06)', border: on ? 'none' : `2px solid ${C.line}`, color: on ? '#fff' : C.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: FONT, fontSize: 30, fontWeight: 600, opacity: panel }}>
            {t.name}{t.pro && <span style={{ padding: '2px 8px', borderRadius: 8, background: on ? 'rgba(0,0,0,.25)' : 'rgba(255, 216, 74, .18)', color: '#ffd84a', fontSize: 18, fontWeight: 700 }}>PRO</span>}
          </div>
        );
      })}
      {/* Превью: новый стиль въезжает справа, прежний уходит влево */}
      {CARD_SEQ.map((c, i) => {
        const next = CARD_SEQ[i + 1];
        const inK = i === 0 ? panel : p(f, c.at, 24), outK = next ? p(f, next.at, 12, inQuart) : 0;
        if ((i > 0 && f < c.at) || outK >= 1) return null;
        const h = c.ar < 1 ? PREVIEW.h : 860 / c.ar, w = h * c.ar;
        return (
          <Img key={c.img} src={staticFile(`img/${c.img}.png`)} style={{ position: 'absolute', left: (W - w) / 2, top: PREVIEW.top + (PREVIEW.h - h) / 2, width: w, height: h,
            borderRadius: 22, opacity: inK * (1 - outK), transform: `translateX(${(1 - inK) * 300 - outK * 300}px)`, boxShadow: '0 30px 60px rgba(0,0,0,.5)' }} />
        );
      })}
      {/* Кнопки окна */}
      <div style={{ position: 'absolute', left: COPY.x, top: COPY.y, width: COPY.w, height: COPY.h, borderRadius: 44, background: tile(HADES), color: '#fff',
        display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 600, opacity: panel, transform: `scale(${1 - pressAt(f, COPY_CLICK) * .08})` }}>Скопировать</div>
      <div style={{ position: 'absolute', left: COPY.x + COPY.w + 20, top: COPY.y, width: 270, height: COPY.h, borderRadius: 44, background: 'rgba(255,255,255,.06)',
        border: `2px solid ${C.line}`, color: C.text, display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 34, fontWeight: 600, opacity: panel, boxSizing: 'border-box' }}>Сохранить</div>
      {/* Тост, как в программе */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1660, display: 'flex', justifyContent: 'center', opacity: toast, transform: `translateY(${(1 - toast) * 30}px)` }}>
        <div style={{ padding: '24px 40px', borderRadius: 40, background: 'rgba(22, 23, 32, .97)', border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 36, color: C.text }}>
          Картинка скопирована — вставь её в чат
        </div>
      </div>
      <Cursor f={f} show={p(f, 30, 12) * (1 - p(f, 270, 14))}
        path={[[0, 760, 1250], [64, ...tabC(1)], [134, ...tabC(3)], [212, COPY.x + COPY.w / 2, COPY.y + COPY.h / 2]]}
        clicks={[70, 140, COPY_CLICK]} />
    </AbsoluteFill>
  );
}

/* ---------- 7. Итоги года и финальный кадр ---------- */
function Finale() {
  const f = useCurrentFrame();
  const yearIn = p(f, 0, 30), yearOut = p(f, 96, 16, inQuart);
  const e0 = 100, enter = p(f, e0, 36);
  const lean = f < e0 + 46 ? 7 * smooth(p(f, e0 + 28, 18, x => x)) : 7 * (1 - p(f, e0 + 46, 6, x => x));
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Glow col={BRAND} y={.4} k={p(f, e0, 40)} />
      {f < 116 && (
        <AbsoluteFill style={{ opacity: yearIn * (1 - yearOut) }}>
          <Glow col={HADES} y={.55} />
          <Caption f={f} eyebrow="ИТОГИ ГОДА" title="Весь год на одной картинке" start={4} top={190} />
          <Img src={staticFile('img/year-story.png')} style={{ position: 'absolute', left: (W - 640) / 2, top: 470, width: 640, height: 1138, borderRadius: 24,
            transform: `scale(${mix(1.08, 1, yearIn)})`, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
        </AbsoluteFill>
      )}
      {f >= e0 && (
        <AbsoluteFill>
          <JoyCons h={230} lean={lean} gap={370 * p(f, e0 + 52, 50)} style={{ left: W / 2, top: 640 + (1 - enter) * 500, transform: `rotate(${(1 - enter) * -16}deg)` }} />
          <div style={{ position: 'absolute', top: 668, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 112, fontWeight: 700, color: C.text }}>
            <Rise text="Game Goal" f={f} start={e0 + 56} step={1.5} />
          </div>
          {[['Трекер доходов с игрой-наградой', 960, 46, C.text, 72], ['Бесплатно · один файл · Windows, macOS, Linux', 1040, 36, C.muted, 82],
            ['github.com/ShuraProgerMain/game-goal', 1200, 40, BRAND.t3, 92]].map(([t, top, size, color, at0]) => (
            <div key={t} style={{ position: 'absolute', top, left: 40, right: 40, textAlign: 'center', fontFamily: FONT, fontSize: size, fontWeight: 500, color }}>
              <Rise text={t} f={f} start={e0 + at0} step={.5} />
            </div>
          ))}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// Набор текста: на каждый символ — одна из трёх клавиш
const typing = Array.from({ length: QUICK.text.length }, (_, i) => [`key${(i % 3) + 1}`, 420 + QUICK.type + 3 * (i + 1), .7]);

export function Trailer() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={0} durationInFrames={180}><Intro /></Sequence>
      <Sequence from={180} durationInFrames={240}><Premise /></Sequence>
      <Sequence from={420} durationInFrames={WIDGET_DUR}><WidgetStory /></Sequence>
      <Sequence from={1280} durationInFrames={300}><Cards /></Sequence>
      <Sequence from={1580} durationInFrames={300}><Finale /></Sequence>

      <Audio src={staticFile('music.wav')} volume={.38} />
      {[
        // заставка
        ['whoosh', 0, .8], ['snap', 63], ['shine', 84, .8],
        // «Хочешь игру?»
        ['pop', 188, .7], ['whoosh', 224, .8], ['pop', 276], ['shine', 318, .7],
        // записи дохода: клик по «+», запись выскакивает, монетка при зачислении
        ['click', 480], ['pop', 484, .8], ['coin', 526], ['click', 570], ['pop', 574, .8], ['coin', 616],
        // Ctrl+Alt+G и набор
        ['key1', 800], ['key2', 806], ['key3', 812], ...typing, ['confirm', 890], ['coin', 902], ['achieve', 960],
        // награда открыта, «Купил!», полка, «Карточка»
        ['unlock', 1104], ['shine', 1132, .8], ['click', 1216], ['confirm', 1218], ['pop', 1232], ['click', 1256], ['whoosh', 1258, .9],
        // окно карточки
        ['pop', 1282, .8], ['click', 1350], ['swipe', 1352], ['click', 1420], ['swipe', 1422], ['click', 1500], ['confirm', 1502], ['open', 1508],
        // итоги года и финал
        ['whoosh', 1580, .7], ['snap', 1726], ['logo', 1736],
      ].map(([n, t, v]) => sfx(n, t, v ?? 1))}
    </AbsoluteFill>
  );
}
