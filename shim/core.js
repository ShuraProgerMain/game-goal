// Ядро Game Goal: данные, достижения, скидки, трей, горячая клавиша. Работает в странице виджета — она живёт всё время,
// пока запущена программа, даже когда виджет скрыт. Окно настроек обращается к ядру через bridge.js.
(() => {
const T = window.__TAURI__;
const { invoke } = T.core;
const { LogicalPosition, LogicalSize } = T.dpi;
const { WebviewWindow } = T.webviewWindow;
const widget = T.window.getCurrentWindow();

const APP_NAME = 'Game Goal';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GameGoal/2.0';
// Размер окна виджета = размер карточки. Компактный вид — только прогресс
const SIZES = { full: [412, 208], compact: [336, 118] };
const EDGE = 8;  // отступ от края экрана по умолчанию
const HOTKEY = 'Control+Alt+G';
const HOUR = 36e5;
const KEEP_DAILY = 10, KEEP_RESTORE = 5;
const TABS = ['goal', 'income', 'stats', 'shelf', 'widget'];
// Без аппаратного ускорения: для пары окон оно не нужно, а GPU-процесс браузера занимает ~90 МБ
const BROWSER_ARGS = '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-gpu';

const DEFAULTS = {
  currency: '₽', target: 10000, entries: [], game: null, sound: true,
  wishlist: [], shelf: [], achievements: null, hotkey: true,
  rates: null, salesCheckedAt: 0,
  weekGoal: 0, weekGoalHit: 0, tint: true, recap: true, recapFor: 0,
  widget: { x: null, y: null, onTop: true, visible: true, compact: false },
  // Программа без установщика: что она прописывает в систему сама и для какого места exe это сделано
  system: { startMenu: true, gg: true, exe: '' },
  // Game Goal Pro: ключ и то, что из него прочитано при проверке подписи (кому и когда выдан)
  proKey: '', pro: null,
};

let env, state, tray = null, trayMenu = null, hotkeyError = '', restoredFrom = null, shown = false, quitting = false;
let readyResolve;
const ready = new Promise(r => readyResolve = r);

/* ---------- Журнал ошибок ---------- */
function log(...parts) {
  const text = parts.map(p => p instanceof Error ? (p.stack || p.message) : typeof p === 'string' ? p : JSON.stringify(p)).join(' ');
  invoke('file_append', { name: 'game-goal.log', text: `[${new Date().toISOString()}] ${text}\n` }).catch(() => {});
}
addEventListener('error', e => log('widget:', e.message, `(${e.filename}:${e.lineno})`));
addEventListener('unhandledrejection', e => log('rejection', e.reason));

/* ---------- Хранение: чтение терпит порчу, запись атомарная (в Rust) ---------- */
const read = name => invoke('file_read', { name });
function fromText(text, name) {
  const s = JSON.parse(text.replace(/^﻿/, ''));  // Блокнот сохраняет с BOM
  if (!s || typeof s !== 'object' || !Array.isArray(s.entries)) throw new Error(`${name}: нет списка доходов`);
  return { ...DEFAULTS, ...s, widget: { ...DEFAULTS.widget, ...(s.widget || {}) }, system: { ...DEFAULTS.system, ...(s.system || {}) } };
}
async function load() {
  const text = await read('data.json').catch(e => { log('чтение data.json', e); return null; });
  if (text == null) return structuredClone(DEFAULTS);
  try { return fromText(text, 'data.json'); } catch (e) {
    log('data.json не читается, копия сохранена как data.json.broken', e);
    await invoke('file_copy', { from: 'data.json', to: 'data.json.broken' }).catch(() => {});
    // Берём самую свежую целую резервную копию, а не чистый лист
    for (const b of await listBackups()) {
      try {
        const s = fromText(await read(`backups/${b.file}`), b.file);
        restoredFrom = b.date;
        log(`данные восстановлены из ${b.file}`);
        return s;
      } catch {}
    }
    return structuredClone(DEFAULTS);
  }
}
// Запись откладывается на 200 мс, чтобы серия правок легла одним разом; записи идут строго по очереди
let saveTimer = null, writing = Promise.resolve();
function writeNow() {
  clearTimeout(saveTimer); saveTimer = null;
  const text = JSON.stringify(state, null, 2);
  writing = writing.then(() => invoke('file_write', { name: 'data.json', text })).catch(e => log('сохранение', e));
  return writing;
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 200); }
function flush() { return saveTimer ? writeNow() : writing; }

/* ---------- Резервные копии: одна в день, последние 10, плюс копия перед каждым восстановлением ---------- */
const pad = n => String(n).padStart(2, '0');
const dayStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
async function listBackups() {
  const files = await invoke('file_list', { dir: 'backups' }).catch(() => []);
  return files.filter(f => /^(data|before-restore)-[\d-]+\.json$/.test(f.name))
    .map(f => ({ file: f.name, kind: f.name.startsWith('data-') ? 'daily' : 'restore', date: f.mtime }))
    .sort((a, b) => b.date - a.date);
}
async function prune() {
  const all = await listBackups();
  for (const [kind, keep] of [['daily', KEEP_DAILY], ['restore', KEEP_RESTORE]])
    for (const b of all.filter(b => b.kind === kind).slice(keep)) await invoke('file_remove', { name: `backups/${b.file}` }).catch(() => {});
}
async function backupDaily() {
  const name = `backups/data-${dayStamp()}.json`;
  try {
    if (await invoke('file_exists', { name }) || !await invoke('file_exists', { name: 'data.json' })) return;
    await invoke('file_copy', { from: 'data.json', to: name });
    await prune();
  } catch (e) { log('резервная копия', e); }
}
async function backupsInfo() {
  const out = [];
  for (const b of await listBackups()) {
    try {
      const s = fromText(await read(`backups/${b.file}`), b.file);
      out.push({ ...b, balance: Logic.balance(s), count: s.entries.length, game: s.game?.title || '' });
    } catch { out.push({ ...b, broken: true }); }
  }
  return out;
}
async function restoreBackup(file) {
  if (!(await listBackups()).some(b => b.file === file)) throw new Error('нет такой копии');
  const s = fromText(await read(`backups/${file}`), file);
  // Текущие данные сначала сохраняем: восстановление тоже можно отменить
  await flush();
  const d = new Date();
  if (await invoke('file_exists', { name: 'data.json' }))
    await invoke('file_copy', { from: 'data.json', to: `backups/before-restore-${dayStamp(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json` });
  // Место виджета и выбор поверх окон остаются текущими
  state = { ...s, widget: state.widget, achievements: s.achievements || state.achievements };
  changed();
  await prune();
  log(`восстановлено из ${file}`);
  return state;
}

// Окна получают копию данных: всем — событие state:changed, виджету — ещё и баннеры и команды
function broadcast() {
  T.event.emit('state:changed', state);
  updateTray();
}
const fire = (name, ...args) => window.Bridge.fire(name, ...args);
// Любое изменение данных: проверить достижения и цель недели, сохранить, разослать окнам
function changed() { checkAchievements(); checkWeekGoal(); save(); broadcast(); ensureColors(); }

/* ---------- Цель на неделю: один баннер в неделю, когда набрана ---------- */
function checkWeekGoal() {
  if (!(state.weekGoal > 0)) return;
  const w = Logic.weekStart(Date.now());
  if (state.weekGoalHit === w || Logic.sumSince(state, w) < state.weekGoal) return;
  state.weekGoalHit = w;
  if (shown) fire('banner', 'Цель недели', `${fmt(Logic.sumSince(state, w))} с понедельника`, true);
  else notify('Цель недели выполнена', `${fmt(Logic.sumSince(state, w))} с понедельника`, 'stats');
}

/* ---------- Итоги недели: уведомление в первый запуск с понедельника ---------- */
function weeklyRecap() {
  const W = Logic.weekStart(Date.now());
  if (state.recapFor === W) return;
  state.recapFor = W; save();
  if (state.recap === false || !state.entries.some(Logic.isIncome)) return;
  const last = state.entries.filter(e => Logic.isIncome(e) && Date.parse(e.date) >= W - Logic.WEEK && Date.parse(e.date) < W);
  const sum = last.reduce((a, e) => a + e.amount, 0);
  const by = new Map();
  for (const e of last) if (e.client) by.set(e.client, (by.get(e.client) || 0) + e.amount);
  const best = [...by].sort((a, b) => b[1] - a[1])[0];
  const fc = Logic.forecast(state);
  const parts = [sum > 0 ? `+${fmt(sum)} за неделю` : 'На прошлой неделе заказов не было'];
  if (fc && fc.done) parts.push('цель уже набрана');
  else if (fc) parts.push(`до цели ${Logic.weeksText(fc.weeks)}`);
  else parts.push(`до цели ${fmt(Math.max(0, state.target - Logic.balance(state)))}`);
  if (best && by.size > 1) parts.push(`лучший заказчик — ${best[0]}`);
  if (state.weekGoal > 0) parts.push(sum >= state.weekGoal ? 'цель недели выполнена' : `цель недели на ${Math.floor(sum / state.weekGoal * 100)}%`);
  notify('Итоги недели', parts.join(' · '), 'stats');
}

/* ---------- Цвета из обложки: два ярких оттенка для обводки и полосы виджета ---------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslHex(h, s, l) {
  const f = n => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
// Картинка уменьшается до 48 px в ширину на холсте; пиксели — RGBA
async function paletteFrom(bytes) {
  const bmp = await createImageBitmap(new Blob([bytes]));
  const width = 48, height = Math.max(1, Math.round(bmp.height * 48 / bmp.width));
  const cv = new OffscreenCanvas(width, height), ctx = cv.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const buf = ctx.getImageData(0, 0, width, height).data;
  const N = 24, bins = Array.from({ length: N }, (_, i) => ({ i, w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < width * height * 4; i += 4) {
    const r = buf[i], g = buf[i + 1], b = buf[i + 2];
    const [h, sat, l] = rgbToHsl(r, g, b);
    if (sat < .25 || l < .14 || l > .9) continue;  // серое, чёрное и белое не в счёт
    const w = sat * (1 - Math.abs(l - .5) * 1.5);
    const bin = bins[Math.floor(h * N) % N];
    bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
  }
  const ranked = bins.filter(x => x.w > 0).sort((a, b) => b.w - a.w);
  if (!ranked.length || ranked[0].w < width * height * .02) return null;  // почти бесцветная обложка
  const dist = (a, b) => Math.min(Math.abs(a - b), N - Math.abs(a - b));
  const a = ranked[0], far = ranked.find(x => dist(x.i, a.i) >= 3 && x.w > a.w * .12);
  const hsl = x => rgbToHsl(x.r / x.w, x.g / x.w, x.b / x.w);
  const A = hsl(a), B = far ? hsl(far) : [(A[0] + .1) % 1, A[1], A[2]];
  const sat = v => Math.max(.6, Math.min(.88, v));
  let mid = (A[0] + B[0]) / 2;
  if (Math.abs(A[0] - B[0]) > .5) mid = (mid + .5) % 1;
  // Яркость подбирается по светлоте, как у фирменных цветов: зелёный и жёлтый на той же
  // HSL-светлоте выглядят намного ярче синего, и белый текст на них не читается
  const fit = (h, s, lum) => {
    let l = .8;
    while (l > .2 && luminance(hslHex(h, s, l)) > lum) l -= .01;
    return hslHex(h, s, l);
  };
  const sa = sat(A[1]), sb = sat(B[1]);
  return {
    g1: fit(A[0], sa, .19), g2: fit(B[0], sb, .42),
    t1: fit(A[0], sa, .14), t2: fit(mid, (sa + sb) / 2, .24), t3: fit(B[0], sb, .4),
  };
}
let colorsBusy = '';
async function ensureColors() {
  const g = state.game;
  if (!g || !g.image || g.colorsFor === g.image || colorsBusy === g.image) return;
  const key = colorsBusy = g.image;
  let colors = null;
  for (const url of [g.image, g.fallback].filter(Boolean)) {
    try {
      const r = await T.http.fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) continue;
      colors = await paletteFrom(await r.arrayBuffer());
      break;
    } catch (e) { log(`цвета обложки «${g.title}»`, e); }
  }
  colorsBusy = '';
  if (state.game !== g || g.image !== key) return;  // награду успели сменить
  g.colors = colors; g.colorsFor = key;
  save(); broadcast();
}

/* ---------- Достижения: проверяются после каждого изменения, новые показываются на виджете ---------- */
function checkAchievements() {
  const first = !state.achievements;
  state.achievements ||= {};
  const fresh = [];
  for (const a of Logic.ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(state); } catch (e) { log(`достижение ${a.id}`, e); }
    if (!ok) continue;
    state.achievements[a.id] = new Date().toISOString();
    fresh.push({ id: a.id, title: a.title, desc: a.desc });
  }
  // В первый запуск версии с достижениями открываем заслуженное молча, без лавины баннеров
  if (first || !fresh.length) return;
  if (shown) fire('achievement', fresh);
  else notify(fresh.length === 1 ? `Достижение: ${fresh[0].title}` : `Новых достижений: ${fresh.length}`, fresh.map(a => a.title).join(', '), 'shelf');
}

