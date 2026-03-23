const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb-promises');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

const PORT = Number(process.env.PORT || 5001);
const ERP_API_BASE = process.env.ERP_API_BASE || 'http://localhost:5000/api';
const APP_SECRET = process.env.APP_SECRET || 'companion_local_secret_2026';

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const usersDb = Datastore.create({
  filename: path.join(dataDir, 'companion-users.db'),
  autoload: true,
});

const tokensDb = Datastore.create({
  filename: path.join(dataDir, 'companion-tokens.db'),
  autoload: true,
});

const sessionsDb = Datastore.create({
  filename: path.join(dataDir, 'companion-audit.db'),
  autoload: true,
});

const sanitizeText = (value, max = 120) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
const normalizeEmail = (value) => sanitizeText(value, 160).toLowerCase();

const keyFromSecret = crypto.createHash('sha256').update(APP_SECRET).digest();

function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  const [salt, known] = String(stored || '').split(':');
  if (!salt || !known) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(known, 'hex'));
}

function encryptApiKey(apiKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFromSecret, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(payload) {
  const [ivHex, tagHex, dataHex] = String(payload || '').split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFromSecret, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

async function erpRequest(path, apiKey, options = {}) {
  const res = await fetch(`${ERP_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { message: raw };
  }

  if (!res.ok) {
    const message = data?.error || data?.message || 'ERP request failed';
    throw new Error(message);
  }

  return data;
}

async function authAppUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ error: 'App auth token is required' });
    }
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) return res.status(401).json({ error: 'App auth token is required' });

    const tokenRecord = await tokensDb.findOne({ tokenHash: hashToken(rawToken) });
    if (!tokenRecord) return res.status(401).json({ error: 'Invalid app auth token' });

    const user = await usersDb.findOne({ _id: tokenRecord.userId });
    if (!user) return res.status(401).json({ error: 'App user not found' });

    req.appUser = user;
    req.tokenRecord = tokenRecord;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid app auth token' });
  }
}

async function getUserApiKey(userId) {
  const user = await usersDb.findOne({ _id: userId });
  if (!user || !user.erpApiKeyEncrypted) {
    throw new Error('ERP API key not configured');
  }
  return decryptApiKey(user.erpApiKeyEncrypted);
}

function authSummary(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    keyConfigured: Boolean(user.erpApiKeyLast4),
    keyLast4: user.erpApiKeyLast4 || null,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'erp-companion-backend' });
});

app.post('/api/app/register', async (req, res) => {
  try {
    const name = sanitizeText(req.body.name || '', 80);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!name || !email || password.length < 6) {
      return res.status(400).json({ error: 'name, email and password (min 6 chars) are required' });
    }

    const exists = await usersDb.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Account already exists' });

    const user = await usersDb.insert({
      name,
      email,
      passwordHash: passwordHash(password),
      erpApiKeyEncrypted: null,
      erpApiKeyLast4: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ user: authSummary(user) });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to register app user' });
  }
});

app.post('/api/app/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await usersDb.findOne({ email });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    await tokensDb.insert({
      tokenHash: hashToken(rawToken),
      userId: user._id,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });

    res.json({ token: rawToken, user: authSummary(user) });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
});

app.post('/api/app/logout', authAppUser, async (req, res) => {
  await tokensDb.remove({ _id: req.tokenRecord._id }, {});
  res.json({ message: 'Logged out' });
});

app.get('/api/app/me', authAppUser, async (req, res) => {
  await tokensDb.update({ _id: req.tokenRecord._id }, { $set: { lastUsedAt: new Date() } });
  res.json({ user: authSummary(req.appUser) });
});

app.post('/api/app/erp-key', authAppUser, async (req, res) => {
  try {
    const apiKey = sanitizeText(req.body.apiKey, 120);
    if (!apiKey || !apiKey.startsWith('erp_')) {
      return res.status(400).json({ error: 'Valid ERP API key is required' });
    }

    await erpRequest('/public/me', apiKey);

    await usersDb.update(
      { _id: req.appUser._id },
      {
        $set: {
          erpApiKeyEncrypted: encryptApiKey(apiKey),
          erpApiKeyLast4: apiKey.slice(-4),
          updatedAt: new Date(),
        },
      }
    );

    res.json({ keyConfigured: true, keyLast4: apiKey.slice(-4) });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to store ERP API key' });
  }
});

app.get('/api/app/erp-key/status', authAppUser, async (req, res) => {
  res.json({
    keyConfigured: Boolean(req.appUser.erpApiKeyLast4),
    keyLast4: req.appUser.erpApiKeyLast4 || null,
  });
});

app.get('/api/app/erp/profile', authAppUser, async (req, res) => {
  try {
    const apiKey = await getUserApiKey(req.appUser._id);
    const profile = await erpRequest('/public/me', apiKey);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch ERP profile' });
  }
});

app.get('/api/app/erp/marks', authAppUser, async (req, res) => {
  try {
    const apiKey = await getUserApiKey(req.appUser._id);
    const sem = Number(req.query.semester);
    const semQuery = Number.isInteger(sem) && sem > 0 && sem <= 12 ? `?semester=${sem}` : '';
    const marks = await erpRequest(`/public/marks${semQuery}`, apiKey);
    res.json(marks);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch marks' });
  }
});

app.get('/api/app/erp/events', authAppUser, async (req, res) => {
  try {
    const apiKey = await getUserApiKey(req.appUser._id);
    const events = await erpRequest('/public/events', apiKey);
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch events' });
  }
});

app.get('/api/app/erp/holidays', authAppUser, async (req, res) => {
  try {
    const apiKey = await getUserApiKey(req.appUser._id);
    const holidays = await erpRequest('/public/holidays', apiKey);
    res.json(holidays);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch holidays' });
  }
});

app.post('/api/app/erp/documents/request', authAppUser, async (req, res) => {
  try {
    const type = sanitizeText(req.body.type, 40);
    const purpose = sanitizeText(req.body.purpose, 200);
    if (!type || !purpose) {
      return res.status(400).json({ error: 'type and purpose are required' });
    }

    const apiKey = await getUserApiKey(req.appUser._id);
    const requestResult = await erpRequest('/public/documents/request', apiKey, {
      method: 'POST',
      body: JSON.stringify({ type, purpose }),
    });

    await sessionsDb.insert({
      userId: req.appUser._id,
      kind: 'document_request',
      type,
      purpose,
      createdAt: new Date(),
    });

    res.status(201).json(requestResult);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to request document' });
  }
});

app.get('/api/app/erp/documents/requests', authAppUser, async (req, res) => {
  try {
    const apiKey = await getUserApiKey(req.appUser._id);
    const requests = await erpRequest('/public/documents/requests', apiKey);
    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch document requests' });
  }
});

app.post('/api/session', async (req, res) => {
  try {
    const name = sanitizeText(req.body.name || '', 80);
    const apiKey = sanitizeText(req.body.apiKey, 100);
    if (!apiKey || !apiKey.startsWith('erp_')) {
      return res.status(400).json({ error: 'Valid ERP API key is required' });
    }

    const profile = await erpRequest('/public/me', apiKey);
    const sessionId = crypto.randomBytes(16).toString('hex');

    await sessionsDb.insert({
      sessionId,
      name,
      apiKeyEncrypted: encryptApiKey(apiKey),
      keyLast4: apiKey.slice(-4),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      erpProfileSnapshot: {
        rollNumber: profile.rollNumber,
        department: profile.department,
      },
    });

    res.status(201).json({
      sessionId,
      profile,
      displayName: name || profile.name,
      keyLast4: apiKey.slice(-4),
    });
  } catch (error) {
    res.status(401).json({ error: error.message || 'Failed to create session' });
  }
});

app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const session = await sessionsDb.findOne({ sessionId: sanitizeText(req.params.sessionId, 100) });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      sessionId: session.sessionId,
      displayName: session.name || 'User',
      keyLast4: session.keyLast4,
      createdAt: session.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch session' });
  }
});

app.listen(PORT, () => {
  console.log(`Companion backend running on port ${PORT}`);
  console.log(`ERP API base: ${ERP_API_BASE}`);
});
