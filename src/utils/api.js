const API = 'http://localhost:8000';

// ── TOKEN / USER ──
export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => localStorage.setItem('token', t);
export const rmToken  = () => localStorage.removeItem('token');
export const getUser  = () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } };
export const setUser  = (u) => localStorage.setItem('user', JSON.stringify(u));
export const rmUser   = () => localStorage.removeItem('user');

export function parseJwt(t) {
  try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
}

export function logout() {
  rmToken(); rmUser();
  window.location.href = '/';
}

// ── FETCH ──
export async function apiFetch(path, opts = {}) {
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

export async function apiForm(path, fd) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { method: 'POST', headers, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Неверный логин или пароль');
  return data;
}

// ── AUTH ──
export async function login(email, password) {
  const fd = new FormData();
  fd.append('username', email);
  fd.append('password', password);
  const data = await apiForm('/api/auth/login', fd);
  setToken(data.access_token);
  const p = parseJwt(data.access_token);
  setUser({ id: parseInt(p.sub), email, role: p.role });
  return p.role;
}

export async function register(email, password, birthDate) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, birth_date: birthDate }),
  });
}

export async function getMe() { return apiFetch('/api/auth/me'); }
export async function resendVerification() { return apiFetch('/api/auth/resend-verification', { method: 'POST' }); }

// ── DOCTORS ──
export const Doctors = {
  list:            (specId) => apiFetch('/api/doctors/' + (specId ? `?specialization_id=${specId}` : '')),
  specializations: ()       => apiFetch('/api/doctors/specializations'),
  slots:           (id, date) => apiFetch(`/api/doctors/${id}/slots?date=${date}`),
  create:          (data)   => apiFetch('/api/users/doctors', { method: 'POST', body: JSON.stringify(data) }),
};

// ── APPOINTMENTS ──
export const Appointments = {
  my:     ()       => apiFetch('/api/appointments/my'),
  doctor: ()       => apiFetch('/api/appointments/doctor'),
  create: (data)   => apiFetch('/api/appointments/', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id)     => apiFetch(`/api/appointments/${id}`, { method: 'DELETE' }),
  status: (id, s)  => apiFetch(`/api/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) }),
};

// ── AI ──
export const AI = {
  start:  ()             => apiFetch('/api/ai/start', { method: 'POST' }),
  answer: (qid, qn, ans) => apiFetch('/api/ai/answer', { method: 'POST', body: JSON.stringify({ questionnaire_id: qid, question_id: qn, answer: ans }) }),
};

// ── USERS (ADMIN) ──
export const Users = {
  all:      ()   => apiFetch('/api/users/'),
  delete:   (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  auditLog: ()   => apiFetch('/api/users/audit-log'),
};

// ── MISC ──
export const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

export function fmtDate(dt) {
  return new Date(dt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Moscow' });
}

export function statusLabel(s) {
  return { CREATED:'Создана', CONFIRMED:'Подтверждена', COMPLETED:'Завершена', CANCELLED:'Отменена' }[s] || s;
}
export function statusColor(s) {
  return { CREATED:'blue', CONFIRMED:'green', COMPLETED:'gray', CANCELLED:'red' }[s] || 'gray';
}