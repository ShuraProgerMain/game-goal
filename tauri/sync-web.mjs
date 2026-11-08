// Собирает папку web для Tauri из интерфейса программы: исходники не дублируются в репозитории,
// а мост preload.js заменяется на shim/api-tauri.js
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const root = path.join(here, '..');
const web = path.join(here, 'web');

fs.rmSync(web, { recursive: true, force: true });
fs.mkdirSync(path.join(web, 'assets'), { recursive: true });
for (const f of ['common.css', 'common.js', 'logic.js']) fs.copyFileSync(path.join(root, f), path.join(web, f));
for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(web, 'assets', f));
fs.copyFileSync(path.join(here, 'shim', 'api-tauri.js'), path.join(web, 'api-tauri.js'));

const html = fs.readFileSync(path.join(root, 'widget.html'), 'utf8');
const i = html.indexOf('<script');
fs.writeFileSync(path.join(web, 'widget.html'), html.slice(0, i) + '<script src="api-tauri.js"></script>\n' + html.slice(i));
console.log('web:', fs.readdirSync(web).join(', '));
