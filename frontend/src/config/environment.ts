// Environment configuration for API endpoints
// This ensures HTTPS is always used in production

const getApiUrl = (): string => {
  // Always use HTTPS in production
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl) {
    // If environment variable is set, ensure it uses HTTPS
    return envApiUrl.replace('http://', 'https://');
  }

  // Default to Railway HTTPS endpoint
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