// Уведомления системы. На Windows — свои, с нажатием: оно открывает нужную вкладку настроек (notify:click).
// На других системах — плагин уведомлений, нажатие там ничего не делает
async function notify(title, body, tab) {
  try { return await invoke('notify', { title, body, tab: tab || null }); } catch {}
  try {
    const N = T.notification;
    if (!await N.isPermissionGranted() && await N.requestPermission() !== 'granted') return;
    N.sendNotification({ title, body });
  } catch (e) { log('уведомление', e); }
}

/* ---------- Покупка награды: игра уходит на полку, следующая берётся из списка желаний ---------- */
function buyGame(paid) {
  const g = state.game;
  if (!g) return null;
  // Сколько заплачено: что ввёл пользователь, иначе своя цена награды
  const price = Number.isFinite(paid) && paid >= 0 ? Math.round(paid * 100) / 100 : (g.price || 0);
  const now = new Date().toISOString();
  if (price > 0) state.entries.push({ id: Date.now(), amount: -price, note: `Покупка: ${g.title}`, date: now, kind: 'purchase' });
  state.shelf.unshift({ ...g, boughtAt: now, paid: price, onSale: !!(g.sale && g.sale.percent > 0) && price < g.price });
  state.game = state.wishlist.shift() || null;
  if (state.game) state.game.chosenAt = now;
  changed();
  if (state.game) setTimeout(() => checkSales(true), 1000);
  return state.game;
}

