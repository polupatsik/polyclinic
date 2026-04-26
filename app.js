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
function requireRole(...roles) {
  requireAuth();
  const u = getUser();
  if (!roles.includes(u?.role)) window.location.href = '/index.html';
}
function redirectByRole() {
  const u = getUser();
  if (!u) return;
  const map = { PATIENT: '/patient.html', DOCTOR: '/doctor.html', ADMIN: '/admin.html' };
  window.location.href = map[u.role] || '/index.html';
}

/* ── API ДЛЯ ПАЦИЕНТА ── */
const Doctors = {
  list: (specId) => apiFetch('/api/doctors/' + (specId ? `?specialization_id=${specId}` : '')),
  specializations: () => apiFetch('/api/doctors/specializations'),
  slots: (id, date) => apiFetch(`/api/doctors/${id}/slots?date=${date}`),
  create: (data) => apiFetch('/api/users/doctors', { method: 'POST', body: JSON.stringify(data) }),
};
const AI = {
  start:  ()             => apiFetch('/api/ai/start', { method:'POST' }),
  answer: (qid, qn, ans) => apiFetch('/api/ai/answer', { method:'POST', body: JSON.stringify({ questionnaire_id: qid, question_id: qn, answer: ans }) }),
};

/* ── API ДЛЯ АДМИНИСТРАТОРА ── */
const Users = {
  all:      ()   => apiFetch('/api/users/'),
  delete:   (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  auditLog: ()   => apiFetch('/api/users/audit-log'),
};

/* ── API ДЛЯ ПАЦИЕНТА И ВРАЧА ── */
const Appointments = {
  my:     ()       => apiFetch('/api/appointments/my'),
  doctor: ()       => apiFetch('/api/appointments/doctor'),
  create: (data)   => apiFetch('/api/appointments/', { method:'POST', body: JSON.stringify(data) }),
  cancel: (id)     => apiFetch(`/api/appointments/${id}`, { method:'DELETE' }),
  status: (id, s)  => apiFetch(`/api/appointments/${id}/status`, { method:'PATCH', body: JSON.stringify({ status: s }) }),
};

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

function statusBadge(s) {
  const map = {
    CREATED:   ['badge-blue','Создана'],
    CONFIRMED: ['badge-green','Подтверждена'],
    COMPLETED: ['badge-gray','Завершена'],
    CANCELLED: ['badge-red','Отменена'],
  };
  const [cls, label] = map[s] || ['badge-gray', s || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function fmtTime(dt) { return new Date(dt).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit' }); }
function fmtDate(dt) { return new Date(dt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Moscow' }); }

function setLoading(btn, on, text = '') {
  if (on) { btn.disabled = true; btn._orig = btn.innerHTML; btn.innerHTML = `<span class="spinner" style="width:15px;height:15px;border-width:2px;"></span> ${text}`; }
  else    { btn.disabled = false; btn.innerHTML = btn._orig || text; }
}

function renderSidebarUser() {
  const u = getUser(); if (!u) return;
  const el = document.getElementById('sidebar-user-block'); if (!el) return;
  const roleLabel = { PATIENT:'Пациент', DOCTOR:'Врач', ADMIN:'Администратор' };
  const initials = u.email ? u.email[0].toUpperCase() : '?';
  el.innerHTML = `
    <div class="sidebar-avatar">${initials}</div>
    <div>
      <div class="sidebar-user-name">${esc(u.email)}</div>
      <div class="sidebar-user-role">${roleLabel[u.role] || u.role}</div>
    </div>`;
}

/* ── SPINNER STYLE ── */
if (!document.querySelector('#spinner-style')) {
  const style = document.createElement('style');
  style.id = 'spinner-style';
  style.textContent = `.spinner{width:22px;height:22px;border:2.5px solid var(--gray-200);border-top-color:var(--blue-mid);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}@keyframes spin{to{transform:rotate(360deg);}}`;
  document.head.appendChild(style);
}

/* ── SVG ICONS  ── */
const ICONS = {
  home:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  calendar: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  users:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  search:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  ai:       `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  logout:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  clock:    `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  door:     `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  list:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  plus:     `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  log:      `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  check:    `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  person:   `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  stethoscope: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
};