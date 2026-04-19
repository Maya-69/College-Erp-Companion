const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

const PORT = Number(process.env.PORT || 5010);
const DEFAULT_HEADLESS = String(process.env.SCRAPER_HEADLESS || 'false').toLowerCase() === 'true';
const NAV_TIMEOUT_MS = Number(process.env.SCRAPER_NAV_TIMEOUT_MS || 30000);
const SESSION_TTL_MS = Number(process.env.SCRAPER_SESSION_TTL_MS || 15000);
const POST_LOGIN_HOLD_MS = Number(process.env.SCRAPER_POST_LOGIN_HOLD_MS || 3000);

const sessionCache = new Map();

const sanitizeText = (value, max = 240) => String(value || '').trim().slice(0, max);

function buildSelectorSet(body) {
  return {
    studentLoginButton: sanitizeText(body.studentLoginButton || 'button', 180),
    emailInput: sanitizeText(body.emailInput || 'input[type="email"], input[name="email"], input[id="email"]', 180),
    passwordInput: sanitizeText(body.passwordInput || 'input[type="password"], input[name="password"], input[id="password"]', 180),
    submitButton: sanitizeText(body.submitButton || 'form button[type="submit"], button[type="submit"]', 180),
  };
}

async function openPage() {
  const browser = await puppeteer.launch({
    headless: DEFAULT_HEADLESS,
    defaultViewport: { width: 1366, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  return { browser, page };
}

async function tryClickStudentMode(page, selector) {
  if (!selector || selector === 'button') {
    const clickedByText = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button'));
      const target = candidates.find((btn) => /student\s+login/i.test(btn.textContent || ''));
      if (!target) return false;
      target.click();
      return true;
    });

    if (clickedByText) return true;
  }

  const button = await page.$(selector);
  if (button) {
    await button.click();
    return true;
  }
  return false;
}

async function runLoginCheck({ loginUrl, loginId, password, selectors }) {
  const session = await loginAndGetSession({ loginUrl, loginId, password, selectors });
  try {
    writeCachedSession(loginUrl, loginId, {
      token: session.token,
      user: session.user,
      role: session.role,
      currentUrl: session.currentUrl,
    });

    if (!DEFAULT_HEADLESS && POST_LOGIN_HOLD_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, POST_LOGIN_HOLD_MS));
    }

    return {
      ok: true,
      role: session.role,
      currentUrl: session.currentUrl,
      sessionTtlMs: SESSION_TTL_MS,
      headless: DEFAULT_HEADLESS,
    };
  } finally {
    await session.browser.close();
  }
}

async function loginAndGetSession({ loginUrl, loginId, password, selectors }) {
  const { browser, page } = await openPage();
  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await tryClickStudentMode(page, selectors.studentLoginButton);

    await page.waitForSelector(selectors.emailInput);
    await page.waitForSelector(selectors.passwordInput);

    await page.click(selectors.emailInput, { clickCount: 3 });
    await page.type(selectors.emailInput, loginId, { delay: 25 });

    await page.click(selectors.passwordInput, { clickCount: 3 });
    await page.type(selectors.passwordInput, password, { delay: 25 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => null),
      page.click(selectors.submitButton),
    ]);

    const currentUrl = page.url();
    const isLoggedIn = /\/student|\/admin/i.test(currentUrl);
    if (!isLoggedIn) {
      const pageText = await page.evaluate(() => document.body.innerText || '');
      const maybeError = /invalid|error|incorrect|not found/i.test(pageText);
      throw new Error(maybeError ? 'Login failed: invalid credentials or portal rejected login' : 'Login could not be verified');
    }

    const session = await page.evaluate(() => {
      const token = localStorage.getItem('erp_token') || '';
      const userRaw = localStorage.getItem('erp_user') || '';
      let user = null;
      try {
        user = userRaw ? JSON.parse(userRaw) : null;
      } catch {
        user = null;
      }
      return { token, user };
    });

    if (!session.token) {
      throw new Error('Login succeeded but ERP token was not found in localStorage');
    }

    return {
      browser,
      role: /\/admin/i.test(currentUrl) ? 'admin' : 'student',
      currentUrl,
      token: session.token,
      user: session.user,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function sessionCacheKey(loginUrl, loginId) {
  return `${loginUrl}::${loginId}`.toLowerCase();
}

function readCachedSession(loginUrl, loginId) {
  const cacheKey = sessionCacheKey(loginUrl, loginId);
  const cached = sessionCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    sessionCache.delete(cacheKey);
    return null;
  }
  return cached;
}

