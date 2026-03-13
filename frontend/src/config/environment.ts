// Environment configuration for API endpoints
// This ensures HTTPS is always used in production
// VERSION: 2.0 - FORCE CACHE REFRESH

const getApiUrl = (): string => {
  // Check if we're in development (localhost) or production
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let apiUrl: string;

  if (isDevelopment) {
    // Local development - use localhost:8000
    apiUrl = 'http://localhost:8000';
    console.log('🔧 LOCAL DEVELOPMENT - Using localhost API:', apiUrl);
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