/* ---------- Сеть: запросы идут из Rust (плагин http), без ограничений браузера на чужие сайты ---------- */
async function getJson(url) {
  const r = await T.http.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ---------- Скидки: раз в 12 часов цена текущей награды и списка желаний ---------- */
async function storePrice(g) {
  if (g.source === 'steam') {
    const id = (g.url || '').match(/\/app\/(\d+)/)?.[1];
    if (!id) return null;
    const d = await getJson(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=ru&filters=price_overview`);
    const po = d[id]?.data?.price_overview;
    if (!po) return null;
    return { percent: po.discount_percent || 0, final: po.final / 100, regular: po.initial / 100, currency: po.currency || 'RUB' };
  }
  if (g.source === 'nintendo') {
    const id = (g.url || '').match(/-(\d+)\.html/)?.[1];
    if (!id) return null;
    const p = new URLSearchParams([['q', '*'], ['fq', `fs_id:${id}`], ['wt', 'json'],
      ['fl', 'price_regular_f,price_discounted_f,price_has_discount_b,price_discount_percentage_f']]);
    const d = (await getJson('https://searching.nintendo-europe.com/en/select?' + p)).response?.docs?.[0];
    if (!d || !d.price_regular_f) return null;
    const final = d.price_has_discount_b && d.price_discounted_f ? d.price_discounted_f : d.price_regular_f;
    const percent = d.price_has_discount_b ? Math.round(d.price_discount_percentage_f || (1 - final / d.price_regular_f) * 100) : 0;
    return { percent, final, regular: d.price_regular_f, currency: 'EUR' };
  }
  return null;
}
let salesRunning = false;
async function checkSales(force) {
  if (salesRunning || (!force && Date.now() - (state.salesCheckedAt || 0) < 12 * HOUR)) return;
  salesRunning = true;
  try {
    const fmtP = v => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v);
    for (const g of [state.game, ...state.wishlist].filter(Boolean)) {
      let info = null;
      try { info = await storePrice(g); } catch (e) { log(`цена «${g.title}»`, e); continue; }
      if (!info) continue;
      const before = g.sale?.percent || 0;
      g.sale = { ...info, checkedAt: new Date().toISOString() };
      if (info.percent > 0 && info.percent !== before) {
        const cur = Logic.SYMBOLS[info.currency] || info.currency;
        notify(`Скидка −${info.percent}% на ${g.title}`,
          `${g.source === 'steam' ? 'Steam' : 'eShop'}: ${fmtP(info.final)} ${cur} вместо ${fmtP(info.regular)} ${cur}`, 'goal');
      }
    }
    state.salesCheckedAt = Date.now();
    changed();
  } finally { salesRunning = false; }
}

/* ---------- Курс ЦБ для пересчёта цен из магазинов в свою валюту ---------- */
async function updateRates(force) {
  if (!force && state.rates && Date.now() - (state.rates.fetchedAt || 0) < 12 * HOUR) return;
  try {
    const r = await T.http.fetch('https://www.cbr.ru/scripts/XML_daily.asp', { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = new TextDecoder('windows-1251').decode(await r.arrayBuffer());
    const values = { RUB: 1 };
    for (const m of xml.matchAll(/<CharCode>(\w+)<\/CharCode>\s*<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d,]+)<\/Value>/g)) {
      if (Object.values(Logic.CODES).includes(m[1])) values[m[1]] = parseFloat(m[3].replace(',', '.')) / +m[2];
    }
    const date = xml.match(/Date="([\d.]+)"/)?.[1] || '';
    state.rates = { values, date, fetchedAt: Date.now() };
    save(); broadcast();
  } catch (e) { log('курс ЦБ', e); }
}

/* ---------- Горячая клавиша: быстрый ввод дохода из любой программы ---------- */
async function setupHotkey() {
  const G = T.globalShortcut;
  try { if (await G.isRegistered(HOTKEY)) await G.unregister(HOTKEY); } catch {}
  hotkeyError = '';
  if (!state.hotkey) return;
  try {
    await G.register(HOTKEY, async e => {
      if (e.state !== 'Pressed') return;
      await setWidgetVisible(true);
      await widget.setFocus();
      fire('quick');
    });
  } catch (e) { hotkeyError = 'Ctrl+Alt+G уже занята другой программой'; log(hotkeyError, e); }
}

/* ---------- Поиск игр: Steam (рубли) и европейский Nintendo eShop (евро) ---------- */
async function searchSteam(q) {
  const url = 'https://store.steampowered.com/api/storesearch/?' + new URLSearchParams({ term: q, l: 'russian', cc: 'ru' });
  const data = await getJson(url);
  return (data.items || []).filter(it => it.type === 'app').map(it => ({
    source: 'steam',
    title: it.name,
    // Адрес картинки берём из ответа: у новых игр в пути есть хеш, без него CDN иногда не отдаёт файл
    image: it.tiny_image ? it.tiny_image.replace('capsule_231x87', 'header') : `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${it.id}/header.jpg`,
    fallback: it.tiny_image || '',
    storePrice: it.price ? (it.price.final || 0) / 100 : 0,
    storeCurrency: it.price ? it.price.currency : 'RUB',
    platform: 'Steam',
    url: `https://store.steampowered.com/app/${it.id}/`,
  }));
}
async function searchNintendo(q) {
  const p = new URLSearchParams([
    ['q', q], ['fq', 'type:GAME'], ['fq', 'system_type:nintendoswitch*'], ['rows', '18'], ['wt', 'json'],
    ['fl', 'title,image_url,image_url_h2x1_s,price_regular_f,price_discounted_f,system_names_txt,url'],
  ]);
  const data = await getJson('https://searching.nintendo-europe.com/en/select?' + p);
  return (data.response?.docs || []).filter(d => d.image_url_h2x1_s || d.image_url).map(d => ({
    source: 'nintendo',
    title: d.title,
    image: d.image_url_h2x1_s || d.image_url,
    fallback: d.image_url || '',
    storePrice: d.price_discounted_f || d.price_regular_f || 0,
    storeCurrency: 'EUR',
    platform: (d.system_names_txt || []).join(', ') || 'Nintendo Switch',
    url: d.url ? 'https://www.nintendo.com' + d.url : '',
  }));
}

