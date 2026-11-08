// JS-часть плагинов Tauri. Сами они в window.__TAURI__ не попадают, поэтому sync-web.mjs собирает этот файл
// esbuild'ом в один скрипт и кладёт их туда под теми же именами, что у остального API
import * as http from '@tauri-apps/plugin-http';
import * as globalShortcut from '@tauri-apps/plugin-global-shortcut';
import * as autostart from '@tauri-apps/plugin-autostart';
import * as notification from '@tauri-apps/plugin-notification';
import * as opener from '@tauri-apps/plugin-opener';

Object.assign(window.__TAURI__, { http, globalShortcut, autostart, notification, opener });
