import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth, api } from '../context/AuthContext';

const STUDENT_LINKS = [
  { path: '/student', label: 'My Dashboard', icon: '🏠' },
  { path: '/student/results', label: 'Results', icon: '📋' },
  { path: '/student/documents', label: 'Documents', icon: '📄' },
  { path: '/student/events', label: 'Events & Notices', icon: '📅' },
  { path: '/student/api-access', label: 'API Access', icon: '🔑' },
  { path: '/student/profile', label: 'My Profile', icon: '👤' },
];

function StudentHome() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [notices, setNotices] = useState([]);
  const [results, setResults] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api('/events', {}, token).then(setEvents).catch(console.error);
    api('/holidays').then(setHolidays).catch(console.error);
    api('/notices').then(setNotices).catch(console.error);
    api(`/results?rollNumber=${user?.rollNumber || ''}`, {}, token).then(setResults).catch(console.error);
    api(`/students/${user?.id}`, {}, token).then(setProfile).catch(console.error);
  }, []);

  const latestResult = results[results.length - 1];

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>Welcome back,</div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: 'var(--gold-light)', marginBottom: 8 }}>{user?.name}</h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {profile && (
              <>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>🎓 {profile.department}</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>📚 Semester {profile.semester}</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>🔖 {profile.rollNumber}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {latestResult && (
            <div style={{ background: 'rgba(201,146,42,0.2)', border: '1px solid rgba(201,146,42,0.4)', borderRadius: 12, padding: '16px 24px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 }}>Latest SGPI (Sem {latestResult.semester})</div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, color: 'var(--gold)', fontWeight: 700 }}>{latestResult.sgpi}</div>
              <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>{latestResult.result}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upcoming Events */}
        <div className="card">
          <div style={{ background: 'var(--navy)', padding: '14px 20px', color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif', fontSize: 15 }}>📅 Upcoming Events</div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {events.slice(0, 8).map(e => (
              <div key={e._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                <div style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '8px', borderRadius: 8, minWidth: 44, textAlign: 'center', fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>
                  <div>{new Date(e.date).getDate()}</div>
                  <div>{new Date(e.date).toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 2 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{e.owner} · {e.time}{e.venue ? ` · ${e.venue}` : ''}</div>
                </div>
                <span style={{ background: 'rgba(10,22,40,0.08)', color: 'var(--navy)', padding: '2px 8px', borderRadius: 20, fontSize: 11, height: 'fit-content' }}>{e.inst}</span>
              </div>
            ))}
            {!events.length && <div className="empty-state" style={{ padding: 24 }}><div>No upcoming events</div></div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Holidays */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ background: 'var(--navy)', padding: '14px 20px', color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif', fontSize: 15 }}>🎉 Upcoming Holidays</div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {holidays.map(h => (
                <div key={h._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 500 }}>{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                </div>
              ))}
              {!holidays.length && <div style={{ padding: '16px 20px', color: 'var(--text-light)', fontSize: 13 }}>No holidays listed</div>}
            </div>
          </div>

          {/* Notices */}
          <div className="card" style={{ flex: 1 }}>
            <div style={{ background: 'var(--navy)', padding: '14px 20px', color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif', fontSize: 15 }}>📢 Notices</div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {notices.slice(0, 5).map(n => (
                <div key={n._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{n.title}</div>
                    <span className={`badge badge-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'info'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{n.priority}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{n.content.substring(0, 60)}...</div>
                </div>
              ))}
              {!notices.length && <div style={{ padding: '16px 20px', color: 'var(--text-light)', fontSize: 13 }}>No notices</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentResults() {
  const { user, token } = useAuth();
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    api(`/results?rollNumber=${user?.rollNumber || ''}`, {}, token).then(setResults).catch(console.error);
    api(`/students/${user?.id}`, {}, token).then(setProfile).catch(console.error);
  }, []);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Marksheet - ${selected.rollNumber} - Sem ${selected.semester}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #000; }
        h1 { text-align: center; color: #0a1628; margin-bottom: 4px; font-size: 20px; }
        .subtitle { text-align: center; color: #666; font-size: 13px; margin-bottom: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
        .info-item { display: flex; gap: 8px; } .info-label { color: #666; min-width: 120px; } .info-value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { background: #0a1628; color: white; padding: 8px 12px; text-align: left; font-size: 12px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        .footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; }
        .result-pass { color: #065f46; font-weight: 700; font-size: 16px; }
        .sgpi-row { display: flex; gap: 40px; background: #f0f9ff; padding: 12px 16px; border-radius: 6px; font-size: 14px; }
        .sgpi-item label { color: #666; display: block; font-size: 12px; } .sgpi-item span { font-weight: 700; font-size: 18px; color: #0a1628; }
      </style></head>
      <body>
        <h1>Vidyalankar Institute of Technology</h1>
        <div class="subtitle">Semester ${selected.semester} Mark Sheet — ${selected.examMonth} ${selected.examYear}</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Student Name:</span><span class="info-value">${profile?.name || user?.name}</span></div>
          <div class="info-item"><span class="info-label">Roll Number:</span><span class="info-value">${selected.rollNumber}</span></div>
          <div class="info-item"><span class="info-label">Department:</span><span class="info-value">${profile?.department || ''}</span></div>
          <div class="info-item"><span class="info-label">Exam Seat No.:</span><span class="info-value">25L179</span></div>
        </div>
        <table>
          <thead><tr><th>Sr.</th><th>Subject</th><th>Head</th><th>Max Marks</th><th>Marks Obtained</th><th>Grade</th><th>Status</th></tr></thead>
          <tbody>
            ${selected.subjects.map((s, i) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.headOfPassing}</td><td>${s.maxMarks}</td><td><strong>${s.marksObtained}</strong></td><td>${s.grade || '—'}</td><td style="color:${s.status === 'Pass' ? '#065f46' : '#991b1b'};font-weight:600">${s.status}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="sgpi-row">
          <div class="sgpi-item"><label>SGPI</label><span>${selected.sgpi}</span></div>
          <div class="sgpi-item"><label>CGPI</label><span>${selected.cgpi || '—'}</span></div>
          <div class="sgpi-item"><label>Result</label><span class="result-pass">${selected.result}</span></div>
        </div>
        <div class="footer">
          <div>Student Signature: ________________</div>
          <div>Controller of Examinations</div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>My Results</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 24, fontSize: 14 }}>View and download semester-wise results</p>

      {!selected ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {results.map(r => (
            <div key={r._id} className="card" style={{ padding: 24, cursor: 'pointer', transition: 'all 0.2s', border: '2px solid var(--border)' }}
              onClick={() => setSelected(r)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '8px 14px', borderRadius: 8, fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700 }}>Sem {r.semester}</div>
                <span className={`badge badge-${r.result === 'PASS' ? 'success' : 'danger'}`} style={{ height: 'fit-content' }}>{r.result}</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: 'var(--text-light)', fontSize: 12 }}>Exam</div>
                <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{r.examMonth} {r.examYear}</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ color: 'var(--text-light)', fontSize: 12 }}>SGPI</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{r.sgpi}</div>
                </div>
                {r.cgpi && <div>
                  <div style={{ color: 'var(--text-light)', fontSize: 12 }}>CGPI</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{r.cgpi}</div>
                </div>}
              </div>
              <div style={{ marginTop: 16, color: 'var(--gold)', fontSize: 13 }}>Click to view marksheet →</div>
            </div>
          ))}
          {!results.length && <div className="card empty-state" style={{ padding: 60, gridColumn: '1 / -1' }}><div className="icon">📋</div><div>No results available yet</div></div>}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>← Back to Results</button>
            <button className="btn btn-primary" onClick={handlePrint}>🖨️ Download / Print Marksheet</button>
          </div>

          <div className="card">
            <div className="page-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif' }}>Semester {selected.semester} Marksheet</h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Examination: {selected.examMonth} {selected.examYear}</p>
                </div>
                <span className={`badge badge-${selected.result === 'PASS' ? 'success' : 'danger'}`} style={{ fontSize: 14, padding: '6px 16px' }}>{selected.result}</span>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24, background: 'var(--cream)', borderRadius: 12, padding: 20 }}>
                <div><div style={{ color: 'var(--text-light)', fontSize: 12, marginBottom: 2 }}>Student Name</div><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{profile?.name || user?.name}</div></div>
                <div><div style={{ color: 'var(--text-light)', fontSize: 12, marginBottom: 2 }}>Roll Number</div><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{selected.rollNumber}</div></div>
                <div><div style={{ color: 'var(--text-light)', fontSize: 12, marginBottom: 2 }}>Department</div><div style={{ fontWeight: 600, color: 'var(--navy)' }}>{profile?.department}</div></div>
              </div>

              <table>
                <thead>
                  <tr><th>Sr.</th><th>Subject Name</th><th>Head of Passing</th><th>Max Marks</th><th>Marks Obtained</th><th>Grade</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {selected.subjects.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td><span className="badge badge-info" style={{ fontSize: 11 }}>{s.headOfPassing}</span></td>
                      <td>{s.maxMarks}</td>
                      <td><strong style={{ color: 'var(--navy)', fontSize: 16 }}>{s.marksObtained}</strong></td>
                      <td><strong>{s.grade || '—'}</strong></td>
                      <td><span className={`badge badge-${s.status === 'Pass' ? 'success' : 'danger'}`}>{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 32, marginTop: 24, background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', borderRadius: 12, padding: 24, color: 'white' }}>
                <div><div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>SGPI</div><div style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 700, color: 'var(--gold)' }}>{selected.sgpi}</div></div>
                {selected.cgpi && <div><div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>CGPI</div><div style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 700, color: 'var(--gold)' }}>{selected.cgpi}</div></div>}
                <div style={{ marginLeft: 'auto', textAlign: 'right', alignSelf: 'center' }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Overall Result</div>
                  <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: selected.result === 'PASS' ? '#34d399' : '#f87171' }}>{selected.result}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentDocuments() {
  const { user, token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api('/documents', {}, token).then(setDocs).catch(console.error);
    api(`/students/${user?.id}`, {}, token).then(setProfile).catch(console.error);
  }, []);

  const docTypeLabels = { bonafide: 'Bonafide Certificate', transcript: 'Transcript', leavingCertificate: 'Leaving Certificate', idCard: 'Identity Card', marksheet: 'Mark Sheet' };
  const docIcons = { bonafide: '📜', transcript: '📑', leavingCertificate: '🎓', idCard: '🪪', marksheet: '📋' };

  const handleDownload = (doc) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${docTypeLabels[doc.type]} - ${profile?.name}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 40px; border: 2px solid #0a1628; }
        h1 { text-align: center; color: #0a1628; font-size: 22px; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #c9922a; }
        .doc-type { text-align: center; font-size: 18px; font-weight: 700; color: #c9922a; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0; }
        .content { line-height: 2; font-size: 14px; color: #333; text-align: justify; }
        .signature { display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; }
        .gold-border { border: 3px solid #c9922a; padding: 30px; border-radius: 8px; }
        .ref { color: #666; font-size: 12px; margin-bottom: 20px; }
      </style></head>
      <body>
        <div class="gold-border">
          <h1>Vidyalankar Institute of Technology</h1>
          <div class="subtitle">Wadala, Mumbai - 400037 | Accredited A+ by NAAC</div>
          <div class="doc-type">${docTypeLabels[doc.type] || doc.type}</div>
          <div class="ref">Ref No: VIT/2025-26/${doc._id.slice(-6).toUpperCase()} | Date: ${new Date(doc.generatedAt).toLocaleDateString('en-IN')}</div>
          <div class="content">
            <p>This is to certify that <strong>${profile?.name}</strong>, Roll No. <strong>${profile?.rollNumber}</strong>, 
            is a bonafide student of <strong>${profile?.department}</strong> in the academic year 2025-26. 
            The student is currently enrolled in Semester ${profile?.semester} under the University of Mumbai.</p>
            <p>This certificate is issued for the purpose of: <strong>${doc.title}</strong></p>
            <p>The student bears good character and academic conduct.</p>
          </div>
          <div class="signature">
            <div>Student Signature<br>_______________</div>
            <div style="text-align:center">Office Seal</div>
            <div style="text-align:right">Principal / HOD<br>_______________</div>
          </div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>My Documents</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 24, fontSize: 14 }}>Download official documents issued to you</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {docs.map(d => (
          <div key={d._id} className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{docIcons[d.type] || '📄'}</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: 'var(--navy)', marginBottom: 4 }}>{docTypeLabels[d.type] || d.type}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-mid)', marginBottom: 4 }}>{d.title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 16 }}>Issued: {new Date(d.generatedAt).toLocaleDateString('en-IN')}</p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleDownload(d)}>
              ⬇️ Download
            </button>
          </div>
        ))}
        {!docs.length && <div className="card empty-state" style={{ padding: 60, gridColumn: '1 / -1' }}><div className="icon">📄</div><div>No documents issued yet</div><p style={{ fontSize: 13, color: 'var(--text-light)', marginTop: 8 }}>Contact admin to request documents</p></div>}
      </div>
    </div>
  );
}

function StudentEvents() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [notices, setNotices] = useState([]);
  const [tab, setTab] = useState('events');

  useEffect(() => {
    api('/events', {}, token).then(setEvents).catch(console.error);
    api('/holidays').then(setHolidays).catch(console.error);
    api('/notices').then(setNotices).catch(console.error);
  }, []);

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 24 }}>Events, Holidays & Notices</h2>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', padding: 4, borderRadius: 10, width: 'fit-content', boxShadow: 'var(--shadow-sm)' }}>
        {[['events', '📅 Events'], ['holidays', '🎉 Holidays'], ['notices', '📢 Notices']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: 14, background: tab === key ? 'var(--navy)' : 'transparent', color: tab === key ? 'var(--gold)' : 'var(--text-mid)', transition: 'all 0.2s' }}>{label}</button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="card">
          <table>
            <thead><tr><th>Inst</th><th>Activity Name</th><th>Owner</th><th>For</th><th>Date</th><th>Time</th><th>Venue</th></tr></thead>
            <tbody>
              {events.map(e => (
                <tr key={e._id}>
                  <td><span className="badge badge-gold">{e.inst}</span></td>
                  <td style={{ fontWeight: 600, maxWidth: 240 }}>{e.title}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{e.owner}</td>
                  <td><span className="badge badge-info" style={{ fontSize: 11 }}>{e.forRole}</span></td>
                  <td style={{ fontWeight: 600 }}>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td>{e.time}</td>
                  <td>{e.venue || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length && <div className="empty-state" style={{ padding: 48 }}><div className="icon">📅</div><div>No events</div></div>}
        </div>
      )}

      {tab === 'holidays' && (
        <div className="card">
          <table>
            <thead><tr><th>Date</th><th>Holiday Name</th></tr></thead>
            <tbody>
              {holidays.map(h => (
                <tr key={h._id}>
                  <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td style={{ fontWeight: 600 }}>{h.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!holidays.length && <div className="empty-state" style={{ padding: 48 }}><div className="icon">🎉</div><div>No holidays listed</div></div>}
        </div>
      )}

      {tab === 'notices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {notices.map(n => (
            <div key={n._id} className="card" style={{ padding: 20, borderLeft: `4px solid ${n.priority === 'high' ? 'var(--danger)' : n.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, color: 'var(--navy)' }}>{n.title}</h3>
                <span className={`badge badge-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'info'}`}>{n.priority}</span>
              </div>
              <p style={{ color: 'var(--text-mid)', fontSize: 14 }}>{n.content}</p>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-light)' }}>Posted by {n.postedBy} · {new Date(n.date).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
          {!notices.length && <div className="card empty-state" style={{ padding: 60 }}><div className="icon">📢</div><div>No notices</div></div>}
        </div>
      )}
    </div>
  );
}

function StudentProfile() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api(`/students/${user?.id}`, {}, token).then(setProfile).catch(console.error);
  }, []);

  if (!profile) return <div style={{ padding: 32 }}><div className="spinner" /></div>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 700 }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 24 }}>My Profile</h2>
      <div className="card">
        <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)', padding: '32px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 80, height: 80, background: 'var(--gold)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: 'var(--navy)', fontFamily: 'Playfair Display, serif', border: '3px solid rgba(255,255,255,0.3)' }}>
            {profile.name?.[0]}
          </div>
          <div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, color: 'var(--gold-light)', marginBottom: 6 }}>{profile.name}</h3>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{profile.department}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span className="badge badge-gold">{profile.rollNumber}</span>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>Semester {profile.semester}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Full Name', value: profile.name, icon: '👤' },
              { label: 'Roll Number', value: profile.rollNumber, icon: '🔖' },
              { label: 'Email', value: profile.email, icon: '📧' },
              { label: 'Mobile', value: profile.mobile || 'Not provided', icon: '📱' },
              { label: 'Department', value: profile.department, icon: '🏫' },
              { label: 'Year / Semester', value: `Year ${profile.year} / Semester ${profile.semester}`, icon: '📚' },
              { label: 'Admission Quota', value: profile.quota, icon: '🎫' },
              { label: 'Institute', value: 'Vidyalankar Institute of Technology', icon: '🏛️' },
            ].map(item => (
              <div key={item.label} style={{ padding: 16, background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {item.icon} {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentApiAccess() {
  const { token } = useAuth();
  const [status, setStatus] = useState({ hasApiKey: false, last4: null, createdAt: null });
  const [generatedKey, setGeneratedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = async () => {
    try {
      const data = await api('/account/api-key/status', {}, token);
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await api('/account/api-key/generate', { method: 'POST' }, token);
      setGeneratedKey(data.apiKey || '');
      setMessage('API key generated. Copy and store it now.');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api('/account/api-key/revoke', { method: 'DELETE' }, token);
      setGeneratedKey('');
      setMessage('API key revoked successfully.');
      await loadStatus();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      setMessage('API key copied to clipboard.');
    } catch {
      setError('Unable to copy automatically. Please copy manually.');
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>API Access</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 20, fontSize: 14 }}>
        Generate an API key to securely use the companion app.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ color: 'var(--text-light)', fontSize: 12, marginBottom: 4 }}>Current Key Status</div>
            <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{status.hasApiKey ? 'Active' : 'Not generated'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-light)', fontSize: 12, marginBottom: 4 }}>Key Ending</div>
            <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{status.last4 ? `****${status.last4}` : '—'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Please wait...' : status.hasApiKey ? 'Regenerate API Key' : 'Generate API Key'}
          </button>
          {status.hasApiKey && (
            <button className="btn btn-danger" onClick={handleRevoke} disabled={loading}>
              Revoke API Key
            </button>
          )}
        </div>
      </div>

      {generatedKey && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ color: 'var(--navy)', fontWeight: 700, marginBottom: 10 }}>Your New API Key</div>
          <div style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 12 }}>
            {generatedKey}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline" onClick={copyKey}>Copy Key</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentPortal() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <Navbar links={STUDENT_LINKS} />
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Routes>
          <Route index element={<StudentHome />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="documents" element={<StudentDocuments />} />
          <Route path="events" element={<StudentEvents />} />
          <Route path="api-access" element={<StudentApiAccess />} />
          <Route path="profile" element={<StudentProfile />} />
        </Routes>
      </div>
    </div>
  );
}
