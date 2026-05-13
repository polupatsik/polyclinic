import { useNavigate } from 'react-router-dom';
import { logout, getUser, statusLabel, statusColor } from '../utils/api';

/* ── BADGE ── */
export function Badge({ status }) {
  const cls = { blue:'badge-blue', green:'badge-green', red:'badge-red', gray:'badge-gray', yellow:'badge-yellow' }[statusColor(status)] || 'badge-gray';
  return <span className={`badge ${cls}`}>{statusLabel(status)}</span>;
}

/* ── SPINNER ── */
export function Spinner({ size = 22 }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

/* ── MODAL ── */
export function Modal({ id, title, subtitle, iconColor, icon, children, onClose }) {
  return (
    <div className="modal-overlay show" id={id} onClick={e => { if (e.target.id === id) onClose?.(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="modal-top">
          <div className="modal-icon" style={iconColor ? { background: iconColor[0], color: iconColor[1] } : {}}>
            {icon}
          </div>
          <div className="modal-title">{title}</div>
          {subtitle && <div className="modal-sub">{subtitle}</div>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── SIDEBAR ── */
export function Sidebar({ label, navItems, activePage, onNav, emailVerified }) {
  const u = getUser();
  const roleLabel = { PATIENT:'Пациент', DOCTOR:'Врач', ADMIN:'Администратор' };
  const initials = u?.email ? u.email[0].toUpperCase() : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <div className="logo-name">МедПортал</div>
          <div className="logo-tag">{label}</div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-user-name">{u?.email}</div>
          <div className="sidebar-user-role">{roleLabel[u?.role] || u?.role}</div>
          {emailVerified !== undefined && (
            <div style={{ fontSize:11, marginTop:4, color: emailVerified ? '#4ade80' : '#f87171' }}>
              {emailVerified ? '✓ Email подтверждён' : '⚠ Email не подтверждён'}
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Меню</div>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => onNav(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-full" onClick={logout} style={{ justifyContent:'flex-start', gap:8, color:'rgba(255,255,255,.5)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Выйти
        </button>
      </div>
    </aside>
  );
}

/* ── EMPTY STATE ── */
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
