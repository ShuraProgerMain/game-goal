// Ключи Game Goal Pro. Ключ — подписанные закрытым ключом данные (кому и когда выдан); программа проверяет
// подпись открытым ключом из src-tauri/src/pro.rs, без серверов и интернета.
//
//   node tools/pro-key.mjs init          — один раз: создать ключ подписи и показать открытый ключ для pro.rs
//   node tools/pro-key.mjs "Ник или имя" — выдать ключ Pro
//
// Закрытый ключ лежит вне репозитория: %USERPROFILE%\.game-goal\pro-signing-key.pem. Его нельзя публиковать,
// а если он потеряется — новых ключей для уже вышедших версий выдать будет нельзя. Сохрани копию.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = path.join(os.homedir(), '.game-goal');
const file = path.join(dir, 'pro-signing-key.pem');
const arg = process.argv[2];

if (!arg) {
  console.log('node tools/pro-key.mjs init | node tools/pro-key.mjs "Ник"');
  process.exit(1);
}

if (arg === 'init') {
  if (fs.existsSync(file)) { console.error(`Ключ подписи уже есть: ${file}`); process.exit(1); }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url');
  console.log(`Ключ подписи сохранён: ${file}`);
  console.log('Открытый ключ для src-tauri/src/pro.rs:');
  console.log(`const PUBLIC_KEY: [u8; 32] = [${[...raw].join(', ')}];`);
  process.exit(0);
}

const privateKey = crypto.createPrivateKey(fs.readFileSync(file));
const payload = Buffer.from(JSON.stringify({ v: 1, n: arg.trim(), i: new Date().toLocaleDateString('sv-SE') }));
const sig = crypto.sign(null, payload, privateKey);
console.log(`GGPRO-${payload.toString('base64url')}.${sig.toString('base64url')}`);