/* ---------- Окна. Координаты — логические пиксели (как сохраняла и версия 1.x на Electron) ---------- */
const wsize = () => SIZES[state.widget.compact ? 'compact' : 'full'];
// Рабочая область монитора (без панели задач) в логических пикселях
function workArea(m) {
  const f = m.scaleFactor, p = m.workArea.position, s = m.workArea.size;
  return { x: p.x / f, y: p.y / f, width: s.width / f, height: s.height / f };
}
async function widgetPos() {
  const p = await widget.outerPosition(), f = await widget.scaleFactor();
  return { x: Math.round(p.x / f), y: Math.round(p.y / f) };
}
async function placeWidget(x, y) {
  const [w, h] = wsize();
  await widget.setSize(new LogicalSize(w, h));
  await widget.setPosition(new LogicalPosition(x, y));
}
// Переключение вида: если виджет в правой половине экрана, держим на месте правый край
async function setCompact(on) {
  const [ow] = wsize();
  state.widget.compact = !!on;
  const [w] = wsize();
  const { x, y } = await widgetPos();
  const m = await T.window.monitorFromPoint(x, y) || await T.window.primaryMonitor();
  const wa = workArea(m);
  const nx = x + ow / 2 > wa.x + wa.width / 2 ? x + ow - w : x;
  await placeWidget(nx, y);
  state.widget.x = nx; state.widget.y = y;
  save(); broadcast();
}
async function defaultWidgetPos() {
  const wa = workArea(await T.window.primaryMonitor());
  return { x: Math.round(wa.x + wa.width - wsize()[0] - EDGE), y: Math.round(wa.y + EDGE) };
}
async function onScreen(x, y) {
  return (await T.window.availableMonitors()).map(workArea).some(a =>
    x + 60 > a.x && x < a.x + a.width - 60 && y >= a.y - 10 && y < a.y + a.height - 60);
}
async function setWidgetVisible(on) {
  if (on) { await widget.show(); await widget.setAlwaysOnTop(!!state.widget.onTop); } else await widget.hide();
  shown = on;
  state.widget.visible = on; save(); updateTray();
}
const toggleWidget = () => setWidgetVisible(!shown);

