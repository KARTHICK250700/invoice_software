// Environment configuration for API endpoints
// This ensures HTTPS is always used in production
// VERSION: 3.0 - FORCE LOCALHOST FOR DEVELOPMENT

const getApiUrl = (): string => {
  // Check if VITE_API_URL is set in environment
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Using VITE_API_URL from environment:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Force localhost for development - ignore hostname check temporarily
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let apiUrl: string;

  if (isDevelopment) {
    // Force local development - use localhost:8000
    apiUrl = 'http://localhost:8000';
    console.log('🔧 FORCED LOCAL DEVELOPMENT - Using localhost API:', apiUrl);
    console.log('🔧 Current hostname:', window.location.hostname);
    console.log('🔧 DEV mode:', import.meta.env.DEV);
  } else {
    // Production - use Railway HTTPS
    apiUrl = 'https://invoicesoftware-production.up.railway.app';
    console.log('🔒 PRODUCTION - Using Railway HTTPS API:', apiUrl);
  }

  return apiUrl;
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  ENDPOINTS: {
    AUTH: '/api/auth',
    CLIENTS: '/api/clients',
    DASHBOARD: '/api/dashboard',
    QUOTATIONS: '/api/quotations',
    INVOICES: '/api/invoices',
    SERVICES: '/api/services',
    VEHICLES: '/api/vehicles',
    REPORTS: '/api/reports'
  }
};

export default API_CONFIG;