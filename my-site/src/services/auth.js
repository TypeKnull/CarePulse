/**
 * CarePulse Healthcare Platform - Authentication & User Session Service
 * 
 * ARCHITECTURAL CONTRACT:
 * - Handles authentication tokens and user sessions.
 * - Ready for seamless integration with Python Flask backend endpoints:
 *     POST /api/auth/register
 *     POST /api/auth/login
 *     POST /api/auth/logout
 *     GET  /api/auth/me
 * - In local development / offline mode, manages client-side user sessions and profile persistence
 *   WITHOUT fabricating fictional patient identities.
 */

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://127.0.0.1:5000/api';
const AUTH_TOKEN_KEY = 'carepulse_auth_token';
const AUTH_USER_KEY = 'carepulse_auth_user';
const USERS_STORE_KEY = 'carepulse_registered_users';

async function getApiError(response, fallback) {
  const data = await response.json().catch(() => ({}));
  return new Error(data.error || fallback);
}

async function fetchProfileRequest(url, options, timeoutMessage) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(timeoutMessage, { cause: error });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeBackendUser(user) {
  const profile = user.profile || {};
  const dateOfBirth = profile.dateOfBirth || user.dateOfBirth || null;
  const familyHistoryValue = profile.familyHistory;
  const familyHistoryText = typeof familyHistoryValue === 'string' ? familyHistoryValue.trim() : '';
  const familyHistory = typeof familyHistoryValue === 'boolean'
    ? familyHistoryValue
    : /^yes$/i.test(familyHistoryText) ? true
      : /^no$/i.test(familyHistoryText) ? false
        : null;
  let age = profile.age ?? null;
  if (age == null && dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(`${String(dateOfBirth).slice(0, 10)}T00:00:00`);
    age = today.getFullYear() - birthDate.getFullYear();
    if (today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
  }

  return {
    ...user,
    fullName: user.fullName || user.name || '',
    profile: {
      ...profile,
      dateOfBirth,
      age,
      gender: profile.gender ?? null,
      bloodGroup: profile.bloodGroup ?? null,
      heightCm: profile.heightCm ?? null,
      weightKg: profile.weightKg ?? null,
      bmi: profile.bmi ?? null,
      smokingStatus: profile.smokingStatus ?? null,
      physicalActivityDays: profile.physicalActivityDays == null
        ? null
        : Number.parseFloat(profile.physicalActivityDays),
      knownConditions: Array.isArray(profile.knownConditions)
        ? profile.knownConditions
        : typeof profile.knownConditions === 'string' && profile.knownConditions.trim()
          ? profile.knownConditions.split(',').map((condition) => condition.trim()).filter(Boolean)
          : [],
      allergies: profile.allergies ?? null,
      currentMedications: profile.currentMedications ?? null,
      familyHistory,
      familyHistoryNotes: profile.familyHistoryNotes ?? (familyHistory === null ? familyHistoryValue ?? null : null),
    },
    vitals: user.vitals || {},
  };
}

/**
 * Helper to get registered users from local persistence
 */
function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to save registered users to local persistence
 */
function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to persist users to localStorage:', err);
  }
}

/**
 * Register a new user account
 * @param {Object} payload
 * @param {string} payload.fullName
 * @param {string} payload.email
 * @param {string} payload.password
 * @returns {Promise<{ success: boolean, user: Object, token: string }>}
 */
export async function registerUser({ fullName, email, password }) {
  // 1. Try real Flask backend first
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });
  } catch {
    // Backend offline; proceed to structured local registration
  }

  if (response) {
    if (!response.ok) throw await getApiError(response, 'Registration failed. Please try again.');
    const data = await response.json();
    if (!data.token || !data.user) throw new Error('Registration response was incomplete. Please try again.');
    const user = normalizeBackendUser({ ...data.user, isRealBackend: true });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { success: true, user, token: data.token, isRealBackend: true };
  }

  // 2. Local fallback registration
  const users = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const newUser = {
    id: `USER-${Date.now().toString(36).toUpperCase()}`,
    fullName: fullName.trim(),
    email: normalizedEmail,
    role: 'patient',
    isNewUser: true,
    hasCompletedOnboarding: false,
    createdAt: new Date().toISOString(),
    profile: {
      age: null,
      gender: null,
      bloodGroup: null,
      heightCm: null,
      weightKg: null,
      bmi: null,
      smokingStatus: null,
      physicalActivityDays: null,
      knownConditions: [],
      medications: [],
      emergencyContact: null,
    },
    vitals: {
      systolicBp: null,
      diastolicBp: null,
      fastingGlucose: null,
      totalCholesterol: null,
      hdl: null,
      ldl: null,
      restingHr: null,
    },
    assessmentHistory: [],
    labReports: [],
    appointments: [],
  };

  users.push(newUser);
  saveStoredUsers(users);

  const fakeToken = `dev_token_${newUser.id}`;
  localStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));

  return {
    success: true,
    user: newUser,
    token: fakeToken,
    isRealBackend: false,
  };
}

