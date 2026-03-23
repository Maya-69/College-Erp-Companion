const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

const apiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: { error: 'API rate limit exceeded. Please try again later.' }
});

app.use('/api', globalApiLimiter);

const JWT_SECRET = process.env.JWT_SECRET || 'college_erp_secret_2024';
const API_KEY_SALT = process.env.API_KEY_SALT || 'college_erp_api_key_salt_2026';

const DOCUMENT_TYPES = ['bonafide', 'transcript', 'leavingCertificate', 'idCard', 'marksheet'];

const sanitizeText = (value, max = 120) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);

const generateApiKey = () => `erp_${crypto.randomBytes(24).toString('hex')}`;

const hashApiKey = (rawKey) => crypto.createHash('sha256').update(`${rawKey}:${API_KEY_SALT}`).digest('hex');

const extractApiKey = (req) => {
  const fromHeader = req.headers['x-api-key'];
  if (fromHeader) return String(fromHeader).trim();
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('apikey ')) {
    return authHeader.slice(7).trim();
  }
  return null;
};

// ======================== MODELS ========================

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  apiKeyHash: { type: String, default: null },
  apiKeyLast4: { type: String, default: null },
  apiKeyCreatedAt: { type: Date, default: null },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  rollNumber: String,
  mobile: String,
  department: String,
  semester: Number,
  year: Number,
  quota: String,
  photo: String,
  createdAt: { type: Date, default: Date.now }
});

const ResultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rollNumber: String,
  semester: Number,
  examMonth: String,
  examYear: Number,
  subjects: [{
    name: String,
    headOfPassing: String,
    maxMarks: Number,
    marksObtained: Number,
    grade: String,
    status: String
  }],
  sgpi: Number,
  cgpi: Number,
  result: String,
  createdAt: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rollNumber: String,
  type: { type: String, enum: DOCUMENT_TYPES },
  title: String,
  content: Object,
  generatedAt: { type: Date, default: Date.now }
});

const DocumentRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rollNumber: { type: String, required: true },
  type: { type: String, enum: DOCUMENT_TYPES, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const EventSchema = new mongoose.Schema({
  title: String,
  owner: String,
  forRole: String,
  date: Date,
  time: String,
  venue: String,
  conducted: { type: Boolean, default: false },
  inst: String
});

const HolidaySchema = new mongoose.Schema({
  date: Date,
  name: String
});

const NoticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  postedBy: String,
  date: { type: Date, default: Date.now },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
});

const User = mongoose.model('User', UserSchema);
const Result = mongoose.model('Result', ResultSchema);
const Document = mongoose.model('Document', DocumentSchema);
const DocumentRequest = mongoose.model('DocumentRequest', DocumentRequestSchema);
const Event = mongoose.model('Event', EventSchema);
const Holiday = mongoose.model('Holiday', HolidaySchema);
const Notice = mongoose.model('Notice', NoticeSchema);

// ======================== MIDDLEWARE ========================

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = extractApiKey(req);
    if (!apiKey || !apiKey.startsWith('erp_')) {
      return res.status(401).json({ error: 'Valid API key required' });
    }

    const apiKeyHash = hashApiKey(apiKey);
    const user = await User.findOne({ apiKeyHash }).select('name email role rollNumber semester year department mobile');
    if (!user) return res.status(401).json({ error: 'Invalid API key' });

    req.apiUser = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid API key' });
  }
};

