const API = 'http://localhost:8000';

/* ── TOKEN / USER ── */
const getToken  = () => localStorage.getItem('token');
const setToken  = t => localStorage.setItem('token', t);
const rmToken   = () => localStorage.removeItem('token');
const getUser   = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };
const setUser   = u => localStorage.setItem('user', JSON.stringify(u));
const rmUser    = () => localStorage.removeItem('user');

function parseJwt(t) {
  try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
}

/* ── FETCH ── */
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401) { logout(); return; }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Ошибка сервера');
  return data;
}

async function apiForm(path, fd) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { method: 'POST', headers, body: fd });
  if (res.status === 401) { logout(); return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Ошибка входа');
  return data;
}

/* ── AUTH ── */
async function login(email, password) {
  const fd = new FormData();
  fd.append('username', email);
  fd.append('password', password);
  const data = await apiForm('/api/auth/login', fd);
  setToken(data.access_token);
  const p = parseJwt(data.access_token);
  setUser({ id: parseInt(p.sub), email, role: p.role });
  return p.role;
}

async function register(email, password, birthDate) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, birth_date: birthDate })
  });
}

function logout() { rmToken(); rmUser(); window.location.href = '/index.html'; }
function requireAuth() { if (!getToken()) window.location.href = '/index.html'; }
function redirectByRole() {
  const u = getUser();
  if (!u) return;
  const map = { PATIENT: '/pages/patient.html', DOCTOR: '/pages/doctor.html', ADMIN: '/pages/admin.html' };
  window.location.href = map[u.role] || '/index.html';
}

/* ── TOAST ── */
function toast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = {
    success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type]||icons.info}<span class="toast-msg">${escHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastIn .2s ease reverse'; setTimeout(() => el.remove(), 200); }, 3500);
}

/* ── MODAL HELPERS ── */
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

/* ── MISC HELPERS ── */
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
const escHtml = esc;

function setLoading(btn, on, text = '') {
  if (on) { btn.disabled = true; btn._orig = btn.innerHTML; btn.innerHTML = `<span class="spinner" style="width:15px;height:15px;border-width:2px;"></span> ${text}`; }
  else    { btn.disabled = false; btn.innerHTML = btn._orig || text; }
}

/* ── SPINNER STYLE ── */
if (!document.querySelector('#spinner-style')) {
  const style = document.createElement('style');
  style.id = 'spinner-style';
  style.textContent = `.spinner{width:22px;height:22px;border:2.5px solid var(--gray-200);border-top-color:var(--blue-mid);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}@keyframes spin{to{transform:rotate(360deg);}}`;
  document.head.appendChild(style);
}