/**
 * Login user with credentials or explicit Demo Mode
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {boolean} credentials.isDemoMode
 * @returns {Promise<{ success: boolean, user: Object, token: string, isDemo: boolean }>}
 */
export async function loginUser({ email, password, isDemoMode = false }) {
  // 1. Explicit Demo Mode check
  if (isDemoMode) {
    const demoUser = {
      id: 'DEMO-P-10492',
      fullName: 'Demo Patient (Sample)',
      email: 'demo@carepulse.local',
      role: 'patient',
      isDemo: true,
      hasCompletedOnboarding: true,
      profile: {
        age: 44,
        gender: 'Male',
        bloodGroup: 'B+',
        heightCm: 173,
        weightKg: 78.5,
        bmi: 26.4,
        smokingStatus: false,
        physicalActivityDays: 3.5,
        knownConditions: ['Borderline Fasting Glucose', 'Pre-Hypertension'],
        emergencyContact: { name: 'Sample Contact', phone: '+1 (555) 019-2834' },
      },
    };

    localStorage.setItem(AUTH_TOKEN_KEY, 'demo_session_token');
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(demoUser));
    return { success: true, user: demoUser, token: 'demo_session_token', isDemo: true };
  }

  // 2. Try real Flask backend first
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // Backend offline; proceed with local auth verification
  }

  if (response) {
    if (!response.ok) throw await getApiError(response, 'Login failed. Please try again.');
    const data = await response.json();
    if (!data.token || !data.user) throw new Error('Login response was incomplete. Please try again.');
    const user = normalizeBackendUser({ ...data.user, isRealBackend: true });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return { success: true, user, token: data.token, isRealBackend: true, isDemo: false };
  }

  // 3. Local fallback authentication
  const users = getStoredUsers();
  const normalizedEmail = (email || '').trim().toLowerCase();
  const matchedUser = users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!matchedUser) {
    throw new Error('No account found with this email address. Please register or use Demo Mode.');
  }

  const token = `dev_token_${matchedUser.id}`;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(matchedUser));

  return {
    success: true,
    user: matchedUser,
    token,
    isRealBackend: false,
    isDemo: false,
  };
}

/**
 * Logout current user and purge auth tokens
 */
export function logoutUser() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Retrieve the active authenticated user session
 * @returns {Object|null}
 */
export function getActiveSessionUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getCurrentUserProfile() {
  const currentSession = getActiveSessionUser();
  if (!currentSession) return null;
  const token = getAuthToken();
  if (currentSession.isDemo || token === 'demo_session_token' || token?.startsWith('dev_token_')) {
    return currentSession;
  }
  if (!token) throw new Error('Your session has expired. Please log in again.');

  const response = await fetchProfileRequest(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }, 'Loading your saved profile timed out. Check your connection and retry.');
  if (!response.ok) throw await getApiError(response, 'Failed to load your saved profile. Please try again.');
  const data = await response.json();
  if (!data.user) throw new Error('The profile response was incomplete. Please try again.');
  const user = normalizeBackendUser({ ...data.user, isRealBackend: true });
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * Save / Update Onboarding Baseline Profile for a real user
 * @param {string} userId
 * @param {Object} onboardingData
 * @returns {Object} Updated user object
 */