// ======================== ROUTES ========================

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, mobile, department, semester, year, quota } = req.body;
    const normalizedEmail = sanitizeText(email, 120).toLowerCase();
    if (!normalizedEmail || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) are required' });
    }
    if (role && !['admin', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: sanitizeText(name, 80),
      email: normalizedEmail,
      password: hashed,
      role,
      rollNumber: sanitizeText(rollNumber, 40),
      mobile: sanitizeText(mobile, 20),
      department: sanitizeText(department, 80),
      semester: Number(semester) || undefined,
      year: Number(year) || undefined,
      quota: sanitizeText(quota, 20)
    });
    res.json({ message: 'User created', user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = sanitizeText(email, 120).toLowerCase();
    if (!normalizedEmail || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, rollNumber: user.rollNumber, department: user.department } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Student Routes
app.get('/api/students', auth, adminOnly, async (req, res) => {
  const students = await User.find({ role: 'student' }).select('-password');
  res.json(students);
});

app.get('/api/students/:id', auth, async (req, res) => {
  const student = await User.findById(req.params.id).select('-password');
  res.json(student);
});

app.put('/api/students/:id', auth, adminOnly, async (req, res) => {
  const student = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
  res.json(student);
});

app.delete('/api/students/:id', auth, adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Student deleted' });
});

app.get('/api/account/api-key/status', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('apiKeyLast4 apiKeyCreatedAt');
  res.json({
    hasApiKey: Boolean(user?.apiKeyLast4),
    last4: user?.apiKeyLast4 || null,
    createdAt: user?.apiKeyCreatedAt || null
  });
});

app.post('/api/account/api-key/generate', auth, async (req, res) => {
  const rawApiKey = generateApiKey();
  await User.findByIdAndUpdate(req.user.id, {
    apiKeyHash: hashApiKey(rawApiKey),
    apiKeyLast4: rawApiKey.slice(-4),
    apiKeyCreatedAt: new Date()
  });

  res.json({
    message: 'API key generated. Store it now; it will not be shown again.',
    apiKey: rawApiKey,
    last4: rawApiKey.slice(-4)
  });
});

app.delete('/api/account/api-key/revoke', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    apiKeyHash: null,
    apiKeyLast4: null,
    apiKeyCreatedAt: null
  });
  res.json({ message: 'API key revoked successfully' });
});

// Results Routes
app.post('/api/results', auth, adminOnly, async (req, res) => {
  try {
    const result = await Result.create(req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/results', auth, async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { rollNumber: req.query.rollNumber || (await User.findById(req.user.id)).rollNumber };
  const results = await Result.find(query).populate('studentId', 'name rollNumber');
  res.json(results);
});

app.get('/api/results/:id', auth, async (req, res) => {
  const result = await Result.findById(req.params.id).populate('studentId', 'name rollNumber department');
  res.json(result);
});

app.put('/api/results/:id', auth, adminOnly, async (req, res) => {
  const result = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(result);
});

app.delete('/api/results/:id', auth, adminOnly, async (req, res) => {
  await Result.findByIdAndDelete(req.params.id);
  res.json({ message: 'Result deleted' });
});

// Documents Routes
app.post('/api/documents', auth, adminOnly, async (req, res) => {
  const doc = await Document.create(req.body);
  res.json(doc);
});

app.get('/api/admin/document-requests', auth, adminOnly, async (_req, res) => {
  const requests = await DocumentRequest.find()
    .populate('studentId', 'name rollNumber email')
    .sort({ createdAt: -1 });
  res.json(requests);
});

app.patch('/api/admin/document-requests/:id', auth, adminOnly, async (req, res) => {
  const status = sanitizeText(req.body.status, 20).toLowerCase();
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = await DocumentRequest.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('studentId', 'name rollNumber email');

  if (!updated) {
    return res.status(404).json({ error: 'Document request not found' });
  }

  res.json(updated);
});

app.get('/api/documents', auth, async (req, res) => {
  const query = req.user.role === 'admin' ? {} : { studentId: req.user.id };
  const docs = await Document.find(query).populate('studentId', 'name rollNumber');
  res.json(docs);
});

app.delete('/api/documents/:id', auth, adminOnly, async (req, res) => {
  await Document.findByIdAndDelete(req.params.id);
  res.json({ message: 'Document deleted' });
});

// Events Routes
app.post('/api/events', auth, adminOnly, async (req, res) => {
  const event = await Event.create(req.body);
  res.json(event);
});

app.get('/api/events', auth, async (req, res) => {
  const events = await Event.find().sort({ date: 1 });
  res.json(events);
});

app.delete('/api/events/:id', auth, adminOnly, async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ message: 'Event deleted' });
});

