// Трейлер Game Goal, 9:16, 30 с при 60 к/с. Сцены: заставка с Joy-Con → «Хочешь игру?» → виджет (доходы,
// Ctrl+Alt+G, награда открыта, «Купил!») → карточки «Награда заработана» → итоги года → финальный кадр.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { BRAND, C, FONT, HADES, JoyCons, Rise, inQuart, mix, p, rub, smooth, tile } from './lib.jsx';
import { Widget } from './Widget.jsx';

const W = 1080, H = 1920;
const sfx = (name, at) => <Sequence key={`${name}-${at}`} from={at} durationInFrames={90}><Audio src={staticFile(`sfx/${name}.wav`)} /></Sequence>;

// Уход сцены: последние n кадров — затухание и лёгкий подъём (x⁴, вдвое быстрее входа)
const exitOf = (f, dur, n = 16) => { const k = p(f, dur - n, n, inQuart); return { opacity: 1 - k, transform: `translateY(${-k * 40}px)` }; };

function Glow({ col = BRAND, y = .42, k = 1 }) {
  return <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% ${y * 100}%, ${col.t2}38, transparent 70%)`, opacity: k }} />;
}
function Caption({ f, eyebrow, title, start = 0, top = 300 }) {
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, top, textAlign: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '.22em', color: C.muted, opacity: p(f, start, 20) }}>{eyebrow}</div>
      <div style={{ marginTop: 22, fontSize: 70, fontWeight: 700, lineHeight: 1.1, color: C.text }}><Rise text={title} f={f} start={start + 6} step={1.1} /></div>
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

/* ---------- 2. «Хочешь игру? Заработай её.» ---------- */
function Premise() {
  const f = useCurrentFrame(), dur = 240;
  const drop = p(f, 46, 40), chip = p(f, 96, 26);
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur) }}>
      <Glow col={HADES} y={.5} k={p(f, 40, 50)} />
      <div style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 112, fontWeight: 700, color: C.text }}>
        <Rise text="Хочешь игру?" f={f} start={8} step={1.4} />
      </div>
      <div style={{ position: 'absolute', left: W / 2 - 260, top: mix(-900, 520, drop), width: 520, height: 780, borderRadius: 40, overflow: 'hidden',
        transform: `rotate(${(1 - drop) * -6}deg)`, boxShadow: '0 50px 90px rgba(0,0,0,.55)' }}>
        <Img src={staticFile('img/hades-poster.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: W / 2 + 120, top: 1230, padding: '18px 34px', borderRadius: 50, background: tile(HADES), color: '#fff',
        fontFamily: FONT, fontSize: 52, fontWeight: 700, opacity: chip, transform: `scale(${mix(.6, 1, chip)}) rotate(-4deg)`, boxShadow: '0 20px 40px rgba(0,0,0,.45)' }}>1 100 ₽</div>
      <div style={{ position: 'absolute', top: 1450, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 104, fontWeight: 700, color: C.text }}>
        <Rise text="Заработай её." f={f} start={140} step={1.4} />
      </div>
      <div style={{ position: 'absolute', top: 1590, left: W / 2 - 220, width: 440, height: 10, borderRadius: 5, background: tile(HADES),
        transform: `scaleX(${p(f, 160, 40)})` }} />
    </AbsoluteFill>
  );
}

/* ---------- 3–5. Виджет: доходы, быстрый ввод, награда открыта, «Купил!» ---------- */
const INCOME = [
  { at: 60, amount: 1500, label: 'превью', who: 'Вася' },
  { at: 170, amount: 800, label: 'шортсы', who: 'Аня' },
];
const QUICK = { type: 410, submit: 470, text: '700 монтаж @Аня', amount: 700 };

function WidgetStory() {
  const f = useCurrentFrame(), dur = 840;
  const earned = INCOME.reduce((a, e) => a + e.amount * p(f, e.at + 12, 50), 0) + QUICK.amount * p(f, QUICK.submit + 12, 50);
  const typed = QUICK.text.slice(0, Math.max(0, Math.floor((f - QUICK.type) / 3)));
  const bannerIn = p(f, 540, 24), bannerOut = p(f, 640, 12, inQuart);
  const shelfIn = p(f, 800, 24);
  // Награда открыта: появление, замах наружу 9×2 кадров, щелчок 3×2, расхождение
  const u0 = 660, lean = f < u0 + 42 ? 7 * smooth(p(f, u0 + 24, 18, x => x)) : 7 * (1 - p(f, u0 + 42, 6, x => x));
  const w = {
    earned, target: 3000, week: earned, weekGoal: 3000, unlocked: f >= u0,
    buyPress: f >= 786 && f < 796 ? smooth(p(f, 786, 5, x => x)) * (1 - p(f, 791, 5, x => x)) : 0,
    quick: f >= 400 && f < 482 ? { show: true, text: typed, caret: Math.floor(f / 18) % 2 === 0 } : null,
    banner: f >= 800 ? { y: shelfIn, kind: 'На полку', text: 'Hades II' } : { y: bannerIn * (1 - bannerOut), kind: 'Достижение', text: 'Цель' },
    unlock: {
      show: p(f, u0, 12) * (1 - p(f, 760, 16, inQuart)),
      jc: { lean, gap: 150 * p(f, u0 + 48, 50), scale: mix(.6, 1, p(f, u0, 24)) },
      glow: p(f, u0 + 48, 20) * .8, text: p(f, u0 + 70, 20),
    },
  };
  const cap = f < 340 ? 0 : f < 650 ? 1 : 2;
  const caps = [
    ['ВИДЖЕТ НА РАБОЧЕМ СТОЛЕ', 'Каждый заказ — шаг к игре', 0],
    ['БЫСТРЫЙ ВВОД', 'Ctrl+Alt+G из любой программы', 340],
    ['ЦЕЛЬ НАБРАНА', 'Игра заработана честно', 650],
  ];
  const capOut = [p(f, 324, 14, inQuart), p(f, 634, 14, inQuart), 0][cap];
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur) }}>
      {/* «Рабочий стол»: размытый арт игры и затемнение */}
      <AbsoluteFill style={{ opacity: p(f, 0, 40) }}>
        <Img src={staticFile('img/hades-poster.jpg')} style={{ position: 'absolute', inset: -120, width: W + 240, height: H + 240, objectFit: 'cover', filter: 'blur(70px) saturate(140%)', opacity: .55 }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,9,13,.85), rgba(8,9,13,.35) 45%, rgba(8,9,13,.9))' }} />
      </AbsoluteFill>
      <div style={{ opacity: 1 - capOut, transform: `translateY(${-capOut * 30}px)` }}>
        <Caption key={cap} f={f} eyebrow={caps[cap][0]} title={caps[cap][1]} start={caps[cap][2] + (cap ? 4 : 10)} />
      </div>

      <div style={{ position: 'absolute', left: (W - 412 * 2.3) / 2, top: 700, opacity: p(f, 10, 30), transform: `translateY(${(1 - p(f, 10, 40)) * 80}px)`,
        filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.6))' }}>
        <Widget f={f} w={w} col={HADES} scale={2.3} />
      </div>

      {/* Доходы: плашка поднимается снизу и «падает» в виджет */}
      {INCOME.map(e => {
        const k = p(f, e.at - 26, 26), fly = p(f, e.at, 14, inQuart);
        if (f < e.at - 26 || fly >= 1) return null;
        return (
          <div key={e.at} style={{ position: 'absolute', left: 0, right: 0, top: mix(1480, 1210, k) - fly * 160, display: 'flex', justifyContent: 'center',
            opacity: k * (1 - fly), transform: `scale(${1 - fly * .3})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 34px', borderRadius: 60, background: 'rgba(22, 23, 32, .96)',
              border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 46, color: C.text, boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
              <b style={{ color: C.plus }}>+{rub(e.amount)}</b><span>{e.label}</span>
              <span style={{ padding: '6px 16px', borderRadius: 30, background: `${HADES.t2}33`, color: HADES.g2, fontSize: 34, fontWeight: 600 }}>{e.who}</span>
            </div>
          </div>
        );
      })}

      {/* Ctrl + Alt + G */}
      {f >= 376 && f < 500 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1280, display: 'flex', justifyContent: 'center', gap: 22, opacity: 1 - p(f, 482, 14, inQuart) }}>
          {['Ctrl', 'Alt', 'G'].map((k, i) => {
            const pop = p(f, 380 + i * 6, 20), press = f >= 404 && f < 412 ? .92 : 1;
            return (
              <div key={k} style={{ minWidth: 120, height: 120, padding: '0 30px', borderRadius: 26, background: '#1a1c26', border: '2px solid rgba(255,255,255,.12)',
                borderBottomWidth: 8, display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.text,
                opacity: pop, transform: `translateY(${(1 - pop) * 40}px) scale(${press})`, boxSizing: 'border-box' }}>{k}</div>
            );
          })}
        </div>
      )}

      {/* Полка: игра встаёт первой */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1300, display: 'flex', justifyContent: 'center', gap: 20, opacity: shelfIn }}>
        {['hades-header', 'celeste', 'hollow', 'stardew'].map((img, i) => {
          const k = i === 0 ? p(f, 806, 28) : 1;
          return (
            <div key={img} style={{ width: 210, height: 98, borderRadius: 18, overflow: 'hidden', border: i === 0 ? `3px solid ${HADES.t3}` : `2px solid ${C.line}`,
              transform: `translateY(${(1 - k) * -220}px) scale(${mix(1.3, 1, k)})`, boxShadow: '0 14px 30px rgba(0,0,0,.45)' }}>
              <Img src={staticFile(`img/${img}.jpg`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1440, textAlign: 'center', fontFamily: FONT, fontSize: 32, color: C.dim, opacity: shelfIn }}>Полка</div>
    </AbsoluteFill>
  );
}

/* ---------- 6. Карточки «Награда заработана»: сменяются, как экраны на консоли ---------- */
const CARDS = [
  { img: 'style-story', name: 'Сторис', pro: true, at: 0, w: 640, h: 1138 },
  { img: 'style-retro', name: 'Ретро', pro: true, at: 110, w: 920, h: 517 },
  { img: 'style-minimal', name: 'Минимал', pro: true, at: 175, w: 920, h: 517 },
  { img: 'style-classic', name: 'Обычная', pro: false, at: 240, w: 920, h: 517 },
];
function Cards() {
  const f = useCurrentFrame(), dur = 300;
  return (
    <AbsoluteFill style={{ background: C.bg, ...exitOf(f, dur) }}>
      <Glow col={HADES} y={.55} />
      <Caption f={f} eyebrow="ПОДЕЛИСЬ НАГРАДОЙ" title="Карточка для Discord и Telegram" start={6} top={190} />
      {CARDS.map((c, i) => {
        const next = CARDS[i + 1];
        const inK = i === 0 ? p(f, 10, 34) : p(f, c.at, 28);
        const outK = next ? p(f, next.at, 14, inQuart) : 0;
        if (f < c.at - 1 && i > 0) return null;
        if (outK >= 1) return null;
        const x = i === 0 ? 0 : (1 - inK) * W;
        const y = i === 0 ? (1 - inK) * 300 : 0;
        return (
          <div key={c.img} style={{ position: 'absolute', left: (W - c.w) / 2, top: 470 + (1138 - c.h) / 2 + y, width: c.w, opacity: inK * (1 - outK),
            transform: `translateX(${x - outK * W * .6}px)` }}>
            <Img src={staticFile(`img/${c.img}.png`)} style={{ width: c.w, height: c.h, borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,.6)' }} />
            <div style={{ marginTop: 34, textAlign: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 600, color: C.text }}>
              {c.name}{c.pro && <span style={{ marginLeft: 16, padding: '4px 14px', borderRadius: 12, background: 'rgba(255, 216, 74, .16)', color: '#ffd84a', fontSize: 28, fontWeight: 700 }}>PRO</span>}
            </div>
          </div>
        );
      })}
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
          {[['Бесплатно · один файл 6,5 МБ', 1000, 50, C.text, 72], ['Windows · macOS · Linux', 1080, 44, C.muted, 82],
            ['github.com/ShuraProgerMain/game-goal', 1240, 40, BRAND.t3, 92]].map(([t, top, size, color, at]) => (
            <div key={t} style={{ position: 'absolute', top, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: size, fontWeight: 500, color }}>
              <Rise text={t} f={f} start={e0 + at} step={.5} />
            </div>
          ))}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export function Trailer() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={0} durationInFrames={180}><Intro /></Sequence>
      <Sequence from={180} durationInFrames={240}><Premise /></Sequence>
      <Sequence from={420} durationInFrames={840}><WidgetStory /></Sequence>
      <Sequence from={1260} durationInFrames={300}><Cards /></Sequence>
      <Sequence from={1560} durationInFrames={300}><Finale /></Sequence>

      {/* Звуки интерфейса — те же, что в программе */}
      {[
        ['tick', 44], ['confirm', 66], ['open', 80],
        ['tick', 188], ['tick', 226], ['coin', 276], ['tick', 320],
        ['coin', 420 + 72], ['coin', 420 + 182],
        ['tick', 420 + 380], ['tick', 420 + 386], ['tick', 420 + 392], ['confirm', 420 + 470], ['coin', 420 + 482], ['open', 420 + 540],
        ['unlock', 420 + 684], ['confirm', 420 + 786], ['open', 420 + 800],
        ['open', 1270], ['tick', 1370], ['tick', 1435], ['tick', 1500],
        ['open', 1564], ['confirm', 1560 + 146],
      ].map(([n, at]) => sfx(n, at))}
    </AbsoluteFill>
  );
}
