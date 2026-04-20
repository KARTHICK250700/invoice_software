import React from 'react';
import { Download } from 'lucide-react';
import { logger } from '../utils/logger';
import { API_CONFIG } from '../config/api';
import { getStoredCompanySettings } from '../hooks/useCompanySettings';
import { useToast } from './UI/Toast';
import { generateTallyInvoicePDF } from '../utils/tallyPdfGenerator';

interface Invoice {
  id?: number;
  invoice_number?: string;
  client_id: number;
  vehicle_id: number;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  taxable_amount: number;
  gst_enabled: boolean;
  tax_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount_amount: number;
  round_off: number;
  service_type?: string;
  km_reading_in?: number;
  km_reading_out?: number;
  challan_no?: string;
  challan_date?: string;
  eway_bill_no?: string;
  transport?: string;
  transport_id?: string;
  place_of_supply?: string;
  hsn_sac_code?: string;
  technician_name?: string;
  work_order_no?: string;
  estimate_no?: string;
  insurance_claim: boolean;
  warranty_applicable: boolean;
  items: InvoiceItem[];
  client?: any;
  vehicle?: any;
  notes?: string;
}

interface InvoiceItem {
  id?: string | number;
  item_type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  total: number;
}

interface PDFInvoiceProps {
  invoice: Invoice;
  className?: string;
  iconOnly?: boolean;
}

const DEFAULT_COMPANY = {
  company_name: 'OM MURUGAN AUTO WORKS',
  address: '44HP+W4Q, Sidco Industrial Estate, Kalaignar Karunanidhi Nagar, Cholambedu, Chennai, Tamil Nadu 600062',
  gst_number: '33AXNPG2146F1ZR',
  email: 'gopalakrish.p86@gmail.com',
  phone: '9884551560',
};

const PDFInvoice: React.FC<PDFInvoiceProps> = ({ invoice, className = '', iconOnly = false }) => {
  const toast = useToast();

  const generatePDF = async () => {
    try {
      logger.logUserAction('PDF_GENERATION_START', `invoice:${invoice.id}`, {
        invoice_number: invoice.invoice_number,
      });

      // Company settings — merge stored settings with defaults
      const stored = getStoredCompanySettings() || {};
      const co = { ...DEFAULT_COMPANY, ...stored };

      // Fetch full invoice details (includes client, vehicle, items)
      let detailedInvoice: any = invoice;
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(
          API_CONFIG.buildEndpoint(`/api/invoices/${(invoice as any).id}`),
          { headers }
        );
        if (res.ok) {
          detailedInvoice = { ...invoice, ...(await res.json()) };
        }
      } catch (_) { /* use prop data */ }

      // Generate Tally-style Indian GST invoice PDF
      await generateTallyInvoicePDF(detailedInvoice, co);

      logger.logUserAction('PDF_GENERATION_SUCCESS', `invoice:${invoice.id}`, {});
      toast.success('Invoice PDF downloaded!');
    } catch (error: any) {
      logger.logUserAction('PDF_GENERATION_ERROR', `invoice:${invoice.id}`, {
        error_message: error?.message,
      });
      toast.error('Error generating PDF. Please try again.');
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={generatePDF}
        title="Download PDF Invoice"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-all shadow-sm ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        PDF
      </button>
    );
  }

  return (
    <button
      onClick={generatePDF}
      className={`inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 active:scale-95 transform transition-all duration-200 shadow-lg hover:shadow-xl border border-teal-400 ${className}`}
      title="Download PDF Invoice"
    >
      <Download className="w-5 h-5" />
      Download PDF
    </button>
  );
};

export default PDFInvoice;
