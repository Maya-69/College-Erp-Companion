import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from '../context/AuthContext';

export default function Landing() {
  const [mode, setMode] = useState(null); // 'student' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (mode === 'admin' && data.user.role !== 'admin') {
        setError('This account does not have admin privileges.');
        setLoading(false);
        return;
      }
      if (mode === 'student' && data.user.role !== 'student') {
        setError('Please use the admin login portal.');
        setLoading(false);
        return;
      }
      login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin' : '/student');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const seedDB = async () => {
    setLoading(true);
    try {
      await fetch('/api/seed', { method: 'POST' });
      setError('');
      alert('Demo data seeded! Use:\nAdmin: admin@vit.edu.in / admin123\nStudent: vicky@vit.edu.in / student123');
    } catch (e) { setError('Seed failed'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 48, height: 48, background: 'var(--gold)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: 'var(--navy)', fontFamily: 'Playfair Display, serif' }}>V</div>
        <div>
          <div style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700 }}>Vidyalankar Institute of Technology</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: 2 }}>ACCREDITED A+ BY NAAC | AUTONOMOUS</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span style={{ background: 'rgba(201,146,42,0.2)', color: 'var(--gold)', padding: '4px 12px', borderRadius: 20, fontSize: 12, border: '1px solid rgba(201,146,42,0.4)' }}>ERP Portal</span>
        </div>
      </header>

      {/* Hero + Login */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        {!mode ? (
          <div style={{ textAlign: 'center', maxWidth: 700 }}>
            {/* Decorative circle */}
            <div style={{ width: 120, height: 120, background: 'rgba(201,146,42,0.1)', borderRadius: '50%', border: '2px solid rgba(201,146,42,0.3)', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎓</div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 5vw, 52px)', color: 'white', marginBottom: 16, lineHeight: 1.2 }}>
              Welcome to <span style={{ color: 'var(--gold)' }}>VIT ERP</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
              Integrated Enterprise Resource Planning System for students, faculty, and administration.
            </p>

            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              <button onClick={() => { setMode('student'); setEmail('vicky@vit.edu.in'); setPassword('student123'); }}
                style={{ background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '18px 40px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
                🎒 Student Login
              </button>
              <button onClick={() => { setMode('admin'); setEmail('admin@vit.edu.in'); setPassword('admin123'); }}
                style={{ background: 'transparent', color: 'var(--gold)', border: '2px solid var(--gold)', padding: '18px 40px', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
                🛡️ Admin Login
              </button>
            </div>

            <button onClick={seedDB} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', padding: '10px 24px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              🌱 Seed Demo Data (First Time Setup)
            </button>

            {/* Features */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 60, textAlign: 'left' }}>
              {[
                { icon: '📊', title: 'Results & Marks', desc: 'View semester-wise results, SGPI, CGPI' },
                { icon: '📄', title: 'Documents', desc: 'Download bonafide, transcripts, certificates' },
                { icon: '📅', title: 'Events & Notices', desc: 'Stay updated with college events and notices' },
              ].map(f => (
                <div key={f.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 6, fontFamily: 'Playfair Display, serif' }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <button onClick={() => { setMode(null); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              ← Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{mode === 'admin' ? '🛡️' : '🎒'}</div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', color: 'var(--navy)', fontSize: 24 }}>
                {mode === 'admin' ? 'Admin Portal' : 'Student Portal'}
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>Sign in to your account</p>
            </div>

            {mode === 'admin' && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
                Demo: admin@vit.edu.in / admin123
              </div>
            )}
            {mode === 'student' && (
              <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1e40af' }}>
                Demo: vicky@vit.edu.in / student123
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="label">Email Address</label>
                <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: mode === 'admin' ? 'var(--navy)' : 'var(--gold)', color: mode === 'admin' ? 'white' : 'var(--navy)', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginTop: 8 }}>
                {loading ? 'Signing in...' : `Sign in as ${mode === 'admin' ? 'Admin' : 'Student'}`}
              </button>
            </form>
          </div>
        )}
      </main>

      <footer style={{ padding: '20px 40px', borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
        © 2026 Vidyalankar Institute of Technology. All rights reserved. | ERP System v2.0
      </footer>
    </div>
  );
}
