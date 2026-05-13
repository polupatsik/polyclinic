import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, getToken, getUser } from '../utils/api';
import { useToast } from '../utils/ToastContext';

const ROLE_ROUTES = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };

export default function Landing() {
  const navigate = useNavigate();
  const toast    = useToast();

  // Redirect if already logged in
  useEffect(() => {
  if (getToken()) {
    const u = getUser();
    if (u?.role) navigate(ROLE_ROUTES[u.role] || '/');
  }
}, []);

  const [modal, setModal]     = useState(null); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [regErr, setRegErr]     = useState('');
  const [regOk, setRegOk]       = useState(false);

  // Loginу
  const [lEmail, setLEmail] = useState('');
  const [lPass,  setLPass]  = useState('');

  // Register
  const [rEmail, setREmail] = useState('');
  const [rPass,  setRPass]  = useState('');
  const [rDob,   setRDob]   = useState('');
  const [rPassErr, setRPassErr] = useState('');

  async function doLogin(e) {
    e.preventDefault();
    setLoginErr('');
    setLoading(true);
    try {
      const role = await login(lEmail, lPass);
      toast('Добро пожаловать!', 'success');
      setTimeout(() => navigate(ROLE_ROUTES[role] || '/'), 300);
    } catch(err) {
      setLoginErr(err.message);
    } finally { setLoading(false); }
  }

  async function doRegister(e) {
    e.preventDefault();
    setRegErr(''); setRegOk(false);
    if (rPass.length < 6) { setRPassErr('Минимум 6 символов'); return; }
    setRPassErr('');
    const birthDate = new Date(rDob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

    if (birthDate > maxDate) { setRegErr('Минимальный возраст — 18 лет'); return; }
    if (birthDate < minDate) { setRegErr('Максимальный возраст — 100 лет'); return; }
    setLoading(true);
    try {
      await register(rEmail, rPass, rDob);
      setRegOk(true);
      setTimeout(() => { setModal('login'); setRegOk(false); }, 2000);
    } catch(err) {
      setRegErr(err.message);
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="landing">
        <div className="landing-card">
          <div className="landing-icon">
            <svg width="42" height="42" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="landing-title">МедПортал</div>
          <div className="landing-sub">Городская поликлиника — запись онлайн</div>
          <div className="landing-btns">
            <button className="landing-btn btn-land-primary" onClick={() => setModal('login')}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Войти
            </button>
            <button className="landing-btn btn-land-outline" onClick={() => setModal('register')}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Зарегистрироваться
            </button>
          </div>
          <p style={{ marginTop:'2rem', fontSize:12, color:'rgba(255,255,255,.3)' }}>
            Нажимая кнопку, вы соглашаетесь с условиями использования
          </p>
        </div>
      </div>

      {/* LOGIN MODAL */}
      {modal === 'login' && (
        <div className="modal-overlay show" id="login-modal" onClick={e => { if(e.target.id==='login-modal') setModal(null); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="modal-title">Вход в систему</div>
              <div className="modal-sub">Введите ваши данные для входа</div>
            </div>
            <div className="modal-body">
              {loginErr && (
                <div style={{ background:'var(--red-light)', color:'var(--red)', border:'1px solid #fca5a5', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>
                  {loginErr}
                </div>
              )}
              <form onSubmit={doLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input type="email" className="form-control" placeholder="your@email.ru" required value={lEmail} onChange={e => setLEmail(e.target.value)} autoComplete="email"/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Пароль</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type="password" className="form-control" placeholder="••••••••" required value={lPass} onChange={e => setLPass(e.target.value)} autoComplete="current-password"/>
                  </div>
                </div>
                <div style={{ textAlign:'right', marginBottom:'1rem' }}>
                  <a href="/forgot" style={{ fontSize:13, color:'var(--blue-mid)' }}>Забыли пароль?</a>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" style={{width:15,height:15,borderWidth:2}}/> : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  )}
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>
              <p className="text-center text-muted mt-2">
                Нет аккаунта?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setModal('register'); }} style={{ color:'var(--blue-mid)' }}>Зарегистрироваться</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER MODAL */}
      {modal === 'register' && (
        <div className="modal-overlay show" id="reg-modal" onClick={e => { if(e.target.id==='reg-modal') setModal(null); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModal(null)}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="modal-top">
              <div className="modal-icon">
                <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <line x1="20" y1="8" x2="20" y2="14"/>
                  <line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <div className="modal-title">Регистрация</div>
              <div className="modal-sub">Создайте аккаунт пациента</div>
            </div>
            <div className="modal-body">
              {regOk && (
                <div style={{ background:'var(--green-light)', color:'var(--green)', border:'1px solid #86efac', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>
                  Регистрация успешна! Проверьте email для подтверждения.
                </div>
              )}
              {regErr && (
                <div style={{ background:'var(--red-light)', color:'var(--red)', border:'1px solid #fca5a5', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>
                  {regErr}
                </div>
              )}
              <form onSubmit={doRegister}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <input type="email" className="form-control" placeholder="patient@mail.ru" required value={rEmail} onChange={e => setREmail(e.target.value)}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Пароль</label>
                  <div className="input-wrap">
                    <svg className="input-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input type="password" className="form-control" placeholder="Минимум 6 символов" required value={rPass} onChange={e => setRPass(e.target.value)}/>
                  </div>
                  {rPassErr && <div className="form-error">{rPassErr}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Дата рождения</label>
                  <input type="date" className="form-control" required value={rDob} onChange={e => setRDob(e.target.value)} 
                  min={new Date(new Date().getFullYear() - 100, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  max={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}/>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <span className="spinner" style={{width:15,height:15,borderWidth:2}}/> : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {loading ? 'Регистрация...' : 'Создать аккаунт'}
                </button>
              </form>
              <p className="text-center text-muted mt-2">
                Уже есть аккаунт?{' '}
                <a href="#" onClick={e => { e.preventDefault(); setModal('login'); }} style={{ color:'var(--blue-mid)' }}>Войти</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}