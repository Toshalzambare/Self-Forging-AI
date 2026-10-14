/**
 * Central API configuration.
 * All values come from environment variables (see .env).
 * Never hardcode URLs, credentials, or ports in component files.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Self-Forging AI';
export const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || 'OmniRoute Auto';
export { apiFetch } from './utils/api.js';
