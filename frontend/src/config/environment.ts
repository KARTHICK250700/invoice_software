// Environment configuration for API endpoints
// This ensures HTTPS is always used in production

const getApiUrl = (): string => {
  // HARDCODED HTTPS URL TO FIX MIXED CONTENT ISSUE
  // This ensures HTTPS is ALWAYS used regardless of environment
  return 'https://invoicesoftware-production.up.railway.app';
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