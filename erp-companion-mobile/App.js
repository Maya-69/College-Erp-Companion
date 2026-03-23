import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'companion_app_token';
const API_KEY_LOCAL_KEY = 'companion_local_erp_api_key';
const COMPANION_URL_KEY = 'companion_base_url';
const ERP_URL_KEY = 'erp_base_url';
const DEFAULT_COMPANION_BASE = process.env.EXPO_PUBLIC_COMPANION_API || 'http://10.0.2.2:5001';
const DEFAULT_ERP_BASE = process.env.EXPO_PUBLIC_ERP_URL || 'http://10.0.2.2:5000';
const isWeb = Platform.OS === 'web';

const docTypes = ['bonafide', 'transcript', 'leavingCertificate', 'idCard', 'marksheet'];
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(value) {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function request(path, options = {}, token) {
  const normalizedBaseUrl = String(path.baseUrl || '').trim().replace(/\/+$/, '');
  if (!normalizedBaseUrl) {
    throw new Error('Companion API URL is not configured');
  }

  const actualPath = path.endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${normalizedBaseUrl}${actualPath}`, { ...options, headers });
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

async function storageGet(key) {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null && value !== undefined) return value;
  } catch {
  }

  if (isWeb && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key) || '';
  }

  return '';
}

async function storageSet(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {
  }

  if (isWeb && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
    return;
  }

  throw new Error('Could not persist data on this device/browser');
}

async function storageDelete(key) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
  }

  if (isWeb && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  }
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [companionBaseUrl, setCompanionBaseUrl] = useState('');
  const [erpBaseUrl, setErpBaseUrl] = useState('');
  const [companionBaseUrlInput, setCompanionBaseUrlInput] = useState(DEFAULT_COMPANION_BASE);
  const [erpBaseUrlInput, setErpBaseUrlInput] = useState(DEFAULT_ERP_BASE);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erpApiKey, setErpApiKey] = useState('');

  const [busy, setBusy] = useState(false);
  const [semester, setSemester] = useState('2');
  const [documentType, setDocumentType] = useState('transcript');
  const [documentPurpose, setDocumentPurpose] = useState('Need transcript for internship');

  const [marks, setMarks] = useState([]);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);
  const [selectedSection, setSelectedSection] = useState('events');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach((item) => {
      map[toDateKey(item.date)] = item;
    });
    return map;
  }, [holidays]);

  const eventMap = useMemo(() => {
    const map = {};
    events.forEach((item) => {
      const key = toDateKey(item.date);
      map[key] = map[key] ? map[key] + 1 : 1;
    });
    return map;
  }, [events]);

  const monthCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ empty: true, key: `empty-start-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day);
      const key = toDateKey(dateObj);
      cells.push({
        empty: false,
        key,
        day,
        dateKey: key,
        holiday: holidayMap[key] || null,
        eventCount: eventMap[key] || 0,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ empty: true, key: `empty-end-${cells.length}` });
    }

    return cells;
  }, [calendarMonth, holidayMap, eventMap]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedCompanionBase = await storageGet(COMPANION_URL_KEY);
        const savedErpBase = await storageGet(ERP_URL_KEY);
        const savedToken = await storageGet(TOKEN_KEY);
        const localKey = await storageGet(API_KEY_LOCAL_KEY);

        if (!savedCompanionBase) {
          setCompanionBaseUrlInput(DEFAULT_COMPANION_BASE);
          setErpBaseUrlInput(DEFAULT_ERP_BASE);
          setBooting(false);
          return;
        }

        setCompanionBaseUrl(savedCompanionBase);
        setErpBaseUrl(savedErpBase || DEFAULT_ERP_BASE);
        setCompanionBaseUrlInput(savedCompanionBase);
        setErpBaseUrlInput(savedErpBase || DEFAULT_ERP_BASE);
        setConfigReady(true);

        if (!savedToken) {
          setBooting(false);
          return;
        }

        const me = await request({ baseUrl: savedCompanionBase, endpoint: '/api/app/me' }, {}, savedToken);
        const keyStatus = await request({ baseUrl: savedCompanionBase, endpoint: '/api/app/erp-key/status' }, {}, savedToken);
        setToken(savedToken);
        setUser(me.user);
        setApiKeyConfigured(Boolean(keyStatus.keyConfigured || localKey));
      } catch {
        await storageDelete(TOKEN_KEY);
        await storageDelete(API_KEY_LOCAL_KEY);
        setToken('');
        setUser(null);
        setApiKeyConfigured(false);
      } finally {
        setBooting(false);
      }
    }
    bootstrap();
  }, []);

  const title = useMemo(() => {
    if (!configReady) return 'Configure API URLs';
    if (!token) return 'SafePath ERP Companion';
    if (!apiKeyConfigured) return 'Connect ERP API Key';
    return `Welcome, ${user?.name || 'User'}`;
  }, [configReady, token, apiKeyConfigured, user]);

  const saveUrls = async () => {
    const normalizedCompanion = companionBaseUrlInput.trim().replace(/\/+$/, '');
    const normalizedErp = erpBaseUrlInput.trim().replace(/\/+$/, '');

    if (!/^https?:\/\//i.test(normalizedCompanion)) {
      Alert.alert('Invalid URL', 'Companion API URL must start with http:// or https://');
      return;
    }
    if (!/^https?:\/\//i.test(normalizedErp)) {
      Alert.alert('Invalid URL', 'ERP URL must start with http:// or https://');
      return;
    }

    setBusy(true);
    try {
      await storageSet(COMPANION_URL_KEY, normalizedCompanion);
      await storageSet(ERP_URL_KEY, normalizedErp);
      setCompanionBaseUrl(normalizedCompanion);
      setErpBaseUrl(normalizedErp);
      setConfigReady(true);
      Alert.alert('Saved', 'URLs saved. You can change them later from this screen by logging out and re-opening URL setup.');
    } catch (error) {
      Alert.alert('Failed', error.message || 'Could not save URLs');
    } finally {
      setBusy(false);
    }
  };

  const resetUrls = async () => {
    await storageDelete(COMPANION_URL_KEY);
    await storageDelete(ERP_URL_KEY);
    await storageDelete(TOKEN_KEY);
    await storageDelete(API_KEY_LOCAL_KEY);
    setConfigReady(false);
    setCompanionBaseUrl('');
    setErpBaseUrl('');
    setToken('');
    setUser(null);
    setApiKeyConfigured(false);
    setCompanionBaseUrlInput(DEFAULT_COMPANION_BASE);
    setErpBaseUrlInput(DEFAULT_ERP_BASE);
    setMarks([]);
    setEvents([]);
    setHolidays([]);
    setDocumentRequests([]);
    setSelectedSection('events');
  };

  const handleRegisterOrLogin = async () => {
    setBusy(true);
    try {
      if (authMode === 'register') {
        await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/register' }, {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
      }

      const login = await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/login' }, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await storageSet(TOKEN_KEY, login.token);
      setToken(login.token);
      setUser(login.user);
      setApiKeyConfigured(Boolean(login.user?.keyConfigured));
      setPassword('');
    } catch (error) {
      Alert.alert('Authentication failed', error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveErpApiKey = async () => {
    setBusy(true);
    try {
      await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp-key' }, {
        method: 'POST',
        body: JSON.stringify({ apiKey: erpApiKey }),
      }, token);

      await storageSet(API_KEY_LOCAL_KEY, erpApiKey);
      setApiKeyConfigured(true);
      setErpApiKey('');
      Alert.alert('Connected', 'Your ERP API key is verified and saved securely.');
    } catch (error) {
      Alert.alert('Key setup failed', error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/logout' }, { method: 'POST' }, token);
      }
    } catch {
    } finally {
      await storageDelete(TOKEN_KEY);
      await storageDelete(API_KEY_LOCAL_KEY);
      setToken('');
      setUser(null);
      setApiKeyConfigured(false);
      setSelectedSection('events');
      setMarks([]);
      setEvents([]);
      setHolidays([]);
      setDocumentRequests([]);
    }
  };

  const loadMarks = async () => {
    setBusy(true);
    try {
      const data = await request({ baseUrl: companionBaseUrl, endpoint: `/api/app/erp/marks?semester=${encodeURIComponent(semester)}` }, {}, token);
      setMarks(Array.isArray(data) ? data : []);
      setSelectedSection('marks');
    } catch (error) {
      Alert.alert('Unable to fetch marks', error.message);
    } finally {
      setBusy(false);
    }
  };

  const loadEventsAndHolidays = async () => {
    setBusy(true);
    try {
      const [e, h] = await Promise.all([
        request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp/events' }, {}, token),
        request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp/holidays' }, {}, token),
      ]);
      setEvents(Array.isArray(e) ? e : []);
      setHolidays(Array.isArray(h) ? h : []);
      setSelectedSection('events');
    } catch (error) {
      Alert.alert('Unable to load calendar', error.message);
    } finally {
      setBusy(false);
    }
  };

  const changeMonth = (delta) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  };

  const loadDocumentRequests = async () => {
    try {
      const requests = await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp/documents/requests' }, {}, token);
      setDocumentRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Failed to load document requests:', error.message);
    }
  };

  const submitDocumentRequest = async () => {
    setBusy(true);
    try {
      await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp/documents/request' }, {
        method: 'POST',
        body: JSON.stringify({ type: documentType, purpose: documentPurpose }),
      }, token);
      const requests = await request({ baseUrl: companionBaseUrl, endpoint: '/api/app/erp/documents/requests' }, {}, token);
      setDocumentRequests(Array.isArray(requests) ? requests : []);
      setSelectedSection('documents');
      Alert.alert('Submitted', 'Document request sent successfully.');
    } catch (error) {
      Alert.alert('Request failed', error.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!configReady || !token || !apiKeyConfigured) return;
    if (selectedSection !== 'events') return;
    if (events.length || holidays.length) return;
    loadEventsAndHolidays();
  }, [configReady, token, apiKeyConfigured, selectedSection]);

  useEffect(() => {
    if (!configReady || !token || !apiKeyConfigured) return;
    if (selectedSection !== 'documents') return;
    loadDocumentRequests();
  }, [configReady, token, apiKeyConfigured, selectedSection]);

  if (booting) {
    return (
      <SafeAreaView style={styles.bootContainer}>
        <ActivityIndicator size="large" color="#2F9E73" />
        <Text style={styles.bootText}>Preparing your companion app...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.logoBadge}>🛡️</Text>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>Fast access to ERP essentials, designed for mobile.</Text>
          {configReady && (
            <Text style={styles.configHint}>Companion: {companionBaseUrl}{'\n'}ERP: {erpBaseUrl}</Text>
          )}
        </View>

        {!configReady && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Enter Backend URLs</Text>
            <Text style={styles.panelHint}>For testing, enter IP + port. Later with static IP/domain, update once and app will skip this step.</Text>
            <TextInput
              style={styles.input}
              value={companionBaseUrlInput}
              onChangeText={setCompanionBaseUrlInput}
              placeholder="Companion API URL (e.g. http://192.168.0.101:5001)"
              autoCapitalize="none"
              placeholderTextColor="#90A4AE"
            />
            <TextInput
              style={styles.input}
              value={erpBaseUrlInput}
              onChangeText={setErpBaseUrlInput}
              placeholder="ERP URL (e.g. http://192.168.0.101:5000)"
              autoCapitalize="none"
              placeholderTextColor="#90A4AE"
            />
            <Pressable style={styles.primaryButton} onPress={saveUrls} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? 'Saving...' : 'Save URLs & Continue'}</Text>
            </Pressable>
          </View>
        )}

        {configReady && !token && (
          <View style={styles.panel}>
            <View style={styles.modeRow}>
              <Pressable style={[styles.modeButton, authMode === 'login' && styles.modeButtonActive]} onPress={() => setAuthMode('login')}>
                <Text style={[styles.modeButtonText, authMode === 'login' && styles.modeButtonTextActive]}>Login</Text>
              </Pressable>
              <Pressable style={[styles.modeButton, authMode === 'register' && styles.modeButtonActive]} onPress={() => setAuthMode('register')}>
                <Text style={[styles.modeButtonText, authMode === 'register' && styles.modeButtonTextActive]}>Create Account</Text>
              </Pressable>
            </View>

            {authMode === 'register' && (
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#90A4AE" />
            )}
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" placeholderTextColor="#90A4AE" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry placeholderTextColor="#90A4AE" />

            <Pressable style={styles.primaryButton} onPress={handleRegisterOrLogin} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account & Login'}</Text>
            </Pressable>
          </View>
        )}

        {configReady && token && !apiKeyConfigured && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Enter ERP API Key</Text>
            <Text style={styles.panelHint}>Generate this key from ERP dashboard → API Access.</Text>
            <TextInput
              style={styles.input}
              value={erpApiKey}
              onChangeText={setErpApiKey}
              placeholder="erp_xxxxxxxxx"
              autoCapitalize="none"
              placeholderTextColor="#90A4AE"
            />
            <Pressable style={styles.primaryButton} onPress={saveErpApiKey} disabled={busy}>
              <Text style={styles.primaryButtonText}>{busy ? 'Verifying...' : 'Save and Continue'}</Text>
            </Pressable>
          </View>
        )}

        {configReady && token && apiKeyConfigured && (
          <>
            <View style={styles.sectionRow}>
              {[
                { key: 'events', label: 'Events Calendar' },
                { key: 'marks', label: 'Marksheet' },
                { key: 'documents', label: 'Document' },
              ].map((section) => (
                <Pressable
                  key={section.key}
                  style={[styles.sectionButton, selectedSection === section.key && styles.sectionButtonActive]}
                  onPress={() => setSelectedSection(section.key)}
                >
                  <Text style={[styles.sectionButtonText, selectedSection === section.key && styles.sectionButtonTextActive]}>{section.label}</Text>
                </Pressable>
              ))}
            </View>

            {selectedSection === 'marks' && (
              <View style={styles.panel}>
                <Text style={styles.actionTitle}>Get Semester Marksheet</Text>
                <TextInput
                  style={styles.input}
                  value={semester}
                  onChangeText={setSemester}
                  placeholder="Semester (e.g. 2)"
                  keyboardType="number-pad"
                  placeholderTextColor="#90A4AE"
                />
                <Pressable style={styles.secondaryButton} onPress={loadMarks} disabled={busy}>
                  <Text style={styles.secondaryButtonText}>Fetch Marks</Text>
                </Pressable>

                <Text style={styles.panelTitle}>Marksheets</Text>
                {marks.length === 0 ? (
                  <Text style={styles.emptyText}>No marks loaded yet. Use “Fetch Marks”.</Text>
                ) : (
                  marks.map((mark) => (
                    <View key={mark._id} style={styles.resultCard}>
                      <Text style={styles.resultHeading}>Semester {mark.semester} • {mark.examMonth} {mark.examYear}</Text>
                      <Text style={styles.resultMeta}>SGPI: {mark.sgpi} • CGPI: {mark.cgpi || '—'} • Result: {mark.result}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {selectedSection === 'events' && (
              <View style={styles.panel}>
                <Text style={styles.actionTitle}>Show Events & Holidays</Text>
                <Text style={styles.panelHint}>Live calendar from ERP APIs</Text>
                <Pressable style={styles.secondaryButton} onPress={loadEventsAndHolidays} disabled={busy}>
                  <Text style={styles.secondaryButtonText}>Load Calendar</Text>
                </Pressable>

                <Text style={styles.panelTitle}>Holidays Calendar</Text>
                <View style={styles.calendarHeader}>
                  <Pressable style={styles.calendarNavBtn} onPress={() => changeMonth(-1)}>
                    <Text style={styles.calendarNavBtnText}>‹</Text>
                  </Pressable>
                  <Text style={styles.calendarMonthTitle}>
                    {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable style={styles.calendarNavBtn} onPress={() => changeMonth(1)}>
                    <Text style={styles.calendarNavBtnText}>›</Text>
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {weekDays.map((day) => (
                    <Text key={day} style={styles.weekDayLabel}>{day}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {monthCells.map((cell) => {
                    if (cell.empty) return <View key={cell.key} style={[styles.calendarCell, styles.calendarCellEmpty]} />;
                    const hasHoliday = Boolean(cell.holiday);
                    const hasEvents = cell.eventCount > 0;
                    return (
                      <View key={cell.key} style={[styles.calendarCell, hasHoliday && styles.calendarCellHoliday]}>
                        <Text style={[styles.calendarDayText, hasHoliday && styles.calendarDayHoliday]}>{cell.day}</Text>
                        {hasEvents && <View style={styles.eventDot} />}
                      </View>
                    );
                  })}
                </View>

                <Text style={styles.panelTitle}>Events</Text>
                {events.length === 0 ? <Text style={styles.emptyText}>No events loaded.</Text> : events.map((event) => (
                  <View key={event._id} style={styles.listItem}>
                    <Text style={styles.listTitle}>{event.title}</Text>
                    <Text style={styles.listMeta}>{new Date(event.date).toLocaleDateString()} • {event.time || '—'}</Text>
                  </View>
                ))}

                <Text style={[styles.panelTitle, { marginTop: 16 }]}>Holidays</Text>
                {holidays.length === 0 ? <Text style={styles.emptyText}>No holidays loaded.</Text> : holidays.map((holiday) => (
                  <View key={holiday._id} style={styles.listItem}>
                    <Text style={styles.listTitle}>{holiday.name}</Text>
                    <Text style={styles.listMeta}>{new Date(holiday.date).toLocaleDateString()}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedSection === 'documents' && (
              <View style={styles.panel}>
                <Text style={styles.actionTitle}>Apply for Document</Text>
                <View style={styles.pillRow}>
                  {docTypes.map((type) => (
                    <Pressable key={type} onPress={() => setDocumentType(type)} style={[styles.pill, documentType === type && styles.pillActive]}>
                      <Text style={[styles.pillText, documentType === type && styles.pillTextActive]}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={documentPurpose}
                  onChangeText={setDocumentPurpose}
                  placeholder="Purpose"
                  placeholderTextColor="#90A4AE"
                />
                <Pressable style={styles.secondaryButton} onPress={submitDocumentRequest} disabled={busy}>
                  <Text style={styles.secondaryButtonText}>Submit Request</Text>
                </Pressable>

                <Text style={styles.panelTitle}>Document Requests</Text>
                {documentRequests.length === 0 ? <Text style={styles.emptyText}>No requests yet.</Text> : documentRequests.map((doc) => (
                  <View key={doc._id} style={styles.listItem}>
                    <Text style={styles.listTitle}>{doc.type} • {doc.status}</Text>
                    <Text style={styles.listMeta}>{doc.purpose}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>

            <Pressable style={styles.resetConfigButton} onPress={resetUrls}>
              <Text style={styles.resetConfigText}>Change API URLs</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDF4F0' },
  content: { padding: 16, paddingBottom: 40 },
  bootContainer: { flex: 1, backgroundColor: '#EDF4F0', justifyContent: 'center', alignItems: 'center' },
  bootText: { marginTop: 12, color: '#365B52', fontSize: 15 },
  headerCard: {
    backgroundColor: '#F7FBF8',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DCEAE3',
    marginBottom: 14,
  },
  logoBadge: { fontSize: 26, marginBottom: 6 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1E3E36' },
  headerSubtitle: { marginTop: 4, color: '#56756E', fontSize: 14 },
  configHint: { marginTop: 8, color: '#4D6E65', fontSize: 12 },
  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0ECE6',
    marginBottom: 14,
  },
  panelTitle: { fontSize: 17, fontWeight: '700', color: '#1F4D42', marginBottom: 8 },
  panelHint: { color: '#6A877E', fontSize: 13, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D9E6E0',
    borderRadius: 12,
    backgroundColor: '#F9FCFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#244941',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#41A878',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryButton: {
    backgroundColor: '#E8F4EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDCCF',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonText: { color: '#1C6250', fontWeight: '700' },
  actionsGrid: { gap: 12 },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0ECE6',
    padding: 14,
  },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#20483F', marginBottom: 8 },
  sectionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sectionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E8E1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionButtonActive: {
    backgroundColor: '#E6F4ED',
    borderColor: '#99CCB5',
  },
  sectionButtonText: {
    color: '#40665B',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionButtonTextActive: {
    color: '#1D6A51',
  },
  resultCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDEBE4',
    backgroundColor: '#F8FCFA',
    padding: 12,
    marginBottom: 8,
  },
  resultHeading: { color: '#244941', fontWeight: '700' },
  resultMeta: { marginTop: 4, color: '#5F7B72', fontSize: 13 },
  listItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    backgroundColor: '#FAFDFC',
    padding: 10,
    marginBottom: 8,
  },
  listTitle: { color: '#1F4D42', fontWeight: '700' },
  listMeta: { marginTop: 3, color: '#69857D', fontSize: 13 },
  emptyText: { color: '#6C877F', fontSize: 13 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CFE3DA',
    backgroundColor: '#F5FBF8',
  },
  calendarNavBtnText: { fontSize: 18, color: '#2A6F5A', fontWeight: '700', lineHeight: 20 },
  calendarMonthTitle: { fontSize: 15, fontWeight: '700', color: '#1F4D42' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekDayLabel: { flex: 1, textAlign: 'center', color: '#6D8B82', fontSize: 12, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  calendarCell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarCellEmpty: { opacity: 0.15 },
  calendarCellHoliday: { backgroundColor: '#E4F3EA', borderWidth: 1, borderColor: '#A8D2BE' },
  calendarDayText: { color: '#43665D', fontSize: 12, fontWeight: '600' },
  calendarDayHoliday: { color: '#1B6E4C', fontWeight: '700' },
  eventDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#2FA36F', marginTop: 3 },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#F2F8F5',
    borderWidth: 1,
    borderColor: '#DDE8E2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  modeButton: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#DDF0E5' },
  modeButtonText: { color: '#69867D', fontWeight: '600' },
  modeButtonTextActive: { color: '#286F59' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: {
    borderWidth: 1,
    borderColor: '#CFE3DA',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F7FBF8',
  },
  pillActive: { backgroundColor: '#E2F3EA', borderColor: '#8FC7AE' },
  pillText: { color: '#5A7A71', fontSize: 12 },
  pillTextActive: { color: '#2A6F5A', fontWeight: '700' },
  logoutButton: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2CACA',
    backgroundColor: '#FFF2F2',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#B34444', fontWeight: '700' },
  resetConfigButton: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0DDEB',
    backgroundColor: '#F3F8FD',
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetConfigText: { color: '#3A5E7D', fontWeight: '700' },
});
