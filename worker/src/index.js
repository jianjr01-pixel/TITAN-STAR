import { uploadFileInfo, MAX_UPLOAD_BYTES } from './filename.js';

const encoder = new TextEncoder();
// Cloudflare Workers 的 WebCrypto 最多支援 100,000 次 PBKDF2 迭代；超過會直接拋錯。
const PBKDF2_ITERATIONS = 100000;
const SESSION_HOURS = 8;
// 登入防護：同一帳號或同一來源 IP 在 15 分鐘內失敗達上限就暫時拒絕。
const LOCK_WINDOW = '-15 minutes';
const MAX_FAILS_PER_USER = 5;
const MAX_FAILS_PER_IP = 20;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});
const b64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const now = () => new Date().toISOString();
export const validUsername = value => /^[a-zA-Z0-9_.-]{3,64}$/.test(value || '');
export const validPassword = value => typeof value === 'string' && value.length >= 10 && value.length <= 128;
const cleanText = (value, max) => String(value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

async function sha256(value) { return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: Uint8Array.from(atob(salt), c => c.charCodeAt(0)), iterations: PBKDF2_ITERATIONS }, key, 256);
  return b64(new Uint8Array(bits));
}
async function newPassword(password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await passwordHash(password, salt) };
}
function sameText(a, b) {
  // 固定時間比對，避免從回應時間推測雜湊內容。
  const x = encoder.encode(String(a)), y = encoder.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
// 帳號不存在時仍計算一次雜湊，讓回應時間一致，不洩漏帳號是否存在。
const DUMMY_SALT = 'AAAAAAAAAAAAAAAAAAAAAA==';

function cors(request, env) {
  const origin = request.headers.get('Origin');
  // ALLOWED_ORIGIN 可用逗號列出多個來源；離線單檔版（file://）的來源是字串 "null"。
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
  return origin && allowed.includes(origin) ? {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    vary: 'Origin',
  } : {};
}
async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  return ip ? await sha256(ip) : null;
}
async function log(env, username, success, event, request, userId = null) {
  // 帳號只保存符合格式的值；亂填的帳號記成 (invalid)，避免把任意字串存進後台紀錄。
  const name = validUsername(username) ? username : '(invalid)';
  await env.DB.prepare('INSERT INTO login_logs (user_id,username,success,event,ip_hash) VALUES (?,?,?,?,?)')
    .bind(userId, name, success ? 1 : 0, cleanText(event, 160), await ipHash(request)).run();
}
async function tooManyFailures(env, username, request) {
  const ip = await ipHash(request);
  const row = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN username=? COLLATE NOCASE THEN 1 ELSE 0 END) AS user_fails,
       SUM(CASE WHEN ip_hash IS NOT NULL AND ip_hash=? THEN 1 ELSE 0 END) AS ip_fails
     FROM login_logs WHERE success=0 AND event='login_failed' AND created_at > datetime('now', ?)`
  ).bind(username, ip, LOCK_WINDOW).first();
  return (row?.user_fails || 0) >= MAX_FAILS_PER_USER || (row?.ip_fails || 0) >= MAX_FAILS_PER_IP;
}
async function actor(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.role,u.must_change_password,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash, now()).first();
  if (!row || !row.active) return null;
  await env.DB.prepare('UPDATE sessions SET last_seen_at=? WHERE token_hash=?').bind(now(), tokenHash).run();
  return row;
}
const requireAdmin = async (request, env) => { const user = await actor(request, env); return user?.role === 'admin' && !user.must_change_password ? user : null; };
function publicUser(row) { return { id: row.id, username: row.username, displayName: row.display_name, role: row.role, mustChangePassword: !!row.must_change_password, active: !!row.active }; }
async function body(request) { try { return await request.json(); } catch { return {}; } }

async function githubUpload(env, filename, bytes, message) {
  if (!env.GITHUB_TOKEN) throw new Error('GitHub upload is not configured');
  const path = `date/${encodeURIComponent(filename)}`;
  const base = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const gh = { authorization: `Bearer ${env.GITHUB_TOKEN}`, 'user-agent': 'TITAN-STAR Worker', accept: 'application/vnd.github+json' };
  const existing = await fetch(base, { headers: gh });
  let sha;
  if (existing.ok) sha = (await existing.json()).sha;
  else if (existing.status !== 404) throw new Error(`GitHub read failed (${existing.status})`);
  const payload = { message, content: b64(new Uint8Array(bytes)), ...(sha ? { sha } : {}) };
  const put = await fetch(base, { method: 'PUT', headers: { ...gh, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!put.ok) throw new Error(`GitHub upload failed (${put.status})`);
  return await put.json();
}

async function handle(request, env, headers) {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/api/')) return json({ error: 'Not found' }, 404, headers);

  if (path === '/api/auth/login' && request.method === 'POST') {
    const { username, password } = await body(request);
    if (!validUsername(username) || typeof password !== 'string' || password.length > 128) {
      await log(env, username, false, 'login_failed', request);
      return json({ error: '帳號或密碼錯誤' }, 401, headers);
    }
    if (await tooManyFailures(env, username, request)) {
      await log(env, username, false, 'login_locked', request);
      return json({ error: '登入失敗次數過多，請 15 分鐘後再試或聯絡管理員' }, 429, headers);
    }
    const user = await env.DB.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(username).first();
    const hash = await passwordHash(password, user?.password_salt || DUMMY_SALT);
    const ok = !!user && sameText(hash, user.password_hash);
    await log(env, username, ok, ok ? 'login' : 'login_failed', request, user?.id || null);
    if (!ok) return json({ error: '帳號或密碼錯誤' }, 401, headers);
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now()).run();
    const token = b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await sha256(token), user.id, expiresAt).run();
    return json({ token, expiresAt, user: publicUser(user) }, 200, headers);
  }
  if (path === '/api/auth/me') {
    const user = await actor(request, env);
    return user ? json({ user: publicUser(user) }, 200, headers) : json({ error: '登入已失效' }, 401, headers);
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, headers);
  }
  if (path === '/api/auth/password' && request.method === 'POST') {
    const user = await actor(request, env);
    if (!user) return json({ error: '未登入' }, 401, headers);
    const { currentPassword, newPassword: next } = await body(request);
    if (!validPassword(next)) return json({ error: '新密碼需 10–128 碼' }, 400, headers);
    if (next === currentPassword) return json({ error: '新密碼不可與目前密碼相同' }, 400, headers);
    const stored = await env.DB.prepare('SELECT password_hash,password_salt FROM users WHERE id=?').bind(user.id).first();
    if (!stored || !sameText(await passwordHash(currentPassword || '', stored.password_salt), stored.password_hash)) return json({ error: '目前密碼錯誤' }, 400, headers);
    const hashed = await newPassword(next);
    await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,must_change_password=0,updated_at=? WHERE id=?').bind(hashed.hash, hashed.salt, now(), user.id).run();
    // 改密碼後，其他裝置上的舊登入全部失效。
    const current = await sha256((request.headers.get('Authorization') || '').slice(7));
    await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').bind(user.id, current).run();
    await log(env, user.username, true, 'password_changed', request, user.id);
    return json({ ok: true }, 200, headers);
  }

  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: '需要管理員權限' }, 403, headers);

  if (path === '/api/admin/users' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT id,username,display_name,role,must_change_password,active,created_at,updated_at FROM users ORDER BY username').all();
    return json({ users: rows.results.map(publicUser) }, 200, headers);
  }
  if (path === '/api/admin/users' && request.method === 'POST') {
    const { username, displayName = '', temporaryPassword } = await body(request);
    if (!validUsername(username) || !validPassword(temporaryPassword)) return json({ error: '帳號需 3–64 碼英數字（可含 _ . -），暫時密碼至少 10 碼' }, 400, headers);
    const exists = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first();
    if (exists) return json({ error: '帳號已存在' }, 409, headers);
    const hashed = await newPassword(temporaryPassword);
    await env.DB.prepare('INSERT INTO users (username,display_name,password_hash,password_salt,role,must_change_password) VALUES (?,?,?,?,?,1)').bind(username, cleanText(displayName, 40), hashed.hash, hashed.salt, 'user').run();
    await log(env, admin.username, true, `account_created:${username}`, request, admin.id);
    return json({ ok: true }, 201, headers);
  }
  const reset = path.match(/^\/api\/admin\/users\/(\d+)\/reset$/);
  if (reset && request.method === 'POST') {
    const { temporaryPassword } = await body(request);
    if (!validPassword(temporaryPassword)) return json({ error: '暫時密碼至少 10 碼' }, 400, headers);
    const target = await env.DB.prepare('SELECT id,username FROM users WHERE id=?').bind(reset[1]).first();
    if (!target) return json({ error: '找不到帳號' }, 404, headers);
    const hashed = await newPassword(temporaryPassword);
    await env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,must_change_password=1,updated_at=? WHERE id=?').bind(hashed.hash, hashed.salt, now(), target.id).run();
    await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id).run();
    await log(env, admin.username, true, `password_reset:${target.username}`, request, admin.id);
    return json({ ok: true }, 200, headers);
  }
  const remove = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (remove && request.method === 'DELETE') {
    if (Number(remove[1]) === admin.id) return json({ error: '不可刪除目前管理員' }, 400, headers);
    const target = await env.DB.prepare('SELECT id,username FROM users WHERE id=?').bind(remove[1]).first();
    if (!target) return json({ error: '找不到帳號' }, 404, headers);
    await env.DB.prepare('DELETE FROM users WHERE id=?').bind(target.id).run();
    await log(env, admin.username, true, `account_deleted:${target.username}`, request, admin.id);
    return json({ ok: true }, 200, headers);
  }
  if (path === '/api/admin/login-logs' && request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT username,success,event,created_at FROM login_logs ORDER BY id DESC LIMIT 200').all();
    return json({ logs: rows.results }, 200, headers);
  }
  if (path === '/api/admin/upload' && request.method === 'POST') {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !uploadFileInfo(file.name)) {
      return json({ error: '檔名不符合 date 規則，例如「115年 08 月維修報表.xlsx」「115年8月整新故障.xlsx」「115年 08 月維修報表-更正版2.xlsx」' }, 400, headers);
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) return json({ error: 'Excel 大小需在 25 MB 以內' }, 400, headers);
    const bytes = await file.arrayBuffer();
    const sig = new Uint8Array(bytes.slice(0, 4));
    if (!(sig[0] === 0x50 && sig[1] === 0x4b)) return json({ error: '檔案內容不是 .xlsx 格式' }, 400, headers);
    const result = await githubUpload(env, file.name, bytes, `TITAN-STAR: upload ${file.name}`);
    await log(env, admin.username, true, `excel_uploaded:${file.name}`, request, admin.id);
    return json({ ok: true, commit: result.commit?.sha || '' }, 200, headers);
  }
  return json({ error: 'Not found' }, 404, headers);
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers });
    try {
      return await handle(request, env, headers);
    } catch (error) {
      console.error(error);
      return json({ error: '服務處理失敗' }, 500, headers);
    }
  },
};

export { passwordHash, PBKDF2_ITERATIONS };
