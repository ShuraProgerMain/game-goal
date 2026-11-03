'use strict';
// Общее для виджета и настроек: форматирование, анимации, звук, иконки.
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_ENTER = 'cubic-bezier(.16,1,.3,1)', EASE_SCROLL = 'cubic-bezier(.25,.5,.6,1)', EASE_EXIT = 'cubic-bezier(.7,0,.84,0)';
const anim = (el, kf, o) => el.animate(kf, reduced ? { ...o, duration: 0, delay: 0 } : o);

let state = null;
const nf = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
const money = v => `${nf.format(v)} ${state.currency}`;
const signed = v => (v >= 0 ? '+' : '−') + money(Math.abs(v));
const parseNum = s => { const n = parseFloat(String(s).replace(/\s| /g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const earnedSum = () => state.entries.reduce((a, e) => a + e.amount, 0);
const isUnlocked = () => state.target > 0 && earnedSum() >= state.target;
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };

function pop(el) { if (el) anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' }); }
function shake(el) { anim(el, [0, -6, 6, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 260, easing: 'ease-out' }); el.focus(); }

// Числа доезжают до значения по той же кривой входа
const shown = {};
function countTo(el, key, to, fmt = v => nf.format(v)) {
  const from = shown[key] ?? 0; shown[key] = to;
  cancelAnimationFrame(el._raf);
  if (reduced || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 800;
  const step = now => {
    const x = Math.min(1, (now - t0) / dur), e = x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    el.textContent = fmt(x < 1 ? Math.round(from + (to - from) * e) : to);
    if (x < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

/* Звук вместо музыки: короткие синтезированные сигналы */
const Sfx = {
  ctx: null,
  tone(f, at, dur, type = 'sine', g = .06) {
    if (!state || !state.sound) return;
    try {
      this.ctx ||= new AudioContext();
      const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), v = c.createGain();
      o.type = type; o.frequency.value = f;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .006); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(v).connect(c.destination); o.start(t); o.stop(t + dur + .02);
    } catch { /* без звука */ }
  },
  tick() { this.tone(1700, 0, .035, 'sine', .03); },
  open() { this.tone(740, 0, .06, 'triangle', .05); this.tone(1110, .05, .09, 'triangle', .05); },
  close() { this.tone(1110, 0, .05, 'triangle', .045); this.tone(740, .045, .08, 'triangle', .045); },
  confirm() { this.tone(988, 0, .07, 'triangle', .06); this.tone(1480, .065, .14, 'triangle', .06); },
  coin() { this.tone(1047, 0, .06, 'square', .025); this.tone(1568, .06, .2, 'square', .025); },
  remove() { this.tone(520, 0, .07, 'triangle', .05); this.tone(390, .06, .12, 'triangle', .05); },
  unlock() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * .085, .25, 'triangle', .06)); this.tone(1568, .34, .7, 'sine', .04); },
};

document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-pad" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 7h9a5 5 0 0 1 4.9 6l-.8 4a2.6 2.6 0 0 1-4.4 1.3L14 16h-4l-2.2 2.3A2.6 2.6 0 0 1 3.4 17l-.8-4A5 5 0 0 1 7.5 7zM8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="11" r="1" fill="currentColor"/><circle cx="17.5" cy="13" r="1" fill="currentColor"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-min" viewBox="0 0 24 24"><path d="M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="i-out" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 3h6l-1 5 3.5 3.5v2H6.5v-2L10 8zM12 13.5V21"/></symbol>
  <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 2.5l1.6 2.3 2.7-.6.6 2.7 2.4 1.4-1 2.6 1 2.6-2.4 1.4-.6 2.7-2.7-.6L12 21.5l-1.6-2.3-2.7.6-.6-2.7-2.4-1.4 1-2.6-1-2.6 2.4-1.4.6-2.7 2.7.6z"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h9A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"/></symbol>
</svg>`);