async function openSettings(tab, card) {
  tab = TABS.includes(tab) ? tab : undefined;
  const open = await WebviewWindow.getByLabel('settings');
  if (open) {
    if (tab) T.event.emitTo('settings', 'settings:tab', tab);
    if (card) T.event.emitTo('settings', 'settings:card', card);
    await open.unminimize(); await open.show(); await open.setFocus();
    return;
  }
  // Окно — на мониторе, где сейчас курсор, по центру рабочей области
  const W = 640, H = 720;
  const c = await T.window.cursorPosition();
  const wa = workArea(await T.window.monitorFromPoint(c.x, c.y) || await T.window.primaryMonitor());
  new WebviewWindow('settings', {
    url: `settings.html?tab=${tab || 'goal'}` + (card ? `&card=${encodeURIComponent(card)}` : ''),
    x: Math.round(wa.x + (wa.width - W) / 2), y: Math.round(wa.y + Math.max(0, (wa.height - H) / 2)),
    width: W, height: H, minWidth: 560, minHeight: 560,
    decorations: false, backgroundColor: '#111218', title: `${APP_NAME} — настройки`,
    // WebView2 требует у всех окон программы одинаковые аргументы браузера — те же, что у виджета в tauri.conf.json
    additionalBrowserArgs: BROWSER_ARGS,
  }).once('tauri://error', e => log('окно настроек', e.payload));
}

