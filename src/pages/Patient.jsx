import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctors, Appointments, AI, getToken, getUser, getMe, resendVerification, esc } from '../utils/api';
import { Sidebar, Badge, Spinner, EmptyState } from '../components/UI';
import { useToast } from '../utils/ToastContext';

export default function Patient() {
  const navigate = useNavigate();
  const toast    = useToast();

  useEffect(() => {
    if (!getToken()) navigate('/');
    const u = getUser();
    if (u?.role !== 'PATIENT') navigate('/');
  }, []);

  const [page, setPage]         = useState('doctors');
  const [doctors, setDoctors]   = useState([]);
  const [specs, setSpecs]       = useState([]);
  const [docSearch, setDocSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [appts, setAppts]       = useState([]);
  const [apptFilter, setApptFilter] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);

  // Book modal
  const [bookModal, setBookModal] = useState(false);
  const [selDoc, setSelDoc]       = useState(null);
  const [bookDate, setBookDate]   = useState('');
  const [slots, setSlots]         = useState([]);
  const [selSlot, setSelSlot]     = useState(null);
  const [complaints, setComplaints] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookErr, setBookErr]     = useState('');

  // Cancel modal
  const [cancelId, setCancelId]   = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // AI widget
  const [aiQId, setAiQId]   = useState(null);
  const [aiMsgs, setAiMsgs] = useState([{ from:'bot', text:'Привет! Я помогу подобрать специалиста. Нажмите «Начать», чтобы пройти опрос.' }]);
  const [aiState, setAiState] = useState('idle'); // idle | running | done
  const [aiQData, setAiQData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiMessagesRef = useRef(null);

  useEffect(() => {
    if (aiMessagesRef.current) {
      aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
    }
  }, [aiMsgs]);
  useEffect(() => {
    loadDoctors();
    checkEmail();
  }, []);

  async function checkEmail() {
    try { const me = await getMe(); setEmailVerified(me.is_email_verified); } catch {}
  }

  async function loadDoctors() {
    const [docs, sp] = await Promise.all([
      Doctors.list().catch(() => []),
      Doctors.specializations().catch(() => []),
    ]);
    setDoctors(docs || []);
    setSpecs(sp || []);
  }

  async function loadAppts() {
    const data = await Appointments.my().catch(() => []);
    setAppts(data || []);
  }

  function navTo(id) {
    setPage(id);
    if (id === 'my-appts') loadAppts();
  }

  // Filtered doctors
  const filteredDocs = doctors.filter(d => {
    const email = (d.user?.email || '').toLowerCase();
    const spec  = (d.specialization?.name || '').toLowerCase();
    const q     = docSearch.toLowerCase();
    const matchQ = !q || `${email} ${spec}`.includes(q);
    const matchS = !specFilter || String(d.specialization_id) === specFilter;
    return matchQ && matchS;
  });

  // Open book modal
  function openBook(doc) {
    setSelDoc(doc);
    setBookErr('');
    setSelSlot(null);
    setComplaints('');
    const today = new Date().toISOString().split('T')[0];
    setBookDate(today);
    setBookModal(true);
    loadSlots(doc.user_id, today);
  }

  async function loadSlots(docId, date) {
    if (!date || !docId) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelSlot(null);
    try {
      const data = await Doctors.slots(docId, date);
      const busy = data.busy_slots || [];
      const all = [];
      for (let h = 8; h <= 17; h++) {
        all.push(`${String(h).padStart(2,'0')}:00`);
        if (h < 17) all.push(`${String(h).padStart(2,'0')}:30`);
      }

      const today = new Date().toISOString().split('T')[0];
      const isToday = date === today;
      const now = new Date();

      setSlots(all.filter(t => {
        if (busy.includes(t)) return false;
        if (isToday) {
          const [h, m] = t.split(':').map(Number);
          const slotTime = new Date();
          slotTime.setHours(h, m, 0, 0);
          return slotTime > now;
        }
        return true;
      }));
    } catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }

  async function submitBooking() {
    if (!selSlot) { toast('Выберите время', 'error'); return; }
    setBookLoading(true); setBookErr('');
    try {
      await Appointments.create({ doctor_id: selDoc.user_id, start_time: `${bookDate}T${selSlot}:00`, complaints });
      setBookModal(false);
      toast('Запись успешно создана!', 'success');
    } catch(e) { setBookErr(e.message); }
    finally { setBookLoading(false); }
  }

  async function doCancel() {
    setCancelLoading(true);
    try {
      await Appointments.cancel(cancelId);
      setCancelId(null);
      toast('Запись отменена', 'info');
      loadAppts();
    } catch(e) { toast(e.message, 'error'); }
    finally { setCancelLoading(false); }
  }

  // AI
  async function startAI() {
    setAiLoading(true);
    try {
      const data = await AI.start();
      setAiQId(data.questionnaire_id);
      setAiMsgs([{ from:'bot', text:'Отлично! Отвечайте «Да» или «Нет» на вопросы.' }, { from:'bot', text: data.question_text }]);
      setAiQData({ id: data.question_id });
      setAiState('running');
    } catch(e) { toast(e.message, 'error'); }
    finally { setAiLoading(false); }
  }

  async function answerAI(answer) {
    setAiMsgs(m => [...m, { from:'user', text: answer ? 'Да' : 'Нет' }]);
    setAiLoading(true);
    try {
      const data = await AI.answer(aiQId, aiQData.id, answer);
      if (data.finished) {
        setAiMsgs(m => [...m, { from:'bot', text:'Готово! Вот мои рекомендации:' }, { from:'result', spec: data.recommended_specialization || 'Терапевт', conf: data.confidence || 0 }]);
        setAiState('done');
        setAiQData(data);
      } else {
        setAiMsgs(m => [...m, { from:'bot', text: data.next_question_text }]);
        setAiQData({ id: data.next_question_id });
      }
    } catch(e) { toast(e.message, 'error'); }
    finally { setAiLoading(false); }
  }

  function resetAI() {
    setAiMsgs([{ from:'bot', text:'Привет! Я помогу подобрать специалиста. Нажмите «Начать», чтобы пройти опрос.' }]);
    setAiState('idle'); setAiQId(null); setAiQData(null);
  }

  function filterBySpec(specName) {
    const opt = specs.find(s => s.name.toLowerCase() === specName.toLowerCase());
    if (opt) setSpecFilter(String(opt.id));
    setPage('doctors');
    toast(`Показаны врачи: ${specName}`, 'info');
  }

  // Filtered appointments
  const now = new Date();
  const filteredAppts = appts.filter(a => !apptFilter || a.status_name === apptFilter);
  const upcomingAppts = filteredAppts.filter(a => new Date(a.start_time) >= now).sort((a,b) => new Date(a.start_time)-new Date(b.start_time));
  const archiveAppts  = filteredAppts.filter(a => new Date(a.start_time) < now).sort((a,b) => new Date(b.start_time)-new Date(a.start_time));

  const navItems = [
    { id:'doctors', label:'Врачи', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id:'my-appts', label:'Мои записи', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  ];

  return (
    <div className="app-layout">
      <Sidebar label="Кабинет пациента" navItems={navItems} activePage={page} onNav={navTo} emailVerified={emailVerified} />

      <div className="main-content">
        {/* ── DOCTORS PAGE ── */}
        {page === 'doctors' && (
          <div id="page-doctors">
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Запись к врачу
              </span>
              <div className="topbar-right">
                <button className="btn btn-blue btn-sm" onClick={() => navTo('my-appts')}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Мои записи
                </button>
              </div>
            </div>

            {!emailVerified && (
              <div style={{ background:'var(--yellow-light)', borderBottom:'1px solid #fcd34d', padding:'10px 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
                <span style={{ fontSize:13, color:'#92400e' }}>⚠ Ваш email не подтверждён. Проверьте почту.</span>
                <button className="btn btn-sm" style={{ background:'#d97706', color:'white', borderColor:'#d97706' }} onClick={async (e) => {
                  e.target.disabled = true; e.target.textContent = 'Отправляем...';
                  try { await resendVerification(); toast('Письмо отправлено!', 'success'); e.target.textContent = 'Отправлено ✓'; }
                  catch(err) { toast(err.message, 'error'); e.target.disabled = false; e.target.textContent = 'Отправить повторно'; }
                }}>Отправить повторно</button>
              </div>
            )}

            <div className="page-content">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'1.5rem', alignItems:'start' }}>
                <div>
                  <div className="filter-bar">
                    <div className="input-wrap" style={{ flex:1, maxWidth:300 }}>
                      <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input type="text" className="form-control" placeholder="Поиск врача..." value={docSearch} onChange={e => setDocSearch(e.target.value)}/>
                    </div>
                    <select className="form-control" value={specFilter} onChange={e => setSpecFilter(e.target.value)} style={{ maxWidth:200 }}>
                      <option value="">Все специализации</option>
                      {specs.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="doctors-grid">
                    {filteredDocs.length === 0 ? (
                      <EmptyState
                        icon={<svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                        title="Врачи не найдены"
                        subtitle="Попробуйте изменить фильтр"
                      />
                    ) : filteredDocs.map(d => {
                      const name = d.user?.email || `Врач #${d.user_id}`;
                      const spec = d.specialization?.name || 'Терапевт';
                      return (
                        <div key={d.user_id} className="doctor-card" onClick={() => openBook(d)}>
                          <div className="doc-avatar">{name[0].toUpperCase()}</div>
                          <div className="doc-name">{name}</div>
                          <div className="doc-spec">{spec}</div>
                          <div className="doc-meta">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                            Кабинет №{d.cabinet_number || '—'}
                          </div>
                          <div style={{ marginTop:10 }}>
                            <button className="btn btn-outline btn-sm btn-full">
                              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Записаться
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI WIDGET */}
                <div className="ai-widget">
                  <div className="ai-header">
                    <div className="ai-dot" />
                    <div className="ai-header-text">
                      <div className="ai-title">AI-помощник</div>
                      <div className="ai-sub">Подбор специалиста</div>
                    </div>
                  </div>
                  <div className="ai-messages" id="ai-messages" ref={aiMessagesRef}>
                    {aiMsgs.map((m, i) => (
                      m.from === 'result' ? (
                        <div key={i} className="ai-result">
                          <div className="ai-result-label">Рекомендуемый специалист</div>
                          <div className="ai-result-spec">{m.spec}</div>
                          <div className="ai-result-conf">Уверенность: {m.conf}%</div>
                        </div>
                      ) : (
                        <div key={i} className={`ai-msg ${m.from}`}>
                          <div className="ai-bubble">{m.text}</div>
                        </div>
                      )
                    ))}
                  </div>
                  <div className="ai-controls" id="ai-controls">
                    {aiState === 'idle' && (
                      <button className="btn btn-primary btn-full btn-sm" onClick={startAI} disabled={aiLoading}>
                        {aiLoading ? <Spinner size={14}/> : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                        Начать опрос
                      </button>
                    )}
                    {aiState === 'running' && !aiLoading && (
                      <div className="ai-yesno">
                        <button className="btn btn-primary btn-sm" style={{ flex:1 }} onClick={() => answerAI(true)}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Да
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={() => answerAI(false)}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Нет
                        </button>
                      </div>
                    )}
                    {aiState === 'running' && aiLoading && <div style={{ padding:'.5rem', display:'flex', justifyContent:'center' }}><Spinner size={18}/></div>}
                    {aiState === 'done' && (
                      <>
                        <button className="btn btn-blue btn-full btn-sm" onClick={() => filterBySpec(aiQData?.recommended_specialization || '')}>
                          Показать этих врачей →
                        </button>
                        <button className="btn btn-outline btn-full btn-sm" style={{ marginTop:8 }} onClick={resetAI}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                          Пройти заново
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MY APPOINTMENTS PAGE ── */}
        {page === 'my-appts' && (
          <div>
            <div className="topbar">
              <span className="topbar-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Мои записи
              </span>
              <div className="topbar-right">
                <select className="form-control" value={apptFilter} onChange={e => setApptFilter(e.target.value)} style={{ maxWidth:180 }}>
                  <option value="">Все статусы</option>
                  <option value="CREATED">Создана</option>
                  <option value="CONFIRMED">Подтверждена</option>
                  <option value="COMPLETED">Завершена</option>
                  <option value="CANCELLED">Отменена</option>
                </select>
              </div>
            </div>
            <div className="page-content">
              <div className="card">
                <div id="appts-list">
                  {appts.length === 0 && upcomingAppts.length === 0 && archiveAppts.length === 0 ? (
                    <EmptyState
                      icon={<svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                      title="Нет записей"
                      subtitle="Запишитесь к врачу в разделе «Врачи»"
                    />
                  ) : (
                    <>
                      {upcomingAppts.length > 0 && (
                        <>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-600)', padding:'12px 16px 6px' }}>Предстоящие ({upcomingAppts.length})</div>
                          {upcomingAppts.map(a => <ApptItem key={a.id} a={a} onCancel={() => setCancelId(a.id)}/>)}
                        </>
                      )}
                      {archiveAppts.length > 0 && (
                        <>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--gray-400)', padding:'16px 16px 6px', borderTop: upcomingAppts.length ? '1px solid var(--gray-100)' : 'none', marginTop: upcomingAppts.length ? 8 : 0 }}>Предыдущие ({archiveAppts.length})</div>
                          {archiveAppts.map(a => <ApptItem key={a.id} a={a} onCancel={() => setCancelId(a.id)}/>)}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOOK MODAL */}
      {bookModal && selDoc && (
        <div className="modal-overlay show" id="book-modal-overlay" onClick={e => { if(e.target.id==='book-modal-overlay') setBookModal(false); }}>
          <div className="modal" style={{ maxWidth:500 }}>
            <button className="modal-close" onClick={() => setBookModal(false)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="modal-title">Запись к врачу</div>
              <div className="modal-sub">{selDoc.user?.email} · {selDoc.specialization?.name}</div>
            </div>
            <div className="modal-body">
              {bookErr && <div style={{ background:'var(--red-light)', color:'var(--red)', border:'1px solid #fca5a5', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>{bookErr}</div>}
              <div className="form-group">
                <label className="form-label">Дата приёма</label>
                <input type="date" className="form-control" value={bookDate} min={new Date().toISOString().split('T')[0]}
                  onChange={e => { setBookDate(e.target.value); setSelSlot(null); loadSlots(selDoc.user_id, e.target.value); }}/>
              </div>
              {slotsLoading && <div style={{ textAlign:'center', padding:'1rem' }}><Spinner/></div>}
              {!slotsLoading && slots.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Выберите время</label>
                  <div className="slots-grid">
                    {slots.map(t => (
                      <button key={t} className={`slot-btn${selSlot===t ? ' selected' : ''}`} onClick={() => setSelSlot(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {!slotsLoading && slots.length === 0 && bookDate && (
                <p style={{ fontSize:13, color:'var(--gray-500)', marginBottom:'1rem' }}>Нет доступных слотов на эту дату</p>
              )}
              {selSlot && (
                <div className="form-group">
                  <label className="form-label">Жалобы (необязательно)</label>
                  <textarea className="form-control" placeholder="Опишите симптомы..." value={complaints} onChange={e => setComplaints(e.target.value)} style={{ minHeight:80 }}/>
                </div>
              )}
              <button className="btn btn-primary btn-full" onClick={submitBooking} disabled={bookLoading || !selSlot}>
                {bookLoading ? <Spinner size={15}/> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                Подтвердить запись
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelId && (
        <div className="modal-overlay show" id="cancel-modal-overlay" onClick={e => { if(e.target.id==='cancel-modal-overlay') setCancelId(null); }}>
          <div className="modal" style={{ maxWidth:380 }}>
            <button className="modal-close" onClick={() => setCancelId(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon" style={{ background:'var(--red-light)', color:'var(--red)' }}>
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <div className="modal-title">Отменить запись?</div>
              <div className="modal-sub">Это действие нельзя отменить</div>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setCancelId(null)}>Нет, оставить</button>
                <button className="btn btn-danger btn-full" onClick={doCancel} disabled={cancelLoading}>
                  {cancelLoading ? <Spinner size={14}/> : null} Да, отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApptItem({ a, onCancel }) {
  const d = new Date(a.start_time);
  const canCancel = ['CREATED','CONFIRMED'].includes(a.status_name) && new Date(a.start_time) >= new Date();
  return (
    <div className="appt-item">
      <div className="appt-date-box">
        <div className="day">{d.getDate()}</div>
        <div className="mon">{d.toLocaleString('ru', { month:'short' })}</div>
      </div>
      <div className="appt-info">
        <div className="appt-title">Врач #{a.doctor_id}</div>
        <div className="appt-time">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {d.toLocaleString('ru', { weekday:'long', hour:'2-digit', minute:'2-digit' })}
        </div>
        {a.complaints && <div className="appt-note">{a.complaints}</div>}
        <div style={{ marginTop:6 }}><Badge status={a.status_name || 'CREATED'}/></div>
      </div>
      {canCancel && (
        <div className="appt-actions">
          <button className="btn btn-danger btn-sm" onClick={onCancel}>Отменить</button>
        </div>
      )}
    </div>
  );
}