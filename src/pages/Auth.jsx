import { useState, useEffect } from 'react';
import { apiFetch, esc } from '../utils/api';
import { useToast } from '../utils/ToastContext';
import { Spinner } from '../components/UI';

export function Forgot() {
  const toast = useToast();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function doForgot(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await apiFetch('/api/auth/forgot-password', { method:'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="landing" style={{ background:'linear-gradient(160deg,var(--navy) 0%,#112244 50%,#1a3a6e 100%)' }}>
      <div className="landing-card">
        <div style={{ width:60, height:60, background:'rgba(41,128,217,.2)', border:'2px solid rgba(41,128,217,.4)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div className="landing-title">Забыли пароль?</div>
        <div className="landing-sub" style={{ marginBottom:'1.5rem' }}>Введите email — пришлём ссылку для восстановления</div>

        {sent ? (
          <div style={{ background:'rgba(22,163,74,.15)', color:'#4ade80', border:'1px solid rgba(22,163,74,.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Инструкции отправлены на {email}
          </div>
        ) : (
          <>
            {error && <div style={{ background:'rgba(220,38,38,.15)', color:'#f87171', border:'1px solid rgba(220,38,38,.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>{error}</div>}
            <form onSubmit={doForgot}>
              <div className="form-group">
                <div className="input-wrap">
                  <svg className="input-icon" width="15" height="15" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input type="email" className="form-control" placeholder="your@email.ru" required value={email} onChange={e => setEmail(e.target.value)} style={{ background:'rgba(255,255,255,.08)', borderColor:'rgba(255,255,255,.2)', color:'white' }}/>
                </div>
              </div>
              <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--blue-mid)', color:'white', borderColor:'var(--blue-mid)', padding:12 }}>
                {loading ? <Spinner size={15}/> : null}
                {loading ? 'Отправка...' : 'Отправить инструкции'}
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop:'1.5rem', fontSize:13 }}>
          <a href="/" style={{ color:'rgba(255,255,255,.5)' }}>← Вернуться ко входу</a>
        </p>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token');
  const toast = useToast();
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');
  const [passErr, setPassErr]         = useState('');
  const [confirmErr, setConfirmErr]   = useState('');

  async function doReset(e) {
    e.preventDefault();
    setPassErr(''); setConfirmErr(''); setError('');
    if (newPass.length < 6) { setPassErr('Минимум 6 символов'); return; }
    if (newPass !== confirmPass) { setConfirmErr('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/reset-password', { method:'POST', body: JSON.stringify({ token, new_password: newPass }) });
      setDone(true);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="landing" style={{ background:'linear-gradient(160deg,var(--navy) 0%,#112244 50%,#1a3a6e 100%)' }}>
      <div className="landing-card">
        <div style={{ width:60, height:60, background:'rgba(41,128,217,.2)', border:'2px solid rgba(41,128,217,.4)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
          <svg width="28" height="28" fill="none" stroke="white" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div className="landing-title">Новый пароль</div>
        <div className="landing-sub" style={{ marginBottom:'1.5rem' }}>Придумайте новый пароль для вашего аккаунта</div>

        {!token && (
          <div style={{ background:'rgba(220,38,38,.15)', color:'#f87171', border:'1px solid rgba(220,38,38,.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>
            Неверная или устаревшая ссылка. Запросите восстановление пароля снова.
          </div>
        )}

        {done && (
          <div style={{ background:'rgba(22,163,74,.15)', color:'#4ade80', border:'1px solid rgba(22,163,74,.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            Пароль успешно изменён! Перенаправляем...
          </div>
        )}

        {token && !done && (
          <>
            {error && <div style={{ background:'rgba(220,38,38,.15)', color:'#f87171', border:'1px solid rgba(220,38,38,.3)', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, marginBottom:'.75rem' }}>{error}</div>}
            <form onSubmit={doReset}>
              <div className="form-group">
                <div className="input-wrap">
                  <svg className="input-icon" width="15" height="15" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" className="form-control" placeholder="Новый пароль" required value={newPass} onChange={e => setNewPass(e.target.value)} style={{ background:'rgba(255,255,255,.08)', borderColor:'rgba(255,255,255,.2)', color:'white' }}/>
                </div>
                {passErr && <div style={{ fontSize:12, color:'#f87171', marginTop:4 }}>{passErr}</div>}
              </div>
              <div className="form-group">
                <div className="input-wrap">
                  <svg className="input-icon" width="15" height="15" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input type="password" className="form-control" placeholder="Подтвердите пароль" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} style={{ background:'rgba(255,255,255,.08)', borderColor:'rgba(255,255,255,.2)', color:'white' }}/>
                </div>
                {confirmErr && <div style={{ fontSize:12, color:'#f87171', marginTop:4 }}>{confirmErr}</div>}
              </div>
              <button type="submit" className="btn btn-full" disabled={loading} style={{ background:'var(--blue-mid)', color:'white', borderColor:'var(--blue-mid)', padding:12 }}>
                {loading ? <Spinner size={15}/> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                {loading ? 'Сохранение...' : 'Сохранить новый пароль'}
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop:'1.5rem', fontSize:13 }}>
          <a href="/" style={{ color:'rgba(255,255,255,.5)' }}>← Вернуться ко входу</a>
        </p>
      </div>
    </div>
  );
}

export function VerifyEmail() {
  const [status, setStatus] = useState('loading');
  const [msg, setMsg]       = useState('');

  useEffect(() => {
    (async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) { setStatus('error'); setMsg('Ссылка недействительна — токен отсутствует.'); return; }
      try {
        const res = await fetch(`http://localhost:8000/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) setStatus('success');
        else { setStatus('error'); setMsg(data.detail || 'Ссылка недействительна или истекла.'); }
      } catch { setStatus('error'); setMsg('Не удалось подключиться к серверу. Попробуйте позже.'); }
    })();
  }, []);

  return (
    <div className="landing">
      <div className="landing-card" style={{ maxWidth:400 }}>
        <div className="landing-icon" style={
          status === 'success' ? { background:'rgba(22,163,74,.25)', border:'2px solid rgba(22,163,74,.5)' } :
          status === 'error'   ? { background:'rgba(220,38,38,.2)', border:'2px solid rgba(220,38,38,.4)' } : {}
        }>
          {status === 'loading' && <span className="spinner" style={{ width:32, height:32, borderWidth:3, borderColor:'rgba(255,255,255,.25)', borderTopColor:'white' }}/>}
          {status === 'success' && <svg width="36" height="36" fill="none" stroke="#4ade80" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
          {status === 'error'   && <svg width="36" height="36" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        </div>
        <div className="landing-title">
          {status === 'loading' ? 'Проверяем...' : status === 'success' ? 'Email подтверждён!' : 'Ошибка подтверждения'}
        </div>
        <div className="landing-sub">
          {status === 'loading' ? 'Подтверждаем ваш email-адрес' :
           status === 'success' ? 'Ваш аккаунт активирован. Теперь вы можете войти.' : msg}
        </div>
        {status !== 'loading' && (
          <div style={{ marginTop:'1.75rem', display:'flex', justifyContent:'center' }}>
            <button className="landing-btn btn-land-primary" onClick={() => window.location.href = '/'}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Войти в систему
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