/* ---------- Автозапуск. С тестовым профилем — только отметка в папке профиля, система не трогается ---------- */
async function autostartOn() {
  if (env.profile) return invoke('file_exists', { name: 'autostart-test' });
  try { return await T.autostart.isEnabled(); } catch (e) { log('автозапуск', e); return false; }
}
async function setAutostart(on) {
  try {
    if (env.profile) await (on ? invoke('file_write', { name: 'autostart-test', text: '1' }) : invoke('file_remove', { name: 'autostart-test' }));
    else await (on ? T.autostart.enable() : T.autostart.disable());
  } catch (e) { log('автозапуск', e); }
  updateTray();
  return autostartOn();
}

/* ---------- Без установщика: ярлык в «Пуске», команда gg и автозапуск ведут туда, где сейчас лежит exe ---------- */
async function ensureSystem() {
  if (env.profile) return;  // тестовый профиль систему не трогает
  try {
    const st = await invoke('integration_status');
    const moved = state.system.exe !== st.exe;
    if (state.system.startMenu && (moved || !st.start_menu)) await invoke('set_start_menu', { on: true });
    if (state.system.gg && !st.gg) await invoke('set_gg', { on: true });
    if (moved && await autostartOn()) await T.autostart.enable();  // в реестре — путь к прежнему месту
    if (moved) { state.system.exe = st.exe; save(); }
  } catch (e) { log('ярлык и команда', e); }
}
async function systemInfo() {
  const st = await invoke('integration_status');
  return { exe: st.exe, startMenu: !!state.system.startMenu, gg: !!state.system.gg, profile: env.profile };
}
async function setSystem(key, on) {
  if (!['startMenu', 'gg'].includes(key)) throw new Error(`нет настройки ${key}`);
  state.system[key] = !!on; save();
  if (!env.profile) {
    try { await invoke(key === 'startMenu' ? 'set_start_menu' : 'set_gg', { on: !!on }); }
    catch (e) { log(key, e); state.system[key] = !on; save(); }
  }
  return systemInfo();
}
// Всё, что программа прописала в систему, снимается; данные остаются. Потом программа закрывается
async function removeFromSystem() {
  state.system = { startMenu: false, gg: false, exe: '' };
  if (!env.profile) {
    for (const cmd of ['set_start_menu', 'set_gg']) await invoke(cmd, { on: false }).catch(e => log(cmd, e));
  }
  await setAutostart(false);
  await quit();
}

/* ---------- Обновления: последний выпуск на GitHub, проверка раз в 12 часов ---------- */
let update = null, updateCheckedAt = 0;
async function checkUpdate(force) {
  if (!force && Date.now() - updateCheckedAt < 12 * HOUR) return update;
  updateCheckedAt = Date.now();
  // Ручная проверка («Проверить» в настройках) должна сказать об ошибке, а не «у тебя последняя версия»
  try { update = await invoke('update_check'); } catch (e) { log('проверка обновлений', e); if (force) throw e; return update; }
  // О каждой новой версии — один раз: баннером на виджете или уведомлением
  if (update && state.updateSeen !== update.version) {
    state.updateSeen = update.version; save();
    const action = update.auto ? { label: 'Обновить', fn: installUpdate } : { label: 'Скачать', fn: () => T.opener.openUrl(update.page) };
    if (shown) fire('banner', 'Новая версия', `Game Goal ${update.version}`, false, action);
    else notify(`Доступна Game Goal ${update.version}`, 'Нажми, чтобы обновить: настройки → «Виджет» → «В системе».', 'widget');
  }
  broadcast();
  return update;
}
async function updateInfo() {
  return { current: await T.app.getVersion(), update };
}
// Данные сохраняются, exe подменяется новым, программа перезапускается сама
async function installUpdate() {
  if (!update?.auto) throw new Error('эта копия обновляется вручную');
  await flush();
  quitting = true;
  try { await invoke('update_install'); } catch (e) { quitting = false; log('обновление', e); throw e; }
}

/* ---------- Game Goal Pro: подпись ключа проверяется в Rust (pro.rs), без интернета ---------- */
async function verifyPro(key) {
  try { return await invoke('pro_verify', { key }); } catch (e) { throw new Error(String(e?.message || e)); }
}
async function activatePro(key) {
  const info = await verifyPro(String(key || ''));
  state.proKey = String(key).replace(/\s+/g, ''); state.pro = info;
  save(); broadcast();
  return info;
}
function deactivatePro() { state.proKey = ''; state.pro = null; save(); broadcast(); }

async function setOnTop(on) {
  state.widget.onTop = on; save();
  await widget.setAlwaysOnTop(on);
  broadcast();
}

