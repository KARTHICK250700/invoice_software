import axios from 'axios';
import { API_CONFIG, AXIOS_CONFIG } from '../config/api';
import { logger, logApiCall, logApiResponse } from '../utils/logger';

// Smart API URL detection using centralized configuration

// Configure axios with centralized settings
axios.defaults.baseURL = AXIOS_CONFIG.baseURL;
axios.defaults.timeout = AXIOS_CONFIG.timeout;
axios.defaults.headers.common = { ...axios.defaults.headers.common, ...AXIOS_CONFIG.headers };

// Add request interceptor to include auth token and logging
axios.interceptors.request.use(
  (config) => {
    // Support both 'access_token' (AuthContext) and 'token' (legacy) key names
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log API request
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    logApiCall(method, url, config.data);
    logger.debug(`API Request: ${method} ${url}`, {
      headers: config.headers,
      params: config.params,
      data: config.data
    });

    // Store start time for response timing
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    logger.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and logging
axios.interceptors.response.use(
  (response) => {
    // Log successful API response
    const config = response.config;
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const startTime = config.metadata?.startTime;
    const responseTime = startTime ? Date.now() - startTime : undefined;

    logApiResponse(method, url, response.status, response.data, startTime);
    logger.info(`API Response: ${method} ${url} - ${response.status}`, {
      status: response.status,
      responseTime: responseTime ? `${responseTime}ms` : 'unknown',
      dataSize: JSON.stringify(response.data).length
    });

    return response;
  },
  (error) => {
    // Log failed API response
    const config = error.config;
    const method = config?.method?.toUpperCase() || 'GET';
    const url = config?.url || '';
    const startTime = config?.metadata?.startTime;
    const responseTime = startTime ? Date.now() - startTime : undefined;

    logApiResponse(method, url, error.response?.status || 0, error.response?.data, startTime, error);
    logger.error(`API Error: ${method} ${url} - ${error.response?.status || 0}`, error, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseTime: responseTime ? `${responseTime}ms` : 'unknown',
      errorMessage: error.message
    });

    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      logger.warning('User logged out due to 401 error');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Dynamic API service class
export class DynamicApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // Generic CRUD operations
  async getAll<T>(endpoint: string, params?: any): Promise<T[]> {
    const response = await axios.get(`${this.baseUrl}/${endpoint}`, { params });
    return response.data.data || response.data;
  }

  async getById<T>(endpoint: string, id: string | number): Promise<T> {
    const response = await axios.get(`${this.baseUrl}/${endpoint}/${id}`);
    return response.data.data || response.data;
  }

  async create<T>(endpoint: string, data: any): Promise<T> {
    const response = await axios.post(`${this.baseUrl}/${endpoint}/`, data);
    return response.data.data || response.data;
  }

  async update<T>(endpoint: string, id: string | number, data: any): Promise<T> {
    const response = await axios.put(`${this.baseUrl}/${endpoint}/${id}`, data);
    return response.data.data || response.data;
  }

  async delete(endpoint: string, id: string | number): Promise<void> {
    await axios.delete(`${this.baseUrl}/${endpoint}/${id}`);
  }

  // Special operations
  async search<T>(endpoint: string, searchTerm: string, params?: any): Promise<T[]> {
    const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
      params: { search: searchTerm, ...params }
    });
    return response.data.data || response.data;
  }

  async preview(endpoint: string, id: string | number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/${endpoint}/${id}/preview`);
    return response.data.data || response.data;
  }

  async download(endpoint: string, id: string | number): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/${endpoint}/${id}/download`);
    return response.data.data || response.data;
  }

  // Authentication methods
  async login(credentials: { username: string; password: string }): Promise<any> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await axios.post('/api/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.data || response.data;
  }

  async getProfile(): Promise<any> {
    const response = await axios.get('/api/auth/me');
    return response.data.data || response.data;
  }
}

// Create service instances for different endpoints
export const apiService = new DynamicApiService();

