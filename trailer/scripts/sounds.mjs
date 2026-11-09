// Звуки интерфейса для трейлера — те же, что Sfx в common.js (частоты, формы волны, огибающая),
// только громче: в программе они тихие, а в видео их должно быть слышно. Пишет WAV в public/sfx.
import fs from 'node:fs';
import path from 'node:path';

const RATE = 48000, GAIN = 5;
const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'public', 'sfx');
fs.mkdirSync(out, { recursive: true });

const wave = { sine: p => Math.sin(2 * Math.PI * p), triangle: p => 1 - 4 * Math.abs(Math.round(p - .25) - (p - .25)), square: p => (p % 1 < .5 ? 1 : -1) };

// tone(частота, начало, длительность, форма, громкость) — огибающая как в WebAudio: 6 мс вверх, экспонента вниз
function render(tones) {
  const len = Math.ceil(Math.max(...tones.map(t => t[1] + t[2] + .03)) * RATE);
  const buf = new Float32Array(len);
  for (const [f, at, dur, type = 'sine', g = .06] of tones) {
    const s0 = Math.floor(at * RATE), n = Math.floor((dur + .02) * RATE);
    for (let i = 0; i < n && s0 + i < len; i++) {
      const t = i / RATE;
      const env = t < .006 ? g * t / .006 : t < dur ? g * Math.pow(.0001 / g, (t - .006) / (dur - .006)) : 0;
      buf[s0 + i] += wave[type]((f * t) % 1) * env * GAIN;
    }
  }
  return buf;
}
function wav(file, buf) {
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((v, i) => data.writeInt16LE(Math.max(-1, Math.min(1, v)) * 32767 | 0, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(out, file), Buffer.concat([h, data]));
}

wav('tick.wav', render([[1700, 0, .035, 'sine', .03]]));
wav('open.wav', render([[740, 0, .06, 'triangle', .05], [1110, .05, .09, 'triangle', .05]]));
wav('confirm.wav', render([[988, 0, .07, 'triangle', .06], [1480, .065, .14, 'triangle', .06]]));
wav('coin.wav', render([[1047, 0, .06, 'square', .025], [1568, .06, .2, 'square', .025]]));
wav('unlock.wav', render([...[523, 659, 784, 1047].map((f, i) => [f, i * .085, .25, 'triangle', .06]), [1568, .34, .7, 'sine', .04]]));
console.log('sfx:', fs.readdirSync(out).join(', '));
