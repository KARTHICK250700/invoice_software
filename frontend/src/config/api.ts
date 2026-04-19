// CENTRALIZED API CONFIGURATION
// Single place to manage all API endpoints and backend connectivity
// VERSION: 4.0 - Complete Environment-based Configuration

/**
 * API Configuration System
 *
 * How to use:
 * 1. For local development: Set VITE_API_URL=http://localhost:8000 in .env
 * 2. For production: Set VITE_API_URL=https://your-production-server.com in .env.production
 * 3. All components automatically use this configuration
 *
 * Examples:
 * - Local: VITE_API_URL=http://localhost:8000
 * - Production: VITE_API_URL=https://apiavaniko.com
 * - New Server: VITE_API_URL=https://your-new-backend.com
 */

// Get base API URL from environment variables
const getBaseApiUrl = (): string => {
  // Primary: Use VITE_API_URL from environment
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  // Fallback: Auto-detect based on current environment
  const isDevelopment =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.startsWith('10.');

  const fallbackUrl = isDevelopment
    ? 'http://localhost:8000'
    : 'https://your-production-backend.com';


  return fallbackUrl;
};

// Base API URL
const BASE_API_URL = getBaseApiUrl();

// API Endpoints Configuration
export const API_CONFIG = {
  BASE_URL: BASE_API_URL,

  // Full endpoint URLs - ready to use
  ENDPOINTS: {
    // Authentication
    AUTH_LOGIN: `${BASE_API_URL}/api/auth/token`,
    AUTH_LOGOUT: `${BASE_API_URL}/api/auth/logout`,
    AUTH_REFRESH: `${BASE_API_URL}/api/auth/refresh`,

    // Clients
    CLIENTS: `${BASE_API_URL}/api/clients`,
    CLIENTS_SEARCH: `${BASE_API_URL}/api/clients/?search=`,

    // Vehicles
    VEHICLES: `${BASE_API_URL}/api/vehicles`,
    VEHICLES_SEARCH: `${BASE_API_URL}/api/vehicles/?search=`,
    VEHICLES_BRANDS: `${BASE_API_URL}/api/vehicles/brands`,

    // Quotations
    QUOTATIONS: `${BASE_API_URL}/api/quotations`,
    QUOTATIONS_SEARCH: `${BASE_API_URL}/api/quotations/?search=`,

    // Invoices
    INVOICES: `${BASE_API_URL}/api/invoices`,
    INVOICES_SEARCH: `${BASE_API_URL}/api/invoices/?search=`,

    // Services
    SERVICES: `${BASE_API_URL}/api/services`,
    SERVICES_CATEGORIES: `${BASE_API_URL}/api/services/categories`,
    SERVICES_SEARCH: `${BASE_API_URL}/api/services/services`,

    // Dashboard & Reports
    DASHBOARD_STATS: `${BASE_API_URL}/api/dashboard/stats`,
    REPORTS: `${BASE_API_URL}/api/reports`
  },

  // Helper function to build custom endpoints
  buildEndpoint: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_API_URL}${cleanPath}`;
  },

  // Helper function to build endpoints with parameters
  buildEndpointWithId: (path: string, id: string | number): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_API_URL}${cleanPath}/${id}`;
  }
};

// Axios default configuration
export const AXIOS_CONFIG = {
  baseURL: BASE_API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
};

// Environment info for debugging
export const ENV_INFO = {
  API_URL: BASE_API_URL,
  IS_DEVELOPMENT: import.meta.env.DEV,
  NODE_ENV: import.meta.env.MODE,
  HOSTNAME: window.location.hostname,
  PORT: window.location.port,
  PROTOCOL: window.location.protocol
};

export default API_CONFIG;