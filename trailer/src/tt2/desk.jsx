// Рабочий стол для роликов второй волны: всё происходит «на экране компьютера». Стол 1600×900 в своих координатах,
// камера (как зум в записи экрана) наезжает на действие; подписи и клавиши — поверх кадра. Окна — обобщённые
// (чат, поиск игры), без чужих логотипов; виджет — точная копия Game Goal.
import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from 'remotion';
import { BRAND, C, FONT, Rise, inQuart, mix, p, smooth, tile } from '../lib.jsx';
import { Widget } from '../Widget.jsx';

export const W = 1080, H = 1920, DW = 1600, DH = 900;
export const WIDGET = { x: 1150, y: 300 };                         // виджет в правом верхнем углу стола
export const wpt = ([x, y]) => [WIDGET.x + x, WIDGET.y + y];      // точка виджета → стол
export const SPOT = { plus: [377, 175], buy: [318, 78], cover: [80, 47] };

export const pressAt = (f, c) => (f >= c && f < c + 10 ? smooth(p(f, c, 5, x => x)) * (1 - p(f, c + 5, 5, x => x)) : 0);
export const typed = (f, from, text, per = 2) => text.slice(0, Math.max(0, Math.floor((f - from) / per)));

export const Sounds = ({ list }) => list.map(([name, from, volume = 1]) => (
  <Sequence key={`${name}-${from}`} from={from} durationInFrames={90}><Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} /></Sequence>
));

// Камера: ключи [{ f, x, y, s, d }] — к кадру f камера смотрит в точку стола (x, y) с масштабом s, переход d кадров
export function camAt(f, keys, shake = 0) {
  let c = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    const t = p(f, k.f, k.d || 22);
    c = { x: mix(c.x, k.x, t), y: mix(c.y, k.y, t), s: mix(c.s, k.s, t) };
  }
  const j = shake ? { x: Math.sin(f * 2.1) * shake * 9, y: Math.cos(f * 2.7) * shake * 7 } : { x: 0, y: 0 };
  return { ...c, x: c.x + j.x, y: c.y + j.y };
}

export function Camera({ cam, children }) {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, #0d1222, #1c1733 45%, #3d2236 75%, #5a3328)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: DW, height: DH, transformOrigin: '0 0',
        transform: `translate(${W / 2 - cam.x * cam.s}px, ${H / 2 - cam.y * cam.s}px) scale(${cam.s})` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

// Обои, иконки и панель задач
export function Desktop({ clock = '19:42', children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, width: DW, height: DH, borderRadius: 18, overflow: 'hidden', fontFamily: FONT,
      background: 'linear-gradient(160deg, #18213d 0%, #33285a 45%, #7c3f6b 75%, #d4775f 100%)' }}>
      <div style={{ position: 'absolute', left: -200, top: 380, width: 1200, height: 700, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(255,170,120,.35), transparent)' }} />
      <div style={{ position: 'absolute', right: -160, top: -220, width: 900, height: 700, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(110,140,255,.35), transparent)' }} />
      {[['Корзина', 40], ['Игры', 130], ['Школа', 220]].map(([n, y]) => (
        <div key={n} style={{ position: 'absolute', left: 26, top: y, width: 70, textAlign: 'center', color: '#fff', fontSize: 12, textShadow: '0 1px 3px rgba(0,0,0,.6)' }}>
          <div style={{ width: 46, height: 40, margin: '0 auto 6px', borderRadius: 8, background: n === 'Корзина' ? 'rgba(255,255,255,.25)' : '#f2c14e' }} />{n}
        </div>
      ))}
      {children}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 46, background: 'rgba(16, 17, 24, .86)', borderTop: '1px solid rgba(255,255,255,.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {['#4cc2ff', '#9aa0b4', '#f2c14e', '#6fd08c', '#e86f6f'].map((c, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 8, background: i ? `${c}` : 'transparent', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, padding: i ? 0 : 5, boxSizing: 'border-box', opacity: i ? .85 : 1 }}>
            {!i && [0, 1, 2, 3].map(q => <span key={q} style={{ background: c, borderRadius: 2 }} />)}
          </div>
        ))}
        <Img src={staticFile('img/icon.png')} style={{ width: 30, height: 30 }} />
        <div style={{ position: 'absolute', right: 18, color: '#fff', fontSize: 12, textAlign: 'right', lineHeight: 1.3 }}>{clock}<br />14.11.2026</div>
      </div>
    </div>
  );
}

