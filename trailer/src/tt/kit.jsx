// Общие детали роликов для TikTok: раскладка 9:16 с запасом под интерфейс TikTok, виджет, курсор, записи дохода,
// полка, финальная плашка. Звуки — только звуки программы (tick, open, close, confirm, coin, remove, unlock).
// Безопасная зона: сверху до 180 px — строка поиска TikTok, снизу от 1500 px — подпись и музыка, справа от 960 px
// на высоте 900–1550 — кнопки лайка и комментариев.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from 'remotion';
import { BRAND, C, FONT, HADES, JoyCons, Rise, inQuart, mix, p, rub, smooth, tile } from '../lib.jsx';
import { Widget } from '../Widget.jsx';

export const W = 1080, H = 1920, S = 2.2, WX = (W - 412 * S) / 2, WY = 600;
export const WB = WY + 208 * S;                                  // нижний край виджета
export const at = ([x, y]) => [WX + x * S, WY + y * S];          // точка виджета → кадр
export const SPOT = { plus: [377, 175], buy: [318, 78], banner: [344, 34] };

// Нажатие кнопки: 5 кадров вниз, 5 обратно
export const pressAt = (f, c) => (f >= c && f < c + 10 ? smooth(p(f, c, 5, x => x)) * (1 - p(f, c + 5, 5, x => x)) : 0);

export const Sounds = ({ list }) => list.map(([name, from, volume = 1]) => (
  <Sequence key={`${name}-${from}`} from={from} durationInFrames={90}><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
));

// Размытая обложка игры под всем роликом — «рабочий стол»
export function Backdrop({ img = 'hades-poster.jpg', k = 1 }) {
  return (
    <AbsoluteFill style={{ opacity: k }}>
      <Img src={staticFile(`img/${img}`)} style={{ position: 'absolute', inset: -120, width: W + 240, height: H + 240, objectFit: 'cover', filter: 'blur(70px) saturate(140%)', opacity: .5 }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(8,9,13,.9), rgba(8,9,13,.4) 45%, rgba(8,9,13,.92))' }} />
    </AbsoluteFill>
  );
}

// Крупная подпись. start < 0 — текст виден уже на первом кадре (хук)
export function Title({ f, text, start = 0, top = 220, size = 76, color = C.text, out = 1, accent }) {
  if (start < 0) start = -200;                                  // хук: весь текст виден с первого кадра
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top, textAlign: 'center', fontFamily: FONT, fontSize: size, fontWeight: 700, lineHeight: 1.12,
      color, opacity: out, transform: `translateY(${(1 - out) * -30}px)`, textShadow: '0 6px 24px rgba(0,0,0,.5)' }}>
      <Rise text={text} f={f} start={start} step={.9} />
      {accent && <div style={{ marginTop: 18, fontSize: size * .5, fontWeight: 600, color: C.muted }}><Rise text={accent} f={f} start={start + 10} step={.6} /></div>}
    </div>
  );
}
// Подпись, которая держится с from до to: вход как у Rise, уход за 12 кадров
export const Say = ({ f, from, to, ...rest }) => (f < from - 1 || f >= to ? null : <Title f={f} start={from} out={1 - p(f, to - 12, 12, inQuart)} {...rest} />);

export function PlacedWidget({ f, w, col = HADES, enter = 1, style }) {
  return (
    <div style={{ position: 'absolute', left: WX, top: WY, opacity: enter, transform: `translateY(${(1 - enter) * 120}px) scale(${mix(.92, 1, enter)})`,
      filter: 'drop-shadow(0 40px 60px rgba(0,0,0,.6))', ...style }}>
      <Widget f={f} w={w} col={col} scale={S} />
    </div>
  );
}

// Награда открыта внутри виджета: замах наружу 9×2 кадров, щелчок 3×2, расхождение (как в программе, вдвое медленнее)
export function unlockAt(f, u0, hold = 100) {
  const lean = f < u0 + 42 ? 7 * smooth(p(f, u0 + 24, 18, x => x)) : 7 * (1 - p(f, u0 + 42, 6, x => x));
  return {
    show: p(f, u0, 12) * (1 - p(f, u0 + hold, 16, inQuart)),
    jc: { lean, gap: 150 * p(f, u0 + 48, 50), scale: mix(.6, 1, p(f, u0, 24)) },
    glow: p(f, u0 + 48, 20) * .8, text: p(f, u0 + 70, 20),
  };
}

