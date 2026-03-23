import { useEffect, useState } from 'react';

const card = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export default function App() {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sessionId, setSessionId] = useState(localStorage.getItem('companion_session_id') || '');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [semester, setSemester] = useState('2');
  const [marks, setMarks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [documentType, setDocumentType] = useState('transcript');
  const [documentPurpose, setDocumentPurpose] = useState('Need transcript for higher studies');
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!sessionId) return;
    api(`/api/session/${sessionId}`)
      .then((data) => setStatus(`Connected (key ending ****${data.keyLast4})`))
      .catch(() => {
        localStorage.removeItem('companion_session_id');
        setSessionId('');
      });
  }, [sessionId]);

  const connect = async () => {
    setError('');
    setStatus('Connecting...');
    try {
      const data = await api('/api/session', {
        method: 'POST',
        body: JSON.stringify({ name, apiKey }),
      });
      setSessionId(data.sessionId);
      localStorage.setItem('companion_session_id', data.sessionId);
      setStatus(`Connected as ${data.displayName} (****${data.keyLast4})`);
      setApiKey('');
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  };

  const fetchProfile = async () => {
    setError('');
    try {
      const data = await api(`/api/erp/profile?sessionId=${encodeURIComponent(sessionId)}`);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchMarks = async () => {
    setError('');
    try {
      const data = await api(`/api/erp/marks?sessionId=${encodeURIComponent(sessionId)}&semester=${encodeURIComponent(semester)}`);
      setMarks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  const requestDocument = async () => {
    setError('');
    try {
      await api('/api/erp/documents/request', {
        method: 'POST',
        body: JSON.stringify({ sessionId, type: documentType, purpose: documentPurpose }),
      });
      await fetchDocumentRequests();
      setStatus('Document request submitted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchDocumentRequests = async () => {
    setError('');
    try {
      const data = await api(`/api/erp/documents/requests?sessionId=${encodeURIComponent(sessionId)}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 6 }}>ERP Companion App</h1>
        <p style={{ color: '#475569', marginTop: 0 }}>Separate client app using API key access to ERP.</p>

        {error && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
        {status && <div style={{ ...card, borderColor: '#bfdbfe', background: '#eff6ff', color: '#1d4ed8' }}>{status}</div>}

        {!sessionId && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Connect with API Key</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional for UI)" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste API key from ERP dashboard" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <button onClick={connect} style={{ padding: '10px 14px', border: 0, borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer' }}>Connect</button>
            </div>
          </div>
        )}

        {sessionId && (
          <>
            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={fetchProfile} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>Get Profile</button>
                <button onClick={fetchDocumentRequests} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>Get Document Requests</button>
                <button
                  onClick={() => {
                    localStorage.removeItem('companion_session_id');
                    setSessionId('');
                    setStatus('Disconnected');
                    setProfile(null);
                    setMarks([]);
                    setRequests([]);
                  }}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c' }}
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Get Semester Marks</h3>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Semester" style={{ width: 140, padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <button onClick={fetchMarks} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>Get Marks</button>
              </div>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>Apply for Document</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                  <option value="bonafide">Bonafide</option>
                  <option value="transcript">Transcript</option>
                  <option value="leavingCertificate">Leaving Certificate</option>
                  <option value="idCard">ID Card</option>
                  <option value="marksheet">Marksheet</option>
                </select>
                <input value={documentPurpose} onChange={(e) => setDocumentPurpose(e.target.value)} placeholder="Purpose" style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                <button onClick={requestDocument} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}>Submit Request</button>
              </div>
            </div>

            {profile && (
              <div style={card}>
                <h3 style={{ marginTop: 0 }}>Profile</h3>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(profile, null, 2)}</pre>
              </div>
            )}

            {marks.length > 0 && (
              <div style={card}>
                <h3 style={{ marginTop: 0 }}>Marks</h3>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(marks, null, 2)}</pre>
              </div>
            )}

            {requests.length > 0 && (
              <div style={card}>
                <h3 style={{ marginTop: 0 }}>Document Requests</h3>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(requests, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
