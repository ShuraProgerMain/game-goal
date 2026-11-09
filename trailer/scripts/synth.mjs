// Маленький синтезатор для звуков и музыки трейлера: осцилляторы, шум, огибающие, простые фильтры, запись WAV.
import fs from 'node:fs';

export const RATE = 48000;

export const osc = {
  sine: p => Math.sin(2 * Math.PI * p),
  triangle: p => 1 - 4 * Math.abs(((p - .25) % 1 + 1) % 1 - .5),
  square: p => (((p % 1) + 1) % 1 < .5 ? 1 : -1),
  saw: p => 2 * (((p % 1) + 1) % 1) - 1,
};

// Осциллятор без наложения частот, как OscillatorNode в Web Audio: волна собрана из гармоник ниже 20 кГц.
// Простые osc.square/triangle на высоких нотах звенят и хрипят, поэтому звуки программы считаются через bl()
export function bl(type, f, t) {
  if (type === 'sine') return Math.sin(2 * Math.PI * f * t);
  const top = Math.floor(20000 / f);
  let v = 0;
  for (let n = 1; n <= top; n++) {
    const s = Math.sin(2 * Math.PI * n * f * t);
    if (type === 'square') { if (n % 2) v += s / n; }
    else if (type === 'triangle') { if (n % 2) v += (((n - 1) / 2) % 2 ? -1 : 1) * s / (n * n); }
    else v += (n % 2 ? 1 : -1) * s / n;
  }
  return type === 'square' ? v * 4 / Math.PI : type === 'triangle' ? v * 8 / (Math.PI * Math.PI) : v * 2 / Math.PI;
}

// Стереобуфер на len секунд
export function track(len) {
  const n = Math.ceil(len * RATE);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

// Добавить звук: fn(t) возвращает отсчёт для времени t от начала звука; pan от −1 (лево) до 1 (право)
export function add(buf, at, dur, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(at * RATE), n = Math.floor(dur * RATE);
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < n; i++) {
    const j = s0 + i;
    if (j < 0) continue;
    if (j >= buf.n) break;
    const v = fn(i / RATE);
    buf.L[j] += v * gl; buf.R[j] += v * gr;
  }
}

// Огибающая: атака, затем экспоненциальный спад к нулю за decay секунд
export const env = (t, a, decay) => (t < a ? t / a : Math.exp(-(t - a) / decay * 5));

// Шум с простым фильтром: lp — коэффициент нижних частот (0..1, меньше — глуше), hp — убрать низ
export function noise({ lp = 1, hp = 0, seed = 1 } = {}) {
  let s = seed * 9301 + 49297, y = 0, x1 = 0, h = 0;
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    const x = (s / 4294967296) * 2 - 1;
    y += lp * (x - y);                  // нижние частоты
    h = hp ? hp * (h + y - x1) : y;     // верхние частоты
    x1 = y;
    return h;
  };
}

// Нота с изменяемой частотой: freq(t) → Гц, фаза накапливается, чтобы глиссандо не щёлкало
export function voice(type, freq) {
  let phase = 0, last = 0;
  return t => { phase += freq(t) * (t - last); last = t; return osc[type](phase); };
}

export function normalize(buf, peak = .9) {
  let m = 0;
  for (let i = 0; i < buf.n; i++) m = Math.max(m, Math.abs(buf.L[i]), Math.abs(buf.R[i]));
  if (!m) return;
  const k = peak / m;
  for (let i = 0; i < buf.n; i++) { buf.L[i] *= k; buf.R[i] *= k; }
}

export function writeWav(file, buf) {
  const data = Buffer.alloc(buf.n * 4);
  for (let i = 0; i < buf.n; i++) {
    data.writeInt16LE(Math.max(-1, Math.min(1, buf.L[i])) * 32767 | 0, i * 4);
    data.writeInt16LE(Math.max(-1, Math.min(1, buf.R[i])) * 32767 | 0, i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

// Частота ноты: midi(60) — до первой октавы
export const midi = m => 440 * Math.pow(2, (m - 69) / 12);
