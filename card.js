// Карточка «Награда заработана»: картинка 1200×675 (в файле — в 1,5 раза крупнее) для Discord, Telegram и т. п.
// Рисуется на холсте, чтобы её можно было скопировать и сохранить как PNG. Стиль — как у виджета.
(function (root) {
  const W = 1200, H = 675, SCALE = 1.5;
  const FONT = 'Rubik, "Segoe UI", system-ui, sans-serif';
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
    };
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

  /**
   * opts: { title, platform, cover (ImageBitmap | null), icon (ImageBitmap | null), colors, stats, money, currency, date }
   * money — показывать ли заработанное за это время
   */
  async function draw(canvas, o) {
    const col = { ...BRAND, ...(o.colors || {}) };
    canvas.width = W * SCALE; canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    await Promise.all([`700 66px ${FONT}`, `600 15px ${FONT}`, `400 15px ${FONT}`].map(f => document.fonts.load(f).catch(() => {})));

    // Фон: размытая обложка и затемнение к краям
    ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, W, H);
    if (o.cover) {
      ctx.save(); ctx.filter = 'blur(40px) saturate(150%)'; ctx.globalAlpha = .9;
      coverFit(ctx, o.cover, -60, -60, W + 120, H + 120);
      ctx.restore();
    }
    const shade = ctx.createRadialGradient(W * .75, H * .35, 0, W * .75, H * .35, W * .95);
    shade.addColorStop(0, 'rgba(8, 9, 13, .2)'); shade.addColorStop(1, 'rgba(8, 9, 13, .8)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, H);

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
    rounded(ctx, L, T + 2, 11, 30, [8, 3, 3, 8]); ctx.fillStyle = C.blue; ctx.fill();
    rounded(ctx, L + 14, T + 2, 11, 30, [3, 8, 8, 3]); ctx.fillStyle = C.red; ctx.fill();
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
    const bx = R + coverW + 14 - 32, by = cy + coverH + 14 - 32;
    ctx.beginPath(); ctx.arc(bx, by, 38, 0, Math.PI * 2); ctx.fillStyle = 'rgba(13, 14, 19, .96)'; ctx.fill();
    ctx.save(); ctx.shadowColor = hexA(col.t1, .55); ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    const tile = ctx.createLinearGradient(bx - 32, by - 32, bx + 32, by + 32);
    tile.addColorStop(0, col.t1); tile.addColorStop(.55, col.t2); tile.addColorStop(1, col.t3);
    ctx.beginPath(); ctx.arc(bx, by, 32, 0, Math.PI * 2); ctx.fillStyle = tile; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(bx - 9.5, by + 1); ctx.lineTo(bx - 3, by + 7.5); ctx.lineTo(bx + 10, by - 6);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineWidth = 1; ctx.lineCap = 'butt';

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
    return canvas;
  }

  // Плитки из статистики: дни всегда, заказы — если были, недели подряд — от двух
  function tiles(s) {
    const t = [{ n: String(s.days), u: plural(s.days, 'день', 'дня', 'дней'), l: 'от выбора до покупки' }];
    if (s.orders) t.push({ n: String(s.orders), u: plural(s.orders, 'заказ', 'заказа', 'заказов'), l: 'вложено в копилку' });
    if (s.streak >= 2) t.push({ n: String(s.streak), u: plural(s.streak, 'неделя', 'недели', 'недель'), l: 'подряд с доходом' });
    return t;
  }

  root.GameCard = { stats, tiles, draw, W, H };
})(window);
