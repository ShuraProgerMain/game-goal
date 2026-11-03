// Game Goal: виджет на рабочем столе, окно настроек и значок в трее.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, net, shell, globalShortcut, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Logic = require('./logic');

const APP_NAME = 'Game Goal';
const LEGACY_NAME = 'Копилка на игру';  // прежнее имя: ярлык автозапуска переименовываем
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GameGoal/1.0';
// Размер окна виджета: карточка плюс прозрачные поля под тень. Компактный вид — только прогресс
const SIZES = { full: [440, 236], compact: [360, 142] };
const ICON = path.join(__dirname, 'assets', 'icon.ico');
const HOTKEY = 'Control+Alt+G';
const AUMID = 'ShuraProger.GameGoal';
const HOUR = 36e5;

// Данные пользователя — в %APPDATA%\game-goal: переживают обновление и переустановку программы.
// GAME_GOAL_PROFILE — отдельная папка данных для проверок, настоящие данные не трогаются
const PROFILE = process.env.GAME_GOAL_PROFILE;
if (PROFILE) app.setPath('userData', PROFILE);
const USER = app.getPath('userData');
const DATA = path.join(USER, 'data.json');
const LOG = path.join(USER, 'game-goal.log');
const BACKUPS = path.join(USER, 'backups');
const KEEP_DAILY = 10, KEEP_RESTORE = 5;
const STARTUP_LNK = PROFILE ? path.join(PROFILE, 'startup-test.lnk')
  : path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${APP_NAME}.lnk`);

const DEFAULTS = {
  currency: '₽', target: 10000, entries: [], game: null, sound: true,
  wishlist: [], shelf: [], achievements: null, hotkey: true,
  rates: null, salesCheckedAt: 0,
  weekGoal: 0, weekGoalHit: 0, tint: true, recap: true, recapFor: 0,
  widget: { x: null, y: null, onTop: true, visible: true, compact: false },
};

let state, widget = null, settings = null, tray = null, quitting = false, hotkeyError = '';

/* ---------- Журнал ошибок ---------- */
function log(...parts) {
  try {
    fs.mkdirSync(USER, { recursive: true });
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > 1 << 20) fs.writeFileSync(LOG, '');
    const text = parts.map(p => p instanceof Error ? p.stack : typeof p === 'string' ? p : JSON.stringify(p)).join(' ');
    fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${text}\n`, 'utf8');
  } catch { /* журнал не должен ронять программу */ }
}
process.on('uncaughtException', e => log('uncaught', e));
process.on('unhandledRejection', e => log('rejection', e));
function watchErrors(win, name) {
  win.webContents.on('console-message', (e, level, message, line, source) => {
    const lv = e.level ?? level, msg = e.message ?? message;
    if (lv === 'error' || lv === 3) log(`${name}: ${msg} (${e.sourceId ?? source}:${e.lineNumber ?? line})`);
  });
  win.webContents.on('render-process-gone', (_e, d) => log(`${name}: renderer gone`, d));
}

/* ---------- Хранение: чтение терпит порчу, запись атомарная ---------- */
function load() {
  // Старые версии хранили данные рядом с программой: переносим один раз
  const legacy = path.join(__dirname, 'data.json');
  try {
    if (!PROFILE && !fs.existsSync(DATA) && fs.existsSync(legacy)) {
      fs.mkdirSync(USER, { recursive: true });
      fs.copyFileSync(legacy, DATA);
      fs.unlinkSync(legacy);
      log(`данные перенесены из ${legacy}`);
    }
  } catch (e) { log('перенос данных', e); }
  try {
    return fromFile(DATA);
  } catch (e) {
    if (!fs.existsSync(DATA)) return structuredClone(DEFAULTS);
    log('data.json не читается, копия сохранена как data.json.broken', e);
    try { fs.copyFileSync(DATA, DATA + '.broken'); } catch {}
    // Берём самую свежую целую резервную копию, а не чистый лист
    for (const b of listBackups()) {
      try {
        const s = fromFile(path.join(BACKUPS, b.file));
        restoredFrom = b.date;
        log(`данные восстановлены из ${b.file}`);
        return s;
      } catch {}
    }
    return structuredClone(DEFAULTS);
  }
}
function fromFile(file) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));  // Блокнот сохраняет с BOM
  if (!s || typeof s !== 'object' || !Array.isArray(s.entries)) throw new Error(`${path.basename(file)}: нет списка доходов`);
  return { ...DEFAULTS, ...s, widget: { ...DEFAULTS.widget, ...(s.widget || {}) } };
}
// Запись откладывается на 200 мс, чтобы серия правок легла одним разом; при выходе — сразу
let saveTimer = null;
function writeNow() {
  clearTimeout(saveTimer); saveTimer = null;
  try {
    fs.mkdirSync(USER, { recursive: true });
    const tmp = DATA + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, DATA);
  } catch (e) { log('сохранение', e); }
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(writeNow, 200); }
function flush() { if (saveTimer) writeNow(); }

