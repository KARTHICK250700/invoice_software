/**
 * Axios global interceptors — auto-log every API request & response.
 * Import this file ONCE in main.tsx before the app mounts.
 */
import axios from 'axios';
import { logger } from './logger';

// Track request start time per request ID
const _startTimes = new Map<number, number>();
let _reqId = 0;

// ── Request interceptor ────────────────────────────────────────────────────
axios.interceptors.request.use(
  (config) => {
    const id = ++_reqId;
    (config as any)._logId = id;
    _startTimes.set(id, Date.now());

    const method = (config.method ?? 'GET').toUpperCase();
    const url    = config.url ?? '';
    logger.logApiRequest({ method, url, requestData: config.data });
    return config;
  },
  (error) => {
    logger.error('Axios request setup error', error);
    return Promise.reject(error);
  }
);

// ── Response interceptor ──────────────────────────────────────────────────
axios.interceptors.response.use(
  (response) => {
    const id        = (response.config as any)._logId as number;
    const start     = _startTimes.get(id);
    const ms        = start ? Date.now() - start : undefined;
    _startTimes.delete(id);

    const method     = (response.config.method ?? 'GET').toUpperCase();
    const url        = response.config.url ?? '';
    const statusCode = response.status;

    logger.logApiRequest({ method, url, statusCode, responseTime: ms });
    return response;
  },
  (error) => {
    const config     = error.config ?? {};
    const id         = (config as any)._logId as number;
    const start      = _startTimes.get(id);
    const ms         = start ? Date.now() - start : undefined;
    if (id) _startTimes.delete(id);

    const method     = (config.method ?? 'GET').toUpperCase();
    const url        = config.url ?? '';
    const statusCode = error.response?.status ?? 0;
    const detail     = error.response?.data?.detail ?? error.message;

    logger.logApiRequest({ method, url, statusCode, responseTime: ms, error: detail });

    // 401 → redirect to login (token expired)
    if (statusCode === 401 && !url.includes('/auth/token')) {
      logger.warning('Session expired — redirecting to login');
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default {};