function writeCachedSession(loginUrl, loginId, session) {
  sessionCache.set(sessionCacheKey(loginUrl, loginId), {
    ...session,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

async function erpJwtRequest(erpApiBase, token, path, options = {}) {
  const base = String(erpApiBase || '').replace(/\/+$/, '');
  if (!base || !/^https?:\/\//i.test(base)) {
    throw new Error('A valid erpApiBase is required');
  }

  const res = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
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
    throw new Error(data?.error || data?.message || 'ERP JWT request failed');
  }

  return data;
}

async function withLoggedInSession(payload, action) {
  const loginUrl = sanitizeText(payload.loginUrl, 240);
  const loginId = sanitizeText(payload.loginId, 180);
  const password = String(payload.password || '').trim();
  const erpApiBase = sanitizeText(payload.erpApiBase, 240);

  if (!loginUrl || !/^https?:\/\//i.test(loginUrl)) {
    throw new Error('loginUrl must start with http:// or https://');
  }
  if (!loginId || !password) {
    throw new Error('loginId and password are required');
  }
  if (!erpApiBase || !/^https?:\/\//i.test(erpApiBase)) {
    throw new Error('erpApiBase must start with http:// or https://');
  }

  const selectors = buildSelectorSet(payload || {});
  const cached = readCachedSession(loginUrl, loginId);
  if (cached?.token) {
    return action({
      token: cached.token,
      user: cached.user,
      role: cached.role,
      erpApiBase,
      currentUrl: cached.currentUrl,
      cached: true,
      sessionTtlMs: SESSION_TTL_MS,
    });
  }

  const session = await loginAndGetSession({ loginUrl, loginId, password, selectors });
  writeCachedSession(loginUrl, loginId, {
    token: session.token,
    user: session.user,
    role: session.role,
    currentUrl: session.currentUrl,
  });
  try {
    return await action({
      token: session.token,
      user: session.user,
      role: session.role,
      erpApiBase,
      currentUrl: session.currentUrl,
      cached: false,
      sessionTtlMs: SESSION_TTL_MS,
    });
  } finally {
    await session.browser.close();
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'erp-scraper-service', headless: DEFAULT_HEADLESS });
});

app.post('/api/scraper/login-check', async (req, res) => {
  try {
    const loginUrl = sanitizeText(req.body.loginUrl, 240);
    const loginId = sanitizeText(req.body.loginId, 180);
    const password = String(req.body.password || '').trim();

    if (!loginUrl || !/^https?:\/\//i.test(loginUrl)) {
      return res.status(400).json({ error: 'loginUrl must start with http:// or https://' });
    }
    if (!loginId || !password) {
      return res.status(400).json({ error: 'loginId and password are required' });
    }

    const selectors = buildSelectorSet(req.body || {});
    const result = await runLoginCheck({ loginUrl, loginId, password, selectors });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Login check failed' });
  }
});

app.post('/api/scraper/profile', async (req, res) => {
  try {
    const result = await withLoggedInSession(req.body, async ({ token, user, erpApiBase }) => {
      if (user?.id) {
        const detailed = await erpJwtRequest(erpApiBase, token, `/students/${encodeURIComponent(user.id)}`);
        return {
          id: detailed._id || detailed.id || user.id,
          name: detailed.name || user.name,
          email: detailed.email || user.email,
          rollNumber: detailed.rollNumber || user.rollNumber,
          department: detailed.department || user.department,
          semester: detailed.semester,
          year: detailed.year,
          mobile: detailed.mobile,
        };
      }

      return {
        id: user?.id || null,
        name: user?.name || null,
        email: user?.email || null,
        rollNumber: user?.rollNumber || null,
        department: user?.department || null,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch profile via scraper' });
  }
});

app.post('/api/scraper/marks', async (req, res) => {
  try {
    const result = await withLoggedInSession(req.body, async ({ token, user, erpApiBase }) => {
      const semester = Number(req.body.semester);
      const semQuery = Number.isInteger(semester) && semester > 0 && semester <= 12
        ? `&semester=${semester}`
        : '';
      const roll = encodeURIComponent(user?.rollNumber || '');
      const suffix = roll ? `?rollNumber=${roll}${semQuery}` : (semQuery ? `?semester=${semester}` : '');
      const marks = await erpJwtRequest(erpApiBase, token, `/results${suffix}`);
      return Array.isArray(marks) ? marks : [];
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch marks via scraper' });
  }
});

app.post('/api/scraper/events', async (req, res) => {
  try {
    const events = await withLoggedInSession(req.body, async ({ token, erpApiBase }) => {
      const data = await erpJwtRequest(erpApiBase, token, '/events');
      return Array.isArray(data) ? data : [];
    });
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch events via scraper' });
  }
});

app.post('/api/scraper/holidays', async (req, res) => {
  try {
    const holidays = await withLoggedInSession(req.body, async ({ token, erpApiBase }) => {
      const data = await erpJwtRequest(erpApiBase, token, '/holidays');
      return Array.isArray(data) ? data : [];
    });
    res.json(holidays);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch holidays via scraper' });
  }
});

app.post('/api/scraper/documents', async (req, res) => {
  try {
    const docs = await withLoggedInSession(req.body, async ({ token, erpApiBase }) => {
      const data = await erpJwtRequest(erpApiBase, token, '/documents');
      return Array.isArray(data) ? data : [];
    });
    res.json(docs);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to fetch documents via scraper' });
  }
});

app.post('/api/scraper/documents/request', async (req, res) => {
  try {
    const result = await withLoggedInSession(req.body, async ({ token, erpApiBase }) => {
      const type = sanitizeText(req.body.type, 40);
      const purpose = sanitizeText(req.body.purpose, 200);
      if (!type || !purpose) {
        throw new Error('type and purpose are required');
      }

      return erpJwtRequest(erpApiBase, token, '/public/documents/request', {
        method: 'POST',
        body: JSON.stringify({ type, purpose }),
      });
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to submit document request via scraper' });
  }
});

app.post('/api/scraper/documents/requests', async (req, res) => {
  try {
    const requests = await withLoggedInSession(req.body, async ({ token, erpApiBase }) => {
      const data = await erpJwtRequest(erpApiBase, token, '/public/documents/requests');
      return Array.isArray(data) ? data : [];
    });

    res.json(requests);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to load document requests via scraper' });
  }
});

app.listen(PORT, () => {
  console.log(`ERP scraper service running on port ${PORT}`);
  console.log(`Default headless mode: ${DEFAULT_HEADLESS}`);
});
