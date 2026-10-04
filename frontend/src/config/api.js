/**
 * Centralized API & Environment Configuration
 * --------------------------------------------
 * Determines active environment (DEV, QA, PROD) and sets up the central API URL.
 * Automatically respects Vite environment modes (.env.development, .env.qa, .env.production).
 */

const rawEnv = (import.meta.env.VITE_ENV || import.meta.env.MODE || 'development').toLowerCase();

export const ENV = rawEnv === 'prod' || rawEnv === 'production'
  ? 'production'
  : (rawEnv === 'qa' || rawEnv === 'staging' || rawEnv === 'test' ? 'qa' : 'development');

export const IS_DEV = ENV === 'development';
export const IS_QA = ENV === 'qa';
export const IS_PROD = ENV === 'production';

// Dynamic API Base URL resolution
const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  
  if (IS_DEV) {
    return 'http://localhost:5005/api';
  }
  if (IS_QA) {
    return 'https://qa-api.craftnest.in/api';
  }
  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

// Environment badge display flag
export const SHOW_ENV_BADGE = import.meta.env.VITE_SHOW_ENV_BADGE === 'true' || (IS_DEV || IS_QA);

export default {
  ENV,
  IS_DEV,
  IS_QA,
  IS_PROD,
  API_BASE_URL,
  SHOW_ENV_BADGE,
};
