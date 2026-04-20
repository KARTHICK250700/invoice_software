import React from 'react';
import { FileDown } from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { getStoredCompanySettings } from '../hooks/useCompanySettings';
import { useToast } from './UI/Toast';
import { generateTallyInvoicePDF } from '../utils/tallyPdfGenerator';

interface Quotation {
  id?: number;
  quotation_number?: string;
  client_id: number;
  vehicle_id: number;
  quotation_date: string;
  valid_until?: string;
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
  place_of_supply?: string;
  hsn_sac_code?: string;
  technician_name?: string;
  items: QuotationItem[];
  client?: any;
  vehicle?: any;
  notes?: string;
}

interface QuotationItem {
  id?: string | number;
  item_type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  total: number;
}

interface PDFQuotationProps {
  quotation: Quotation;
  className?: string;
}

const DEFAULT_COMPANY = {
  company_name: 'OM MURUGAN AUTO WORKS',
  address: '44HP+W4Q, Sidco Industrial Estate, Kalaignar Karunanidhi Nagar, Cholambedu, Chennai, Tamil Nadu 600062',
  gst_number: '33AXNPG2146F1ZR',
  email: 'gopalakrish.p86@gmail.com',
  phone: '9884551560',
};

const PDFQuotation: React.FC<PDFQuotationProps> = ({ quotation, className = '' }) => {
  const toast = useToast();

  const generatePDF = async () => {
    try {
      // Company settings
      const stored = getStoredCompanySettings() || {};
      const co = { ...DEFAULT_COMPANY, ...stored };

      // Fetch full quotation details (includes client, vehicle, items)
      let detailedQuotation: any = quotation;
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(
          API_CONFIG.buildEndpoint(`/api/quotations/${(quotation as any).id}`),
          { headers }
        );
        if (res.ok) {
          detailedQuotation = { ...quotation, ...(await res.json()) };
        }
      } catch (_) { /* use prop data */ }

      // Map quotation fields to invoice-compatible format for the Tally generator
      const invoiceCompatible = {
        ...detailedQuotation,
        invoice_number: detailedQuotation.quotation_number || `QT-${detailedQuotation.id}`,
        invoice_date:   detailedQuotation.quotation_date,
        _documentTitle: 'Quotation',  // signals Tally generator to use "Quotation" instead of "Tax Invoice"
      };

      await generateTallyInvoicePDF(invoiceCompatible, co);
      toast.success('Quotation PDF downloaded!');
    } catch (error: any) {
      toast.error('Error generating PDF. Please try again.');
    }
  };

  return (
    <button
      onClick={generatePDF}
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg ${className}`}
      title="Download Quotation PDF"
    >
      <FileDown className="w-4 h-4" />
      Download PDF
    </button>
  );
};

export default PDFQuotation;