// Окно с заголовком
export function Win({ x, y, w, h, title, k = 1, children, z = 2 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 12, overflow: 'hidden', background: '#16171f', zIndex: z,
      border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 24px 60px rgba(0,0,0,.55)', opacity: k, transform: `scale(${mix(.94, 1, k)})`, fontFamily: FONT, color: C.text }}>
      <div style={{ height: 34, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: C.muted, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ flex: 1 }}>{title}</span><span style={{ letterSpacing: 14, opacity: .6 }}>–▢✕</span>
      </div>
      <div style={{ position: 'absolute', top: 34, left: 0, right: 0, bottom: 0 }}>{children}</div>
    </div>
  );
}

// Чат: сообщения [{ at, me, name, text }]; черновик my = { from, text, send } печатается в поле ввода
const AV = { 'Тёма': '#e86f6f', 'Лёха': '#6fd08c', 'Дэн': '#4cc2ff' };
export function Chat({ f, x = 70, y = 230, w = 520, h = 460, title = 'пати 🎮', msgs, drafts = [] }) {
  const shown = msgs.filter(m => f >= m.at);
  const draft = drafts.find(d => f >= d.from && f < d.send);
  return (
    <Win x={x} y={y} w={w} h={h} title={title}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 62, padding: '14px 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
        {shown.map((m, i) => {
          const k = p(f, m.at, 12);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignSelf: m.me ? 'flex-end' : 'flex-start', maxWidth: '82%', opacity: k, transform: `translateY(${(1 - k) * 14}px) scale(${mix(.9, 1, k)})`,
              transformOrigin: m.me ? '100% 100%' : '0 100%' }}>
              {!m.me && <div style={{ width: 34, height: 34, borderRadius: 17, background: AV[m.name] || '#9aa0b4', flex: 'none', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>{m.name[0]}</div>}
              <div style={{ padding: '9px 14px', borderRadius: 16, background: m.me ? tile(BRAND) : '#24262f', fontSize: 17, lineHeight: 1.3 }}>
                {!m.me && <div style={{ fontSize: 12, fontWeight: 600, color: AV[m.name] || C.muted, marginBottom: 2 }}>{m.name}</div>}
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, height: 40, borderRadius: 20, background: '#24262f', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 16,
        color: draft ? C.text : C.dim }}>
        {draft ? <>{typed(f, draft.from, draft.text, 2)}<span style={{ width: 2, height: 18, marginLeft: 1, background: Math.floor(f / 15) % 2 ? C.text : 'transparent' }} /></> : 'Сообщение'}
      </div>
    </Win>
  );
}
// Сообщение уходит в чат на кадре send черновика
export const sent = (drafts) => drafts.map(d => ({ at: d.send, me: true, text: d.text }));

export function DeskWidget({ f, w, col, at = WIDGET }) {
  return (
    <div style={{ position: 'absolute', left: at.x, top: at.y, zIndex: 3, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.5))' }}>
      <Widget f={f} w={w} col={col} scale={1} />
    </div>
  );
}

// Курсор в координатах стола: путь [кадр прихода, x, y], до точки — 16 кадров
export function DeskCursor({ f, path, clicks = [], show = 1 }) {
  let x = path[0][1], y = path[0][2];
  for (let i = 1; i < path.length; i++) {
    const [t, nx, ny] = path[i];
    if (f < t - 16) break;
    const k = p(f, t - 16, 16);
    x = mix(x, nx, k); y = mix(y, ny, k);
  }
  const press = clicks.reduce((a, c) => Math.max(a, pressAt(f, c)), 0);
  const c0 = clicks.find(c => f >= c && f < c + 20);
  const r = c0 == null ? null : p(f, c0, 20);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: show, zIndex: 20 }}>
      {r != null && <div style={{ position: 'absolute', left: -22 * r, top: -22 * r, width: 44 * r, height: 44 * r, borderRadius: '50%', border: `2px solid rgba(255,255,255,${.7 * (1 - r)})` }} />}
      <svg width="26" height="26" viewBox="0 0 24 24" style={{ position: 'absolute', left: -3, top: -2, transform: `scale(${1 - press * .15})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.5))' }}>
        <path d="M4 2.5v17.2l4.6-4.4 3 6.9 3-1.3-3-6.8h6.2z" fill="#fff" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------- Поверх кадра ---------- */
// Подпись-мем сверху: белый жирный текст с обводкой, как в TikTok
export function Meme({ f, from, to, text, top = 170, size = 66 }) {
  if (f < from - 1 || f >= to) return null;
  const k = from < 0 ? 1 : p(f, from, 10), out = p(f, to - 8, 8, inQuart);
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top, textAlign: 'center', fontFamily: FONT, fontSize: size, fontWeight: 800, lineHeight: 1.12, color: '#fff',
      WebkitTextStroke: '3px #000', paintOrder: 'stroke fill', textShadow: '0 6px 20px rgba(0,0,0,.5)', zIndex: 60,
      opacity: k * (1 - out), transform: `scale(${mix(1.25, 1, k)})` }}>{text}</div>
  );
}
// Нажатые клавиши, как в записи экрана с показом клавиш
export function Keys({ f, from, keys = ['Ctrl', 'Alt', 'G'], top = 1500 }) {
  const t = f - from;
  if (t < 0 || t >= 44) return null;
  const k = p(t, 0, 10) * (1 - p(t, 34, 10, inQuart));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', gap: 16, opacity: k, zIndex: 60 }}>
      {keys.map((key, i) => (
        <div key={key} style={{ minWidth: 100, height: 100, padding: '0 26px', borderRadius: 22, background: '#1a1c26', border: '2px solid rgba(255,255,255,.14)', borderBottomWidth: 7,
          display: 'grid', placeItems: 'center', fontFamily: FONT, fontSize: 42, fontWeight: 700, color: '#fff', boxSizing: 'border-box',
          transform: `translateY(${(1 - p(t, i * 3, 12)) * 30}px) scale(${t >= i * 3 && t < 18 ? .93 : 1})` }}>{key}</div>
      ))}
    </div>
  );
}
// Карточка-склейка «2 недели спустя»
export function Later({ f, from, dur = 50, text }) {
  const t = f - from;
  if (t < 0 || t >= dur) return null;
  const k = p(t, 0, 8) * (1 - p(t, dur - 8, 8, inQuart));
  return (
    <AbsoluteFill style={{ background: `rgba(10, 8, 30, ${.92 * k})`, display: 'grid', placeItems: 'center', zIndex: 70 }}>
      <div style={{ fontFamily: FONT, fontSize: 96, fontWeight: 900, color: '#ffe14d', WebkitTextStroke: '5px #2b1a00', paintOrder: 'stroke fill', fontStyle: 'italic',
        transform: `rotate(-4deg) scale(${mix(.6, 1, p(t, 0, 14))})`, opacity: k, textAlign: 'center', lineHeight: 1.05, whiteSpace: 'pre-line' }}>{text}</div>
    </AbsoluteFill>
  );
}
// Маленькая подпись бренда в конце
export function Brand({ f, from, line = 'Game Goal — копилка на игру · бесплатно', top = 1640 }) {
  if (f < from) return null;
  const k = p(f, from, 14);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * 30}px)`, zIndex: 65 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 30px', borderRadius: 50, background: 'rgba(14, 15, 22, .92)', border: '2px solid rgba(255,255,255,.12)',
        fontFamily: FONT, fontSize: 36, fontWeight: 600, color: '#fff' }}>
        <Img src={staticFile('img/icon.png')} style={{ width: 52, height: 52 }} />{line}
      </div>
    </div>
  );
}
