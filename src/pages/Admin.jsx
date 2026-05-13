import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Doctors, Appointments, getToken, getUser, esc } from '../utils/api';
import { Sidebar, Badge, Spinner, EmptyState } from '../components/UI';
import { useToast } from '../utils/ToastContext';

export default function Admin() {
  const navigate = useNavigate();
  const toast    = useToast();

  useEffect(() => {
    if (!getToken()) navigate('/');
    const u = getUser();
    if (u?.role !== 'ADMIN') navigate('/');
  }, []);

  const [page, setPage] = useState('dashboard');

  // Dashboard
  const [dashUsers, setDashUsers]   = useState([]);
  const [dashAudit, setDashAudit]   = useState([]);

  // Users
  const [allUsers, setAllUsers]     = useState([]);
  const [usersQ, setUsersQ]         = useState('');
  const [usersRole, setUsersRole]   = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create doctor modal
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [specs, setSpecs]           = useState([]);
  const [cdEmail, setCdEmail]       = useState('');
  const [cdPass,  setCdPass]        = useState('');
  const [cdSpec,  setCdSpec]        = useState('');
  const [cdCab,   setCdCab]         = useState('');
  const [cdLoading, setCdLoading]   = useState(false);
  const [cdMsg, setCdMsg]           = useState(null); // {type, text}

  // Appointments
  const [allAppts, setAllAppts]     = useState([]);
  const [apptStatus, setApptStatus] = useState('');
  const [apptModal, setApptModal]   = useState(null);
  const [apptNewStatus, setApptNewStatus] = useState('CONFIRMED');
  const [apptSaveLoading, setApptSaveLoading] = useState(false);

  // Audit
  const [allAudit, setAllAudit]     = useState([]);
  const [auditQ, setAuditQ]         = useState('');
  const [auditResult, setAuditResult] = useState('');

  useEffect(() => { loadDashboard(); initSpecs(); }, []);

  async function loadDashboard() {
    const [users, audit] = await Promise.all([
      Users.all().catch(() => []),
      Users.auditLog().catch(() => []),
    ]);
    setDashUsers(users || []);
    setDashAudit(audit || []);
  }

  async function initSpecs() {
    const sp = await Doctors.specializations().catch(() => []);
    setSpecs(sp || []);
  }

  async function navTo(id) {
    setPage(id);
    if (id === 'users') { const u = await Users.all().catch(() => []); setAllUsers(u || []); }
    if (id === 'appointments') { const a = await Appointments.my().catch(() => []); setAllAppts(a || []); }
    if (id === 'audit') { const a = await Users.auditLog().catch(() => []); setAllAudit(a || []); }
  }

  // ── DASHBOARD STATS ──
  const patients = dashUsers.filter(u => u.role?.name === 'PATIENT').length;
  const doctors  = dashUsers.filter(u => u.role?.name === 'DOCTOR').length;
  const errors   = dashAudit.filter(a => a.result === 'error').length;
  const recentAudit = dashAudit.slice(0, 8);

  // ── USERS ──
  const filteredUsers = allUsers.filter(u =>
    (!usersQ || (u.email||'').toLowerCase().includes(usersQ.toLowerCase())) &&
    (!usersRole || u.role?.name === usersRole)
  );

  async function doDelete() {
    setDeleteLoading(true);
    try {
      await Users.delete(deleteTarget.id);
      setDeleteTarget(null);
      toast('Пользователь удалён', 'success');
      const u = await Users.all().catch(() => []);
      setAllUsers(u || []);
    } catch(e) { toast(e.message, 'error'); }
    finally { setDeleteLoading(false); }
  }

  // ── CREATE DOCTOR ──
  async function createDoctor(e) {
    e.preventDefault();
    setCdLoading(true); setCdMsg(null);
    try {
      await Doctors.create({ email: cdEmail, password: cdPass, specialization_id: parseInt(cdSpec), cabinet_number: cdCab });
      setCdMsg({ type:'success', text:`Врач создан! Передайте пароль: ${cdPass}` });
      setCdEmail(''); setCdPass(''); setCdSpec(''); setCdCab('');
      toast('Аккаунт врача создан', 'success');
      const u = await Users.all().catch(() => []);
      setAllUsers(u || []);
    } catch(err) {
      setCdMsg({ type:'error', text: err.message });
    } finally { setCdLoading(false); }
  }

  // ── APPOINTMENTS ──
  const filteredAppts = allAppts.filter(a => !apptStatus || a.status_name === apptStatus)
    .sort((a,b) => new Date(b.start_time)-new Date(a.start_time));

  async function saveApptStatus() {
    setApptSaveLoading(true);
    try {
      await Appointments.status(apptModal, apptNewStatus);
      setApptModal(null);
      toast('Статус обновлён', 'success');
      const a = await Appointments.my().catch(() => []);
      setAllAppts(a || []);
    } catch(e) { toast(e.message, 'error'); }
    finally { setApptSaveLoading(false); }
  }

  // ── AUDIT ──
  const filteredAudit = allAudit.filter(a =>
    (!auditQ || (a.action||'').toLowerCase().includes(auditQ.toLowerCase())) &&
    (!auditResult || a.result === auditResult)
  );

  const roleLabel = { PATIENT:'Пациент', DOCTOR:'Врач', ADMIN:'Администратор' };
  const roleClass = { PATIENT:'badge-blue', DOCTOR:'badge-green', ADMIN:'badge-yellow' };

  const navItems = [
    { id:'dashboard',    label:'Дашборд', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id:'users',        label:'Пользователи', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id:'appointments', label:'Записи', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id:'audit',        label:'Журнал аудита', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  ];

  function fmtDate(dt) { return new Date(dt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }

  return (
    <div className="app-layout">
      <Sidebar label="Администрирование" navItems={navItems} activePage={page} onNav={navTo}/>

      <div className="main-content">

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Дашборд
              </span>
              <div className="topbar-right">
                <button className="btn btn-blue btn-sm" onClick={() => setCreateDocOpen(true)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Добавить врача
                </button>
              </div>
            </div>
            <div className="page-content">
              <div className="stats-grid">
                {[
                  { cls:'si-blue', label:'Пациентов', val: patients, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
                  { cls:'si-green', label:'Врачей', val: doctors, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
                  { cls:'si-yellow', label:'Всего пользователей', val: dashUsers.length, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                  { cls:'si-red', label:'Ошибок в журнале', val: errors, icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.val}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Последние действия
                  </div>
                </div>
                {recentAudit.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Время</th><th>Пользователь</th><th>Действие</th><th>Результат</th></tr></thead>
                      <tbody>
                        {recentAudit.map((a, i) => (
                          <tr key={i}>
                            <td style={{ fontSize:13, color:'var(--gray-500)' }}>{fmtDate(a.action_time)}</td>
                            <td>{a.user_id ? `#${a.user_id}` : '—'}</td>
                            <td><code style={{ fontSize:12, background:'var(--gray-100)', padding:'2px 6px', borderRadius:4 }}>{a.action}</code></td>
                            <td>{a.result === 'success' ? <span className="badge badge-green">Успех</span> : <span className="badge badge-red">Ошибка</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="empty-state"><p>Журнал пуст</p></div>}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {page === 'users' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Пользователи
              </span>
              <div className="topbar-right">
                <button className="btn btn-blue btn-sm" onClick={() => setCreateDocOpen(true)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Добавить врача
                </button>
              </div>
            </div>
            <div className="page-content">
              <div className="filter-bar">
                <div className="input-wrap" style={{ flex:1, maxWidth:280 }}>
                  <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" className="form-control" placeholder="Поиск по email..." value={usersQ} onChange={e => setUsersQ(e.target.value)}/>
                </div>
                <select className="form-control" style={{ maxWidth:180 }} value={usersRole} onChange={e => setUsersRole(e.target.value)}>
                  <option value="">Все роли</option>
                  <option value="PATIENT">Пациент</option>
                  <option value="DOCTOR">Врач</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Email</th><th>Роль</th><th>Email подтверждён</th><th>Создан</th><th></th></tr></thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan="6"><EmptyState title="Нет пользователей"/></td></tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td style={{ color:'var(--gray-500)', fontSize:13 }}>#{u.id}</td>
                          <td><strong>{u.email}</strong></td>
                          <td><span className={`badge ${roleClass[u.role?.name] || 'badge-gray'}`}>{roleLabel[u.role?.name] || u.role?.name || '—'}</span></td>
                          <td>{u.is_email_verified ? <span className="badge badge-green">✓</span> : <span className="badge badge-yellow">✗</span>}</td>
                          <td style={{ fontSize:13, color:'var(--gray-500)' }}>{fmtDate(u.created_at)}</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(u)}>
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── APPOINTMENTS ── */}
        {page === 'appointments' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Все записи
              </span>
              <div className="topbar-right">
                <select className="form-control" style={{ maxWidth:180 }} value={apptStatus} onChange={e => setApptStatus(e.target.value)}>
                  <option value="">Все статусы</option>
                  <option value="CREATED">Создана</option>
                  <option value="CONFIRMED">Подтверждена</option>
                  <option value="COMPLETED">Завершена</option>
                  <option value="CANCELLED">Отменена</option>
                </select>
              </div>
            </div>
            <div className="page-content">
              <div className="card" id="admin-appts-card">
                {filteredAppts.length === 0 ? <EmptyState title="Нет записей"/> : filteredAppts.map(a => {
                  const d = new Date(a.start_time);
                  return (
                    <div key={a.id} className="appt-item">
                      <div className="appt-date-box">
                        <div className="day">{d.getDate()}</div>
                        <div className="mon">{d.toLocaleString('ru', { month:'short' })}</div>
                      </div>
                      <div className="appt-info">
                        <div className="appt-title">Пациент #{a.patient_id} → Врач #{a.doctor_id}</div>
                        <div className="appt-time">
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {d.toLocaleString('ru', { weekday:'short', hour:'2-digit', minute:'2-digit' })}
                        </div>
                        <div style={{ marginTop:5 }}><Badge status={a.status_name || 'CREATED'}/></div>
                      </div>
                      <div className="appt-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => { setApptModal(a.id); setApptNewStatus('CONFIRMED'); }}>Статус</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT ── */}
        {page === 'audit' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Журнал аудита
              </span>
            </div>
            <div className="page-content">
              <div className="filter-bar">
                <div className="input-wrap" style={{ flex:1, maxWidth:300 }}>
                  <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" className="form-control" placeholder="Поиск по действию..." value={auditQ} onChange={e => setAuditQ(e.target.value)}/>
                </div>
                <select className="form-control" style={{ maxWidth:180 }} value={auditResult} onChange={e => setAuditResult(e.target.value)}>
                  <option value="">Все результаты</option>
                  <option value="success">Успех</option>
                  <option value="error">Ошибка</option>
                </select>
              </div>
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Время</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th>Результат</th></tr></thead>
                    <tbody>
                      {filteredAudit.length === 0 ? (
                        <tr><td colSpan="5"><EmptyState title="Нет записей"/></td></tr>
                      ) : filteredAudit.map((a, i) => (
                        <tr key={i}>
                          <td style={{ fontSize:12, color:'var(--gray-500)', whiteSpace:'nowrap' }}>{fmtDate(a.action_time)}</td>
                          <td>{a.user_id ? `#${a.user_id}` : <span style={{ color:'var(--gray-400)' }}>—</span>}</td>
                          <td><code style={{ fontSize:12, background:'var(--gray-100)', padding:'2px 6px', borderRadius:4 }}>{a.action}</code></td>
                          <td style={{ fontSize:13 }}>{a.object_type} {a.object_id ? `#${a.object_id}` : ''}</td>
                          <td>{a.result === 'success' ? <span className="badge badge-green">Успех</span> : <span className="badge badge-red">Ошибка</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE DOCTOR MODAL */}
      {createDocOpen && (
        <div className="modal-overlay show" id="cd-overlay" onClick={e => { if(e.target.id==='cd-overlay') setCreateDocOpen(false); }}>
          <div className="modal" style={{ maxWidth:460 }}>
            <button className="modal-close" onClick={() => setCreateDocOpen(false)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <div className="modal-title">Добавить врача</div>
              <div className="modal-sub">Создать аккаунт для нового врача</div>
            </div>
            <div className="modal-body">
              {cdMsg && (
                <div style={{ background: cdMsg.type==='success' ? 'var(--green-light)' : 'var(--red-light)', color: cdMsg.type==='success' ? 'var(--green)' : 'var(--red)', border: `1px solid ${cdMsg.type==='success' ? '#86efac' : '#fca5a5'}`, borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>
                  {cdMsg.text}
                </div>
              )}
              <form onSubmit={createDoctor}>
                <div className="form-group">
                  <label className="form-label">Email врача</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input type="email" className="form-control" placeholder="doctor@clinic.ru" required value={cdEmail} onChange={e => setCdEmail(e.target.value)}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Временный пароль</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type="text" className="form-control" placeholder="Передайте врачу" required minLength="6" value={cdPass} onChange={e => setCdPass(e.target.value)}/>
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:4 }}>Минимум 6 символов. Сообщите врачу этот пароль.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Специализация</label>
                  <select className="form-control" required value={cdSpec} onChange={e => setCdSpec(e.target.value)}>
                    <option value="">Выберите специализацию</option>
                    {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Номер кабинета</label>
                  <input type="text" className="form-control" placeholder="101" required value={cdCab} onChange={e => setCdCab(e.target.value)}/>
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={cdLoading}>
                  {cdLoading ? <Spinner size={15}/> : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
                  Создать аккаунт врача
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteTarget && (
        <div className="modal-overlay show" id="del-overlay" onClick={e => { if(e.target.id==='del-overlay') setDeleteTarget(null); }}>
          <div className="modal" style={{ maxWidth:380 }}>
            <button className="modal-close" onClick={() => setDeleteTarget(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon" style={{ background:'var(--red-light)', color:'var(--red)' }}>
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <div className="modal-title">Удалить пользователя?</div>
              <div className="modal-sub">Удалить: {deleteTarget.email}</div>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setDeleteTarget(null)}>Отмена</button>
                <button className="btn btn-danger btn-full" onClick={doDelete} disabled={deleteLoading}>
                  {deleteLoading ? <Spinner size={14}/> : null} Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPT STATUS MODAL */}
      {apptModal && (
        <div className="modal-overlay show" id="as-overlay" onClick={e => { if(e.target.id==='as-overlay') setApptModal(null); }}>
          <div className="modal" style={{ maxWidth:360 }}>
            <button className="modal-close" onClick={() => setApptModal(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div className="modal-title">Изменить статус</div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Новый статус</label>
                <select className="form-control" value={apptNewStatus} onChange={e => setApptNewStatus(e.target.value)}>
                  <option value="CONFIRMED">Подтверждена</option>
                  <option value="COMPLETED">Завершена</option>
                  <option value="CANCELLED">Отменена</option>
                </select>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setApptModal(null)}>Отмена</button>
                <button className="btn btn-primary btn-full" onClick={saveApptStatus} disabled={apptSaveLoading}>
                  {apptSaveLoading ? <Spinner size={14}/> : null} Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