export async function saveOnboardingProfile(userId, onboardingData) {
  const currentSession = getActiveSessionUser();
  if (!currentSession) throw new Error('No active user session.');

  const token = getAuthToken();
  const isRealBackend = !currentSession.isDemo && token !== 'demo_session_token' && !token?.startsWith('dev_token_');
  let serverUser = null;
  if (isRealBackend) {
    if (!token) throw new Error('Your session has expired. Please log in again.');
    const response = await fetchProfileRequest(`${API_BASE_URL}/patients/${userId}/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(onboardingData),
    }, 'Saving your profile timed out. Check your connection and retry.');
    if (!response.ok) throw await getApiError(response, 'Failed to save health profile. Please try again.');
    const data = await response.json();
    if (!data.success || !data.user?.profile) throw new Error('The saved profile response was incomplete. Please try again.');
    serverUser = normalizeBackendUser({ ...data.user, isRealBackend: true });
  }

  const updatedUser = isRealBackend ? {
    ...currentSession,
    ...serverUser,
    hasCompletedOnboarding: true,
    isRealBackend: true,
    vitals: currentSession.vitals || {},
  } : {
    ...currentSession,
    hasCompletedOnboarding: true,
    isNewUser: false,
    profile: {
      ...currentSession.profile,
      dateOfBirth: onboardingData.dateOfBirth ?? currentSession.profile?.dateOfBirth,
      age: onboardingData.dateOfBirth
        ? normalizeBackendUser({ ...currentSession, profile: { dateOfBirth: onboardingData.dateOfBirth } }).profile.age
        : onboardingData.age ?? currentSession.profile?.age,
      gender: onboardingData.gender ?? currentSession.profile?.gender,
      bloodGroup: onboardingData.bloodGroup ?? currentSession.profile?.bloodGroup,
      heightCm: onboardingData.heightCm ?? currentSession.profile?.heightCm,
      weightKg: onboardingData.weightKg ?? currentSession.profile?.weightKg,
      bmi: onboardingData.bmi ?? currentSession.profile?.bmi,
      smokingStatus: onboardingData.smokingStatus ?? currentSession.profile?.smokingStatus,
      physicalActivityDays: onboardingData.physicalActivityDays ?? currentSession.profile?.physicalActivityDays,
      knownConditions: onboardingData.knownConditions ?? currentSession.profile?.knownConditions ?? [],
      allergies: onboardingData.allergies ?? currentSession.profile?.allergies ?? null,
      currentMedications: onboardingData.currentMedications ?? currentSession.profile?.currentMedications ?? null,
      familyHistory: onboardingData.familyHistory == null
        ? currentSession.profile?.familyHistory ?? null
        : /^yes$/i.test(onboardingData.familyHistory),
      familyHistoryNotes: onboardingData.familyHistory ?? currentSession.profile?.familyHistoryNotes ?? null,
      emergencyContact: onboardingData.emergencyContact || currentSession.profile?.emergencyContact,
    },
    vitals: {
      ...currentSession.vitals,
      systolicBp: onboardingData.systolicBp ?? currentSession.vitals?.systolicBp,
      diastolicBp: onboardingData.diastolicBp ?? currentSession.vitals?.diastolicBp,
      fastingGlucose: onboardingData.fastingGlucose ?? currentSession.vitals?.fastingGlucose,
      totalCholesterol: onboardingData.totalCholesterol ?? currentSession.vitals?.totalCholesterol,
      hdl: onboardingData.hdl ?? currentSession.vitals?.hdl,
      ldl: onboardingData.ldl ?? currentSession.vitals?.ldl,
    },
    isLocalOnly: !currentSession.isDemo,
  };

  // Update session in storage
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));

  // If local registered user, update in user store list
  if (!updatedUser.isDemo) {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = updatedUser;
      saveStoredUsers(users);
    }
  }

  return updatedUser;
}

/**
 * Save new disease risk prediction assessment to user's history
 * @param {string} userId
 * @param {Object} assessment
 */
export function saveUserAssessmentRecord(userId, assessment) {
  const currentSession = getActiveSessionUser();
  if (!currentSession) return;

  const history = currentSession.assessmentHistory || [];
  const updatedHistory = [assessment, ...history];

  const updatedUser = {
    ...currentSession,
    assessmentHistory: updatedHistory,
  };

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));

  if (!updatedUser.isDemo) {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx] = updatedUser;
      saveStoredUsers(users);
    }
  }

  return updatedUser;
}