/* ---------- Резервные копии: одна в день, последние 10, плюс копия перед каждым восстановлением ---------- */
let restoredFrom = null;
const pad = n => String(n).padStart(2, '0');
const dayStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function listBackups() {
  let files = [];
  try { files = fs.readdirSync(BACKUPS).filter(f => /^(data|before-restore)-[\d-]+\.json$/.test(f)); } catch { return []; }
  return files.map(file => ({ file, kind: file.startsWith('data-') ? 'daily' : 'restore', date: fs.statSync(path.join(BACKUPS, file)).mtimeMs }))
    .sort((a, b) => b.date - a.date);
}
function prune() {
  const all = listBackups();
  for (const [kind, keep] of [['daily', KEEP_DAILY], ['restore', KEEP_RESTORE]])
    for (const b of all.filter(b => b.kind === kind).slice(keep)) try { fs.unlinkSync(path.join(BACKUPS, b.file)); } catch {}
}
function backupDaily() {
  const file = path.join(BACKUPS, `data-${dayStamp()}.json`);
  if (fs.existsSync(file) || !fs.existsSync(DATA)) return;
  try {
    fs.mkdirSync(BACKUPS, { recursive: true });
    fs.copyFileSync(DATA, file);
    prune();
  } catch (e) { log('резервная копия', e); }
}
function backupsInfo() {
  return listBackups().map(b => {
    try {
      const s = fromFile(path.join(BACKUPS, b.file));
      return { ...b, balance: Logic.balance(s), count: s.entries.length, game: s.game?.title || '' };
    } catch { return { ...b, broken: true }; }
  });
}
function restoreBackup(file) {
  if (!listBackups().some(b => b.file === file)) throw new Error('нет такой копии');
  const s = fromFile(path.join(BACKUPS, file));
  // Текущие данные сначала сохраняем: восстановление тоже можно отменить
  flush();
  const d = new Date();
  if (fs.existsSync(DATA)) fs.copyFileSync(DATA, path.join(BACKUPS, `before-restore-${dayStamp(d)}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`));
  // Место виджета и выбор поверх окон остаются текущими
  state = { ...s, widget: state.widget, achievements: s.achievements || state.achievements };
  changed();
  prune();
  log(`восстановлено из ${file}`);
  return state;
}
function send(win, channel, ...args) { if (win && !win.isDestroyed()) win.webContents.send(channel, ...args); }
function broadcast() {
  send(widget, 'state:changed', state); send(settings, 'state:changed', state);
  updateTray();
}
// Любое изменение данных: проверить достижения и цель недели, сохранить, разослать окнам
function changed() { checkAchievements(); checkWeekGoal(); save(); broadcast(); ensureColors(); }
const widgetShown = () => widget && !widget.isDestroyed() && widget.isVisible();