// Курсор мыши: путь — точки [кадр прихода, x, y], до каждой он едет 20 кадров; clicks — кадры нажатий
export function Cursor({ f, path, clicks = [], show = 1 }) {
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [t, nx, ny] = path[i];
    if (f < t - 20) break;
    const k = p(f, t - 20, 20);
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

// Запись дохода: после клика по «+» плашка выскакивает из кнопки, держится и уходит в виджет на кадре absorb
export function Entry({ f, click, absorb, amount, label, who, col = HADES }) {
  const [px, py] = at(SPOT.plus);
  const k = p(f, click + 2, 24), fly = p(f, absorb, 14, inQuart);
  if (f < click + 2 || fly >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: mix(py, WB + 50, k) - fly * 260, display: 'flex', justifyContent: 'center', zIndex: 20,
      opacity: Math.min(1, k * 2) * (1 - fly), transform: `translateX(${(1 - k) * (px - W / 2)}px) scale(${mix(.4, 1, k) * (1 - fly * .3)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 30px 16px 16px', borderRadius: 60, background: 'rgba(22, 23, 32, .96)',
        border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 44, color: C.text, boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>
        <span style={{ width: 60, height: 60, borderRadius: 30, background: tile(col), display: 'grid', placeItems: 'center' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <b style={{ color: C.plus }}>+{rub(amount)}</b><span>{label}</span>
        {who && <span style={{ padding: '6px 16px', borderRadius: 30, background: `${col.t2}33`, color: col.g2, fontSize: 32, fontWeight: 600 }}>{who}</span>}
      </div>
    </div>
  );
}
// Сколько уже зачислено: каждая запись докручивает счётчик за 50 кадров после того, как ушла в виджет
export const earnedAt = (f, base, entries) => entries.reduce((a, e) => a + e.amount * p(f, e.absorb + 12, 50), base);

// Полка под виджетом: купленная игра встаёт первой
export function Shelf({ f, start, top = WB + 70, first = 'hades-header.jpg', col = HADES }) {
  const k0 = p(f, start, 24);
  if (f < start) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, opacity: k0 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
        {[first, 'celeste.jpg', 'hollow.jpg', 'stardew.jpg'].map((img, i) => {
          const k = i === 0 ? p(f, start + 6, 28) : 1;
          return (
            <div key={img} style={{ width: 200, height: 94, borderRadius: 18, overflow: 'hidden', border: i === 0 ? `3px solid ${col.t3}` : `2px solid ${C.line}`,
              transform: `translateY(${(1 - k) * -220}px) scale(${mix(1.3, 1, k)})`, boxShadow: '0 14px 30px rgba(0,0,0,.45)' }}>
              <Img src={staticFile(`img/${img}`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, textAlign: 'center', fontFamily: FONT, fontSize: 32, color: C.dim }}>Полка</div>
    </div>
  );
}

// Тост, как в программе
export function Toast({ f, from, to, text, top = 1380 }) {
  const k = p(f, from, 20) * (1 - p(f, to - 12, 12, inQuart));
  if (f < from || f >= to) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px)`, zIndex: 30 }}>
      <div style={{ padding: '24px 40px', borderRadius: 40, background: 'rgba(22, 23, 32, .97)', border: `2px solid ${C.line}`, fontFamily: FONT, fontSize: 36, color: C.text,
        boxShadow: '0 20px 50px rgba(0,0,0,.5)' }}>{text}</div>
    </div>
  );
}

// Финальная плашка: Joy-Con щёлкают и расходятся, название, строки, «ссылка в профиле»
export function EndCard({ f, start, lines, cta = 'Ссылка в профиле', note }) {
  if (f < start) return null;
  const t = f - start, enter = p(t, 0, 30);
  const lean = t < 40 ? 7 * smooth(p(t, 22, 18, x => x)) : 7 * (1 - p(t, 40, 6, x => x));
  return (
    <AbsoluteFill style={{ background: `rgba(8, 9, 13, ${.94 * p(t, 0, 16)})`, zIndex: 40 }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% 40%, ${BRAND.t2}38, transparent 70%)`, opacity: p(t, 10, 40) }} />
      <JoyCons h={200} lean={lean} gap={330 * p(t, 46, 40)} style={{ left: W / 2, top: 560 + (1 - enter) * 400, transform: `rotate(${(1 - enter) * -16}deg)` }} />
      <div style={{ position: 'absolute', top: 580, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 100, fontWeight: 700, color: C.text }}>
        <Rise text="Game Goal" f={t} start={48} step={1.3} />
      </div>
      {lines.map((l, i) => (
        <div key={l} style={{ position: 'absolute', top: 860 + i * 72, left: 50, right: 50, textAlign: 'center', fontFamily: FONT, fontSize: i ? 38 : 46,
          fontWeight: i ? 500 : 600, color: i ? C.muted : C.text }}>
          <Rise text={l} f={t} start={60 + i * 8} step={.5} />
        </div>
      ))}
      <div style={{ position: 'absolute', top: 860 + lines.length * 72 + 50, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: p(t, 76, 20),
        transform: `scale(${mix(.8, 1, p(t, 76, 24))})` }}>
        <div style={{ padding: '22px 48px', borderRadius: 50, background: tile(BRAND), color: '#fff', fontFamily: FONT, fontSize: 42, fontWeight: 700 }}>{cta}</div>
      </div>
      {note && (
        <div style={{ position: 'absolute', top: 860 + lines.length * 72 + 190, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontSize: 36, color: C.muted,
          opacity: p(t, 92, 20) }}>{note}</div>
      )}
    </AbsoluteFill>
  );
}

// Список записей, как «Записи» в настройках программы: строки выезжают по очереди (at), свежая подсвечена (hl)
export function Ledger({ f, rows, top = WB + 40, col = HADES, show = 1 }) {
  if (show <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top, padding: '18px 22px', borderRadius: 32, background: 'rgba(18, 19, 26, .96)', border: `2px solid ${C.line}`,
      boxShadow: '0 30px 60px rgba(0,0,0,.5)', opacity: show, transform: `translateY(${(1 - show) * 40}px)`, fontFamily: FONT }}>
      <div style={{ padding: '0 8px 10px', fontSize: 26, fontWeight: 600, letterSpacing: '.16em', color: C.dim }}>ЗАПИСИ</div>
      {rows.filter(r => f >= r.at).map(r => {
        const k = p(f, r.at, 18);
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 8px', borderRadius: 18, height: 56 * k, overflow: 'hidden',
            opacity: k, background: r.hl ? `${col.t2}33` : 'transparent', boxShadow: r.hl ? `inset 0 0 0 2px ${col.t3}` : 'none' }}>
            <b style={{ minWidth: 150, fontSize: 38, color: C.plus }}>+{rub(r.amount)}</b>
            <span style={{ flex: 1, fontSize: 34, color: C.text, whiteSpace: 'nowrap' }}>{r.label}</span>
            <span style={{ fontSize: 28, color: C.dim }}>{r.when}</span>
          </div>
        );
      })}
    </div>
  );
}