// Holidays Routes
app.post('/api/holidays', auth, adminOnly, async (req, res) => {
  const holiday = await Holiday.create(req.body);
  res.json(holiday);
});

app.get('/api/holidays', async (req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 });
  res.json(holidays);
});

// Notices Routes
app.post('/api/notices', auth, adminOnly, async (req, res) => {
  const notice = await Notice.create({ ...req.body, postedBy: req.user.name });
  res.json(notice);
});

app.get('/api/notices', async (req, res) => {
  const notices = await Notice.find().sort({ date: -1 });
  res.json(notices);
});

// Stats Route (Admin)
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  const totalStudents = await User.countDocuments({ role: 'student' });
  const totalResults = await Result.countDocuments();
  const totalDocuments = await Document.countDocuments();
  const totalDocumentRequests = await DocumentRequest.countDocuments();
  const totalEvents = await Event.countDocuments();
  res.json({ totalStudents, totalResults, totalDocuments, totalDocumentRequests, totalEvents });
});

app.get('/api/public/me', apiKeyLimiter, apiKeyAuth, async (req, res) => {
  res.json({
    id: req.apiUser._id,
    name: req.apiUser.name,
    email: req.apiUser.email,
    rollNumber: req.apiUser.rollNumber,
    department: req.apiUser.department,
    semester: req.apiUser.semester,
    year: req.apiUser.year,
    mobile: req.apiUser.mobile
  });
});

app.get('/api/public/marks', apiKeyLimiter, apiKeyAuth, async (req, res) => {
  const requestedSemester = Number(req.query.semester);
  const query = { rollNumber: req.apiUser.rollNumber };
  if (Number.isInteger(requestedSemester) && requestedSemester > 0 && requestedSemester <= 12) {
    query.semester = requestedSemester;
  }
  const results = await Result.find(query).sort({ semester: 1, createdAt: 1 });
  res.json(results);
});

app.get('/api/public/events', apiKeyLimiter, apiKeyAuth, async (_req, res) => {
  const events = await Event.find().sort({ date: 1 });
  res.json(events);
});

app.get('/api/public/holidays', apiKeyLimiter, apiKeyAuth, async (_req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 });
  res.json(holidays);
});

app.post('/api/public/documents/request', apiKeyLimiter, apiKeyAuth, async (req, res) => {
  const type = sanitizeText(req.body.type, 40);
  const purpose = sanitizeText(req.body.purpose, 200);
  if (!DOCUMENT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }
  if (!purpose || purpose.length < 5) {
    return res.status(400).json({ error: 'Purpose must be at least 5 characters' });
  }

  const request = await DocumentRequest.create({
    studentId: req.apiUser._id,
    rollNumber: req.apiUser.rollNumber,
    type,
    purpose,
    status: 'pending'
  });

  res.status(201).json({
    id: request._id,
    type: request.type,
    purpose: request.purpose,
    status: request.status,
    createdAt: request.createdAt
  });
});

app.get('/api/public/documents/requests', apiKeyLimiter, apiKeyAuth, async (req, res) => {
  const requests = await DocumentRequest.find({ studentId: req.apiUser._id }).sort({ createdAt: -1 });
  res.json(requests);
});

