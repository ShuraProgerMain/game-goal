// Звуки интерфейса для трейлера. tick, open, confirm, coin и unlock — те же, что Sfx в common.js программы
// (частоты, формы волны, огибающая), только громче. Остальные — для действий, которых в программе нет:
// пролёт, появление, клик мышью, клавиши, щелчок Joy-Con, достижение, блеск и аккорд логотипа.
import fs from 'node:fs';
import path from 'node:path';
import { add, env, midi, noise, normalize, track, voice, writeWav, osc } from './synth.mjs';

const out = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'public', 'sfx');
fs.mkdirSync(out, { recursive: true });

// tone() как в программе: 6 мс вверх, экспонента вниз до .0001
function tone(buf, f, at, dur, type = 'sine', g = .06) {
  add(buf, at, dur + .02, t => {
    const e = t < .006 ? g * t / .006 : t < dur ? g * Math.pow(.0001 / g, (t - .006) / (dur - .006)) : 0;
    return osc[type]((f * t) % 1) * e;
  });
}
function make(name, len, fill, peak = .8) {
  const b = track(len);
  fill(b);
  normalize(b, peak);
  writeWav(path.join(out, `${name}.wav`), b);
}

// Звуки программы
make('tick', .1, b => tone(b, 1700, 0, .035, 'sine', .03), .5);
make('open', .2, b => { tone(b, 740, 0, .06, 'triangle', .05); tone(b, 1110, .05, .09, 'triangle', .05); }, .6);
make('confirm', .25, b => { tone(b, 988, 0, .07, 'triangle', .06); tone(b, 1480, .065, .14, 'triangle', .06); }, .7);
make('coin', .3, b => { tone(b, 1047, 0, .06, 'square', .025); tone(b, 1568, .06, .2, 'square', .025); }, .55);
make('unlock', 1.2, b => { [523, 659, 784, 1047].forEach((f, i) => tone(b, f, i * .085, .25, 'triangle', .06)); tone(b, 1568, .34, .7, 'sine', .04); }, .8);

// Пролёт: шум, у которого открывается и закрывается фильтр
make('whoosh', .5, b => {
  const n = noise({ lp: .05, seed: 3 });
  let lp = 0, y = 0;
  add(b, 0, .5, t => { lp = .02 + .25 * Math.sin(Math.PI * Math.min(1, t / .45)); const x = n(); y += lp * (x - y); return y * Math.sin(Math.PI * Math.min(1, t / .45)) * 3; });
}, .45);
// Мягкое появление: «пузырёк» с падающей высотой
make('pop', .15, b => {
  const v = voice('sine', t => 900 - 2600 * t);
  add(b, 0, .12, t => v(t) * env(t, .004, .07));
}, .55);
// Клик мышью: короткий щелчок шума и тон
make('click', .08, b => {
  const n = noise({ lp: .6, hp: .9, seed: 7 });
  add(b, 0, .03, t => n() * env(t, .001, .012));
  add(b, 0, .05, t => osc.sine(2400 * t) * env(t, .001, .02) * .4);
}, .5);
// Клавиши: три разных по высоте нажатия, чтобы набор не звучал одинаково
[[1, 2600], [2, 3100], [3, 2200]].forEach(([i, f]) => make(`key${i}`, .08, b => {
  const n = noise({ lp: .4, hp: .7, seed: 11 + i });
  add(b, 0, .04, t => n() * env(t, .001, .015));
  add(b, 0, .05, t => osc.triangle(f * t) * env(t, .001, .018) * .25);
}, .4));
// Щелчок Joy-Con: низкий удар и защёлка
make('snap', .3, b => {
  const thump = voice('sine', t => 160 * Math.exp(-t * 25) + 55);
  add(b, 0, .25, t => thump(t) * env(t, .002, .12));
  const n = noise({ lp: .7, hp: .85, seed: 21 });
  add(b, .012, .05, t => n() * env(t, .001, .02) * .8);
}, .8);
// Смахивание карточки: короткий пролёт повыше
make('swipe', .25, b => {
  const n = noise({ lp: .3, hp: .6, seed: 5 });
  add(b, 0, .22, t => n() * Math.sin(Math.PI * t / .22) * .8);
}, .35);
// Достижение: три ноты колокольчиком (FM) вверх по мажору
make('achieve', 1, b => {
  [76, 81, 88].forEach((m, i) => {
    const f = midi(m);
    add(b, i * .09, .8, t => Math.sin(2 * Math.PI * f * t + 1.6 * Math.exp(-t * 6) * Math.sin(2 * Math.PI * f * 3.5 * t)) * env(t, .003, .5) * .5);
  });
}, .7);
// Блеск: россыпь высоких нот
make('shine', .9, b => {
  [96, 100, 103, 108, 103].forEach((m, i) => {
    const f = midi(m);
    add(b, i * .06, .5, t => osc.sine(f * t) * env(t, .002, .25) * .3, 1, i % 2 ? .4 : -.4);
  });
}, .45);
// Аккорд логотипа: мягкий Fmaj9 с колокольчиком сверху
make('logo', 2.6, b => {
  [53, 57, 60, 64, 67].forEach((m, i) => {
    const f = midi(m);
    add(b, i * .015, 2.5, t => (osc.sine(f * t) + .3 * osc.sine(2 * f * t)) * env(t, .02, 1.6) * .3, 1, (i - 2) * .25);
  });
  const f = midi(88);
  add(b, .05, 1.5, t => Math.sin(2 * Math.PI * f * t + Math.exp(-t * 5) * Math.sin(2 * Math.PI * f * 3.5 * t)) * env(t, .003, .8) * .25);
}, .75);

console.log('sfx:', fs.readdirSync(out).join(', '));
