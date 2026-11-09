// Карточка «Награда заработана»: картинка для Discord, Telegram и т. п. Рисуется на холсте, чтобы её можно было
// скопировать и сохранить как PNG. Стили: обычная (как виджет, 1200×675), сторис (1080×1920), минимал (1200×675)
// и ретро (1200×675).
(function (root) {
  const W = 1200, H = 675, SCALE = 1.5;
  const FONT = 'Rubik, "Segoe UI", system-ui, sans-serif';
  // Пиксельный шрифт для «Ретро» (OFL, файл и лицензия в assets), рисуется по сетке 8 px
  const PIX = '"Press Start 2P", monospace';
  let pixReady = null;
  const loadPixel = () => pixReady ||= new FontFace('Press Start 2P', 'url(assets/PressStart2P-Regular.ttf)').load()
    .then(f => document.fonts.add(f)).catch(() => {});
  const BRAND = { g1: '#4a6beb', g2: '#ed99db', t1: '#385cf2', t2: '#8f70f2', t3: '#f294d1' };
  const C = { text: '#eef0f6', muted: '#bdc2db', dim: '#7d8299', plus: '#7be3b4', blue: '#0db8e6', red: '#f74754' };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };

  // Статистика покупки: от выбора награды (или прошлой покупки, или первого дохода) до самой покупки
  function stats(state, item) {
    const end = Date.parse(item.boughtAt);
    const older = (state.shelf || []).map(g => Date.parse(g.boughtAt)).filter(t => t < end).sort((a, b) => b - a)[0];
    const incomes = state.entries.filter(Logic.isIncome);
    const first = incomes.map(e => Date.parse(e.date)).sort((a, b) => a - b)[0];
    const start = Date.parse(item.chosenAt) || older || first || end;
    const inside = incomes.filter(e => { const t = Date.parse(e.date); return t >= start && t <= end; });
    return {
      days: Math.max(1, Math.ceil((end - start) / Logic.DAY)),
      orders: inside.length,
      earned: inside.reduce((a, e) => a + e.amount, 0),
      streak: Logic.streakWeeks(state, end),
      start, end, list: inside,
      achievements: achievementsIn(state, start, end),
    };
  }
  // Названия достижений, открытых за время [from, to] (дата покупки — до конца того же дня)
  function achievementsIn(state, from, to) {
    const got = state.achievements || {};
    return Logic.ACHIEVEMENTS.filter(a => { const t = Date.parse(got[a.id]); return t >= from && t <= to + Logic.DAY; }).map(a => a.title);
  }

  function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  // Перенос названия: не больше двух строк, лишнее — многоточием
  function lines(ctx, text, width, max = 2) {
    const words = text.split(/\s+/), out = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= width || !cur) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    if (out.length > max) {
      out.length = max;
      let last = out[max - 1];
      while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
      out[max - 1] = last.trimEnd() + '…';
    }
    return out;
  }
  function coverFit(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height), iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }

  // Размытая обложка на весь фон и затемнение к краям
  function blurredBg(ctx, o, w, h, cx = .75, cy = .35) {
    ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, w, h);
    if (o.cover) {
      ctx.save(); ctx.filter = 'blur(40px) saturate(150%)'; ctx.globalAlpha = .9;
      coverFit(ctx, o.cover, -60, -60, w + 120, h + 120);
      ctx.restore();
    }
    const shade = ctx.createRadialGradient(w * cx, h * cy, 0, w * cx, h * cy, Math.max(w, h) * .95);
    shade.addColorStop(0, 'rgba(8, 9, 13, .2)'); shade.addColorStop(1, 'rgba(8, 9, 13, .8)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
  }
  // Отметка «куплено»: круг с фирменным градиентом и галочкой, вокруг — тёмная обводка
  function badge(ctx, bx, by, col, r = 32) {
    ctx.beginPath(); ctx.arc(bx, by, r + 6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(13, 14, 19, .96)'; ctx.fill();
    ctx.save(); ctx.shadowColor = hexA(col.t1, .55); ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    const tile = ctx.createLinearGradient(bx - r, by - r, bx + r, by + r);
    tile.addColorStop(0, col.t1); tile.addColorStop(.55, col.t2); tile.addColorStop(1, col.t3);
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fillStyle = tile; ctx.fill();
    ctx.restore();
    const k = r / 32;
    ctx.beginPath(); ctx.moveTo(bx - 9.5 * k, by + k); ctx.lineTo(bx - 3 * k, by + 7.5 * k); ctx.lineTo(bx + 10 * k, by - 6 * k);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 1; ctx.lineCap = 'butt';
  }
  // Половинки Joy-Con перед надзаголовком
  function joycons(ctx, x, y, h = 30) {
    const w = h * 11 / 30, rr = h * 8 / 30;
    rounded(ctx, x, y, w, h, [rr, 3, 3, rr]); ctx.fillStyle = C.blue; ctx.fill();
    rounded(ctx, x + w + 3, y, w, h, [3, rr, rr, 3]); ctx.fillStyle = C.red; ctx.fill();
    return 2 * w + 3;
  }

  // Обычная — как виджет: стеклянная карточка с переливающимся контуром
  function drawClassic(ctx, o, col) {
    blurredBg(ctx, o, W, H);

    // Карточка: свечение, переливающийся контур, тёмное стекло
    const X = 44, Y = 44, CW = W - 88, CH = H - 88;
    ctx.save();
    ctx.shadowColor = hexA(col.g1, .3); ctx.shadowBlur = 90;
    rounded(ctx, X, Y, CW, CH, 40); ctx.fillStyle = '#0d0e13'; ctx.fill();
    ctx.restore();
    const ring = ctx.createConicGradient(200 * Math.PI / 180, W / 2, H / 2);
    [col.g1, col.g2, col.g1, col.g2, col.g1].forEach((c, i, a) => ring.addColorStop(i / (a.length - 1), c));
    rounded(ctx, X, Y, CW, CH, 40); ctx.fillStyle = ring; ctx.fill();
    rounded(ctx, X + 3, Y + 3, CW - 6, CH - 6, 37); ctx.fillStyle = 'rgba(13, 14, 19, .96)'; ctx.fill();

    const L = X + 57, T = Y + 53, coverW = 470, coverH = 220, R = X + CW - 57 - coverW;
    const leftW = R - 48 - L;

    // Надзаголовок с половинками Joy-Con
    joycons(ctx, L, T + 2);
    ctx.font = `600 15px ${FONT}`; ctx.letterSpacing = '3.3px'; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
    ctx.fillText('НАГРАДА ЗАРАБОТАНА', L + 39, T + 17);
    ctx.letterSpacing = '0px';

    // Название и магазин
    ctx.font = `700 66px ${FONT}`; ctx.fillStyle = C.text; ctx.textBaseline = 'alphabetic';
    const titleLines = lines(ctx, o.title, leftW);
    titleLines.forEach((s, i) => ctx.fillText(s, L, T + 105 + i * 68));
    let y = T + 105 + (titleLines.length - 1) * 68 + 30;
    ctx.font = `400 16px ${FONT}`;
    const chipW = ctx.measureText(o.platform).width + 46;
    rounded(ctx, L, y, chipW, 36, 18); ctx.fillStyle = 'rgba(255, 255, 255, .06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(L + 20, y + 18, 4, 0, Math.PI * 2); ctx.fillStyle = col.t3; ctx.fill();
    ctx.fillStyle = C.muted; ctx.textBaseline = 'middle'; ctx.fillText(o.platform, L + 33, y + 18.5);

    // Плитки статистики внизу левой колонки
    const tiles = o.stats, gap = 14, tileH = 122, tileY = Y + CH - 40 - 30 - 26 - tileH;
    const tileW = (leftW - gap * (tiles.length - 1)) / tiles.length;
    tiles.forEach((t, i) => {
      const tx = L + i * (tileW + gap);
      rounded(ctx, tx, tileY, tileW, tileH, 22); ctx.fillStyle = 'rgba(255, 255, 255, .045)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 44px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(t.n, tx + 20, tileY + 60);
      const nw = ctx.measureText(t.n).width;
      ctx.font = `600 20px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(t.u, tx + 28 + nw, tileY + 60);
      ctx.font = `400 14px ${FONT}`; ctx.fillStyle = C.dim;
      lines(ctx, t.l, tileW - 40).forEach((s, k) => ctx.fillText(s, tx + 20, tileY + 88 + k * 18));
    });

    // Обложка с отметкой «куплено»
    const cy = o.money ? T + 58 : Y + (CH - 66 - coverH) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, .5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
    rounded(ctx, R, cy, coverW, coverH, 26); ctx.fillStyle = '#16171f'; ctx.fill();
    ctx.restore();
    ctx.save(); rounded(ctx, R, cy, coverW, coverH, 26); ctx.clip();
    if (o.cover) coverFit(ctx, o.cover, R, cy, coverW, coverH);
    ctx.restore();
    rounded(ctx, R + .5, cy + .5, coverW - 1, coverH - 1, 26); ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
    badge(ctx, R + coverW + 14 - 32, cy + coverH + 14 - 32, col);

    // Заработанное — только если пользователь решил его показать
    if (o.money) {
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.plus; ctx.fillText(o.money, R, cy + coverH + 82);
      ctx.font = `400 18px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText('заработано за это время', R, cy + coverH + 112);
    }

    // Подвал: значок, название программы, дата
    const fy = Y + CH - 40 - 13;
    if (o.icon) ctx.drawImage(o.icon, L, fy - 13, 26, 26);
    ctx.textBaseline = 'middle';
    ctx.font = `600 15px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText('Game Goal', L + 37, fy);
    const gw = ctx.measureText('Game Goal').width;
    ctx.font = `400 15px ${FONT}`; ctx.fillStyle = C.dim; ctx.fillText('· копилка на игру', L + 45 + gw, fy);
    ctx.textAlign = 'right'; ctx.fillText(o.date, X + CW - 57, fy); ctx.textAlign = 'left';
  }

  // Подложка карточки как у виджета: свечение, переливающийся контур, тёмное стекло
  function frame(ctx, col, x, y, w, h, r, cx, cy) {
    ctx.save();
    ctx.shadowColor = hexA(col.g1, .3); ctx.shadowBlur = 100;
    rounded(ctx, x, y, w, h, r); ctx.fillStyle = '#0d0e13'; ctx.fill();
    ctx.restore();
    const ring = ctx.createConicGradient(200 * Math.PI / 180, cx, cy);
    [col.g1, col.g2, col.g1, col.g2, col.g1].forEach((c, i, a) => ring.addColorStop(i / (a.length - 1), c));
    rounded(ctx, x, y, w, h, r); ctx.fillStyle = ring; ctx.fill();
    rounded(ctx, x + 3, y + 3, w - 6, h - 6, r - 3); ctx.fillStyle = 'rgba(13, 14, 19, .96)'; ctx.fill();
  }
  // Обложка в рамке с тенью
  function coverBox(ctx, img, x, y, w, h, r) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, .5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
    rounded(ctx, x, y, w, h, r); ctx.fillStyle = '#16171f'; ctx.fill();
    ctx.restore();
    ctx.save(); rounded(ctx, x, y, w, h, r); ctx.clip();
    if (img) coverFit(ctx, img, x, y, w, h);
    ctx.restore();
    rounded(ctx, x + .5, y + .5, w - 1, h - 1, r); ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
  }

  // Пятиконечная звезда — значок достижения
  function star(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  // Плашки достижений: звезда в фирменном градиенте и название; переносятся не больше чем на rows строк, возвращают высоту
  function achChips(ctx, titles, x, y, maxW, size, col, rows = 1) {
    const h = Math.round(size * 2.3), pad = Math.round(size * .9), gap = Math.round(size * .55);
    let cx = x, cy = y;
    ctx.font = `600 ${size}px ${FONT}`;
    for (const t of titles) {
      const w = h + ctx.measureText(t).width + pad;
      if (cx > x && cx + w > x + maxW) {
        if (--rows < 1) break;
        cx = x; cy += h + gap;
      }
      rounded(ctx, cx, cy, w, h, h / 2); ctx.fillStyle = 'rgba(255, 255, 255, .06)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
      const g = ctx.createLinearGradient(cx, cy, cx + h, cy + h);
      g.addColorStop(0, col.t1); g.addColorStop(1, col.t3);
      ctx.beginPath(); ctx.arc(cx + h / 2, cy + h / 2, h * .34, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      star(ctx, cx + h / 2, cy + h / 2 + .5, h * .19); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = C.text; ctx.textBaseline = 'middle'; ctx.fillText(t, cx + h * .92, cy + h / 2 + 1);
      cx += w + gap;
    }
    return titles.length ? cy + h - y : 0;
  }
  // «Как копилось»: сумма заказов от выбора награды до покупки ступеньками, в конце — отметка «куплено».
  // Чисел нет — только форма, поэтому годится и со скрытыми деньгами
  function journey(ctx, s, x, y, w, h, col, label) {
    const pts = s.list.map(e => ({ t: Date.parse(e.date), a: e.amount })).sort((a, b) => a.t - b.t);
    const t0 = s.start, t1 = Math.max(s.end, t0 + Logic.DAY), total = pts.reduce((a, p) => a + p.a, 0) || 1;
    const X = t => x + Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) * w, Y = v => y + h - v / total * h * .92;
    const path = () => {
      let cum = 0;
      ctx.beginPath(); ctx.moveTo(x, y + h);
      for (const p of pts) { ctx.lineTo(X(p.t), Y(cum)); cum += p.a; ctx.lineTo(X(p.t), Y(cum)); }
      ctx.lineTo(x + w, Y(cum));
    };
    // сетка
    ctx.strokeStyle = 'rgba(255, 255, 255, .06)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); ctx.stroke(); }
    // заливка под линией
    path(); ctx.lineTo(x + w, y + h); ctx.closePath();
    const fill = ctx.createLinearGradient(0, y, 0, y + h);
    fill.addColorStop(0, hexA(col.t2, .32)); fill.addColorStop(1, hexA(col.t2, 0));
    ctx.fillStyle = fill; ctx.fill();
    // линия
    path();
    const stroke = ctx.createLinearGradient(x, 0, x + w, 0);
    stroke.addColorStop(0, col.t1); stroke.addColorStop(1, col.t3);
    ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(3, h / 60); ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 1;
    // заказы — точки на ступеньках
    let cum = 0;
    for (const p of pts) { cum += p.a; ctx.beginPath(); ctx.arc(X(p.t), Y(cum), Math.max(4, h / 45), 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }
    badge(ctx, x + w, Y(total), col, Math.max(16, h / 9));
    // даты начала и покупки
    const d = t => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
    ctx.font = `400 ${label}px ${FONT}`; ctx.fillStyle = C.dim; ctx.textBaseline = 'top';
    ctx.textAlign = 'left'; ctx.fillText(d(t0), x, y + h + label * .7);
    ctx.textAlign = 'right'; ctx.fillText(d(s.end), x + w, y + h + label * .7); ctx.textAlign = 'left';
  }
  // Доход по месяцам: столбики без чисел, самый сильный месяц — в фирменном градиенте, остальные нейтральные
  const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  function monthBars(ctx, byMonth, x, y, w, h, col, label) {
    const max = Math.max(...byMonth), best = max > 0 ? byMonth.indexOf(max) : -1;
    const gap = w * .025, bw = (w - gap * 11) / 12, ch = h - label * 1.9;
    byMonth.forEach((v, i) => {
      const bh = Math.max(4, max ? v / max * ch : 0), bx = x + i * (bw + gap), by = y + ch - bh;
      rounded(ctx, bx, by, bw, bh, [Math.min(8, bw / 3), Math.min(8, bw / 3), 3, 3]);
      if (i === best) {
        const g = ctx.createLinearGradient(0, by, 0, by + bh);
        g.addColorStop(0, col.t3); g.addColorStop(1, col.t1); ctx.fillStyle = g;
      } else ctx.fillStyle = v ? 'rgba(255, 255, 255, .16)' : 'rgba(255, 255, 255, .06)';
      ctx.fill();
      ctx.font = `${i === best ? 600 : 400} ${label}px ${FONT}`; ctx.fillStyle = i === best ? C.text : C.dim;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(MON[i], bx + bw / 2, y + ch + label * .55);
    });
    ctx.textAlign = 'left';
  }
  function sectionLabel(ctx, text, x, y, size) {
    ctx.font = `600 ${size}px ${FONT}`; ctx.fillStyle = C.muted; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, x, y);
  }

  // Сторис — вертикальная 1080×1920: постер, название, «как копилось», плитки, достижения за это время
  function drawStory(ctx, o, col) {
    const w = 1080, h = 1920, X = 60, Y = 60, CW = w - 120, CH = h - 120;
    blurredBg(ctx, o, w, h, .5, .3);
    frame(ctx, col, X, Y, CW, CH, 56, w / 2, h / 2);
    const L = X + 70, IW = CW - 140, mid = w / 2;

    ctx.font = `600 22px ${FONT}`; ctx.letterSpacing = '5px';
    const tw = ctx.measureText('НАГРАДА ЗАРАБОТАНА').width, jw = 2 * (40 * 11 / 30) + 3;
    const x0 = mid - (jw + 24 + tw) / 2;
    joycons(ctx, x0, Y + 90, 40);
    ctx.fillStyle = C.muted; ctx.textBaseline = 'middle'; ctx.fillText('НАГРАДА ЗАРАБОТАНА', x0 + jw + 24, Y + 111);
    ctx.letterSpacing = '0px';

    // Постер (вертикальный из Steam) или обычная обложка
    const cw = o.poster ? 380 : IW, ch = o.poster ? 570 : Math.round(IW * 215 / 460), cy = Y + 170, cx = mid - cw / 2;
    coverBox(ctx, o.poster || o.cover, cx, cy, cw, ch, 30);
    badge(ctx, cx + cw - 12, cy + ch - 12, col, 42);

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = `700 84px ${FONT}`; ctx.fillStyle = C.text;
    const tl = lines(ctx, o.title, IW);
    let y = cy + ch + 115;
    tl.forEach((s, i) => ctx.fillText(s, mid, y + i * 90));
    y += (tl.length - 1) * 90 + 40;
    ctx.font = `400 26px ${FONT}`;
    const chipW = ctx.measureText(o.platform).width + 64;
    rounded(ctx, mid - chipW / 2, y, chipW, 52, 26); ctx.fillStyle = 'rgba(255, 255, 255, .06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(mid - chipW / 2 + 28, y + 26, 6, 0, Math.PI * 2); ctx.fillStyle = col.t3; ctx.fill();
    ctx.fillStyle = C.muted; ctx.textBaseline = 'middle'; ctx.fillText(o.platform, mid + 10, y + 27);
    ctx.textAlign = 'left';

    // Как копилось: подпись, сумма справа (если показываем), график
    y += 130;
    sectionLabel(ctx, 'Как копилось', L, y, 28);
    if (o.money) {
      ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.plus; ctx.textAlign = 'right'; ctx.fillText(o.money, L + IW, y + 4); ctx.textAlign = 'left';
    }
    const chartH = tl.length > 1 ? 190 : 250;
    if (o.raw && o.raw.list.length) journey(ctx, o.raw, L, y + 36, IW - 30, chartH, col, 22);
    y += 36 + chartH + 70;

    // Плитки в ряд
    const n = o.stats.length, gap = 20, tw2 = (IW - gap * (n - 1)) / n, th = 150;
    o.stats.forEach((t, i) => {
      const tx = L + i * (tw2 + gap);
      rounded(ctx, tx, y, tw2, th, 28); ctx.fillStyle = 'rgba(255, 255, 255, .045)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = `700 60px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(t.n, tx + tw2 / 2, y + 76);
      ctx.font = `600 26px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(t.u + (t.short ? ` ${t.short}` : ''), tx + tw2 / 2, y + 118);
      ctx.textAlign = 'left';
    });
    y += th + 44;

    // Достижения, открытые, пока копилась эта игра
    const ach = (o.raw && o.raw.achievements || []).slice(0, 4);
    if (ach.length) achChips(ctx, ach, L, y, IW, 24, col);

    const fy = Y + CH - 64;
    ctx.textBaseline = 'middle';
    ctx.font = `600 26px ${FONT}`;
    const gw = ctx.measureText('Game Goal').width;
    ctx.font = `400 26px ${FONT}`;
    const sub = ` · копилка на игру · ${o.date}`, sw = ctx.measureText(sub).width;
    const fx = mid - (44 + 14 + gw + sw) / 2;
    if (o.icon) ctx.drawImage(o.icon, fx, fy - 22, 44, 44);
    ctx.font = `600 26px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText('Game Goal', fx + 58, fy);
    ctx.font = `400 26px ${FONT}`; ctx.fillStyle = C.dim; ctx.fillText(sub, fx + 58 + gw, fy);
  }

  // Минимал — большой арт игры на всю картинку, слева название и одна строка цифр
  function drawMinimal(ctx, o, col) {
    const w = 1200, h = 675, L = 76;
    ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, w, h);
    const art = o.hero || o.cover;
    if (art) coverFit(ctx, art, 0, 0, w, h);
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(8, 9, 13, .97)'); side.addColorStop(.42, 'rgba(8, 9, 13, .86)');
    side.addColorStop(.72, 'rgba(8, 9, 13, .25)'); side.addColorStop(1, 'rgba(8, 9, 13, 0)');
    ctx.fillStyle = side; ctx.fillRect(0, 0, w, h);
    const low = ctx.createLinearGradient(0, h * .6, 0, h);
    low.addColorStop(0, 'rgba(8, 9, 13, 0)'); low.addColorStop(1, 'rgba(8, 9, 13, .75)');
    ctx.fillStyle = low; ctx.fillRect(0, 0, w, h);

    // Полоса цвета обложки слева и надзаголовок
    const bar = ctx.createLinearGradient(0, 170, 0, 470);
    bar.addColorStop(0, col.g1); bar.addColorStop(1, col.g2);
    rounded(ctx, L - 30, 178, 6, 290, 3); ctx.fillStyle = bar; ctx.fill();
    ctx.font = `600 16px ${FONT}`; ctx.letterSpacing = '4px'; ctx.fillStyle = col.g2; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ЗАРАБОТАНО', L, 200);
    ctx.letterSpacing = '0px';

    ctx.font = `700 76px ${FONT}`; ctx.fillStyle = C.text;
    const tl = lines(ctx, o.title, 600);
    tl.forEach((s, i) => ctx.fillText(s, L, 282 + i * 80));
    let y = 282 + (tl.length - 1) * 80 + 62;
    ctx.font = `400 24px ${FONT}`; ctx.fillStyle = C.muted;
    ctx.fillText(o.stats.map(t => `${t.n} ${t.u}` + (t.short ? ` ${t.short}` : '')).join('  ·  '), L, y);
    if (o.money) {
      y += 52;
      ctx.font = `700 32px ${FONT}`; ctx.fillStyle = C.plus; ctx.fillText(o.money, L, y);
      const mw = ctx.measureText(o.money).width;
      ctx.font = `400 22px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText('за это время', L + mw + 14, y);
    }

    const fy = h - 58;
    ctx.textBaseline = 'middle';
    if (o.icon) ctx.drawImage(o.icon, L, fy - 12, 24, 24);
    ctx.font = `600 15px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText('Game Goal', L + 34, fy);
    const gw = ctx.measureText('Game Goal').width;
    ctx.font = `400 15px ${FONT}`; ctx.fillStyle = C.dim; ctx.fillText(`· ${o.date}`, L + 42 + gw, fy);
  }

  // Пиксельный текст: шрифт рисуется в родном размере 8 px без сглаживания и увеличивается блоками по px.
  // Символов, которых в шрифте нет, — заменяем. Возвращает ширину в логических пикселях
  const pixSafe = t => t.replace(/[\u00a0\u202f]/g, ' ').replace(/₽/g, 'РУБ').replace(/[«»]/g, '"');
  function pixelText(ctx, text, x, y, { px = 4, color = '#fff', align = 'left', shadow = null } = {}) {
    text = pixSafe(text);
    const m = new OffscreenCanvas(1, 1).getContext('2d');
    m.font = `8px ${PIX}`;
    const w = Math.ceil(m.measureText(text).width) + 2, h = 10;
    const c = new OffscreenCanvas(w, h), g = c.getContext('2d');
    g.font = m.font; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(text, 1, 1);  // порог ниже — края без полутонов
    const d = g.getImageData(0, 0, w, h), [r, gg, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (let i = 0; i < d.data.length; i += 4) {
      const on = d.data[i + 3] > 110;
      d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b; d.data[i + 3] = on ? 255 : 0;
    }
    g.putImageData(d, 0, 0);
    const W2 = w * px, x0 = align === 'center' ? x - W2 / 2 : align === 'right' ? x - W2 : x;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (shadow) {  // тень на один «пиксель» вниз и вправо, как в старых играх
      const sc = new OffscreenCanvas(w, h), sg = sc.getContext('2d');
      sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = shadow; sg.fillRect(0, 0, w, h);
      ctx.drawImage(sc, x0 + px, y + px, W2, h * px);
    }
    ctx.drawImage(c, x0, y, W2, h * px);
    ctx.restore();
    return W2;
  }
  // Рамка из «пикселей»: ступенчатые углы, светлая кромка сверху-слева и тёмная снизу-справа
  function pixelBox(ctx, x, y, w, h, p, fill, light, dark) {
    ctx.fillStyle = dark; ctx.fillRect(x + p, y + p, w - p, h - p);
    ctx.fillStyle = light; ctx.fillRect(x, y + p, w - p, h - 2 * p); ctx.fillRect(x + p, y, w - 2 * p, h - p);
    ctx.fillStyle = fill; ctx.fillRect(x + p, y + p, w - 2 * p, h - 2 * p);
  }
  // Монетка 8×8 по сетке
  function coin(ctx, x, y, p) {
    const rows = ['..####..', '.#yyyy#.', '#yy##yy#', '#y#yy#y#', '#y#yy#y#', '#yy##yy#', '.#yyyy#.', '..####..'];
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === '#' ? '#b8860b' : '#ffd84a'; ctx.fillRect(x + i * p, y + j * p, p, p);
    }));
  }

  // Ретро — в духе приставок 8–16 бит: пиксельная обложка, пиксельный шрифт, диалоговое окно, полосы кинескопа
  function drawRetro(ctx, o, col) {
    const w = 1200, h = 675, P = 4, gold = '#ffd84a', ink = '#f4f4f8', dim = '#8a90b8', bg = '#0b0d1a';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // Экран в рамке цвета обложки
    pixelBox(ctx, 28, 28, w - 56, h - 56, 8, '#11152b', col.g2, col.g1);

    // Обложка, огрублённая до крупных пикселей и урезанной палитры
    const cw = 432, ch = 204, cx = 76, cy = 98;
    ctx.fillStyle = '#000'; ctx.fillRect(cx + 10, cy + 10, cw, ch);
    if (o.cover) {
      const sw = cw / P / 2, sh = ch / P / 2, small = new OffscreenCanvas(sw, sh), sg = small.getContext('2d');
      coverFit(sg, o.cover, 0, 0, sw, sh);
      const d = sg.getImageData(0, 0, sw, sh);
      for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(d.data[i + k] / 51) * 51;
      sg.putImageData(d, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(small, cx, cy, cw, ch); ctx.restore();
    }
    ctx.strokeStyle = ink; ctx.lineWidth = P; ctx.strokeRect(cx - P / 2, cy - P / 2, cw + P, ch + P);

    // Счёт: заработанное за это время
    if (o.money) {
      coin(ctx, cx, cy + ch + 46, 5);
      pixelText(ctx, 'СЧЁТ', cx + 58, cy + ch + 40, { px: 3, color: dim });
      pixelText(ctx, o.money, cx + 58, cy + ch + 70, { px: 4, color: gold, shadow: '#5a3d00' });
    }

    // Справа: надзаголовок, название, диалоговое окно со статистикой
    const R = cx + cw + 60, RW = w - 76 - R;
    pixelText(ctx, 'НАГРАДА ПОЛУЧЕНА', R, 98, { px: 3, color: gold });
    let y = 140;
    // Название: самый крупный размер букв, при котором оно влезает в две строки
    const m = new OffscreenCanvas(1, 1).getContext('2d'); m.font = `8px ${PIX}`;
    let tl = [], tp = 6;
    for (tp of [6, 5, 4, 3]) {
      tl = []; let cur = '';
      for (const wd of pixSafe(o.title.toUpperCase()).split(/\s+/)) {
        const next = cur ? `${cur} ${wd}` : wd;
        if (m.measureText(next).width * tp <= RW || !cur) cur = next; else { tl.push(cur); cur = wd; }
      }
      if (cur) tl.push(cur);
      if (tl.length <= 2 && tl.every(t => m.measureText(t).width * tp <= RW)) break;
    }
    const lh = tp * 11;
    tl.slice(0, 2).forEach((t, i) => pixelText(ctx, t, R, y + i * lh, { px: tp, color: ink, shadow: col.g1 }));
    y += Math.min(tl.length, 2) * lh + 22;
    pixelText(ctx, o.platform.toUpperCase(), R, y, { px: 3, color: dim });

    const bx = R, by = 352, bw = RW, bh = 196;
    pixelBox(ctx, bx, by, bw, bh, 6, '#05060d', ink, '#9aa0c8');
    o.stats.forEach((t, i) => {
      const ry = by + 30 + i * 52;
      pixelText(ctx, '>', bx + 26, ry, { px: 3, color: gold });
      pixelText(ctx, (t.u + (t.short ? ' ' + t.short : '')).toUpperCase(), bx + 62, ry, { px: 3, color: ink });
      pixelText(ctx, t.n, bx + bw - 30, ry - 6, { px: 4, color: gold, align: 'right' });
    });

    // Подвал
    pixelText(ctx, 'GAME GOAL', 76, h - 104, { px: 3, color: col.g2 });
    pixelText(ctx, o.date.toUpperCase(), w - 76, h - 104, { px: 3, color: dim, align: 'right' });

    // Полосы кинескопа и затемнение углов экрана
    ctx.fillStyle = 'rgba(0, 0, 0, .13)';
    for (let sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, w * .75);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)'); vig.addColorStop(1, 'rgba(0, 0, 0, .55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  }

  const STYLES = {
    classic: { name: 'Обычная', w: W, h: H, scale: SCALE, draw: drawClassic },
    story: { name: 'Сторис', w: 1080, h: 1920, scale: 1, draw: drawStory, pro: true },
    minimal: { name: 'Минимал', w: 1200, h: 675, scale: 1.5, draw: drawMinimal, pro: true },
    retro: { name: 'Ретро', w: 1200, h: 675, scale: 1.5, draw: drawRetro, pro: true },
  };
  /**
   * opts: { style, title, platform, cover (ImageBitmap | null), icon (ImageBitmap | null), colors, stats, money,
   *         date, paid, number } — money показывается, только если пользователь так решил
   */
  async function draw(canvas, o) {
    const st = STYLES[o.style] || STYLES.classic;
    const col = { ...BRAND, ...(o.colors || {}) };
    canvas.width = st.w * st.scale; canvas.height = st.h * st.scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(st.scale, 0, 0, st.scale, 0, 0);
    await Promise.all([`700 66px ${FONT}`, `600 15px ${FONT}`, `400 15px ${FONT}`]
      .map(f => document.fonts.load(f).catch(() => {})));
    if (o.style === 'retro') await loadPixel();
    st.draw(ctx, o, col);
    return canvas;
  }

  // Плитки из статистики: дни всегда, заказы — если были, недели подряд — от двух
  function tiles(s) {
    // short — для стилей, где цифры идут одной строкой
    const t = [{ n: String(s.days), u: plural(s.days, 'день', 'дня', 'дней'), l: 'от выбора до покупки' }];
    if (s.orders) t.push({ n: String(s.orders), u: plural(s.orders, 'заказ', 'заказа', 'заказов'), l: 'вложено в копилку' });
    if (s.streak >= 2) t.push({ n: String(s.streak), u: plural(s.streak, 'неделя', 'недели', 'недель'), l: 'подряд с доходом', short: 'подряд' });
    return t;
  }

  /* ---------- Итоги года: сколько игр заработано, полка обложками и цифры за год ---------- */
  const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  function yearStats(state, year) {
    const inYear = t => new Date(t).getFullYear() === year;
    const games = (state.shelf || []).filter(g => inYear(g.boughtAt)).sort((a, b) => Date.parse(a.boughtAt) - Date.parse(b.boughtAt));
    const incomes = state.entries.filter(e => Logic.isIncome(e) && inYear(e.date));
    // Самая длинная серия недель подряд с доходом внутри года
    const weeks = [...new Set(incomes.map(e => Logic.weekStart(Date.parse(e.date))))].sort((a, b) => a - b);
    let streak = 0, run = 0, prev = null;
    for (const w of weeks) { run = prev !== null && w - prev === Logic.WEEK ? run + 1 : 1; streak = Math.max(streak, run); prev = w; }
    const fastest = games.map(g => ({ title: g.title, days: stats(state, g).days })).sort((a, b) => a.days - b.days)[0] || null;
    const byMonth = Array(12).fill(0);
    for (const e of incomes) byMonth[new Date(e.date).getMonth()] += e.amount;
    const top = Math.max(...byMonth);
    return {
      year, games, orders: incomes.length, earned: incomes.reduce((a, e) => a + e.amount, 0), streak, fastest,
      bestMonth: top > 0 ? MONTHS[byMonth.indexOf(top)] : null, byMonth,
      achievements: achievementsIn(state, new Date(year, 0, 1).getTime(), new Date(year, 11, 31).getTime()),
    };
  }
  // Годы, за которые есть что показать: доходы или покупки; свежий — первым
  function years(state) {
    const all = [...state.entries.filter(Logic.isIncome).map(e => e.date), ...(state.shelf || []).map(g => g.boughtAt)];
    return [...new Set(all.map(t => new Date(t).getFullYear()))].sort((a, b) => b - a);
  }
  // Плитки итогов: заказы, серия недель, самая быстрая игра, лучший месяц — что есть
  function yearTiles(y) {
    const t = [];
    if (y.orders) t.push({ n: String(y.orders), u: plural(y.orders, 'заказ', 'заказа', 'заказов'), l: 'за год' });
    if (y.streak >= 2) t.push({ n: String(y.streak), u: plural(y.streak, 'неделя', 'недели', 'недель'), l: 'подряд с доходом' });
    if (y.fastest) t.push({ n: String(y.fastest.days), u: plural(y.fastest.days, 'день', 'дня', 'дней'), l: `быстрее всего — ${y.fastest.title}` });
    if (y.bestMonth) t.push({ n: y.bestMonth, u: '', l: 'самый сильный месяц', word: true });
    return t.slice(0, 4);
  }
  // Сетка обложек: последняя клетка — «+N», если игр больше, чем помещается
  function coverGrid(ctx, covers, total, x, y, cols, rows, cw, ch, gap) {
    const cells = cols * rows, shown = total > cells ? cells - 1 : Math.min(total, cells);
    for (let i = 0; i < shown; i++) {
      const cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
      coverBox(ctx, covers[i], cx, cy, cw, ch, Math.round(ch * .14));
    }
    if (total > cells) {
      const i = cells - 1, cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (ch + gap);
      rounded(ctx, cx, cy, cw, ch, Math.round(ch * .14)); ctx.fillStyle = 'rgba(255, 255, 255, .06)'; ctx.fill();
      ctx.font = `700 ${Math.round(ch * .36)}px ${FONT}`; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`+${total - cells + 1}`, cx + cw / 2, cy + ch / 2); ctx.textAlign = 'left';
    }
  }
  function yearTile(ctx, t, x, y, w, h, big, small, label) {
    rounded(ctx, x, y, w, h, Math.round(h * .18)); ctx.fillStyle = 'rgba(255, 255, 255, .045)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, .08)'; ctx.stroke();
    ctx.textBaseline = 'alphabetic';
    const nSize = t.word ? Math.round(big * .7) : big;
    ctx.font = `700 ${nSize}px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(t.n, x + w * .07, y + h * .5);
    const nw = ctx.measureText(t.n).width;
    if (t.u) { ctx.font = `600 ${small}px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(t.u, x + w * .07 + nw + small * .4, y + h * .5); }
    ctx.font = `400 ${label}px ${FONT}`; ctx.fillStyle = C.dim;
    ctx.fillText(lines(ctx, t.l, w * .86, 1)[0], x + w * .07, y + h * .78);
  }

  // Итоги года, обычная — 1200×675: слева главная цифра и плитки, справа обложки, доход по месяцам и достижения
  function drawYearClassic(ctx, o, col) {
    const y = o.year, X = 44, Y = 44, CW = W - 88, CH = H - 88;
    blurredBg(ctx, o, W, H);
    frame(ctx, col, X, Y, CW, CH, 40, W / 2, H / 2);
    const L = X + 57, T = Y + 53, RW = 470, R = X + CW - 57 - RW, leftW = R - 44 - L;

    joycons(ctx, L, T + 2);
    ctx.font = `600 15px ${FONT}`; ctx.letterSpacing = '3.3px'; ctx.fillStyle = C.muted; ctx.textBaseline = 'middle';
    ctx.fillText(`ИТОГИ ${y.year} ГОДА`, L + 39, T + 17);
    ctx.letterSpacing = '0px';

    const n = y.games.length;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 110px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(String(n), L - 4, T + 150);
    const nw = ctx.measureText(String(n)).width;
    ctx.font = `700 32px ${FONT}`; ctx.fillText(plural(n, 'игра', 'игры', 'игр'), L + nw + 14, T + 112);
    ctx.font = `400 22px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(n ? 'заработано за год' : 'в этом году ещё впереди', L + nw + 14, T + 146);
    if (o.money) {
      ctx.font = `700 30px ${FONT}`; ctx.fillStyle = C.plus; ctx.fillText(o.money, L, T + 200);
      const mw = ctx.measureText(o.money).width;
      ctx.font = `400 18px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText('доход за год', L + mw + 12, T + 200);
    }
    const gap = 12, th = 96, tw = (leftW - gap) / 2, ty0 = Y + CH - 40 - 30 - 26 - (th * 2 + gap);
    o.tiles.forEach((t, i) => yearTile(ctx, t, L + (i % 2) * (tw + gap), ty0 + Math.floor(i / 2) * (th + gap), tw, th, 34, 16, 13));

    // Справа: обложки одной полосой, под ними доход по месяцам и достижения года
    const cg = 10, cw = (RW - cg * 3) / 4, ch = Math.round(cw * 215 / 460);
    if (n) coverGrid(ctx, o.covers, n, R, T, 4, 1, cw, ch, cg);
    sectionLabel(ctx, 'Доход по месяцам', R, T + ch + 52, 15);
    monthBars(ctx, y.byMonth, R, T + ch + 70, RW, 230, col, 13);
    if (y.achievements.length) achChips(ctx, y.achievements, R, T + ch + 334, RW, 13, col);

    const fy = Y + CH - 40 - 13;
    if (o.icon) ctx.drawImage(o.icon, L, fy - 13, 26, 26);
    ctx.textBaseline = 'middle';
    ctx.font = `600 15px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText('Game Goal', L + 37, fy);
    const gw = ctx.measureText('Game Goal').width;
    ctx.font = `400 15px ${FONT}`; ctx.fillStyle = C.dim; ctx.fillText('· копилка на игру', L + 45 + gw, fy);
    ctx.textAlign = 'right'; ctx.fillText(String(y.year), X + CW - 57, fy); ctx.textAlign = 'left';
  }

  // Итоги года, сторис — 1080×1920: цифра года, обложки, доход по месяцам, плитки, достижения
  function drawYearStory(ctx, o, col) {
    const y = o.year, w = 1080, h = 1920, X = 60, Y = 60, CW = w - 120, CH = h - 120, mid = w / 2;
    blurredBg(ctx, o, w, h, .5, .3);
    frame(ctx, col, X, Y, CW, CH, 56, mid, h / 2);
    const L = X + 70, IW = CW - 140;

    ctx.font = `600 22px ${FONT}`; ctx.letterSpacing = '5px';
    const label = `ИТОГИ ${y.year} ГОДА`, tw = ctx.measureText(label).width, jw = 2 * (40 * 11 / 30) + 3;
    const x0 = mid - (jw + 24 + tw) / 2;
    joycons(ctx, x0, Y + 90, 40);
    ctx.fillStyle = C.muted; ctx.textBaseline = 'middle'; ctx.fillText(label, x0 + jw + 24, Y + 111);
    ctx.letterSpacing = '0px';

    // Главная цифра слева, подпись и доход справа от неё
    const n = y.games.length;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `700 220px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText(String(n), L - 8, Y + 400);
    const nw = ctx.measureText(String(n)).width;
    ctx.font = `700 54px ${FONT}`; ctx.fillText(plural(n, 'игра', 'игры', 'игр'), L + nw + 24, Y + 300);
    ctx.font = `400 32px ${FONT}`; ctx.fillStyle = C.muted; ctx.fillText(n ? 'заработано за год' : 'в этом году впереди', L + nw + 24, Y + 346);
    if (o.money) {
      ctx.font = `700 40px ${FONT}`; ctx.fillStyle = C.plus; ctx.fillText(o.money, L + nw + 24, Y + 400);
    }

    // Обложки: до 4, две колонки
    let yy = Y + 460;
    const cg = 20, cw = (IW - cg) / 2, ch = Math.round(cw * 215 / 460), rows = Math.min(2, Math.max(1, Math.ceil(n / 2)));
    if (n) { coverGrid(ctx, o.covers, n, L, yy, 2, rows, cw, ch, cg); yy += rows * ch + (rows - 1) * cg; }
    yy += 80;

    sectionLabel(ctx, 'Доход по месяцам', L, yy, 28);
    monthBars(ctx, y.byMonth, L, yy + 30, IW, 260, col, 22);
    yy += 30 + 260 + 50;

    // Плитки 2×2
    const th = 130, gap = 20, tw2 = (IW - gap) / 2;
    o.tiles.forEach((t, i) => yearTile(ctx, t, L + (i % 2) * (tw2 + gap), yy + Math.floor(i / 2) * (th + gap), tw2, th, 54, 24, 20));
    yy += Math.ceil(o.tiles.length / 2) * (th + gap) + 24;

    const ach = y.achievements.slice(0, 5);
    if (ach.length) achChips(ctx, ach, L, yy, IW, 24, col);

    const fy = Y + CH - 64;
    ctx.textBaseline = 'middle';
    ctx.font = `600 26px ${FONT}`;
    const gw = ctx.measureText('Game Goal').width;
    ctx.font = `400 26px ${FONT}`;
    const sub = ' · копилка на игру', sw = ctx.measureText(sub).width;
    const fx = mid - (44 + 14 + gw + sw) / 2;
    if (o.icon) ctx.drawImage(o.icon, fx, fy - 22, 44, 44);
    ctx.font = `600 26px ${FONT}`; ctx.fillStyle = C.text; ctx.fillText('Game Goal', fx + 58, fy);
    ctx.font = `400 26px ${FONT}`; ctx.fillStyle = C.dim; ctx.fillText(sub, fx + 58 + gw, fy);
  }

  const YEAR_STYLES = {
    classic: { name: 'Обычная', w: W, h: H, scale: SCALE, draw: drawYearClassic },
    story: { name: 'Сторис', w: 1080, h: 1920, scale: 1, draw: drawYearStory, pro: true },
  };
  // opts: { style, year (из yearStats), covers: [ImageBitmap], cover (фон), icon, colors, tiles, money }
  async function drawYear(canvas, o) {
    const st = YEAR_STYLES[o.style] || YEAR_STYLES.classic;
    const col = { ...BRAND, ...(o.colors || {}) };
    canvas.width = st.w * st.scale; canvas.height = st.h * st.scale;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(st.scale, 0, 0, st.scale, 0, 0);
    await Promise.all([`700 110px ${FONT}`, `600 15px ${FONT}`, `400 15px ${FONT}`].map(f => document.fonts.load(f).catch(() => {})));
    st.draw(ctx, o, col);
    return canvas;
  }

  root.GameCard = { stats, tiles, draw, STYLES, yearStats, years, yearTiles, drawYear, YEAR_STYLES };
})(window);
