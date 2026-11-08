// Мост виджета для прототипа на Tauri: те же методы, что preload.js даёт в Electron.
// Прототип только показывает и двигает виджет; запись данных, настройки и меню — заглушки.
(() => {
  const T = window.__TAURI__, win = T.window.getCurrentWindow();
  const noop = () => {}, none = async () => {};
  window.api = {
    getState: () => T.core.invoke('get_state'),
    setState: none, buyGame: none, openSettings: none, widgetMenu: noop,
    setOnTop: on => win.setAlwaysOnTop(!!on),
    hideWidget: () => win.hide(),
    moveWidget: (x, y) => win.setPosition(new T.dpi.LogicalPosition(x, y)),
    moveWidgetEnd: noop,
    onState: noop, onWidgetPing: noop, onWidgetQuick: noop, onAchievement: noop, onBanner: noop,
  };
})();
