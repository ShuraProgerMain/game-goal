// Мост между страницами и ядром: window.api, через которое окна вызывают программу.
// В виджете вызовы идут прямо в ядро (core.js), в окне настроек — сообщениями в окно виджета.
(() => {
  const T = window.__TAURI__, me = T.window.getCurrentWindow(), inWidget = me.label === 'widget';

  // События для этой страницы: данные изменились, достижение, баннер, команды виджету
  const handlers = {};
  const on = (name, fn) => (handlers[name] ||= []).push(fn);
  window.Bridge = { fire: (name, ...args) => (handlers[name] || []).forEach(fn => fn(...args)) };
  T.event.listen('state:changed', e => Bridge.fire('state', e.payload));
  T.event.listen('settings:tab', e => Bridge.fire('tab', e.payload));
  T.event.listen('settings:card', e => Bridge.fire('card', e.payload));

  let seq = 0;
  const waiting = new Map();
  if (!inWidget) T.event.listen('rpc:reply', e => {
    const w = waiting.get(e.payload.id);
    if (!w) return;
    waiting.delete(e.payload.id);
    'error' in e.payload ? w.reject(new Error(e.payload.error)) : w.resolve(e.payload.result);
  });
  const call = (method, ...args) => inWidget
    ? window.Core.ready.then(() => window.Core.api[method](...args))
    : new Promise((resolve, reject) => {
      const id = ++seq;
      waiting.set(id, { resolve, reject });
      T.event.emitTo('widget', 'rpc', { id, from: me.label, method, args });
    });

  const methods = ['getState', 'setState', 'search', 'setOnTop', 'hideWidget', 'showWidget', 'resetWidgetPos',
    'moveWidget', 'moveWidgetEnd', 'widgetMenu', 'openSettings', 'getAutostart', 'setAutostart', 'openUrl',
    'openDataFolder', 'setCompact', 'buyGame', 'listBackups', 'restoreBackup', 'backupNow', 'refreshPrices',
    'getHotkey', 'setHotkey', 'getSystem', 'setSystem', 'removeFromSystem', 'openCard', 'getUpdate', 'checkUpdate', 'installUpdate'];
  window.api = Object.fromEntries(methods.map(m => [m, (...args) => call(m, ...args)]));
  Object.assign(window.api, {
    onState: fn => on('state', fn),
    onSettingsTab: fn => on('tab', fn),
    onWidgetPing: fn => on('ping', fn),
    onWidgetQuick: fn => on('quick', fn),
    onAchievement: fn => on('achievement', fn),
    onBanner: fn => on('banner', fn),
    onCard: fn => on('card', fn),
    // Карточка: обложка грузится через Rust (с чужого сайта холст иначе нельзя сохранить), PNG сохраняется в «Изображения»
    imageBytes: async url => { const r = await T.http.fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); },
    saveCard: (name, png) => T.core.invoke('save_card', { name, png }),
    close: () => me.close(),
    minimize: () => me.minimize(),
  });

  // Заголовок окна настроек: перетаскивание окна за пустое место
  document.addEventListener('mousedown', e => {
    if (e.button === 0 && e.target.closest('.titlebar') && !e.target.closest('button, input, select, a')) me.startDragging();
  });
})();