// Specific service classes for different entities
export class InvoiceService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  // Invoice-specific methods
  async getInvoices(filters?: {
    status?: string;
    client_id?: number;
    skip?: number;
    limit?: number;
  }) {
    return this.getAll('invoices', filters);
  }

  async createInvoice(invoiceData: any) {
    return this.create('invoices', invoiceData);
  }

  async updateInvoice(id: string | number, invoiceData: any) {
    return this.update('invoices', id, invoiceData);
  }

  async previewInvoice(id: string | number) {
    return this.preview('invoices', id);
  }


  // QR Code access (no auth required)
  async viewByQR(accessCode: string) {
    const response = await axios.get(`/api/invoices/view/${accessCode}`);
    return response.data.data || response.data;
  }
}

export class QuotationService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  async getQuotations(filters?: any) {
    return this.getAll('quotations', filters);
  }

  async createQuotation(quotationData: any) {
    return this.create('quotations', quotationData);
  }

  async updateQuotation(id: string | number, quotationData: any) {
    return this.update('quotations', id, quotationData);
  }

  async previewQuotation(id: string | number) {
    return this.preview('quotations', id);
  }

  async downloadQuotationPDF(id: string | number) {
    return this.download('quotations', id);
  }
}

export class ClientService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  async searchClients(searchTerm: string) {
    return this.search('clients', searchTerm);
  }

  async getClients(params?: any) {
    return this.getAll('clients', params);
  }

  async createClient(clientData: any) {
    return this.create('clients', clientData);
  }

  async updateClient(id: string | number, clientData: any) {
    return this.update('clients', id, clientData);
  }

  async deleteClient(id: string | number) {
    return this.delete('clients', id);
  }
}

export class VehicleService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  async searchVehicles(searchTerm: string, clientId?: number) {
    return this.search('vehicles', searchTerm, clientId ? { client_id: clientId } : {});
  }

  async getVehicles(params?: any) {
    return this.getAll('vehicles', params);
  }

  async createVehicle(vehicleData: any) {
    return this.create('vehicles', vehicleData);
  }

  async updateVehicle(id: string | number, vehicleData: any) {
    return this.update('vehicles', id, vehicleData);
  }

  async deleteVehicle(id: string | number) {
    return this.delete('vehicles', id);
  }

  async getBrands() {
    const response = await axios.get('/api/vehicles/brands');
    return response.data.data?.brands || response.data.brands || response.data.data || response.data;
  }

  async getModels(brandId: number) {
    const response = await axios.get(`/api/vehicles/brands/${brandId}/models`);
    return response.data.data?.models || response.data.models || response.data.data || response.data;
  }
}

export class ServiceService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  async getServices(params?: any) {
    return this.getAll('services', params);
  }

  async createService(serviceData: any) {
    return this.create('services', serviceData);
  }

  async updateService(id: string | number, serviceData: any) {
    return this.update('services', id, serviceData);
  }

  async deleteService(id: string | number) {
    return this.delete('services', id);
  }
}

export class DashboardService extends DynamicApiService {
  constructor() {
    super('/api');
  }

  async getStats() {
    const response = await axios.get('/api/dashboard/stats');
    return response.data.data || response.data;
  }

  async getRecentActivity() {
    const response = await axios.get('/api/dashboard/recent-activity');
    return response.data.data || response.data;
  }

  async getRevenueData(period: string = 'month') {
    const response = await axios.get('/api/dashboard/revenue', { params: { period } });
    return response.data.data || response.data;
  }
}

// Export service instances
export const invoiceService = new InvoiceService();
export const quotationService = new QuotationService();
export const clientService = new ClientService();
export const vehicleService = new VehicleService();
export const serviceService = new ServiceService();
export const dashboardService = new DashboardService();

// Utility functions for file handling
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

// Helper for handling form data
export const prepareFormData = (data: any) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] instanceof File) {
      formData.append(key, data[key]);
    } else if (Array.isArray(data[key])) {
      formData.append(key, JSON.stringify(data[key]));
    } else if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key].toString());
    }
  });
  return formData;
};

// Error handling utility
export const handleApiError = (error: any) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Dynamic query key generator for React Query
export const getQueryKey = (endpoint: string, params?: any) => {
  if (params) {
    return [endpoint, params];
  }
  return [endpoint];
};

export default apiService;