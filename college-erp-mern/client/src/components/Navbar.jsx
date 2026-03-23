import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ links }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <header style={{ background: 'var(--navy)', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 32 }}>
          <div style={{ width: 36, height: 36, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--navy)', fontFamily: 'Playfair Display, serif' }}>V</div>
          <div>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'Playfair Display, serif' }}>VIT ERP</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1 }}>PORTAL</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          {links.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              style={{
                background: location.pathname === link.path ? 'rgba(201,146,42,0.2)' : 'transparent',
                color: location.pathname === link.path ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                borderBottom: location.pathname === link.path ? '2px solid var(--gold)' : '2px solid transparent'
              }}>
              {link.icon} {link.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
            <div style={{ color: 'var(--gold)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{user?.role}</div>
          </div>
          <div style={{ width: 36, height: 36, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--navy)', fontWeight: 700 }}>
            {user?.name?.[0]}
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
