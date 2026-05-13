import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Appointments, getToken, getUser, esc } from '../utils/api';
import { Sidebar, Badge, Spinner, EmptyState } from '../components/UI';
import { useToast } from '../utils/ToastContext';

export default function Doctor() {
  const navigate = useNavigate();
  const toast    = useToast();

  useEffect(() => {
    if (!getToken()) navigate('/');
    const u = getUser();
    if (u?.role !== 'DOCTOR') navigate('/');
  }, []);

  const [page, setPage]   = useState('schedule');
  const [appts, setAppts] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);

  // List filters
  const [listDate, setListDate]     = useState('');
  const [listStatus, setListStatus] = useState('');

  // Patient modal
  const [selAppt, setSelAppt]     = useState(null);
  const [statusLoading, setStatusLoading] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const data = await Appointments.doctor().catch(() => []);
    setAppts(data || []);
  }

  // ── WEEK GRID ──
  function getWeekDays() {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  const days = getWeekDays();
  const todayStr = new Date().toDateString();
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const weekLabel = `${days[0].toLocaleDateString('ru', { day:'2-digit', month:'long' })} — ${days[6].toLocaleDateString('ru', { day:'2-digit', month:'long', year:'numeric' })}`;

  // ── LIST ──
  const filteredList = appts.filter(a => {
    const matchDate   = !listDate   || a.start_time.startsWith(listDate);
    const matchStatus = !listStatus || a.status_name === listStatus;
    return matchDate && matchStatus;
  });
  const now = new Date();
  const upcomingList = filteredList.filter(a => new Date(a.start_time) >= now).sort((a,b) => new Date(a.start_time)-new Date(b.start_time));
  const archiveList  = filteredList.filter(a => new Date(a.start_time) < now).sort((a,b) => new Date(b.start_time)-new Date(a.start_time));

  // ── STATUS UPDATE ──
  async function updateStatus(status) {
    setStatusLoading(status);
    try {
      await Appointments.status(selAppt.id, status);
      setAppts(prev => prev.map(a => a.id === selAppt.id ? { ...a, status_name: status } : a));
      setSelAppt(prev => ({ ...prev, status_name: status }));
      toast(status === 'COMPLETED' ? 'Приём завершён' : status === 'CONFIRMED' ? 'Запись подтверждена' : 'Приём отменён', 'success');
      setSelAppt(null);
    } catch(e) { toast(e.message, 'error'); }
    finally { setStatusLoading(''); }
  }

  const navItems = [
    { id:'schedule', label:'Расписание', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { id:'list',     label:'Список записей', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  ];

  return (
    <div className="app-layout">
      <Sidebar label="Кабинет врача" navItems={navItems} activePage={page} onNav={setPage}/>

      <div className="main-content">
        {/* ── SCHEDULE ── */}
        {page === 'schedule' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Расписание на неделю
              </span>
              <div className="topbar-right">
                <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o-1)}>← Назад</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>Сегодня</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o+1)}>Вперёд →</button>
              </div>
            </div>
            <div className="page-content">
              <div id="week-range" style={{ fontSize:13, color:'var(--gray-500)', marginBottom:'1rem' }}>{weekLabel}</div>
              <div className="week-grid">
                {days.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isToday = d.toDateString() === todayStr;
                  const dayAppts = appts.filter(a => a.start_time.startsWith(dateStr)).sort((a,b) => new Date(a.start_time)-new Date(b.start_time));
                  return (
                    <div key={i} className={`week-day${isToday ? ' today' : ''}`}>
                      <div className="week-day-head">
                        <span className="dn">{d.getDate()}</span>{dayNames[i]}
                      </div>
                      {dayAppts.map(a => {
                        const cls = a.status_name === 'COMPLETED' ? 'done' : a.status_name === 'CANCELLED' ? 'cancelled' : '';
                        const time = new Date(a.start_time).toLocaleString('ru', { hour:'2-digit', minute:'2-digit' });
                        return (
                          <div key={a.id} className={`week-appt ${cls}`} onClick={() => setSelAppt(a)} title={`Пациент #${a.patient_id}`}>
                            {time} #{a.patient_id}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:'1rem', display:'flex', gap:'1rem', fontSize:12 }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:'var(--blue-light)', display:'inline-block' }}/> Создана</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:'var(--green-light)', display:'inline-block' }}/> Подтверждена</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:'var(--gray-200)', display:'inline-block' }}/> Завершена</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:12, height:12, borderRadius:3, background:'var(--red-light)', display:'inline-block' }}/> Отменена</span>
              </div>
            </div>
          </div>
        )}

        {/* ── LIST ── */}
        {page === 'list' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                Список записей
              </span>
            </div>
            <div className="page-content">
              <div className="filter-bar">
                <input type="date" className="form-control" style={{ maxWidth:180 }} value={listDate} onChange={e => setListDate(e.target.value)}/>
                <select className="form-control" style={{ maxWidth:200 }} value={listStatus} onChange={e => setListStatus(e.target.value)}>
                  <option value="">Все статусы</option>
                  <option value="CREATED">Создана</option>
                  <option value="CONFIRMED">Подтверждена</option>
                  <option value="COMPLETED">Завершена</option>
                  <option value="CANCELLED">Отменена</option>
                </select>
              </div>
              <div className="card">
                {!upcomingList.length && !archiveList.length ? (
                  <EmptyState
                    icon={<svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    title="Нет записей" subtitle="Измените фильтр"
                  />
                ) : (
                  <>
                    {upcomingList.length > 0 && (
                      <>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-600)', padding:'12px 16px 6px' }}>Предстоящие ({upcomingList.length})</div>
                        {upcomingList.map(a => <DocApptItem key={a.id} a={a} onClick={() => setSelAppt(a)}/>)}
                      </>
                    )}
                    {archiveList.length > 0 && (
                      <>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-400)', padding:'16px 16px 6px', borderTop: upcomingList.length ? '1px solid var(--gray-100)' : 'none' }}>Прошедшие ({archiveList.length})</div>
                        {archiveList.map(a => <DocApptItem key={a.id} a={a} onClick={() => setSelAppt(a)}/>)}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PATIENT MODAL */}
      {selAppt && (
        <div className="modal-overlay show" id="pm-overlay" onClick={e => { if(e.target.id==='pm-overlay') setSelAppt(null); }}>
          <div className="modal" style={{ maxWidth:480 }}>
            <button className="modal-close" onClick={() => setSelAppt(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="modal-title">Карточка приёма</div>
              <div className="modal-sub">{new Date(selAppt.start_time).toLocaleString('ru', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:'1rem' }}>
                <InfoRow icon="user" label="Пациент" value={`#${selAppt.patient_id}`}/>
                <InfoRow icon="clock" label="Время приёма" value={new Date(selAppt.start_time).toLocaleString('ru', { hour:'2-digit', minute:'2-digit' })}/>
                {selAppt.complaints && <InfoRow icon="file" label="Жалобы" value={selAppt.complaints}/>}
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <svg width="16" height="16" fill="none" stroke="var(--blue-mid)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink:0 }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  <div><div style={{ fontSize:12, color:'var(--gray-500)' }}>Статус</div><Badge status={selAppt.status_name}/></div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="btn btn-success btn-sm"
                  disabled={['COMPLETED','CANCELLED'].includes(selAppt.status_name) || statusLoading === 'COMPLETED'}
                  onClick={() => updateStatus('COMPLETED')}>
                  {statusLoading === 'COMPLETED' ? <Spinner size={13}/> : <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                  Завершить
                </button>
                <button className="btn btn-blue btn-sm"
                  disabled={['CONFIRMED','COMPLETED','CANCELLED'].includes(selAppt.status_name) || statusLoading === 'CONFIRMED'}
                  onClick={() => updateStatus('CONFIRMED')}>
                  {statusLoading === 'CONFIRMED' ? <Spinner size={13}/> : null}
                  Подтвердить
                </button>
                <button className="btn btn-danger btn-sm"
                  disabled={['COMPLETED','CANCELLED'].includes(selAppt.status_name) || statusLoading === 'CANCELLED'}
                  onClick={() => updateStatus('CANCELLED')}>
                  {statusLoading === 'CANCELLED' ? <Spinner size={13}/> : null}
                  Отменить
                </button>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => setSelAppt(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  const icons = {
    user: <svg width="16" height="16" fill="none" stroke="var(--blue-mid)" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    clock: <svg width="16" height="16" fill="none" stroke="var(--blue-mid)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    file: <svg width="16" height="16" fill="none" stroke="var(--blue-mid)" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  };
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <div style={{ marginTop:2, flexShrink:0 }}>{icons[icon]}</div>
      <div>
        <div style={{ fontSize:12, color:'var(--gray-500)' }}>{label}</div>
        <div style={{ fontWeight:600 }}>{value}</div>
      </div>
    </div>
  );
}

function DocApptItem({ a, onClick }) {
  const d = new Date(a.start_time);
  return (
    <div className="appt-item" style={{ cursor:'pointer' }} onClick={onClick}>
      <div className="appt-date-box">
        <div className="day">{d.getDate()}</div>
        <div className="mon">{d.toLocaleString('ru', { month:'short' })}</div>
      </div>
      <div className="appt-info">
        <div className="appt-title">Пациент #{a.patient_id}</div>
        <div className="appt-time">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {d.toLocaleString('ru', { weekday:'short', hour:'2-digit', minute:'2-digit' })}
        </div>
        {a.complaints && <div className="appt-note">{a.complaints}</div>}
        <div style={{ marginTop:5 }}><Badge status={a.status_name || 'CREATED'}/></div>
      </div>
      <div className="appt-actions">
        <button className="btn btn-outline btn-sm">Открыть</button>
      </div>
    </div>
  );
}