/* ---------- Цель на неделю: один баннер в неделю, когда набрана ---------- */
function checkWeekGoal() {
  if (!(state.weekGoal > 0)) return;
  const w = Logic.weekStart(Date.now());
  if (state.weekGoalHit === w || Logic.sumSince(state, w) < state.weekGoal) return;
  state.weekGoalHit = w;
  if (widgetShown()) send(widget, 'widget:banner', 'Цель недели', `${fmt(Logic.sumSince(state, w))} с понедельника`, true);
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
function paletteFrom(img) {
  const small = img.resize({ width: 48, quality: 'good' });
  const { width, height } = small.getSize();
  const buf = small.toBitmap();  // BGRA
  const N = 24, bins = Array.from({ length: N }, (_, i) => ({ i, w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i < width * height * 4; i += 4) {
    const b = buf[i], g = buf[i + 1], r = buf[i + 2];
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
function luminance(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}
let colorsBusy = '';
async function ensureColors() {
  const g = state.game;
  if (!g || !g.image || g.colorsFor === g.image || colorsBusy === g.image) return;
  const key = colorsBusy = g.image;
  let colors = null;
  for (const url of [g.image, g.fallback].filter(Boolean)) {
    try {
      const r = await net.fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) continue;
      const img = nativeImage.createFromBuffer(Buffer.from(await r.arrayBuffer()));
      if (img.isEmpty()) continue;
      colors = paletteFrom(img);
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
  if (widget && !widget.isDestroyed() && widget.isVisible()) send(widget, 'achievement', fresh);
  else notify(fresh.length === 1 ? `Достижение: ${fresh[0].title}` : `Новых достижений: ${fresh.length}`, fresh.map(a => a.title).join(', '), 'shelf');
}

function notify(title, body, tab) {
  try {
    if (!Notification.isSupported()) return;
    const n = new Notification({ title, body, icon: ICON });
    n.on('click', () => openSettings(tab));
    n.show();
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
  changed();
  if (state.game) setTimeout(() => checkSales(true), 1000);
  return state.game;
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
    const r = await net.fetch('https://www.cbr.ru/scripts/XML_daily.asp', { headers: { 'User-Agent': UA } });
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
function setupHotkey() {
  globalShortcut.unregister(HOTKEY);
  hotkeyError = '';
  if (!state.hotkey) return;
  const ok = globalShortcut.register(HOTKEY, () => {
    setWidgetVisible(true);
    widget.show(); widget.focus();
    send(widget, 'widget:quick');
  });
  if (!ok) { hotkeyError = 'Ctrl+Alt+G уже занята другой программой'; log(hotkeyError); }
}

/* ---------- Поиск игр: Steam (рубли) и европейский Nintendo eShop (евро) ---------- */
async function getJson(url) {
  const r = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
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

/* ---------- Окна ---------- */
const prefs = { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true };

const wsize = () => SIZES[state.widget.compact ? 'compact' : 'full'];
// Переключение вида: если виджет в правой половине экрана, держим на месте правый край
function setCompact(on) {
  const [ow] = wsize();
  state.widget.compact = !!on;
  const [w, h] = wsize();
  if (widget && !widget.isDestroyed()) {
    const [x, y] = widget.getPosition();
    const wa = screen.getDisplayNearestPoint({ x, y }).workArea;
    const nx = x + ow / 2 > wa.x + wa.width / 2 ? x + ow - w : x;
    widget.setBounds({ x: nx, y, width: w, height: h });
    state.widget.x = nx; state.widget.y = y;
  }
  save(); broadcast();
}
function defaultWidgetPos() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - wsize()[0] - 4, y: wa.y + 4 };
}
function onScreen(x, y) {
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return x + 60 > a.x && x < a.x + a.width - 60 && y >= a.y - 10 && y < a.y + a.height - 60;
  });
}

function createWidget(show = true) {
  let { x, y, onTop } = state.widget;
  if (x == null || !onScreen(x, y)) ({ x, y } = defaultWidgetPos());
  widget = new BrowserWindow({
    x, y, width: wsize()[0], height: wsize()[1],
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, show: false,
    alwaysOnTop: onTop, title: APP_NAME, icon: ICON,
    webPreferences: prefs,
  });
  if (onTop) widget.setAlwaysOnTop(true, 'floating');
  watchErrors(widget, 'widget');
  widget.loadFile('widget.html');
  widget.once('ready-to-show', () => { if (show) widget.showInactive(); updateTray(); });
  widget.webContents.on('render-process-gone', () => { if (!quitting) { widget.destroy(); createWidget(state.widget.visible); } });
  widget.on('close', e => { if (!quitting) { e.preventDefault(); setWidgetVisible(false); } });
  widget.on('session-end', flush);  // выключение или выход из Windows: before-quit может не прийти
}
function setWidgetVisible(on) {
  if (on && (!widget || widget.isDestroyed())) createWidget(true);
  else if (widget && !widget.isDestroyed()) on ? widget.showInactive() : widget.hide();
  state.widget.visible = on; save(); updateTray();
}
function pingWidget() { if (widget && !widget.isDestroyed()) widget.webContents.send('widget:ping'); }

function openSettings(tab) {
  if (settings && !settings.isDestroyed()) {
    if (tab) settings.webContents.send('settings:tab', tab);
    if (settings.isMinimized()) settings.restore();
    settings.show(); settings.focus();
    return;
  }
  // Окно — на мониторе, где сейчас курсор, по центру рабочей области
  const W = 640, H = 720;
  const wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  settings = new BrowserWindow({
    x: Math.round(wa.x + (wa.width - W) / 2), y: Math.round(wa.y + Math.max(0, (wa.height - H) / 2)),
    width: W, height: H, minWidth: 560, minHeight: 560,
    frame: false, backgroundColor: '#111218', show: false, title: `${APP_NAME} — настройки`, icon: ICON,
    webPreferences: prefs,
  });
  watchErrors(settings, 'settings');
  settings.loadFile('settings.html', { query: { tab: tab || 'goal' } });
  settings.once('ready-to-show', () => settings.show());
  settings.on('closed', () => { settings = null; });
}

/* ---------- Уведомления Windows видны, только если у ярлыка в «Пуск» тот же AppUserModelID ----------
   ID обязательно с точкой (Компания.Программа): ярлык с ID без точки, например «GameGoal»,
   Windows молча прячет из «Пуска» и поиска */
function linkNotifications() {
  if (PROFILE) return;
  const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${APP_NAME}.lnk`);
  try {
    if (fs.existsSync(lnk) && shell.readShortcutLink(lnk).appUserModelId !== AUMID)
      shell.writeShortcutLink(lnk, 'update', { appUserModelId: AUMID });
  } catch (e) { log('ярлык для уведомлений', e); }
}

/* ---------- Автозапуск: ярлык в «Автозагрузке» с флагом --background (его же ставит установщик) ---------- */
const autostartOn = () => fs.existsSync(STARTUP_LNK);
function migrateAutostart() {
  // Ярлык автозапуска со старым именем заменяем новым, сохраняя выбор пользователя
  const legacy = path.join(path.dirname(STARTUP_LNK), `${LEGACY_NAME}.lnk`);
  if (PROFILE || !fs.existsSync(legacy)) return;
  try { fs.unlinkSync(legacy); } catch (e) { log('старый ярлык автозапуска', e); }
  if (!autostartOn()) setAutostart(true);
}
function setAutostart(on) {
  try {
    if (on) {
      shell.writeShortcutLink(STARTUP_LNK, 'replace', {
        target: process.execPath, args: `"${__dirname}" --background`, cwd: __dirname,
        icon: ICON, iconIndex: 0, description: 'Виджет прогресса заработка на игру',
      });
    } else if (fs.existsSync(STARTUP_LNK)) fs.unlinkSync(STARTUP_LNK);
  } catch (e) { log('автозапуск', e); }
  updateTray();
  return autostartOn();
}

function setOnTop(on) {
  state.widget.onTop = on; save();
  if (widget && !widget.isDestroyed()) widget.setAlwaysOnTop(on, 'floating');
  broadcast();
}
function toggleWidget() { setWidgetVisible(!(widget && !widget.isDestroyed() && widget.isVisible())); }

/* ---------- Трей ---------- */
function fmt(v) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v) + ' ' + state.currency; }
function updateTray() {
  if (!tray) return;
  const earned = Logic.balance(state);
  const pct = state.target > 0 ? Math.floor(Math.min(1, earned / state.target) * 100) : 0;
  tray.setToolTip(`${APP_NAME}: ${fmt(earned)} из ${fmt(state.target)} (${pct}%)` + (state.game ? `\nНаграда: ${state.game.title}` : ''));
  tray.setContextMenu(buildMenu());
}
function buildMenu() {
  const shown = widget && !widget.isDestroyed() && widget.isVisible();
  return Menu.buildFromTemplate([
    { label: shown ? 'Скрыть виджет' : 'Показать виджет', click: toggleWidget },
    { label: 'Настройки…', click: () => openSettings() },
    { label: 'Добавить доход…', click: () => openSettings('income') },
    { type: 'separator' },
    { label: 'Поверх всех окон', type: 'checkbox', checked: state.widget.onTop, click: m => setOnTop(m.checked) },
    { label: 'Компактный вид', type: 'checkbox', checked: !!state.widget.compact, click: m => setCompact(m.checked) },
    { label: 'Запускать вместе с Windows', type: 'checkbox', checked: autostartOn(), click: m => setAutostart(m.checked) },
    { type: 'separator' },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } },
  ]);
}

/* ---------- Команды запуска: gg, gg settings, gg add 1500 за превью ---------- */
function parseArgs(argv, cwd) {
  const here = __dirname.toLowerCase();
  const i = argv.findIndex((a, n) => n > 0 && path.resolve(cwd || process.cwd(), a).toLowerCase() === here);
  return (i >= 0 ? argv.slice(i + 1) : []).filter(a => !a.startsWith('--') || a === '--background');
}
function runCommand(args, fromSecond) {
  const [cmd, ...rest] = args.filter(a => a !== '--background');
  if (cmd === 'settings') return openSettings();
  if (cmd === 'stats') return openSettings('stats');
  if (cmd === 'add') {
    const q = Logic.parseQuick(rest.join(' '));
    if (!q) { log(`gg add: не понял сумму «${rest[0] || ''}»`); return; }
    state.entries.push({ id: Date.now(), amount: q.amount, note: q.note, client: q.client, date: new Date().toISOString() });
    setWidgetVisible(true); changed(); pingWidget();
    return;
  }
  if (!fromSecond || args.includes('--background')) return;
  // Повторный запуск без команды: показать виджет, а если он уже на виду — открыть настройки
  const shown = widget && !widget.isDestroyed() && widget.isVisible();
  if (shown) openSettings(); else setWidgetVisible(true);
  pingWidget();
}

/* ---------- IPC: только ожидаемые команды и данные ---------- */
ipcMain.handle('state:get', () => state);
ipcMain.handle('state:set', (_e, patch) => {
  const allowed = ['currency', 'target', 'entries', 'game', 'sound', 'wishlist', 'shelf', 'weekGoal', 'tint', 'recap'];
  const newGame = patch && 'game' in patch && patch.game && patch.game.url !== state.game?.url;
  const newWish = patch && Array.isArray(patch.wishlist) && patch.wishlist.length > state.wishlist.length;
  for (const k of allowed) if (patch && k in patch) state[k] = patch[k];
  changed();
  if (newGame || newWish) setTimeout(() => checkSales(true), 500);
  return state;
});
ipcMain.handle('search', async (_e, src, q) => {
  q = String(q || '').trim().slice(0, 200);
  if (!q) return [];
  try { return src === 'nintendo' ? await searchNintendo(q) : await searchSteam(q); }
  catch (e) { log(`поиск ${src} «${q}»`, e); throw e; }
});
ipcMain.handle('widget:onTop', (_e, on) => setOnTop(!!on));
ipcMain.handle('widget:compact', (_e, on) => setCompact(!!on));
ipcMain.handle('widget:hide', () => setWidgetVisible(false));
ipcMain.handle('widget:show', () => setWidgetVisible(true));
ipcMain.handle('widget:resetPos', () => {
  const { x, y } = defaultWidgetPos();
  setWidgetVisible(true);
  widget.setBounds({ x, y, width: wsize()[0], height: wsize()[1] });
  state.widget.x = x; state.widget.y = y; save();
});
// Перетаскивание виджета вручную: у области drag в Windows пропадает hover
ipcMain.on('widget:move', (_e, x, y) => {
  if (widget && !widget.isDestroyed() && Number.isFinite(x) && Number.isFinite(y))
    widget.setBounds({ x: Math.round(x), y: Math.round(y), width: wsize()[0], height: wsize()[1] });
});
ipcMain.on('widget:moveEnd', () => {
  if (!widget || widget.isDestroyed()) return;
  const [x, y] = widget.getPosition();
  state.widget.x = x; state.widget.y = y; save();
});
ipcMain.on('widget:menu', () => { if (widget && !widget.isDestroyed()) buildMenu().popup({ window: widget }); });
ipcMain.handle('settings:open', (_e, tab) => openSettings(['goal', 'income', 'stats', 'shelf', 'widget'].includes(tab) ? tab : undefined));
ipcMain.handle('game:buy', (_e, paid) => buyGame(typeof paid === 'number' ? paid : undefined));
ipcMain.handle('backups:list', () => backupsInfo());
ipcMain.handle('backups:restore', (_e, file) => restoreBackup(String(file)));
ipcMain.handle('backups:now', () => {
  flush();
  try { fs.rmSync(path.join(BACKUPS, `data-${dayStamp()}.json`), { force: true }); } catch {}
  backupDaily();
  return backupsInfo();
});
ipcMain.handle('prices:refresh', async () => { await Promise.all([checkSales(true), updateRates(true)]); return state; });
ipcMain.handle('hotkey:get', () => ({ on: !!state.hotkey, error: hotkeyError }));
ipcMain.handle('hotkey:set', (_e, on) => { state.hotkey = !!on; save(); setupHotkey(); return { on: state.hotkey, error: hotkeyError }; });
ipcMain.handle('autostart:get', () => autostartOn());
ipcMain.handle('autostart:set', (_e, on) => setAutostart(!!on));
ipcMain.handle('win:close', e => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.handle('win:minimize', e => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.handle('open:url', (_e, url) => { if (/^https:\/\//.test(String(url))) shell.openExternal(url); });
ipcMain.handle('open:data', () => shell.openPath(USER));

/* ---------- Запуск: один экземпляр, повторный передаёт команду первому ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv, cwd) => runCommand(parseArgs(argv, cwd), true));
  app.whenReady().then(() => {
    app.setAppUserModelId(AUMID);
    state = load();
    migrateAutostart();
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
    tray.on('click', toggleWidget);
    checkAchievements(); save();
    backupDaily();
    createWidget(state.widget.visible !== false);
    updateTray();
    setupHotkey();
    linkNotifications();
    runCommand(parseArgs(process.argv), false);
    if (restoredFrom) setTimeout(() => notify('Данные восстановлены из копии',
      `Файл данных был повреждён, взята копия от ${new Date(restoredFrom).toLocaleDateString('ru-RU')}. Повреждённый файл: data.json.broken`, 'widget'), 3000);
    // Сеть — после показа окна: курс ЦБ и скидки раз в 12 часов, условие проверяется раз в час
    setTimeout(() => { updateRates(); checkSales(); ensureColors(); }, 5000);
    setTimeout(weeklyRecap, 15000);
    setInterval(() => { updateRates(); checkSales(); backupDaily(); weeklyRecap(); }, HOUR);
  }).catch(e => log('запуск', e));
  // Окна прячутся в трей, приложение живёт до «Выход»
  app.on('window-all-closed', () => {});
  app.on('before-quit', () => { quitting = true; flush(); });
  app.on('will-quit', () => { flush(); globalShortcut.unregisterAll(); });
}