/* ---------- Трей ---------- */
function fmt(v) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v) + ' ' + state.currency; }
async function buildMenu() {
  const { Menu, MenuItem, CheckMenuItem, PredefinedMenuItem } = T.menu;
  const sep = () => PredefinedMenuItem.new({ item: 'Separator' });
  return Menu.new({ items: await Promise.all([
    MenuItem.new({ text: shown ? 'Скрыть виджет' : 'Показать виджет', action: toggleWidget }),
    MenuItem.new({ text: 'Настройки…', action: () => openSettings() }),
    MenuItem.new({ text: 'Добавить доход…', action: () => openSettings('income') }),
    sep(),
    CheckMenuItem.new({ text: 'Поверх всех окон', checked: !!state.widget.onTop, action: () => setOnTop(!state.widget.onTop) }),
    CheckMenuItem.new({ text: 'Компактный вид', checked: !!state.widget.compact, action: () => setCompact(!state.widget.compact) }),
    CheckMenuItem.new({ text: 'Запускать вместе с системой', checked: await autostartOn(), action: async () => setAutostart(!await autostartOn()) }),
    sep(),
    MenuItem.new({ text: 'Выход', action: quit }),
  ]) });
}
// Меню трея пересобирается после изменений, но не чаще раза за 300 мс
let trayTimer = null;
function updateTray() { clearTimeout(trayTimer); trayTimer = setTimeout(refreshTray, 300); }
async function refreshTray() {
  if (!tray) return;
  try {
    const earned = Logic.balance(state);
    const pct = state.target > 0 ? Math.floor(Math.min(1, earned / state.target) * 100) : 0;
    await tray.setTooltip(`${APP_NAME}: ${fmt(earned)} из ${fmt(state.target)} (${pct}%)` + (state.game ? `\nНаграда: ${state.game.title}` : ''));
    const old = trayMenu;
    trayMenu = await buildMenu();
    await tray.setMenu(trayMenu);
    if (old) old.close().catch(() => {});
  } catch (e) { log('трей', e); }
}
async function createTray() {
  const bytes = new Uint8Array(await (await fetch('assets/tray.png')).arrayBuffer());
  tray = await T.tray.TrayIcon.new({
    id: 'game-goal', icon: await T.image.Image.fromBytes(bytes), showMenuOnLeftClick: false,
    action: e => { if (e.type === 'Click' && e.button === 'Left' && e.buttonState === 'Up') toggleWidget(); },
  });
  await refreshTray();
}

async function quit() {
  if (quitting) return;
  quitting = true;
  await flush();
  invoke('quit');
}

/* ---------- Команды запуска: gg, gg settings, gg add 1500 за превью ---------- */
function runCommand(args, fromSecond) {
  const [cmd, ...rest] = args.filter(a => !a.startsWith('--'));
  if (cmd === 'settings') return openSettings();
  if (cmd === 'stats') return openSettings('stats');
  if (cmd === 'add') {
    const q = Logic.parseQuick(rest.join(' '));
    if (!q) { log(`gg add: не понял сумму «${rest[0] || ''}»`); return; }
    state.entries.push({ id: Date.now(), amount: q.amount, note: q.note, client: q.client, date: new Date().toISOString() });
    setWidgetVisible(true); changed(); fire('ping');
    return;
  }
  if (!fromSecond || args.includes('--background')) return;
  // Повторный запуск без команды: показать виджет, а если он уже на виду — открыть настройки
  if (shown) openSettings(); else setWidgetVisible(true);
  fire('ping');
}

