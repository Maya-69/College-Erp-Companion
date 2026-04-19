import { useEffect, useState } from 'react';

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

async function api(path, options = {}, token = '') {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('companion_token') || '');
  const [user, setUser] = useState(null);

  const [integrationMode, setIntegrationMode] = useState('api');
  const [modeStatus, setModeStatus] = useState({ keyConfigured: false, scraperConfigured: false });
  const [apiKey, setApiKey] = useState('');

  const [loginUrl, setLoginUrl] = useState('http://localhost:5173');
  const [loginId, setLoginId] = useState('vicky@vit.edu.in');
  const [erpPassword, setErpPassword] = useState('student123');
  const [scraperResult, setScraperResult] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadAccountState = async (authToken) => {
    const me = await api('/api/app/me', {}, authToken);
    const mode = await api('/api/app/integration-mode', {}, authToken);
    setUser(me.user);
    setIntegrationMode(mode.mode || 'api');
    setModeStatus({
      keyConfigured: Boolean(mode.keyConfigured),
      scraperConfigured: Boolean(mode.scraperConfigured),
    });
  };

  useEffect(() => {
    if (!token) return;
    loadAccountState(token).catch(() => {
      localStorage.removeItem('companion_token');
      setToken('');
      setUser(null);
    });
  }, [token]);

  const handleAuth = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      if (authMode === 'register') {
        await api('/api/app/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
      }

      const login = await api('/api/app/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('companion_token', login.token);
      setToken(login.token);
      setStatus('Logged in successfully');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeMode = async (mode) => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api('/api/app/integration-mode', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      }, token);
      await loadAccountState(token);
      setStatus(`Mode switched to ${mode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveApiKey = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api('/api/app/erp-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      }, token);
      await loadAccountState(token);
      setApiKey('');
      setStatus('API key saved and verified');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveScraperCredentials = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    setScraperResult(null);
    try {
      const result = await api('/api/app/scraper-credentials', {
        method: 'POST',
        body: JSON.stringify({ loginUrl, loginId, password: erpPassword }),
      }, token);
      await loadAccountState(token);
      setScraperResult(result.loginResult || null);
      setStatus('Scraper credentials verified and saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runScraperLoginCheck = async () => {
    setBusy(true);
    setError('');
    setStatus('');
    setScraperResult(null);
    try {
      const result = await api('/api/app/scraper/login-check', {
        method: 'POST',
        body: JSON.stringify({ loginUrl, loginId, password: erpPassword }),
      }, token);
      setScraperResult(result);
      setStatus('Scraper login check passed');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('companion_token');
    setToken('');
    setUser(null);
    setStatus('Logged out');
    setError('');
    setScraperResult(null);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 6 }}>ERP Companion Control Panel</h1>
        <p style={{ color: '#475569', marginTop: 0 }}>Stage 1: choose API or Scraper mode and verify scraper login.</p>

        {error && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
        {status && <div style={{ ...card, borderColor: '#bfdbfe', background: '#eff6ff', color: '#1d4ed8' }}>{status}</div>}

        {!token && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>App Account</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setAuthMode('login')} style={{ padding: '8px 12px' }}>Login</button>
              <button onClick={() => setAuthMode('register')} style={{ padding: '8px 12px' }}>Register</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {authMode === 'register' && (
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ padding: 10 }} />
              )}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10 }} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" style={{ padding: 10 }} />
              <button disabled={busy} onClick={handleAuth} style={{ padding: '10px 14px' }}>
                {busy ? 'Please wait...' : authMode === 'register' ? 'Register + Login' : 'Login'}
              </button>
            </div>
          </div>
        )}

        {token && (
          <>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Logged In</h3>
              <div style={{ marginBottom: 10 }}>{user?.name} ({user?.email})</div>
              <button onClick={logout} style={{ padding: '10px 14px' }}>Logout</button>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Integration Mode</h3>
              <div style={{ marginBottom: 12 }}>Current mode: <strong>{integrationMode}</strong></div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button disabled={busy} onClick={() => changeMode('api')} style={{ padding: '10px 14px' }}>Use API Key</button>
                <button disabled={busy} onClick={() => changeMode('scraper')} style={{ padding: '10px 14px' }}>Use Scraper</button>
              </div>
              <div style={{ color: '#334155', fontSize: 14 }}>
                API configured: {modeStatus.keyConfigured ? 'yes' : 'no'} | Scraper configured: {modeStatus.scraperConfigured ? 'yes' : 'no'}
              </div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>API Key Setup</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="erp_xxx API key" style={{ padding: 10 }} />
                <button disabled={busy} onClick={saveApiKey} style={{ padding: '10px 14px' }}>Save API Key</button>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Scraper Login Setup</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} placeholder="ERP login URL" style={{ padding: 10 }} />
                <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ERP login ID / email" style={{ padding: 10 }} />
                <input value={erpPassword} onChange={(e) => setErpPassword(e.target.value)} type="password" placeholder="ERP password" style={{ padding: 10 }} />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button disabled={busy} onClick={saveScraperCredentials} style={{ padding: '10px 14px' }}>Save + Verify Scraper Credentials</button>
                  <button disabled={busy} onClick={runScraperLoginCheck} style={{ padding: '10px 14px' }}>Run Login Check</button>
                </div>
              </div>
            </div>

            {scraperResult && (
              <div style={card}>
                <h3 style={{ marginTop: 0 }}>Scraper Result</h3>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(scraperResult, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}