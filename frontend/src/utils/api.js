/**
 * Central authenticated API client with dual-token management and silent token refresh.
 * Stores sfa_access_token and sfa_refresh_token in localStorage.
 * Transparently refreshes expired 15-minute access tokens upon 401 responses.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const ACCESS_TOKEN_KEY = 'sfa_access_token';
export const REFRESH_TOKEN_KEY = 'sfa_refresh_token';
export const USER_KEY = 'sfa_user';

// In-flight refresh promise to prevent duplicate refresh calls across parallel requests
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed(err) {
  refreshSubscribers.forEach(cb => cb(null, err));
  refreshSubscribers = [];
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, refreshToken, user) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken() && getStoredUser());
}

/**
 * Attempts to rotate the refresh token and acquire a new access token.
 */
export async function refreshTokens() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    window.dispatchEvent(new CustomEvent('sfa-auth-expired'));
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    window.dispatchEvent(new CustomEvent('sfa-auth-expired'));
    throw new Error('Session expired or revoked');
  }

  const data = await res.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  return data.token;
}

/**
 * Central fetch helper with authorization and automatic 401 token refresh retry.
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
  });

  // Intercept 401 Unauthorized for non-auth endpoints
  const isAuthEndpoint = path.startsWith('/api/auth/login') ||
                         path.startsWith('/api/auth/signup') ||
                         path.startsWith('/api/auth/refresh');

  if (res.status === 401 && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await refreshTokens();
        isRefreshing = false;
        onRefreshed(newToken);

        // Retry initial request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(url, {
          ...options,
          headers,
        });
      } catch (refreshErr) {
        isRefreshing = false;
        onRefreshFailed(refreshErr);
        throw refreshErr;
      }
    } else {
      // Another request is already refreshing — await its completion and retry
      const retryPromise = new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken, err) => {
          if (err) {
            reject(err);
          } else {
            headers['Authorization'] = `Bearer ${newToken}`;
            resolve(fetch(url, { ...options, headers }));
          }
        });
      });
      res = await retryPromise;
    }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  return res.json();
}

// ── Auth API Helpers ───────────────────────────────────────────────────────────

export async function authLogin(login, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Invalid email or password.');
  }

  const data = await res.json();
  setSession(data.token, data.refresh_token, data.user);
  return data.user;
}

export async function authSignup(email, username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Failed to create account.');
  }

  const data = await res.json();
  setSession(data.token, data.refresh_token, data.user);
  return data.user;
}

export async function authGoogle(credential) {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Google sign-in failed.');
  }

  const data = await res.json();
  setSession(data.token, data.refresh_token, data.user);
  return data.user;
}

export async function authLogout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (_) {}
  }
  clearSession();
}

export async function authGetMe() {
  return apiFetch('/api/auth/me');
}

export async function authGetSessions() {
  return apiFetch('/api/auth/sessions');
}