/* ---------- Команды окон: их вызывают window.api в виджете и окне настроек ---------- */
const clone = v => v == null ? v : structuredClone(v);
const api = {
  getState: () => clone(state),
  setState(patch) {
    patch = clone(patch);
    const allowed = ['currency', 'target', 'entries', 'game', 'sound', 'wishlist', 'shelf', 'weekGoal', 'tint', 'recap', 'cardMoney', 'cardStyle', 'yearStyle'];
    const newGame = patch && 'game' in patch && patch.game && patch.game.url !== state.game?.url;
    const newWish = patch && Array.isArray(patch.wishlist) && patch.wishlist.length > state.wishlist.length;
    for (const k of allowed) if (patch && k in patch) state[k] = patch[k];
    // Когда игра стала наградой — для карточки «дней от выбора до покупки»
    if (newGame) state.game.chosenAt = new Date().toISOString();
    changed();
    if (newGame || newWish) setTimeout(() => checkSales(true), 500);
    return clone(state);
  },
  async search(src, q) {
    q = String(q || '').trim().slice(0, 200);
    if (!q) return [];
    try { return src === 'nintendo' ? await searchNintendo(q) : await searchSteam(q); }
    catch (e) { log(`поиск ${src} «${q}»`, e); throw e; }
  },
  setOnTop: on => setOnTop(!!on),
  setCompact: on => setCompact(!!on),
  hideWidget: () => setWidgetVisible(false),
  showWidget: () => setWidgetVisible(true),
  async resetWidgetPos() {
    const { x, y } = await defaultWidgetPos();
    await setWidgetVisible(true);
    await placeWidget(x, y);
    state.widget.x = x; state.widget.y = y; save();
  },
  // Перетаскивание виджета вручную: позиция приходит на каждое движение мыши
  moveWidget(x, y) { if (Number.isFinite(x) && Number.isFinite(y)) widget.setPosition(new LogicalPosition(Math.round(x), Math.round(y))); },
  async moveWidgetEnd() { const { x, y } = await widgetPos(); state.widget.x = x; state.widget.y = y; save(); },
  async widgetMenu() { (await buildMenu()).popup(undefined, widget); },
  openSettings: tab => openSettings(tab),
  // Карточка покупки: окно настроек на полке и сразу диалог карточки
  openCard: boughtAt => openSettings('shelf', String(boughtAt)),
  buyGame: paid => clone(buyGame(typeof paid === 'number' ? paid : undefined)),
  listBackups: () => backupsInfo(),
  restoreBackup: file => restoreBackup(String(file)).then(clone),
  async backupNow() {
    await flush();
    await invoke('file_remove', { name: `backups/data-${dayStamp()}.json` }).catch(() => {});
    await backupDaily();
    return backupsInfo();
  },
  async refreshPrices() { await Promise.all([checkSales(true), updateRates(true)]); return clone(state); },
  getHotkey: () => ({ on: !!state.hotkey, error: hotkeyError }),
  async setHotkey(on) { state.hotkey = !!on; save(); await setupHotkey(); return { on: state.hotkey, error: hotkeyError }; },
  getAutostart: () => autostartOn(),
  setAutostart: on => setAutostart(!!on),
  openUrl(url) { if (/^https:\/\//.test(String(url))) return T.opener.openUrl(url); },
  openDataFolder: () => invoke('open_data_dir'),
  getSystem: () => systemInfo(),
  setSystem: (key, on) => setSystem(String(key), on),
  removeFromSystem: () => removeFromSystem(),
  getUpdate: () => updateInfo(),
  checkUpdate: async () => { await checkUpdate(true); return updateInfo(); },
  installUpdate: () => installUpdate(),
  activatePro: key => activatePro(key),
  deactivatePro: () => deactivatePro(),
};

/* ---------- Запуск ---------- */
async function start() {
  env = await invoke('env_info');
  state = await load();
  // Pro — только по ключу с верной подписью: отметку в data.json проверяем заново при каждом запуске
  state.pro = state.proKey ? await verifyPro(state.proKey).catch(() => null) : null;
  // Первый запуск этой версии: автозапуск включается, как раньше это делал установщик
  if (!state.autostartSet) { state.autostartSet = true; await setAutostart(true); }
  checkAchievements(); save();
  await backupDaily();
  await ensureSystem();

  let { x, y } = state.widget;
  if (x == null || !await onScreen(x, y)) ({ x, y } = await defaultWidgetPos());
  await placeWidget(x, y);
  widget.onCloseRequested(e => { if (!quitting) { e.preventDefault(); setWidgetVisible(false); } });

  // Окно настроек вызывает ядро сообщениями rpc и получает ответ rpc:reply
  await T.event.listen('rpc', async e => {
    const { id, from, method, args } = e.payload;
    let reply;
    try {
      if (!Object.hasOwn(api, method)) throw new Error(`нет команды ${method}`);
      reply = { id, result: await api[method](...(args || [])) };
    } catch (err) { reply = { id, error: String(err?.message || err) }; }
    T.event.emitTo(from, 'rpc:reply', reply);
  });
  await T.event.listen('cli', e => runCommand(e.payload || [], true));
  await T.event.listen('notify:click', e => openSettings(e.payload || undefined));
  readyResolve();

  if (state.widget.visible !== false) await setWidgetVisible(true);
  await createTray().catch(e => log('трей', e));
  await setupHotkey();
  runCommand(env.args, false);
  if (restoredFrom) setTimeout(() => notify('Данные восстановлены из копии',
    `Файл данных был повреждён, взята копия от ${new Date(restoredFrom).toLocaleDateString('ru-RU')}. Повреждённый файл: data.json.broken`, 'widget'), 3000);
  // Сеть — после показа окна: курс ЦБ и скидки раз в 12 часов, условие проверяется раз в час
  setTimeout(() => { updateRates(); checkSales(); ensureColors(); }, 5000);
  setTimeout(weeklyRecap, 15000);
  if (!env.profile) setTimeout(checkUpdate, 20000);
  setInterval(() => { updateRates(); checkSales(); backupDaily(); weeklyRecap(); if (!env.profile) checkUpdate(); }, HOUR);
}

window.Core = { ready, api };
start().catch(e => { log('запуск', e); readyResolve(); });
})();
