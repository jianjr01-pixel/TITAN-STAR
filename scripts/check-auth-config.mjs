#!/usr/bin/env node
// 檢查 auth-config.js 是否已填入 Cloudflare Worker 網址。
// 尚未設定就部署，所有人都會卡在登入畫面，因此正式部署前用 --strict 擋下。
//   node scripts/check-auth-config.mjs           → 未設定時只顯示警告
//   node scripts/check-auth-config.mjs --strict  → 未設定時結束碼 1
import fs from 'node:fs';

const strict = process.argv.includes('--strict');
const text = fs.readFileSync('auth-config.js', 'utf8');
const url = (text.match(/TITAN_AUTH_API\s*=\s*['"]([^'"]*)['"]/) || [])[1] || '';
const ok = /^https:\/\/[^\s]+$/.test(url) && !url.includes('REPLACE_WITH');
if (ok) {
  console.log(`✓ 登入服務網址已設定：${url}`);
} else {
  const msg = 'auth-config.js 尚未填入 Cloudflare Worker 網址；部署後使用者將無法登入。請依 worker/README.md 完成設定。';
  if (strict) { console.error(`::error title=登入服務未設定::${msg}`); process.exit(1); }
  console.warn(`::warning title=登入服務未設定::${msg}`);
}
