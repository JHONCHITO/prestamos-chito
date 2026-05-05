const LOCAL_API_URL = 'http://localhost:5000/api';
const DEFAULT_PROD_API_URL = 'https://prestamos-chito-backend.onrender.com/api';

function isLocalHost(hostname = '') {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function normalizeApiUrl(rawUrl = '') {
  const value = String(rawUrl || '').trim();

  if (!value || value === '/api' || value === 'api') {
    return '';
  }

  if (!/^https?:\/\//i.test(value)) {
    return '';
  }

  try {
    const parsed = new URL(value);

    // Ignorar URLs de frontend en Vercel; la API real vive en el backend.
    if (parsed.hostname.endsWith('.vercel.app')) {
      return '';
    }

    if (
      typeof window !== 'undefined' &&
      parsed.hostname === window.location.hostname &&
      !isLocalHost(parsed.hostname)
    ) {
      return '';
    }
  } catch (error) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function readBrowserCandidate(name) {
  if (typeof window === 'undefined') {
    return '';
  }

  return String(window[name] || '').trim();
}

export function resolveApiUrl() {
  const candidates = [
    import.meta.env.VITE_API_URL,
    import.meta.env.VITE_SUPERADMIN_API_URL,
    readBrowserCandidate('__API_URL__'),
    readBrowserCandidate('__SUPERADMIN_API_URL__'),
    readBrowserCandidate('__REACT_APP_API_URL__'),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeApiUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return LOCAL_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');
