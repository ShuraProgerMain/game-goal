// Собирает папку web для Tauri из интерфейса программы: исходники не дублируются в репозитории.
// Вместо preload.js в страницы встраивается мост bridge.js, в виджет — ещё и ядро core.js (бывший main.js)
import fs from 'node:fs';
import path from 'node:path';
import esbuild from 'esbuild';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const root = path.join(here, '..');
const web = path.join(here, 'web');

fs.rmSync(web, { recursive: true, force: true });
fs.mkdirSync(path.join(web, 'assets'), { recursive: true });
for (const f of ['common.css', 'common.js', 'logic.js', 'card.js']) fs.copyFileSync(path.join(root, f), path.join(web, f));
for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(web, 'assets', f));
for (const f of ['bridge.js', 'core.js']) fs.copyFileSync(path.join(here, 'shim', f), path.join(web, f));
await esbuild.build({ entryPoints: [path.join(here, 'shim', 'plugins.js')], bundle: true, format: 'iife', minify: true, outfile: path.join(web, 'plugins.js'), logLevel: 'warning' });

const BRIDGE = '<script src="plugins.js"></script>\n<script src="bridge.js"></script>\n';
function page(name, inject) {
  let html = fs.readFileSync(path.join(root, name), 'utf8');
  for (const [anchor, tag, after] of inject) {
    const i = html.indexOf(anchor);
    if (i < 0) throw new Error(`${name}: не найдено «${anchor}»`);
    const at = after ? i + anchor.length : i;
    html = html.slice(0, at) + tag + html.slice(at);
  }
  fs.writeFileSync(path.join(web, name), html);
}
page('widget.html', [
  ['<script', BRIDGE, false],
  ['<script src="logic.js"></script>', '\n<script src="core.js"></script>', true],
]);
page('settings.html', [['<script', BRIDGE, false]]);
console.log('web:', fs.readdirSync(web).join(', '));