// Seed Data
app.post('/api/seed', async (req, res) => {
  try {
    const calculateGrade = (score, max) => {
      const percent = max ? (score / max) * 100 : 0;
      if (percent >= 90) return 'O';
      if (percent >= 80) return 'A+';
      if (percent >= 70) return 'A';
      if (percent >= 60) return 'B+';
      if (percent >= 50) return 'B';
      return 'C';
    };

    const randomMarks = (max) => {
      const min = Math.max(18, Math.floor(max * 0.55));
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const subjectTemplate = [
      { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'ESE', maxMarks: 50 },
      { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'ISA', maxMarks: 45 },
      { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'MSE', maxMarks: 30 },
      { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'ESE', maxMarks: 40 },
      { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'ISA', maxMarks: 15 },
      { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'MSE', maxMarks: 20 },
      { name: 'ARTIFICIAL INTELLIGENCE LAB', headOfPassing: 'ESE', maxMarks: 25 },
      { name: 'WEB DESIGN LAB', headOfPassing: 'ESE', maxMarks: 25 },
      { name: 'SOFTWARE ENGINEERING', headOfPassing: 'ESE', maxMarks: 40 },
    ];

    const buildRandomSem5Result = (studentId, rollNumber) => {
      const subjects = subjectTemplate.map((subj) => {
        const marksObtained = randomMarks(subj.maxMarks);
        return {
          ...subj,
          marksObtained,
          grade: calculateGrade(marksObtained, subj.maxMarks),
          status: 'Pass'
        };
      });

      const sgpi = Number((7.1 + Math.random() * 2.4).toFixed(2));
      const cgpi = Number((6.9 + Math.random() * 2.2).toFixed(2));

      return {
        studentId,
        rollNumber,
        semester: 5,
        examMonth: 'Nov',
        examYear: 2025,
        subjects,
        sgpi,
        cgpi,
        result: 'PASS'
      };
    };

    // Create admin
    const adminPass = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { email: 'admin@vit.edu.in' },
      { name: 'Admin VIT', email: 'admin@vit.edu.in', password: adminPass, role: 'admin' },
      { upsert: true }
    );

    // Create demo student
    const studentPass = await bcrypt.hash('student123', 10);
    const student = await User.findOneAndUpdate(
      { email: 'vicky@vit.edu.in' },
      {
        name: 'Vicky Pukale', email: 'vicky@vit.edu.in', password: studentPass, role: 'student',
        rollNumber: '23102A0033', mobile: '8591221919', department: 'Computer Engineering',
        semester: 5, year: 3, quota: 'GOVT'
      },
      { upsert: true, new: true }
    );

    const extraStudentSeeds = [
      { name: 'Mayuresh Sawant', email: 'mayuresh@vit.edu.in', rollNumber: '23102A0029', mobile: '9890023001' },
      { name: 'Sunil Saini', email: 'sunil@vit.edu.in', rollNumber: '23102A0036', mobile: '9890023003' },
      { name: 'Parag Jadhav', email: 'parag@vit.edu.in', rollNumber: '23102A0018', mobile: '9890023002' },
      { name: 'Rohit Thatikonda', email: 'rohit@vit.edu.in', rollNumber: '23102A0050', mobile: '9890023004' },
    ];

    const extraStudents = [];
    for (const seed of extraStudentSeeds) {
      const seededStudent = await User.findOneAndUpdate(
        { email: seed.email },
        {
          name: seed.name,
          email: seed.email,
          password: studentPass,
          role: 'student',
          rollNumber: seed.rollNumber,
          mobile: seed.mobile,
          department: 'Computer Engineering',
          semester: 5,
          year: 3,
          quota: 'GOVT'
        },
        { upsert: true, new: true }
      );
      extraStudents.push(seededStudent);
    }

    // Seed events
    await Event.deleteMany({});
    await Event.insertMany([
      { title: 'MSE 1', owner: 'DILIP MOTWANI', forRole: 'STUDENT', date: new Date('2026-02-23'), time: '09:00', inst: 'VIT', conducted: false },
      { title: 'VERVE 25 (START)', owner: 'SANGEETA JOSHI', forRole: 'STUDENT', date: new Date('2026-02-23'), time: '09:00', inst: 'VIT', conducted: false },
      { title: 'VALUE ADDED COURSE ON EMBEDDED FINANCE', owner: 'LAVANYA SAMALA', forRole: 'STUDENT', date: new Date('2026-02-23'), time: '10:00', venue: 'X-020', inst: 'VSIT', conducted: false },
      { title: 'MMS SA- SESSION ON CAPITAL MARKET - BSE', owner: 'VARSHA MAHESHWARI', forRole: 'STUDENT', date: new Date('2026-02-24'), time: '09:00', inst: 'VIT', conducted: false },
    ]);

    // Seed holidays
    await Holiday.deleteMany({});
    await Holiday.insertMany([
      { date: new Date('2026-03-03'), name: 'HOLI 2ND DAY' },
      { date: new Date('2026-03-19'), name: 'GUDHI PADWA' },
      { date: new Date('2026-03-21'), name: 'RAMZAN-EID' },
      { date: new Date('2026-04-14'), name: 'DR. BABASAHEB AMBEDKAR JAYANTI' },
      { date: new Date('2026-05-01'), name: 'MAHARASHTRA DIN  BUDDHA POURNIMA' },
    ]);

    // Seed result for student
    const existingResult = await Result.findOne({ rollNumber: '23102A0033', semester: 5 });
    if (!existingResult) {
      await Result.create({
        studentId: student._id,
        rollNumber: '23102A0033',
        semester: 5,
        examMonth: 'Nov',
        examYear: 2025,
        subjects: [
          { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'ESE', maxMarks: 50, marksObtained: 46, grade: 'O', status: 'Pass' },
          { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'ISA', maxMarks: 45, marksObtained: 41, grade: 'O', status: 'Pass' },
          { name: 'FUNDAMENTALS OF ROBOTICS AND CONTROL', headOfPassing: 'MSE', maxMarks: 30, marksObtained: 30, grade: 'O', status: 'Pass' },
          { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'ESE', maxMarks: 40, marksObtained: 23, grade: 'B', status: 'Pass' },
          { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'ISA', maxMarks: 15, marksObtained: 14, grade: 'A', status: 'Pass' },
          { name: 'ARTIFICIAL INTELLIGENCE', headOfPassing: 'MSE', maxMarks: 20, marksObtained: 18, grade: 'A', status: 'Pass' },
          { name: 'ARTIFICIAL INTELLIGENCE LAB', headOfPassing: 'ESE', maxMarks: 25, marksObtained: 24, grade: 'O', status: 'Pass' },
          { name: 'WEB DESIGN LAB', headOfPassing: 'ESE', maxMarks: 25, marksObtained: 23, grade: 'O', status: 'Pass' },
          { name: 'SOFTWARE ENGINEERING', headOfPassing: 'ESE', maxMarks: 40, marksObtained: 30, grade: 'B+', status: 'Pass' },
        ],
        sgpi: 9.5,
        cgpi: 9.2,
        result: 'PASS'
      });
    }

    for (const seededStudent of extraStudents) {
      const alreadyPresent = await Result.findOne({ rollNumber: seededStudent.rollNumber, semester: 5 });
      if (!alreadyPresent) {
        await Result.create(buildRandomSem5Result(seededStudent._id, seededStudent.rollNumber));
      }
    }

    // Seed notices
    await Notice.deleteMany({});
    await Notice.insertMany([
      { title: 'Exam Schedule Released', content: 'MSE 1 exams begin from 23rd February 2026. Students are requested to check the timetable.', postedBy: 'Admin', priority: 'high', date: new Date() },
      { title: 'Library Book Return', content: 'All students must return library books before end of semester.', postedBy: 'Library Admin', priority: 'medium', date: new Date() },
      { title: 'Value Added Course Registration', content: 'Register for Embedded Finance and International Finance courses in Room X-020.', postedBy: 'Admin', priority: 'low', date: new Date() },
    ]);

    res.json({ message: 'Database seeded successfully!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Connect and start
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/college_erp';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5000, () => console.log('Server running on port 5000'));
  })
  .catch(err => console.error('MongoDB connection error:', err));
