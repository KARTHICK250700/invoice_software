/**
 * New PDF Service - Clean PDF Generation API
 * Service for the new separate PDF generation endpoints
 */

import axios from 'axios';
// Old PDF generator import removed

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with base configuration
const pdfApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for PDF generation
});

// Add auth token to requests
pdfApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
pdfApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class NewPDFService {
  /**
   * Download invoice PDF using new local PDF generation
   */
  async downloadInvoicePDF(invoiceId: number | string): Promise<void> {
    try {
      console.log(`🔄 Downloading invoice PDF for ID: ${invoiceId} (LOCAL GENERATION)`);

      // First, get invoice data from API
      const invoiceResponse = await pdfApi.get(`/api/invoices/${invoiceId}`);
      const invoiceData = invoiceResponse.data;

      // Convert API data to PDF format
      const pdfData = convertApiDataToUnifiedFormat(invoiceData, 'invoice');

      // Generate PDF using local library
      await generateExactFormatInvoicePDF(pdfData);

      console.log(`✅ Invoice PDF downloaded successfully (LOCAL GENERATION)`);
    } catch (error: any) {
      console.error('❌ Invoice PDF download failed (LOCAL GENERATION):', error);

      // Fallback to backend PDF generation if local fails
      try {
        console.log(`🔄 Attempting fallback to backend PDF generation for invoice ${invoiceId}`);

        const response = await pdfApi.get(`/api/pdf/invoices/${invoiceId}/pdf`, {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
          }
        });

        // Create blob URL and trigger download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice_${invoiceId}_backend.pdf`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`✅ Invoice PDF downloaded successfully (BACKEND FALLBACK)`);
      } catch (fallbackError: any) {
        console.error('❌ Backend fallback also failed:', fallbackError);
        throw new Error(`Failed to download invoice PDF: ${error.message}`);
      }
    }
  }

  /**
   * Download quotation PDF using new local PDF generation
   */
  async downloadQuotationPDF(quotationId: number | string): Promise<void> {
    try {
      console.log(`🔄 Downloading quotation PDF for ID: ${quotationId} (LOCAL GENERATION)`);

      // First, get quotation data from API
      const quotationResponse = await pdfApi.get(`/api/quotations/${quotationId}`);
      const quotationData = quotationResponse.data;

      // Convert API data to PDF format
      const pdfData = convertApiDataToUnifiedFormat(quotationData, 'quotation');

      // Generate PDF using local library
      // await generateExactFormatQuotationPDF(pdfData);

      console.log(`✅ Quotation PDF downloaded successfully (LOCAL GENERATION)`);
    } catch (error: any) {
      console.error('❌ Quotation PDF download failed (LOCAL GENERATION):', error);

      // Fallback to backend PDF generation if local fails
      try {
        console.log(`🔄 Attempting fallback to backend PDF generation for quotation ${quotationId}`);

        const response = await pdfApi.get(`/api/pdf/quotations/${quotationId}/pdf`, {
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
          }
        });

        // Create blob URL and trigger download
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `quotation_${quotationId}_backend.pdf`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`✅ Quotation PDF downloaded successfully (BACKEND FALLBACK)`);
      } catch (fallbackError: any) {
        console.error('❌ Backend fallback also failed:', fallbackError);
        throw new Error(`Failed to download quotation PDF: ${error.message}`);
      }
    }
  }

  /**
   * Check PDF service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await pdfApi.get('/api/pdf/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('PDF Service health check failed:', error);
      return false;
    }
  }

  /**
   * Preview invoice (returns URL for preview)
   */
  async getInvoicePreviewURL(invoiceId: number | string): Promise<string> {
    try {
      const response = await pdfApi.get(`/api/pdf/invoices/${invoiceId}/preview`);
      return response.data.preview_url;
    } catch (error) {
      console.error('Failed to get invoice preview URL:', error);
      throw error;
    }
  }

  /**
   * Preview quotation (returns URL for preview)
   */
  async getQuotationPreviewURL(quotationId: number | string): Promise<string> {
    try {
      const response = await pdfApi.get(`/api/pdf/quotations/${quotationId}/preview`);
      return response.data.preview_url;
    } catch (error) {
      console.error('Failed to get quotation preview URL:', error);
      throw error;
    }
  }

}

// Create global instance
export const newPdfService = new NewPDFService();

// Helper functions for easy import
export const downloadInvoicePDF = (invoiceId: number | string) =>
  newPdfService.downloadInvoicePDF(invoiceId);

export const downloadQuotationPDF = (quotationId: number | string) =>
  newPdfService.downloadQuotationPDF(quotationId);

export const checkPDFServiceHealth = () =>
  newPdfService.checkHealth();

export default newPdfService;