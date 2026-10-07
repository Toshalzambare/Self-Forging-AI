/**
 * Central API configuration.
 * All values come from environment variables (see .env).
 * Never hardcode URLs, credentials, or ports in component files.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Self-Forging AI';
export const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || 'OmniRoute Auto';

// Demo credentials — only used for the simple login gate
export const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME || 'admin';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'admin123';

/**
 * Central fetch helper — all API calls go through here.
 * Automatically prepends the base URL and handles JSON parsing.
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

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
