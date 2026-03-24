import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth, api } from '../context/AuthContext';

const ADMIN_LINKS = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/students', label: 'Students', icon: '🎓' },
  { path: '/admin/results', label: 'Results', icon: '📋' },
  { path: '/admin/documents', label: 'Documents', icon: '📄' },
  { path: '/admin/events', label: 'Events', icon: '📅' },
  { path: '/admin/notices', label: 'Notices', icon: '📢' },
];

function AdminHome() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    api('/admin/stats', {}, token).then(setStats).catch(console.error);
    api('/events', {}, token).then(setEvents).catch(console.error);
    api('/notices', {}, token).then(setNotices).catch(console.error);
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>Admin Dashboard</h2>
      <p style={{ color: 'var(--text-light)', marginBottom: 32 }}>System overview and management</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { icon: '👨‍🎓', label: 'Total Students', value: stats?.totalStudents || 0, color: '#3182ce' },
          { icon: '📋', label: 'Results Added', value: stats?.totalResults || 0, color: '#2d9e6a' },
          { icon: '📄', label: 'Documents', value: stats?.totalDocuments || 0, color: '#d97706' },
          { icon: '📅', label: 'Events', value: stats?.totalEvents || 0, color: '#805ad5' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderLeftColor: s.color }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Upcoming Events */}
        <div className="card">
          <div style={{ padding: '16px 20px', background: 'var(--navy)', color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif', fontSize: 16 }}>
            📅 Upcoming Events
          </div>
          <div style={{ padding: 0 }}>
            {events.slice(0, 5).map(e => (
              <div key={e._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{e.owner}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{e.time}</div>
                </div>
              </div>
            ))}
            {!events.length && <div className="empty-state" style={{ padding: 24 }}><div>No events</div></div>}
          </div>
        </div>

        {/* Recent Notices */}
        <div className="card">
          <div style={{ padding: '16px 20px', background: 'var(--navy)', color: 'var(--gold-light)', fontFamily: 'Playfair Display, serif', fontSize: 16 }}>
            📢 Recent Notices
          </div>
          <div style={{ padding: 0 }}>
            {notices.slice(0, 5).map(n => (
              <div key={n._id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', flex: 1 }}>{n.title}</div>
                  <span className={`badge badge-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'info'}`} style={{ marginLeft: 8, fontSize: 10 }}>{n.priority}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>{n.content.substring(0, 80)}...</div>
              </div>
            ))}
            {!notices.length && <div className="empty-state" style={{ padding: 24 }}><div>No notices</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsManager() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNumber: '', mobile: '', department: 'Computer Engineering', semester: 1, year: 1, quota: 'GOVT', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchStudents = () => api('/students', {}, token).then(setStudents);
  useEffect(() => { fetchStudents(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }, token);
      await fetchStudents();
      setShowModal(false);
      setForm({ name: '', email: '', password: '', rollNumber: '', mobile: '', department: 'Computer Engineering', semester: 1, year: 1, quota: 'GOVT', role: 'student' });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    await api(`/students/${id}`, { method: 'DELETE' }, token);
    fetchStudents();
  };

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.rollNumber?.includes(search) || s.email?.includes(search));

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'var(--navy)' }}>Student Management</h2>
          <p style={{ color: 'var(--text-light)', fontSize: 14 }}>{students.length} students enrolled</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Student</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="input-field" placeholder="🔍 Search by name, roll number, or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Roll No.</th><th>Name</th><th>Department</th><th>Semester</th><th>Email</th><th>Mobile</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id}>
                <td><span className="badge badge-gold">{s.rollNumber}</span></td>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{s.department}</td>
                <td><span className="badge badge-info">Sem {s.semester}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{s.email}</td>
                <td style={{ fontSize: 13 }}>{s.mobile}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="empty-state"><div className="icon">🎓</div><div>No students found</div></div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Add New Student</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-light)' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="grid-2">
                  <div className="form-group"><label className="label">Full Name</label><input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label className="label">Roll Number</label><input className="input-field" value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} required /></div>
                  <div className="form-group"><label className="label">Email</label><input className="input-field" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                  <div className="form-group"><label className="label">Password</label><input className="input-field" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>
                  <div className="form-group"><label className="label">Mobile</label><input className="input-field" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} /></div>
                  <div className="form-group"><label className="label">Quota</label>
                    <select className="input-field" value={form.quota} onChange={e => setForm({...form, quota: e.target.value})}>
                      <option>GOVT</option><option>MANAGEMENT</option><option>MINORITY</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="label">Department</label>
                    <select className="input-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                      <option>Computer Engineering</option><option>Information Technology</option><option>Electronics Engineering</option><option>Mechanical Engineering</option><option>Civil Engineering</option><option>EXTC Engineering</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="label">Semester</label>
                    <select className="input-field" value={form.semester} onChange={e => setForm({...form, semester: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsManager() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ rollNumber: '', semester: 1, examMonth: 'Nov', examYear: 2025, subjects: [], sgpi: '', cgpi: '', result: 'PASS' });
  const [subjects, setSubjects] = useState([{ name: '', headOfPassing: 'ESE', maxMarks: 50, marksObtained: '', grade: '', status: 'Pass' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const fetchResults = () => api('/results', {}, token).then(setResults).catch(console.error);
  useEffect(() => {
    fetchResults();
    api('/students', {}, token).then(setStudents).catch(console.error);
  }, []);

  const addSubjectRow = () => setSubjects([...subjects, { name: '', headOfPassing: 'ESE', maxMarks: 50, marksObtained: '', grade: '', status: 'Pass' }]);
  const updateSubject = (i, field, val) => { const s = [...subjects]; s[i] = {...s[i], [field]: val}; setSubjects(s); };
  const removeSubject = (i) => setSubjects(subjects.filter((_, idx) => idx !== i));

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const student = students.find(s => s.rollNumber === form.rollNumber);
      await api('/results', { method: 'POST', body: JSON.stringify({ ...form, studentId: student?._id, subjects, semester: Number(form.semester), examYear: Number(form.examYear), sgpi: Number(form.sgpi), cgpi: Number(form.cgpi) }) }, token);
      await fetchResults();
      setShowModal(false);
      setSubjects([{ name: '', headOfPassing: 'ESE', maxMarks: 50, marksObtained: '', grade: '', status: 'Pass' }]);
      setForm({ rollNumber: '', semester: 1, examMonth: 'Nov', examYear: 2025, subjects: [], sgpi: '', cgpi: '', result: 'PASS' });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this result?')) return;
    await api(`/results/${id}`, { method: 'DELETE' }, token);
    fetchResults();
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--navy)' }}>Results Management</h2><p style={{ color: 'var(--text-light)', fontSize: 14 }}>Add and manage student results</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Result</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Roll No.</th><th>Student</th><th>Semester</th><th>Exam</th><th>SGPI</th><th>CGPI</th><th>Result</th><th>Actions</th></tr></thead>
          <tbody>
            {results.map(r => (
              <tr key={r._id}>
                <td><span className="badge badge-gold">{r.rollNumber}</span></td>
                <td style={{ fontWeight: 600 }}>{r.studentId?.name || '—'}</td>
                <td>Semester {r.semester}</td>
                <td>{r.examMonth} {r.examYear}</td>
                <td><strong style={{ color: 'var(--navy)' }}>{r.sgpi}</strong></td>
                <td><strong style={{ color: 'var(--navy)' }}>{r.cgpi}</strong></td>
                <td><span className={`badge badge-${r.result === 'PASS' ? 'success' : 'danger'}`}>{r.result}</span></td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!results.length && <div className="empty-state"><div className="icon">📋</div><div>No results added yet</div></div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3>Add Student Result</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="grid-3" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="label">Roll Number</label>
                    <select className="input-field" value={form.rollNumber} onChange={e => setForm({...form, rollNumber: e.target.value})} required>
                      <option value="">Select Student</option>
                      {students.map(s => <option key={s._id} value={s.rollNumber}>{s.rollNumber} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Semester</label>
                    <select className="input-field" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Exam Month</label>
                    <select className="input-field" value={form.examMonth} onChange={e => setForm({...form, examMonth: e.target.value})}>
                      <option>Nov</option><option>May</option><option>Apr</option><option>Oct</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Exam Year</label>
                    <input className="input-field" type="number" value={form.examYear} onChange={e => setForm({...form, examYear: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="label">SGPI</label>
                    <input className="input-field" type="number" step="0.01" value={form.sgpi} onChange={e => setForm({...form, sgpi: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="label">CGPI</label>
                    <input className="input-field" type="number" step="0.01" value={form.cgpi} onChange={e => setForm({...form, cgpi: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Result</label>
                  <select className="input-field" style={{ maxWidth: 200 }} value={form.result} onChange={e => setForm({...form, result: e.target.value})}>
                    <option>PASS</option><option>FAIL</option><option>ATKT</option>
                  </select>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label className="label" style={{ margin: 0 }}>Subjects & Marks</label>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addSubjectRow}>+ Add Subject</button>
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <table>
                      <thead><tr><th>Subject Name</th><th>Head</th><th>Max</th><th>Obtained</th><th>Grade</th><th>Status</th><th></th></tr></thead>
                      <tbody>
                        {subjects.map((s, i) => (
                          <tr key={i}>
                            <td><input className="input-field" style={{ minWidth: 180 }} value={s.name} onChange={e => updateSubject(i, 'name', e.target.value)} placeholder="Subject name" /></td>
                            <td><select className="input-field" style={{ minWidth: 60 }} value={s.headOfPassing} onChange={e => updateSubject(i, 'headOfPassing', e.target.value)}><option>ESE</option><option>ISA</option><option>MSE</option><option>TW</option><option>OR</option></select></td>
                            <td><input className="input-field" type="number" style={{ width: 60 }} value={s.maxMarks} onChange={e => updateSubject(i, 'maxMarks', Number(e.target.value))} /></td>
                            <td><input className="input-field" type="number" style={{ width: 60 }} value={s.marksObtained} onChange={e => updateSubject(i, 'marksObtained', Number(e.target.value))} /></td>
                            <td><input className="input-field" style={{ width: 60 }} value={s.grade} onChange={e => updateSubject(i, 'grade', e.target.value)} placeholder="O/A/B" /></td>
                            <td><select className="input-field" style={{ minWidth: 70 }} value={s.status} onChange={e => updateSubject(i, 'status', e.target.value)}><option>Pass</option><option>Fail</option></select></td>
                            <td><button type="button" onClick={() => removeSubject(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18 }}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Result'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsManager() {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [docRequests, setDocRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ studentId: '', rollNumber: '', type: 'bonafide', title: '' });
  const [loading, setLoading] = useState(false);

  const fetchDocs = () => api('/documents', {}, token).then(setDocs).catch(console.error);
  const fetchDocRequests = () => api('/admin/document-requests', {}, token).then(setDocRequests).catch(console.error);
  useEffect(() => {
    fetchDocs();
    fetchDocRequests();
    api('/students', {}, token).then(setStudents).catch(console.error);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/documents', { method: 'POST', body: JSON.stringify({ ...form, content: { generatedAt: new Date(), issuedBy: 'Admin' } }) }, token);
      fetchDocs();
      setShowModal(false);
      setForm({ studentId: '', rollNumber: '', type: 'bonafide', title: '' });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api(`/documents/${id}`, { method: 'DELETE' }, token);
    fetchDocs();
  };

  const handleRequestStatus = async (id, status) => {
    try {
      await api(`/admin/document-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }, token);
      fetchDocRequests();
      fetchDocs();
    } catch (error) {
      alert(error.message);
    }
  };

  const docTypeLabels = { bonafide: 'Bonafide', transcript: 'Transcript', leavingCertificate: 'Leaving Certificate', idCard: 'ID Card', marksheet: 'Mark Sheet' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--navy)' }}>Documents Management</h2><p style={{ color: 'var(--text-light)', fontSize: 14 }}>Issue documents to students</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Issue Document</button>
      </div>

      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
          <strong style={{ color: 'var(--navy)' }}>Student Document Requests</strong>
        </div>
        <table>
          <thead><tr><th>Requested On</th><th>Roll No.</th><th>Student</th><th>Type</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {docRequests.map(r => (
              <tr key={r._id}>
                <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                <td><span className="badge badge-gold">{r.rollNumber}</span></td>
                <td style={{ fontWeight: 600 }}>{r.studentId?.name || '—'}</td>
                <td><span className="badge badge-info">{docTypeLabels[r.type] || r.type}</span></td>
                <td style={{ maxWidth: 260 }}>{r.purpose}</td>
                <td><span className={`badge badge-${r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}`}>{r.status}</span></td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => handleRequestStatus(r._id, 'approved')} disabled={r.status === 'approved'}>Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleRequestStatus(r._id, 'rejected')} disabled={r.status === 'rejected'}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!docRequests.length && <div className="empty-state"><div className="icon">📥</div><div>No document requests yet</div></div>}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--cream)' }}>
          <strong style={{ color: 'var(--navy)' }}>Issued Documents</strong>
        </div>
        <table>
          <thead><tr><th>Roll No.</th><th>Student</th><th>Document Type</th><th>Title</th><th>Issued On</th><th>Actions</th></tr></thead>
          <tbody>
            {docs.map(d => (
              <tr key={d._id}>
                <td><span className="badge badge-gold">{d.rollNumber}</span></td>
                <td style={{ fontWeight: 600 }}>{d.studentId?.name || '—'}</td>
                <td><span className="badge badge-info">{docTypeLabels[d.type] || d.type}</span></td>
                <td>{d.title}</td>
                <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{new Date(d.generatedAt).toLocaleDateString('en-IN')}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(d._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!docs.length && <div className="empty-state"><div className="icon">📄</div><div>No documents issued</div></div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Issue Document</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="label">Student</label>
                  <select className="input-field" value={form.studentId} onChange={e => {
                    const s = students.find(s => s._id === e.target.value);
                    setForm({...form, studentId: e.target.value, rollNumber: s?.rollNumber || ''});
                  }} required>
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s._id} value={s._id}>{s.rollNumber} - {s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Document Type</label>
                  <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value, title: docTypeLabels[e.target.value]})}>
                    {Object.entries(docTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Title / Purpose</label>
                  <input className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Bonafide for Bank Loan" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Issuing...' : 'Issue Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EventsManager() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', owner: '', forRole: 'STUDENT', date: '', time: '', venue: '', inst: 'VIT', isHoliday: false, reason: '' });
  const [loading, setLoading] = useState(false);

  const fetchEvents = () => api('/events', {}, token).then(setEvents).catch(console.error);
  useEffect(() => { fetchEvents(); }, []);

  const resetForm = () => {
    setForm({ title: '', owner: '', forRole: 'STUDENT', date: '', time: '', venue: '', inst: 'VIT', isHoliday: false, reason: '' });
    setEditingId(null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        owner: form.owner,
        forRole: form.forRole,
        date: form.date,
        time: form.time,
        venue: form.venue,
        inst: form.inst,
        isHoliday: form.isHoliday,
        reason: form.reason
      };
      if (editingId) {
        await api(`/events/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      } else {
        await api('/events', { method: 'POST', body: JSON.stringify(payload) }, token);
      }
      fetchEvents();
      setShowModal(false);
      resetForm();
    }
    catch (e) { alert(e.message); }
    setLoading(false);
  };

  const handleEdit = (eventItem) => {
    setEditingId(eventItem._id);
    setForm({
      title: eventItem.title || '',
      owner: eventItem.owner || '',
      forRole: eventItem.forRole || 'STUDENT',
      date: eventItem.date ? new Date(eventItem.date).toISOString().slice(0, 10) : '',
      time: eventItem.time || '',
      venue: eventItem.venue || '',
      inst: eventItem.inst || 'VIT',
      isHoliday: Boolean(eventItem.isHoliday),
      reason: eventItem.reason || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api(`/events/${id}`, { method: 'DELETE' }, token);
    fetchEvents();
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--navy)' }}>Events Management</h2></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Add Event</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Type</th><th>Activity Name</th><th>Reason</th><th>Owner</th><th>For</th><th>Date</th><th>Time</th><th>Venue</th><th>Actions</th></tr></thead>
          <tbody>
            {events.map(e => (
              <tr key={e._id}>
                <td><span className={`badge ${e.isHoliday ? 'badge-danger' : 'badge-gold'}`}>{e.isHoliday ? 'Holiday' : (e.inst || 'Event')}</span></td>
                <td style={{ fontWeight: 600, maxWidth: 220 }}>{e.title}</td>
                <td style={{ fontSize: 13, color: 'var(--text-mid)', maxWidth: 220 }}>{e.reason || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--text-mid)' }}>{e.owner || '—'}</td>
                <td><span className="badge badge-info">{e.forRole}</span></td>
                <td>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                <td>{e.time || '—'}</td>
                <td>{e.venue || '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => handleEdit(e)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && <div className="empty-state"><div className="icon">📅</div><div>No events</div></div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Event' : 'Add Event'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="label">Activity Name</label><input className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input id="isHoliday" type="checkbox" checked={form.isHoliday} onChange={e => setForm({ ...form, isHoliday: e.target.checked, reason: e.target.checked ? form.reason : '' })} />
                    <label htmlFor="isHoliday" className="label" style={{ marginBottom: 0 }}>This is a holiday</label>
                  </div>
                  {form.isHoliday && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="label">Why is this holiday?</label><input className="input-field" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required placeholder="e.g. National holiday / Festival" /></div>}
                  <div className="form-group"><label className="label">Activity Owner (Optional)</label><input className="input-field" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} /></div>
                  <div className="form-group"><label className="label">Institute</label><select className="input-field" value={form.inst} onChange={e => setForm({...form, inst: e.target.value})}><option>VIT</option><option>VSIT</option><option>VIVA</option></select></div>
                  <div className="form-group"><label className="label">Date</label><input className="input-field" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
                  <div className="form-group"><label className="label">Time (Optional)</label><input className="input-field" type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} /></div>
                  <div className="form-group"><label className="label">Venue (Optional)</label><input className="input-field" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} placeholder="e.g. X-020" /></div>
                  <div className="form-group"><label className="label">For</label><select className="input-field" value={form.forRole} onChange={e => setForm({...form, forRole: e.target.value})}><option>STUDENT</option><option>STAFF</option><option>ALL</option></select></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Event' : 'Add Event')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NoticesManager() {
  const { token } = useAuth();
  const [notices, setNotices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'low' });
  const [loading, setLoading] = useState(false);

  const fetchNotices = () => api('/notices', {}, token).then(setNotices).catch(console.error);
  useEffect(() => { fetchNotices(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api('/notices', { method: 'POST', body: JSON.stringify(form) }, token); fetchNotices(); setShowModal(false); setForm({ title: '', content: '', priority: 'low' }); }
    catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h2 style={{ color: 'var(--navy)' }}>Notices & Announcements</h2></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Post Notice</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {notices.map(n => (
          <div key={n._id} className="card" style={{ padding: 20, borderLeft: `4px solid ${n.priority === 'high' ? 'var(--danger)' : n.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 16, color: 'var(--navy)', marginBottom: 6 }}>{n.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-mid)' }}>{n.content}</p>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-light)' }}>Posted by {n.postedBy} · {new Date(n.date).toLocaleDateString('en-IN')}</div>
              </div>
              <span className={`badge badge-${n.priority === 'high' ? 'danger' : n.priority === 'medium' ? 'warning' : 'info'}`}>{n.priority}</span>
            </div>
          </div>
        ))}
        {!notices.length && <div className="empty-state card" style={{ padding: 48 }}><div className="icon">📢</div><div>No notices posted</div></div>}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Post Notice</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <div className="form-group"><label className="label">Title</label><input className="input-field" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
                <div className="form-group"><label className="label">Content</label><textarea className="input-field" rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} required style={{ resize: 'vertical' }} /></div>
                <div className="form-group"><label className="label">Priority</label><select className="input-field" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Posting...' : 'Post Notice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <Navbar links={ADMIN_LINKS} />
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="students" element={<StudentsManager />} />
          <Route path="results" element={<ResultsManager />} />
          <Route path="documents" element={<DocumentsManager />} />
          <Route path="events" element={<EventsManager />} />
          <Route path="notices" element={<NoticesManager />} />
        </Routes>
      </div>
    </div>
  );
}
