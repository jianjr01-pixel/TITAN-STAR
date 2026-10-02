// Auth — 登入畫面與後台管理介面。
// 所有權限判斷都在 Cloudflare Worker 伺服器端完成；這個檔案只負責畫面。
// 非登入相關的共用介面功能（快捷鍵、通知、延遲載入圖表）放在 app.js 的 window.TitanUI。
window.Auth = (function () {
  'use strict';
  const API = String(window.TITAN_AUTH_API || '').replace(/\/$/, '');
  const KEY = 'titan_worker_session';
  const $ = id => document.getElementById(id);
  const UI = () => window.TitanUI || {};

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function configured() {
    return /^https:\/\/[^\s]+$/.test(API) && !API.includes('REPLACE_WITH');
  }
  function session() {
    try {
      const s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s && s.expiresAt && Date.parse(s.expiresAt) <= Date.now()) { clear(); return null; }
      return s;
    } catch { return null; }
  }
  function clear() { sessionStorage.removeItem(KEY); sessionStorage.removeItem('titan_session'); }

  async function api(path, options = {}) {
    if (!configured()) throw new Error('登入服務尚未設定，請管理員在 auth-config.js 填入 Cloudflare Worker 網址');
    const headers = new Headers(options.headers || {});
    const s = session();
    if (s && s.token) headers.set('Authorization', `Bearer ${s.token}`);
    let res;
    try { res = await fetch(API + path, { ...options, headers }); }
    catch { throw new Error('無法連線登入服務，請確認網路後再試'); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/password') { clear(); showLogin('登入已失效，請重新登入'); }
    if (!res.ok) throw new Error(data.error || `服務請求失敗（${res.status}）`);
    return data;
  }

  // ─── 畫面切換 ───
  function showLogin(message = '') {
    $('loginScreen').style.display = 'flex';
    $('changePwScreen').style.display = 'none';
    $('loginPwd').value = '';
    const ready = configured();
    $('loginErr').textContent = ready ? message : '登入服務尚未設定：請管理員依 worker/README.md 部署 Cloudflare Worker，並在 auth-config.js 填入網址。';
    const btn = $('loginBtn');
    if (btn) btn.disabled = !ready;
    setTimeout(() => { const u = $('loginUser'); if (u && ready) u.focus(); }, 100);
  }
  let forcedChange = false;
  function showChangePw(forced) {
    forcedChange = !!forced;
    $('loginScreen').style.display = 'none';
    $('changePwScreen').style.display = 'flex';
    $('changePwSub').textContent = forced ? '首次登入或密碼已重設，請輸入暫時密碼並設定新密碼。' : '請輸入目前密碼與新密碼。';
    for (const id of ['cpOld', 'cpNew', 'cpConfirm']) $(id).value = '';
    $('changePwErr').textContent = '';
    const cancel = $('changePwCancel');
    if (cancel) cancel.style.display = forced ? 'none' : '';
    setTimeout(() => $('cpOld').focus(), 100);
  }
  // 權限群組：Worker 回傳 permission；舊版 Worker 只有 role，依 role 推回
  const PERM_LABEL = { admin: '管理權限', uploader: '更新報表權限', viewer: '瀏覽權限' };
  const PERM_DESC = {
    admin: '可新增使用者、設定權限、上傳報表',
    uploader: '可上傳報表、瀏覽分析資料',
    viewer: '僅可瀏覽分析資料',
  };
  function permOf(user) {
    if (!user) return 'viewer';
    if (PERM_LABEL[user.permission]) return user.permission;
    return user.role === 'admin' ? 'admin' : 'viewer';
  }
  function currentUser() { const s = session(); return (s && s.user) || null; }
  function avatarHtml(user) {
    const uid = String(user.username || '');
    const name = String(user.displayName || '');
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xFFFF;
    const label = (name ? `${name}（${uid}）` : uid) + ` · ${PERM_LABEL[permOf(user)]}`;
    return `<span class="user-avatar" style="background:hsl(${h % 360},55%,52%)" title="${esc(label)}">${esc((name || uid).charAt(0))}</span>`;
  }
  async function showMain(user) {
    $('loginScreen').style.display = 'none';
    $('changePwScreen').style.display = 'none';
    const perm = permOf(user);
    sessionStorage.setItem('titan_session', JSON.stringify({ username: user.username, isAdmin: perm === 'admin', canUpload: perm !== 'viewer', permission: perm }));
    const userEl = $('modeBarUser');
    if (userEl) userEl.innerHTML = avatarHtml(user);
    for (const [id, show] of [['adminPanelBtn', perm === 'admin'], ['reportUploadBtn', perm === 'uploader'], ['changeOwnPasswordBtn', true], ['logoutBtn', true]]) {
      const el = $(id); if (el) el.style.display = show ? '' : 'none';
    }
    UI().initKeyboardShortcuts?.();
    try { return await window.onAuthSuccess?.(); }
    catch (e) { console.error('[auth] onAuthSuccess failed:', e); return window.App?.openDashboardDirect?.(); }
  }

  // ─── 登入流程 ───
  async function boot() {
    const s = session();
    if (!s || !s.token) return showLogin();
    try {
      const d = await api('/api/auth/me');
      sessionStorage.setItem(KEY, JSON.stringify({ ...s, user: d.user }));
      if (d.user.mustChangePassword) return showChangePw(true);
      await showMain(d.user);
    } catch (e) { clear(); showLogin(e.message.includes('尚未設定') ? '' : '請重新登入'); }
  }
  let busy = false;
  async function doLogin() {
    if (busy) return;
    const err = $('loginErr');
    const username = $('loginUser').value.trim();
    const password = $('loginPwd').value;
    if (!username || !password) { err.textContent = '請輸入帳號與密碼'; return; }
    busy = true; err.textContent = '登入中…';
    try {
      const d = await api('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
      sessionStorage.setItem(KEY, JSON.stringify({ token: d.token, expiresAt: d.expiresAt, user: d.user }));
      err.textContent = '';
      if (d.user.mustChangePassword) showChangePw(true); else await showMain(d.user);
    } catch (e) { err.textContent = e.message; $('loginPwd').value = ''; }
    finally { busy = false; }
  }
  async function doChangePw() {
    const err = $('changePwErr');
    const currentPassword = $('cpOld').value;
    const newPassword = $('cpNew').value;
    if (newPassword.length < 10) { err.textContent = '新密碼至少 10 碼'; return; }
    if (newPassword !== $('cpConfirm').value) { err.textContent = '兩次新密碼不一致'; return; }
    try {
      await api('/api/auth/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
      const s = session();
      s.user.mustChangePassword = false;
      sessionStorage.setItem(KEY, JSON.stringify(s));
      if (forcedChange) await showMain(s.user);
      else { $('changePwScreen').style.display = 'none'; alert('密碼已更新，其他裝置上的登入已登出。'); }
    } catch (e) { err.textContent = e.message; }
  }
  function cancelChangePassword() { if (!forcedChange) $('changePwScreen').style.display = 'none'; }
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    clear();
    const userEl = $('modeBarUser'); if (userEl) userEl.textContent = '';
    for (const id of ['adminPanelBtn', 'reportUploadBtn', 'changeOwnPasswordBtn', 'logoutBtn']) { const el = $(id); if (el) el.style.display = 'none'; }
    showLogin();
  }

  // ─── 後台管理 ───
  const EVENT_LABEL = {
    login: '登入', login_failed: '登入失敗', login_locked: '登入暫停（失敗過多）', password_changed: '修改密碼',
    account_created: '新增帳號', account_deleted: '刪除帳號', password_reset: '重設密碼', excel_uploaded: '上傳 Excel',
    permission_changed: '變更權限',
  };
  function eventText(event) {
    const [type, ...rest] = String(event || '').split(':');
    return (EVENT_LABEL[type] || type) + (rest.length ? `：${rest.join(':')}` : '');
  }
  function permOptions(selected) {
    return Object.keys(PERM_LABEL).map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${PERM_LABEL[p]}</option>`).join('');
  }
  async function renderAdmin() {
    const [u, l] = await Promise.all([api('/api/admin/users'), api('/api/admin/login-logs')]);
    const me = currentUser();
    const adminCount = u.users.filter(x => permOf(x) === 'admin' && x.active !== false).length;
    $('userListEl').innerHTML = u.users.map(x => {
      const perm = permOf(x);
      const isMe = me && Number(me.id) === Number(x.id);
      const lastAdmin = perm === 'admin' && adminCount <= 1;
      return `
      <div class="ap-user-row ${perm === 'admin' ? 'is-admin' : ''}">
        <span class="ap-user-info">${esc(x.username)} ${esc(x.displayName || '')}${isMe ? ' <small class="ap-me">（你）</small>' : ''}${x.mustChangePassword ? ' · 待改密' : ''}</span>
        <span class="ap-user-acts">
          ${isMe || lastAdmin
            ? `<span class="ap-perm-tag perm-${perm}" title="${esc(isMe ? '不可變更自己的權限' : '至少要保留一位管理權限帳號')}">${PERM_LABEL[perm]}</span>`
            : `<select class="ap-perm-select" data-act="perm" data-id="${Number(x.id)}" data-name="${esc(x.username)}" data-prev="${perm}" aria-label="${esc(x.username)} 的權限群組">${permOptions(perm)}</select>`}
          ${isMe ? '' : `
            <button class="btn" data-act="reset" data-id="${Number(x.id)}" data-name="${esc(x.username)}">重設密碼</button>
            ${lastAdmin ? '' : `<button class="btn danger" data-act="delete" data-id="${Number(x.id)}" data-name="${esc(x.username)}">刪除</button>`}`}
        </span>
      </div>`;
    }).join('') || '<div class="ap-note">尚無帳號</div>';
    $('loginLogEl').innerHTML = l.logs.map(x =>
      `<div>${esc(x.created_at)} · ${esc(x.username)} · ${esc(eventText(x.event))} · ${x.success ? '成功' : '失敗'}</div>`
    ).join('') || '<div class="ap-note">尚無紀錄</div>';
  }
  function bindAdminList() {
    const list = $('userListEl');
    if (!list || list.dataset.bound) return;
    list.dataset.bound = '1';
    list.addEventListener('click', e => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = Number(btn.dataset.id), name = btn.dataset.name;
      if (btn.dataset.act === 'reset') resetUserPwd(id, name); else deleteUser(id, name);
    });
    list.addEventListener('change', e => {
      const sel = e.target.closest('select[data-act="perm"]');
      if (sel) setUserPermission(Number(sel.dataset.id), sel.dataset.name, sel.value, sel);
    });
  }
  // 管理權限看到完整後台；更新報表權限只看到「上傳每月 Excel」
  function setPanelMode(mode) {
    const panel = $('adminPanel');
    if (!panel) return;
    panel.dataset.mode = mode;
    panel.querySelectorAll('[data-admin-only]').forEach(el => { el.style.display = mode === 'admin' ? '' : 'none'; });
    const title = $('adminPanelTitle');
    if (title) title.textContent = mode === 'admin' ? '⚙ 帳號管理' : '⤒ 上傳每月報表';
  }
  async function openAdminPanel() {
    const perm = permOf(currentUser());
    if (perm === 'viewer') { alert('目前帳號為瀏覽權限，無法使用後台'); return; }
    $('adminPanel').style.display = 'flex';
    setPanelMode(perm === 'admin' ? 'admin' : 'upload');
    if (perm !== 'admin') return;
    bindAdminList();
    try { await renderAdmin(); } catch (e) { alert(e.message); }
  }
  async function setUserPermission(id, name, permission, sel) {
    if (!confirm(`確定把「${name}」改為「${PERM_LABEL[permission]}」？\n${PERM_DESC[permission]}。\n對方需要重新登入才會套用。`)) {
      if (sel) sel.value = sel.dataset.prev;
      return;
    }
    try {
      await api(`/api/admin/users/${Number(id)}/permission`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ permission }) });
      await renderAdmin();
    } catch (e) { alert(e.message); if (sel) sel.value = sel.dataset.prev; }
  }
  function closeAdminPanel() { $('adminPanel').style.display = 'none'; }
  async function addUser() {
    const err = $('addUserErr'); err.textContent = '';
    try {
      await api('/api/admin/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        username: $('newUserInput').value.trim(), displayName: $('newNameInput').value.trim(), temporaryPassword: $('newTempPassword').value,
        permission: ($('newUserPermission') && $('newUserPermission').value) || 'viewer',
      }) });
      for (const id of ['newUserInput', 'newNameInput', 'newTempPassword']) $(id).value = '';
      if ($('newUserPermission')) $('newUserPermission').value = 'viewer';
      await renderAdmin();
    } catch (e) { err.textContent = e.message; }
  }
  async function resetUserPwd(id, name) {
    const temporaryPassword = prompt(`為「${name}」設定新的暫時密碼（至少 10 碼）。對方下次登入須改密碼。`);
    if (!temporaryPassword) return;
    try { await api(`/api/admin/users/${Number(id)}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ temporaryPassword }) }); await renderAdmin(); }
    catch (e) { alert(e.message); }
  }
  async function deleteUser(id, name) {
    if (!confirm(`確定刪除帳號「${name}」？此動作無法復原。`)) return;
    try { await api(`/api/admin/users/${Number(id)}`, { method: 'DELETE' }); await renderAdmin(); }
    catch (e) { alert(e.message); }
  }
  async function uploadExcel(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const info = window.RepairMonthlySource?.monthInfo;
    if (info) { try { info(file.name); } catch (e) { alert(e.message); input.value = ''; return; } }
    const form = new FormData(); form.append('file', file);
    try {
      await api('/api/upload', { method: 'POST', body: form });
      alert(`「${file.name}」已上傳至 date 資料夾。稍候按「檢查更新」即可看到新資料。`);
      if (permOf(currentUser()) === 'admin') await renderAdmin();
    }
    catch (e) { alert(e.message); }
    finally { input.value = ''; }
  }

  return {
    boot, doLogin, doChangePw, logout, cancelChangePassword,
    openChangePassword: () => showChangePw(false),
    openAdminPanel, closeAdminPanel, addUser, resetUserPwd, deleteUser, uploadExcel, setUserPermission,
    permission: () => permOf(currentUser()),
    // app.js 仍會呼叫的共用功能，轉交給 TitanUI
    requestNotificationPermission: (...a) => UI().requestNotificationPermission?.(...a) || Promise.resolve(),
    notifyNewAnomalies: (...a) => UI().notifyNewAnomalies?.(...a),
    lazyChart: (...a) => UI().lazyChart?.(...a),
    _esc: esc,
  };
})();
