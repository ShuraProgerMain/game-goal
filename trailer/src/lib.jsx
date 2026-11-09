// Токены и движение трейлера. Цвета — из common.css программы, кривые — из системы «Nintendo UI»:
// вход — экспонента наружу (быстрый старт, длинное торможение), уход — x⁴ и вдвое быстрее, в видео всё вдвое медленнее UI.
import React from 'react';

export const FONT = 'Rubik, "Segoe UI", system-ui, sans-serif';
export const C = {
  bg: '#08090d', glass: '#0f1016', text: '#eef0f6', muted: '#bdc2db', dim: '#7d8299', plus: '#7be3b4', minus: '#ff7a85',
  line: 'rgba(255, 255, 255, .08)', blue: '#0db8e6', red: '#f74754',
};
// Фирменные цвета и цвета обложки Hades II (их программа вычисляет сама)
export const BRAND = { g1: '#4a6beb', g2: '#ed99db', t1: '#385cf2', t2: '#8f70f2', t3: '#f294d1' };
export const HADES = { g1: '#228764', g2: '#5cb7d6', t1: '#1e7658', t2: '#25938e', t3: '#58b5d5' };
// Цвета других игр — сняты с их обложек так же, как это делает программа (контур g1/g2, плашки t1→t3)
export const GAMES = {
  terraria: { name: 'Terraria', img: 'terraria-header.jpg', poster: 'terraria-poster.jpg', price: 380,
    col: { g1: '#3f9b45', g2: '#8fd3f4', t1: '#2f7d32', t2: '#46a34c', t3: '#6fbfe8' } },
  elden: { name: 'Elden Ring', img: 'elden-header.jpg', poster: 'elden-poster.jpg', price: 3000,
    col: { g1: '#a07a2c', g2: '#f0d48a', t1: '#6e5019', t2: '#a87b2a', t3: '#d9b45c' } },
  peak: { name: 'PEAK', img: 'peak-header.jpg', poster: 'peak-header.jpg', price: 350,
    col: { g1: '#6f4fd0', g2: '#ffb36b', t1: '#5a3fb0', t2: '#8c5bd6', t3: '#ee9c55' } },
  lethal: { name: 'Lethal Company', img: 'lethal-header.jpg', poster: 'lethal-poster.jpg', price: 420,
    col: { g1: '#c01e1e', g2: '#ff8a6a', t1: '#8e1212', t2: '#c62424', t3: '#f05a3c' } },
  repo: { name: 'R.E.P.O.', img: 'repo-header.jpg', poster: 'repo-poster.jpg', price: 380,
    col: { g1: '#e0a514', g2: '#6cc4f5', t1: '#b07a08', t2: '#dba11a', t3: '#4aa8e0' } },
};
export const tile = c => `linear-gradient(120deg, ${c.t1}, ${c.t2} 55%, ${c.t3})`;

export const clamp = v => Math.min(1, Math.max(0, v));
export const outExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const inQuart = t => t ** 4;
export const smooth = t => t * t * (3 - 2 * t);
// Доля пути анимации на кадре f: начало, длительность (кадры), кривая
export const p = (f, start, dur, e = outExpo) => e(clamp((f - start) / dur));
export const mix = (a, b, t) => a + (b - a) * t;

export const nf = new Intl.NumberFormat('ru-RU');
export const rub = v => `${nf.format(Math.round(v))} ₽`;

// Текст, буквы которого поднимаются снизу с шагом step кадров (как в нижней трети Nintendo UI).
// Слова не разрываются, а длинная строка переносится между словами
export function Rise({ text, f, start = 0, step = 1.1, dist = 0.5, style }) {
  let n = 0;
  return (
    <span style={style}>
      {text.split(' ').map((word, wi) => (
        <React.Fragment key={wi}>
          {wi > 0 && ' '}
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {[...word].map((ch, i) => {
              const k = p(f, start + (n++ + wi) * step, 26);
              return <span key={i} style={{ display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * dist}em)` }}>{ch}</span>;
            })}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

// Половинки Joy-Con: замах наружу (lean, градусы) и расхождение (gap, px)
export function JoyCons({ h = 320, lean = 0, gap = 0, style }) {
  const w = h * 84 / 216, r = w * .62;
  const half = (side) => ({
    position: 'absolute', top: 0, width: w, height: h, background: side === 'l' ? C.blue : C.red,
    borderRadius: side === 'l' ? `${r}px 10px 10px ${r}px` : `10px ${r}px ${r}px 10px`,
    left: side === 'l' ? -w - 4 - gap : 4 + gap,
    transformOrigin: side === 'l' ? '100% 100%' : '0 100%',
    transform: `rotate(${side === 'l' ? -lean : lean}deg)`,
  });
  const dot = (top) => ({ position: 'absolute', left: w * .26, top, width: w * .48, height: w * .48, borderRadius: '50%', background: 'rgba(0, 0, 0, .28)' });
  return (
    <div style={{ position: 'absolute', width: 0, height: h, ...style }}>
      <div style={half('l')}><div style={dot('22%')} /></div>
      <div style={half('r')}><div style={dot('62%')} /></div>
    </div>
  );
}
