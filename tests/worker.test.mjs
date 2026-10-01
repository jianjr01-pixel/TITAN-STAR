// Cloudflare Worker 登入服務：用 node:sqlite 模擬 D1，實際跑過 migration 與 API 流程。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import worker, { passwordHash, PBKDF2_ITERATIONS } from '../worker/src/index.js';
import { uploadFileInfo } from '../worker/src/filename.js';

const require = createRequire(import.meta.url);
const monthly = require('../monthly-source.js');
const ORIGIN = 'https://jianjr01-pixel.github.io';

function d1() {
  const db = new DatabaseSync(':memory:');
  for (const f of fs.readdirSync('worker/migrations').sort()) db.exec(fs.readFileSync(`worker/migrations/${f}`, 'utf8'));
  const wrap = (sql, args = []) => ({
    bind: (...a) => wrap(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return { raw: db, DB: { prepare: sql => wrap(sql) } };
}
async function seedUser(db, username, password, role = 'user', mustChange = 0) {
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  db.raw.prepare('INSERT INTO users (username,display_name,password_hash,password_salt,role,must_change_password) VALUES (?,?,?,?,?,?)')
    .run(username, '', await passwordHash(password, salt), salt, role, mustChange);
}
function env(db) { return { DB: db.DB, ALLOWED_ORIGIN: ORIGIN, GITHUB_OWNER: 'o', GITHUB_REPO: 'r', GITHUB_TOKEN: 't' }; }
function call(e, path, { method = 'GET', body, token, ip = '1.2.3.4', form } = {}) {
  const headers = { Origin: ORIGIN, 'CF-Connecting-IP': ip };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['content-type'] = 'application/json';
  return worker.fetch(new Request(`https://w.example${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) }), e);
}
const login = (e, username, password, ip) => call(e, '/api/auth/login', { method: 'POST', body: { username, password }, ip });

test('PBKDF2 迭代次數不超過 Cloudflare Workers 上限', () => {
  assert.ok(PBKDF2_ITERATIONS <= 100000);
});

test('上傳檔名規則與 monthly-source.monthInfo 一致', () => {
  const names = [
    '115年 08 月維修報表.xlsx', '115年8月維修報表.xlsx', '115年 08 月維修報表-更正版.xlsx', '115年 08 月維修報表-更正版2.xlsx',
    '2026年 08 月維修報表.xlsx', '115年8月整新故障.xlsx', '115年8月整新故障-更正版3.xlsx', '１１５年８月整新故障.xlsx',
    '115年 13 月維修報表.xlsx', '115年 08 月維修報表.xls', 'data.json', '../115年8月維修報表.xlsx', '~$115年8月維修報表.xlsx',
    '115年 08 月維修報表 (1).xlsx', '年度品號主檔.xlsx',
  ];
  for (const name of names) {
    let expected = null;
    try { const m = monthly.monthInfo(name); expected = { kind: m.kind, month: m.month, revision: m.revision }; } catch {}
    if (/[\\/]|^~\$/.test(name)) expected = null;
    assert.deepEqual(uploadFileInfo(name), expected, name);
  }
});

test('登入、改密碼、登出流程', async () => {
  const db = d1(); const e = env(db);
  await seedUser(db, 'user01', 'TempPassword1', 'user', 1);
  let r = await login(e, 'user01', 'TempPassword1');
  assert.equal(r.status, 200);
  const { token, user } = await r.json();
  assert.equal(user.mustChangePassword, true);
  r = await call(e, '/api/auth/password', { method: 'POST', token, body: { currentPassword: 'TempPassword1', newPassword: 'NewPassword123' } });
  assert.equal(r.status, 200);
  assert.equal((await login(e, 'user01', 'TempPassword1')).status, 401);
  assert.equal((await login(e, 'user01', 'NewPassword123')).status, 200);
  await call(e, '/api/auth/logout', { method: 'POST', token });
  assert.equal((await call(e, '/api/auth/me', { token })).status, 401);
});

test('同一帳號連續失敗 5 次後暫停登入（正確密碼也拒絕）', async () => {
  const db = d1(); const e = env(db);
  await seedUser(db, 'user02', 'RightPassword1');
  for (let i = 0; i < 5; i++) assert.equal((await login(e, 'user02', 'wrong-password', `9.9.9.${i}`)).status, 401);
  assert.equal((await login(e, 'user02', 'RightPassword1')).status, 429);
});

test('亂填帳號不會寫進紀錄；一般使用者無法進後台；暫時密碼的管理員也不行', async () => {
  const db = d1(); const e = env(db);
  await seedUser(db, 'admin01', 'AdminPassword1', 'admin', 1);
  await seedUser(db, 'user03', 'UserPassword1');
  await login(e, '<img src=x onerror=alert(1)>', 'x');
  const names = db.raw.prepare('SELECT username FROM login_logs').all().map(r => r.username);
  assert.ok(names.every(n => !n.includes('<')), names.join(','));
  const u = await (await login(e, 'user03', 'UserPassword1')).json();
  assert.equal((await call(e, '/api/admin/users', { token: u.token })).status, 403);
  const a = await (await login(e, 'admin01', 'AdminPassword1')).json();
  assert.equal((await call(e, '/api/admin/users', { token: a.token })).status, 403);
});

test('管理員操作寫入紀錄，上傳接受標準檔名並拒絕非 xlsx 內容', async () => {
  const db = d1(); const e = env(db);
  await seedUser(db, 'admin02', 'AdminPassword2', 'admin', 0);
  const { token } = await (await login(e, 'admin02', 'AdminPassword2')).json();
  assert.equal((await call(e, '/api/admin/users', { method: 'POST', token, body: { username: 'user04', displayName: '<b>王</b>', temporaryPassword: 'TempPassword4' } })).status, 201);
  const created = db.raw.prepare("SELECT id,display_name FROM users WHERE username='user04'").get();
  assert.ok(!created.display_name.includes('<'));
  assert.equal((await call(e, `/api/admin/users/${created.id}/reset`, { method: 'POST', token, body: { temporaryPassword: 'TempPassword5' } })).status, 200);
  assert.equal((await call(e, `/api/admin/users/${created.id}`, { method: 'DELETE', token })).status, 200);

  const realFetch = globalThis.fetch;
  const puts = [];
  globalThis.fetch = async (url, opt = {}) => {
    if (opt.method === 'PUT') { puts.push(decodeURIComponent(url)); return new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 201 }); }
    return new Response('{}', { status: 404 });
  };
  try {
    const xlsx = new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]);
    let form = new FormData(); form.append('file', new File([xlsx], '115年 08 月維修報表.xlsx'));
    assert.equal((await call(e, '/api/admin/upload', { method: 'POST', token, form })).status, 200);
    form = new FormData(); form.append('file', new File([xlsx], '115年 08 月維修報表-更正版2.xlsx'));
    assert.equal((await call(e, '/api/admin/upload', { method: 'POST', token, form })).status, 200);
    form = new FormData(); form.append('file', new File(['not excel'], '115年8月整新故障.xlsx'));
    assert.equal((await call(e, '/api/admin/upload', { method: 'POST', token, form })).status, 400);
    form = new FormData(); form.append('file', new File([xlsx], 'evil.xlsx'));
    assert.equal((await call(e, '/api/admin/upload', { method: 'POST', token, form })).status, 400);
  } finally { globalThis.fetch = realFetch; }
  assert.equal(puts.length, 2);
  assert.ok(puts[0].endsWith('/contents/date/115年 08 月維修報表.xlsx'));
  const events = db.raw.prepare('SELECT event FROM login_logs WHERE success=1').all().map(r => r.event.split(':')[0]);
  for (const ev of ['account_created', 'password_reset', 'account_deleted', 'excel_uploaded']) assert.ok(events.includes(ev), ev);
});

test('前端後台畫面會跳脫帳號與紀錄內容', () => {
  const ctx = { window: {}, document: { getElementById: () => null }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, Headers, console };
  vm.runInNewContext(fs.readFileSync('auth-worker.js', 'utf8'), ctx);
  assert.equal(ctx.window.Auth._esc('<img src=x onerror="a">\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;');
});
