// Environment configuration for API endpoints
// This ensures HTTPS is always used in production
// VERSION: 2.0 - FORCE CACHE REFRESH

const getApiUrl = (): string => {
  // HARDCODED HTTPS URL TO FIX MIXED CONTENT ISSUE - VERSION 2.0
  // This ensures HTTPS is ALWAYS used regardless of environment
  const httpsUrl = 'https://invoicesoftware-production.up.railway.app';
  console.log('🔒 API Configuration - Using HTTPS URL:', httpsUrl);
  return httpsUrl;
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