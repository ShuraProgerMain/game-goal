// Общая логика для основного процесса и окон: деньги, темп, заказчики, достижения, валюты.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DAY = 864e5, WEEK = 7 * DAY;

  const isIncome = e => e.amount > 0 && e.kind !== 'purchase';
  const balance = s => s.entries.reduce((a, e) => a + e.amount, 0);
  const incomeTotal = s => s.entries.filter(isIncome).reduce((a, e) => a + e.amount, 0);

  // Неделя с понедельника, по местному времени
  function weekStart(t) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function monthStart(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }

  function sumSince(s, from) {
    return s.entries.filter(e => isIncome(e) && Date.parse(e.date) >= from).reduce((a, e) => a + e.amount, 0);
  }

  // Доход по неделям: последние n недель, текущая — последняя
  function weekly(s, n = 12, now = Date.now()) {
    const cur = weekStart(now), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const start = cur - i * WEEK;
      const sum = s.entries.filter(e => isIncome(e) && weekStart(Date.parse(e.date)) === start).reduce((a, e) => a + e.amount, 0);
      out.push({ start, sum });
    }
    return out;
  }

  // Средний доход в неделю: с первого заработка, но не дальше 8 недель назад и не меньше одной недели
  function pace(s, now = Date.now()) {
    const inc = s.entries.filter(isIncome);
    if (!inc.length) return 0;
    const first = Math.min(...inc.map(e => Date.parse(e.date)));
    const from = Math.max(first, now - 8 * WEEK);
    const weeks = Math.max(1, (now - from) / WEEK);
    return sumSince(s, from) / weeks;
  }

  // Когда при таком темпе наберётся цель
  function forecast(s, now = Date.now()) {
    const left = s.target - balance(s);
    if (left <= 0) return { done: true };
    const p = pace(s, now);
    if (p <= 0) return null;
    const weeks = left / p;
    return { weeks, date: now + weeks * WEEK };
  }
  function weeksText(w) {
    if (w < 1) return `≈${Math.max(1, Math.round(w * 7))} дн`;
    if (w < 9) return `≈${Math.round(w)} нед`;
    return `≈${Math.round(w / 4.35)} мес`;
  }

  // Заказчики: сколько принёс каждый и когда был последний заказ
  function clients(s) {
    const map = new Map();
    for (const e of s.entries) {
      if (!isIncome(e) || !e.client) continue;
      const c = map.get(e.client) || { name: e.client, total: 0, count: 0, last: 0 };
      c.total += e.amount; c.count++; c.last = Math.max(c.last, Date.parse(e.date));
      map.set(e.client, c);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }
  // «1500 превью @Вася» → сумма, заметка, заказчик.
  // Разделитель разрядов (пробел, точка, запятая) — только перед ровно тремя цифрами:
  // «1 500» и «1.500» — это 1500, а в «1500 3 ролика» тройка остаётся в заметке. «1500р» и «1500 ₽» — тоже сумма
  function parseQuick(text) {
    const m = String(text).match(/^\s*([-−–]?)\s*(\d{1,3}(?:[\s.,]\d{3})+(?!\d)|\d+)(?:[.,](\d{1,2}))?(?![\d.,])\s*(?:(?:₽|р|руб)\.?(?=\s|$))?\s*(.*)$/i);
    if (!m) return null;
    let amount = +(m[2].replace(/\D/g, '') + (m[3] ? '.' + m[3] : ''));
    if (m[1]) amount = -amount;
    if (!Number.isFinite(amount) || amount === 0) return null;
    let note = m[4], client = '';
    note = note.replace(/(^|\s)@(\S+)/, (_, sp, c) => { client = c.replace(/_/g, ' '); return sp; }).replace(/\s{2,}/g, ' ').trim();
    return { amount, note, client };
  }

  // Недели подряд с доходом, считая до текущей (или прошлой, если в текущей ещё пусто)
  function streakWeeks(s, now = Date.now()) {
    const weeks = new Set(s.entries.filter(isIncome).map(e => weekStart(Date.parse(e.date))));
    let w = weekStart(now);
    if (!weeks.has(w)) w -= WEEK;
    let n = 0;
    while (weeks.has(w)) { n++; w -= WEEK; }
    return n;
  }

  const ACHIEVEMENTS = [
    { id: 'first', title: 'Первый заказ', desc: 'Записать первый доход', test: s => s.entries.some(isIncome) },
    { id: 'big', title: 'Крупная рыба', desc: 'Один заказ на 10 000 или больше', test: s => s.entries.some(e => isIncome(e) && e.amount >= 10000) },
    { id: 'k10', title: 'Пять цифр', desc: 'Заработать 10 000 за всё время', test: s => incomeTotal(s) >= 10000 },
    { id: 'k50', title: 'Полтинник', desc: 'Заработать 50 000 за всё время', test: s => incomeTotal(s) >= 50000 },
    { id: 'k100', title: 'Сотня', desc: 'Заработать 100 000 за всё время', test: s => incomeTotal(s) >= 100000 },
    { id: 'half', title: 'Полпути', desc: 'Набрать половину цели', test: s => s.target > 0 && balance(s) >= s.target / 2 },
    { id: 'goal', title: 'Цель!', desc: 'Набрать всю сумму цели', test: s => s.target > 0 && balance(s) >= s.target },
    { id: 'streak3', title: 'В ритме', desc: 'Доход три недели подряд', test: s => streakWeeks(s) >= 3 },
    { id: 'streak8', title: 'Марафонец', desc: 'Доход восемь недель подряд', test: s => streakWeeks(s) >= 8 },
    { id: 'orders25', title: 'Конвейер', desc: '25 записанных заказов', test: s => s.entries.filter(isIncome).length >= 25 },
    { id: 'clients3', title: 'Свои люди', desc: 'Три разных заказчика', test: s => clients(s).length >= 3 },
    { id: 'buy1', title: 'Первый трофей', desc: 'Купить игру-награду', test: s => (s.shelf || []).length >= 1 },
    { id: 'buy3', title: 'Коллекционер', desc: 'Три игры на полке', test: s => (s.shelf || []).length >= 3 },
    { id: 'sale', title: 'Охотник за скидками', desc: 'Купить награду со скидкой', test: s => (s.shelf || []).some(g => g.onSale) },
  ];

  // Валюты: курс ЦБ хранится как «рублей за 1 единицу»
  const CODES = { '₽': 'RUB', '$': 'USD', '€': 'EUR', '₸': 'KZT', '₴': 'UAH', 'Br': 'BYN' };
  const SYMBOLS = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸', UAH: '₴', BYN: 'Br' };
  function convert(amount, from, to, rates) {
    if (from === to) return amount;
    const r = rates && rates.values;
    if (!r || !r[from] || !r[to]) return null;
    return amount * r[from] / r[to];
  }

  // Цена со скидкой в своей валюте — только подсказка при покупке: игру могут купить и на картридже
  function salePrice(s, g = s.game) {
    if (!g || !(g.sale && g.sale.percent > 0)) return 0;
    const v = convert(g.sale.final, g.sale.currency, CODES[s.currency] || 'RUB', s.rates);
    return v > 0 ? Math.round(v) : 0;
  }

  return {
    DAY, WEEK, isIncome, balance, incomeTotal, weekStart, monthStart, sumSince, weekly, pace, forecast, weeksText,
    clients, parseQuick, streakWeeks, ACHIEVEMENTS, CODES, SYMBOLS, convert, salePrice,
  };
});
