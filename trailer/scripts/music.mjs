// Фоновая музыка трейлера — своя, сгенерированная кодом: 120 ударов в минуту, такт — 2 с.
// Части совпадают со сценами: заставка — пэд, «Хочешь игру?» — клавиши, виджет — бас и барабаны,
// перед «Награда открыта» (18 с) — нарастание, дальше полная часть с арпеджио, в финале — аккорд на логотипе.
import path from 'node:path';
import fs from 'node:fs';
import { add, env, midi, noise, normalize, osc, track, voice, writeWav } from './synth.mjs';

const LEN = 1880 / 60;                 // длина трейлера, с
const BEAT = .5, BAR = 2;
const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'public');
fs.mkdirSync(out, { recursive: true });
const m = track(LEN);

// Аккорды по тактам: Fmaj7 – Gadd9 – Em7 – Am7, бас — их основные тоны
const CHORDS = [[53, 57, 60, 64], [55, 59, 62, 69], [52, 55, 59, 62], [57, 60, 64, 67]];
const BASS = [41, 43, 40, 45];
const chordAt = t => Math.floor(t / BAR) % 4;
const UNLOCK = 18, CARDS = 1280 / 60, FINALE = 1580 / 60, LOGO = FINALE + 156 / 60;

// Пэд: три слегка расстроенные пилы через мягкий фильтр, медленная атака
function pad(at, dur, notes, gain) {
  notes.forEach((n, k) => [-1, 0, 1].forEach(d => {
    const f = midi(n) * Math.pow(2, d * 6 / 1200);
    let y = 0;
    add(m, at, dur + .8, t => {
      y += .045 * (osc.saw(f * t) - y);
      const a = Math.min(1, t / .5) * (t > dur ? Math.max(0, 1 - (t - dur) / .8) : 1);
      return y * a;
    }, gain, (k - 1.5) * .3 + d * .2);
  }));
}
// Электропиано: основной тон и пара обертонов, затухание
function keys(at, notes, gain, decay = 1.2) {
  notes.forEach((n, k) => {
    const f = midi(n + 12);
    add(m, at, decay * 1.4, t => (osc.sine(f * t) + .25 * osc.sine(2 * f * t) + .08 * osc.sine(3 * f * t)) * env(t, .004, decay), gain, (k - 1.5) * .2);
  });
}
function bass(at, n, dur, gain) {
  const f = midi(n);
  add(m, at, dur + .1, t => (osc.triangle(f * t) * .7 + osc.sine(f * t) * .5) * env(t, .006, dur), gain);
}
function kick(at, gain) {
  const v = voice('sine', t => 48 + 110 * Math.exp(-t * 30));
  add(m, at, .35, t => v(t) * env(t, .002, .22), gain);
}
function snare(at, gain) {
  const n = noise({ lp: .5, hp: .5, seed: Math.floor(at * 100) });
  add(m, at, .25, t => (n() * .9 + osc.sine(185 * t) * .4) * env(t, .002, .12), gain);
}
function hat(at, gain, seed) {
  const n = noise({ lp: .9, hp: .95, seed });
  add(m, at, .06, t => n() * env(t, .001, .03), gain, .25);
}
function pluck(at, n, gain, pan) {
  const f = midi(n);
  add(m, at, .3, t => (osc.triangle(f * t) * .6 + osc.square(f * t) * .15) * env(t, .002, .14), gain, pan);
}

// Пэд — всю дорогу, в заставке тише
for (let b = 0; b * BAR < LEN; b++) {
  const t = b * BAR, c = CHORDS[b % 4];
  if (t >= FINALE + 2) break;
  pad(t, BAR, c, t < 3 ? .035 : .05);
}
// Клавиши — с «Хочешь игру?», синкопа: доля 1 и «и» второй
for (let t = 3; t < CARDS; t += BAR) {
  const c = CHORDS[chordAt(t)];
  keys(t, c, .05);
  keys(t + BEAT * 1.5, c.slice(1), .035, .8);
}
// Бас и барабаны — с виджета
for (let t = 7; t < FINALE; t += BEAT) {
  const beat = Math.round((t % BAR) / BEAT);        // 0..3 внутри такта
  const brk = t >= UNLOCK - 2 && t < UNLOCK;        // перед «Награда открыта» — затишье
  const full = t >= UNLOCK;
  const root = BASS[chordAt(t)];
  if (!brk) {
    if (beat === 0) bass(t, root, .7, .22);
    if (beat === 2) bass(t, root, .4, .18);
    if (beat === 3) bass(t + BEAT / 2, root + 12, .2, .12);
    if (beat === 0 || beat === 2) kick(t, .5);
    if (t >= 9 && (beat === 1 || beat === 3)) snare(t, .18);
  }
  hat(t + BEAT / 2, brk ? .03 : .06, Math.floor(t * 10));
  if (full) hat(t, .035, Math.floor(t * 10) + 1);
  // Арпеджио в полной части: шестнадцатые по нотам аккорда на две октавы выше
  if (full && t < CARDS + 5) {
    const c = CHORDS[chordAt(t)];
    for (let k = 0; k < 2; k++) pluck(t + k * BEAT / 2, c[(beat * 2 + k) % 4] + 24, .04, k ? .35 : -.35);
  }
}
// Нарастание перед «Награда открыта»: шум, у которого открывается фильтр, и восходящий тон
{
  const n = noise({ lp: .3, seed: 9 });
  let y = 0;
  add(m, UNLOCK - 2, 2, t => { const k = t / 2; const x = n(); y += (.01 + k * .4) * (x - y); return y * k * k * 1.4; }, .35);
  const v = voice('sine', t => 220 * Math.pow(2, t * 1.4));
  add(m, UNLOCK - 2, 2, t => v(t) * (t / 2) ** 2 * .3, .5);
}
// Тарелка на «Награда открыта»
{
  const n = noise({ lp: .8, hp: .9, seed: 33 });
  add(m, UNLOCK, 2.2, t => n() * env(t, .002, 1.6), .25);
  kick(UNLOCK, .6);
}
// Финал: аккорд на логотипе, звенит до конца, последние 1,2 с — затухание
pad(LOGO, LEN - LOGO, [41, 53, 57, 60, 64, 67], .06);
keys(LOGO, [53, 57, 60, 64, 67], .06, 2.4);
bass(LOGO, 29, 2.4, .25);

// Общее затухание в самом конце
const fadeFrom = Math.floor((LEN - 1.2) * 48000);
for (let i = fadeFrom; i < m.n; i++) { const k = 1 - (i - fadeFrom) / (m.n - fadeFrom); m.L[i] *= k; m.R[i] *= k; }
normalize(m, .85);
writeWav(path.join(out, 'music.wav'), m);
console.log('music.wav', LEN.toFixed(2), 's');
