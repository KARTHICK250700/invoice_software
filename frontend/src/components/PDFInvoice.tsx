import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { FileDown } from 'lucide-react';
import { logger } from '../utils/logger';

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
}

const formatNumber = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined) return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN');
};

const PDFInvoice: React.FC<PDFInvoiceProps> = ({ invoice, className = '' }) => {
  const generatePDF = async () => {
    try {
      console.log('🚀 Generating PDF for invoice:', invoice.invoice_number);
      logger.logUserAction('PDF_GENERATION_START', `invoice:${invoice.id}`, {
        invoice_number: invoice.invoice_number,
        has_items: invoice.items?.length || 0
      });

      // Fetch detailed invoice data with items
      let detailedInvoice = invoice;
      if (!detailedInvoice.items || detailedInvoice.items.length === 0) {
        console.log('📋 Fetching detailed invoice data with items...');
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('access_token');
          const headers: any = {
            'Content-Type': 'application/json'
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Use local development server
          const apiUrl = import.meta.env.DEV ? 'http://localhost:8000' : 'https://invoicesoftware-production.up.railway.app';
          const response = await fetch(`${apiUrl}/api/invoices/${detailedInvoice.id}/items`, {
            headers
          });

          if (response.ok) {
            detailedInvoice = await response.json();
            console.log('✅ Detailed invoice fetched:', detailedInvoice);
            console.log('📋 Items found:', detailedInvoice.items?.length || 0);
            console.log('🏢 Client data:', detailedInvoice.client);
            console.log('🚗 Vehicle data:', detailedInvoice.vehicle);
          } else {
            console.warn('⚠️ Failed to fetch detailed invoice. Status:', response.status);
            console.warn('⚠️ Response:', await response.text());
          }
        } catch (error) {
          console.warn('⚠️ Error fetching detailed invoice:', error);
        }
      }

      // Load company logo
      let logoDataUrl = '';
      try {
        const logoResponse = await fetch('/logo.webp');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          logoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          console.log('✅ Company logo loaded successfully');
        }
      } catch (logoError) {
        console.warn('⚠️ Logo not found, using text header:', logoError);
      }

      // Generate QR Code for invoice verification
      let qrCodeDataUrl = '';
      try {
        const verificationUrl = `${window.location.origin}/verify-invoice/${detailedInvoice.id || invoice.id}`;
        qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 100,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        console.log('✅ QR Code generated for verification:', verificationUrl);
      } catch (qrError) {
        console.warn('⚠️ Error generating QR code:', qrError);
      }

      // Create a temporary div for PDF content
      const pdfContent = document.createElement('div');
      pdfContent.id = 'pdf-content';
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      pdfContent.style.width = '210mm';
      pdfContent.style.padding = '20px';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.style.backgroundColor = 'white';

      // PDF HTML content - Traditional Invoice Format
      pdfContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 0; font-family: Arial, sans-serif; border: 2px solid #000;">
          <!-- Company Header with Full Width Company Name -->
          <div style="background: #20b2aa; color: white;">
            <!-- First Row: Company Name Full Width -->
            <div style="text-align: center; padding: 15px 12px 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.3);">
              <h1 style="margin: 0; font-size: 42px; font-weight: bold; color: white; line-height: 1.1; letter-spacing: 2px;">
                OM MURUGAN AUTO WORKS
              </h1>
            </div>

            <!-- Second Row: Details with Logo and Contact -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px 12px 12px;">
              <!-- Left: Logo and Business Info -->
              <div style="display: flex; align-items: center; flex: 1;">
                ${logoDataUrl ? `
                  <img src="${logoDataUrl}" alt="Company Logo" style="height: 78px; width: auto; margin-right: 15px; object-fit: contain;" />
                ` : `
                  <div style="width: 78px; height: 78px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                    <span style="color: #20b2aa; font-size: 30px; font-weight: bold;">🚗</span>
                  </div>
                `}
                <div>
                  <p style="margin: 0 0 3px 0; font-size: 14px; color: white; font-weight: bold;">
                    Complete Multibrand Auto Care Services
                  </p>
                  <p style="margin: 0 0 2px 0; font-size: 12px; color: white;">
                    No.45, Anna Salai, Chennai - 600002, Tamil Nadu
                  </p>
                  <p style="margin: 0; font-size: 11px; color: white;">
                    PAN: 26CORPP3939N1 | GSTIN: 33AABBA7890B1ZW
                  </p>
                </div>
              </div>

              <!-- Right: Contact Information -->
              <div style="text-align: right; color: white; font-size: 11px; min-width: 200px;">
                <p style="margin: 2px 0; font-weight: bold;">📞 Tel: +91 98765 43210</p>
                <p style="margin: 2px 0; font-weight: bold;">📱 Mobile: +91 98765 43210</p>
                <p style="margin: 2px 0; font-weight: bold;">✉️ Email: contact@ommunruganworks.com</p>
                <p style="margin: 2px 0; font-weight: bold;">🌐 Web: www.ommunruganworks.com</p>
              </div>
            </div>
          </div>

          <!-- PAN and Tax Invoice Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; border-bottom: 1px solid #000; background: #f8f9fa;">
            <div style="font-size: 12px; font-weight: bold;">
              PAN : 26CORPP3939N1
            </div>
            <div style="text-align: center; flex-grow: 1;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold;">TAX INVOICE</h2>
            </div>
            <div style="font-size: 11px; font-weight: bold;">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>

          <!-- Traditional Customer & Vehicle Details Section -->
          <div style="display: flex; border-bottom: 1px solid #000;">
            <!-- Left Column - Customer & Vehicle Details -->
            <div style="flex: 1; padding: 8px; border-right: 1px solid #000;">
              <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; background: #f8f9fa; padding: 3px; border: 1px solid #000;">
                Customer & Vehicle Details
              </h3>

              ${detailedInvoice.client ? `
                <p style="margin: 2px 0; font-size: 11px;"><strong>M/S</strong> ${detailedInvoice.client.name || 'N/A'}</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Address</strong> ${detailedInvoice.client.address || 'N/A'}</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Phone</strong> ${detailedInvoice.client.mobile || invoice.client.phone || 'N/A'}</p>
              ` : `
                <p style="margin: 2px 0; font-size: 11px;"><strong>M/S</strong> Customer Details Not Available</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Address</strong> N/A</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Phone</strong> N/A</p>
              `}

              <div style="margin-top: 8px;">
                <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">Vehicle Details:</p>
                ${detailedInvoice.vehicle ? `
                  <p style="margin: 2px 0; font-size: 11px;">Vehicle No: ${detailedInvoice.vehicle.registration_number || 'N/A'}</p>
                  <p style="margin: 2px 0; font-size: 11px;">Make/Model: ${detailedInvoice.vehicle.brand_name || 'N/A'} ${detailedInvoice.vehicle.model_name || 'N/A'}</p>
                ` : `
                  <p style="margin: 2px 0; font-size: 11px;">Vehicle No: N/A</p>
                  <p style="margin: 2px 0; font-size: 11px;">Make/Model: N/A</p>
                `}
                <p style="margin: 2px 0; font-size: 11px;">GSTIN: ${detailedInvoice.client?.gst_number || '32AABBA7890B1ZB'}</p>
              </div>
            </div>

            <!-- Right Column - Invoice Details -->
            <div style="flex: 1; padding: 8px;">
              <p style="margin: 5px 0; font-size: 12px;">Place of Supply: ${detailedInvoice.place_of_supply || 'Tamil Nadu (33)'}</p>

              <table style="width: 100%; margin-top: 15px; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Invoice No.</td>
                  <td style="padding: 3px;">${detailedInvoice.invoice_number || 'N/A'}</td>
                  <td style="padding: 3px; font-weight: bold;">Invoice Date</td>
                  <td style="padding: 3px;">${formatDate(detailedInvoice.invoice_date)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Challan No</td>
                  <td style="padding: 3px;">${detailedInvoice.challan_no || '33'}</td>
                  <td style="padding: 3px; font-weight: bold;">Challan Date</td>
                  <td style="padding: 3px;">${formatDate(invoice.challan_date || invoice.invoice_date)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">E-Way Bill No.</td>
                  <td style="padding: 3px;">${detailedInvoice.eway_bill_no || '78456378'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Transport</td>
                  <td style="padding: 3px;">${detailedInvoice.transport || 'Self Transport'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Transport ID</td>
                  <td style="padding: 3px;">${detailedInvoice.transport_id || '24ABSF'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
              </table>
            </div>
          </div>

          <!-- ADVANCED: SEPARATE TABLES FOR SERVICES & PARTS -->
          ${(() => {
            console.log('📋 Invoice items debug:', detailedInvoice.items);
            console.log('📋 Total items count:', detailedInvoice.items?.length || 0);

            const services = detailedInvoice.items?.filter(item =>
              item.item_type === 'service' || item.type === 'service'
            ) || [];
            const parts = detailedInvoice.items?.filter(item =>
              item.item_type === 'part' || item.type === 'part'
            ) || [];

            console.log('🔧 Services found:', services.length, services);
            console.log('🔩 Parts found:', parts.length, parts);

            // MEMORY EFFICIENT HTML BUILDING
            const htmlParts = []; // Use array for better memory performance

            // TRADITIONAL SERVICES TABLE
            htmlParts.push(`
              <!-- Traditional Services Table -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 10px; font-size: 11px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Sr.No</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">Service Description</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">HSN/SAC</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Qty</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Rate</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Amount</th>
                    ${detailedInvoice.gst_enabled ? `
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Tax %</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tax Amt</th>` : ''}
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Total</th>
                  </tr>
                </thead>
                <tbody>`);

            if (services.length > 0) {
              services.forEach((service, index) => {
                const rate = service.rate || service.unit_price || 0;
                const quantity = service.quantity || 1;
                const amount = rate * quantity;
                const taxPercent = detailedInvoice.gst_enabled ? (detailedInvoice.tax_rate || 0) : 0;
                const taxAmount = detailedInvoice.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;

                htmlParts.push(`
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #000; padding: 3px;">${service.name || 'Car Service Package'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${service.hsn_sac || service.hsn_code || '9986'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${quantity}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(rate)}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(amount)}</td>
                    ${detailedInvoice.gst_enabled ? `
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${taxPercent}%</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(taxAmount)}</td>` : ''}
                    <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: bold;">₹${formatNumber(total)}</td>
                  </tr>`);
              });
            } else {
              htmlParts.push(`
                <tr>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;">1</td>
                  <td style="border: 1px solid #000; padding: 3px;">Car Service Package</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;">9986</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;">1</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹0.00</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹0.00</td>
                  ${detailedInvoice.gst_enabled ? `
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;">${detailedInvoice.tax_rate || 0}%</td>
                  <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹0.00</td>` : ''}
                  <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: bold;">₹0.00</td>
                </tr>`);
            }

            htmlParts.push(`
                </tbody>
              </table>`);

            // Add empty row for spacing
            htmlParts.push(`<div style="height: 10px;"></div>`);

            // TRADITIONAL PARTS TABLE
            htmlParts.push(`
              <!-- Traditional Parts Table -->
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 10px; font-size: 11px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Sr.No</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: left; font-weight: bold;">Part Description</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">HSN/SAC</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Qty</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Rate</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Amount</th>
                    ${detailedInvoice.gst_enabled ? `
                    <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">Tax %</th>
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Tax Amt</th>` : ''}
                    <th style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">Total</th>
                  </tr>
                </thead>
                <tbody>`);

            if (parts.length > 0) {
              parts.forEach((part, index) => {
                const rate = part.rate || part.unit_price || 0;
                const quantity = part.quantity || 1;
                const amount = rate * quantity;
                const taxPercent = detailedInvoice.gst_enabled ? (detailedInvoice.tax_rate || 0) : 0;
                const taxAmount = detailedInvoice.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;

                htmlParts.push(`
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #000; padding: 3px;">${part.name || 'Auto Part'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${part.hsn_sac || part.hsn_code || '8708'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${quantity}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(rate)}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(amount)}</td>
                    ${detailedInvoice.gst_enabled ? `
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${taxPercent}%</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(taxAmount)}</td>` : ''}
                    <td style="border: 1px solid #000; padding: 3px; text-align: right; font-weight: bold;">₹${formatNumber(total)}</td>
                  </tr>`);
              });
            }

            htmlParts.push(`
                </tbody>
              </table>`);

            // COMBINED SUMMARY (if both services and parts exist)
            if (services.length > 0 && parts.length > 0) {
              const servicesTotal = services.reduce((sum, service) => sum + (service.total || 0), 0);
              const partsTotal = parts.reduce((sum, part) => sum + (part.total || 0), 0);
              htmlParts.push(`
              <div style="margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">📊 WORK SUMMARY</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px;">
                  <div>
                    <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                      <span>🔧 Services (${services.length} items):</span>
                      <span style="font-weight: bold;">₹${formatNumber(servicesTotal)}</span>
                    </p>
                    <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                      <span>🔩 Parts (${parts.length} items):</span>
                      <span style="font-weight: bold;">₹${formatNumber(partsTotal)}</span>
                    </p>
                  </div>
                  <div>
                    <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                      <span>📋 Total Items:</span>
                      <span style="font-weight: bold;">${services.length + parts.length}</span>
                    </p>
                    <p style="margin: 3px 0; display: flex; justify-content: space-between; border-top: 1px solid #d1d5db; padding-top: 3px;">
                      <span style="font-weight: bold;">💰 Subtotal:</span>
                      <span style="font-weight: bold; color: #059669;">₹${formatNumber(servicesTotal + partsTotal)}</span>
                    </p>
                  </div>
                </div>
              </div>`);
            }

            // FALLBACK: If no items at all
            if (services.length === 0 && parts.length === 0) {
              console.log('⚠️ No services or parts found in invoice items');
              htmlParts.length = 0; // Clear array
              htmlParts.push(`
              <div style="margin-bottom: 30px; text-align: center; padding: 30px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">📋 No services or parts added to this invoice</p>
              </div>`);
            }

            // Join array efficiently and return
            const result = htmlParts.join('');
            htmlParts.length = 0; // Clear array to free memory
            return result;
          })()}

          <!-- Traditional Totals Section -->
          <div style="display: flex; border: 1px solid #000; margin-bottom: 10px;">
            <!-- Left: Total in Words -->
            <div style="flex: 1; border-right: 1px solid #000; padding: 10px;">
              <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">Total in words:</p>
              <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                RUPEES ${(() => {
                  const amount = Math.floor(detailedInvoice.total_amount || 0);
                  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
                  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

                  function convertToWords(num) {
                    if (num === 0) return 'ZERO';
                    if (num < 20) return ones[num];
                    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
                    if (num < 1000) return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 ? ' ' + convertToWords(num % 100) : '');
                    if (num < 100000) return convertToWords(Math.floor(num / 1000)) + ' THOUSAND' + (num % 1000 ? ' ' + convertToWords(num % 1000) : '');
                    if (num < 10000000) return convertToWords(Math.floor(num / 100000)) + ' LAKH' + (num % 100000 ? ' ' + convertToWords(num % 100000) : '');
                    return convertToWords(Math.floor(num / 10000000)) + ' CRORE' + (num % 10000000 ? ' ' + convertToWords(num % 10000000) : '');
                  }

                  return convertToWords(amount);
                })()} ONLY
              </p>
            </div>

            <!-- Right: Traditional Totals Table -->
            <div style="flex: 1; padding: 10px;">
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Taxable Amount</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(detailedInvoice.taxable_amount || 0)}</td>
                </tr>
                ${detailedInvoice.gst_enabled && invoice.cgst_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">CGST @ ${detailedInvoice.cgst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(invoice.cgst_amount || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">SGST @ ${detailedInvoice.sgst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(invoice.sgst_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedInvoice.igst_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">IGST @ ${detailedInvoice.igst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(invoice.igst_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedInvoice.discount_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Discount</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">-₹${formatNumber(invoice.discount_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedInvoice.round_off !== 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Round Off</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">${detailedInvoice.round_off >= 0 ? '+' : ''}₹${formatNumber(invoice.round_off || 0)}</td>
                </tr>
                ` : ''}
                <tr style="background: #f8f9fa;">
                  <td style="padding: 8px; font-weight: bold; border-top: 2px solid #000;">Total Amount</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #000;">₹${formatNumber(invoice.total_amount || 0)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Notes Section (if any) -->
          ${detailedInvoice.notes ? `
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px;">
            <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Notes:</p>
            <p style="margin: 0; font-size: 10px;">${detailedInvoice.notes}</p>
          </div>
          ` : ''}

          <!-- Insurance/Warranty badges -->
          ${detailedInvoice.insurance_claim || invoice.warranty_applicable ? `
          <div style="margin-bottom: 8px; text-align: center;">
            ${detailedInvoice.insurance_claim ? '<span style="background: #fee2e2; color: #dc2626; padding: 6px 10px; border: 1px solid #dc2626; margin: 0 3px; font-size: 10px; font-weight: bold;">INSURANCE CLAIM</span>' : ''}
            ${detailedInvoice.warranty_applicable ? '<span style="background: #dcfce7; color: #166534; padding: 6px 10px; border: 1px solid #166534; margin: 0 3px; font-size: 10px; font-weight: bold;">WARRANTY APPLICABLE</span>' : ''}
          </div>
          ` : ''}

          <!-- QR Code and Signature Section -->
          <div style="display: flex; border: 1px solid #000; margin-bottom: 8px;">
            <!-- Left: QR Code Section -->
            <div style="flex: 1; border-right: 1px solid #000; padding: 8px; text-align: center;">
              <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Scan QR Code to Verify Invoice</p>
              ${qrCodeDataUrl ? `
                <img src="${qrCodeDataUrl}" alt="Invoice Verification QR Code" style="width: 70px; height: 70px; margin: 0 auto; border: 1px solid #000;" />
              ` : `
                <div style="width: 70px; height: 70px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 10px; background: #f8f9fa;">
                  QR CODE
                </div>
              `}
              <p style="margin: 3px 0 0 0; font-size: 8px;">Invoice #${detailedInvoice.invoice_number || 'N/A'}</p>
              <p style="margin: 1px 0 0 0; font-size: 7px; color: #666;">Verify at: ${window.location.origin}/verify-invoice</p>
            </div>

            <!-- Middle: Customer Signature -->
            <div style="flex: 1; border-right: 1px solid #000; padding: 8px; text-align: center;">
              <div style="height: 45px; margin-bottom: 5px;"></div>
              <div style="border-top: 1px solid #000; padding-top: 3px;">
                <p style="margin: 0; font-size: 10px; font-weight: bold;">Customer Signature</p>
              </div>
            </div>

            <!-- Right: Authorized Signatory -->
            <div style="flex: 1; padding: 8px; text-align: center;">
              <div style="height: 45px; margin-bottom: 5px;"></div>
              <div style="border-top: 1px solid #000; padding-top: 3px;">
                <p style="margin: 0; font-size: 10px; font-weight: bold;">Authorized Signatory</p>
                <p style="margin: 1px 0 0 0; font-size: 8px; color: #666;">for OM MURUGAN AUTO WORKS</p>
              </div>
            </div>
          </div>

          <!-- Business Information Footer -->
          <div style="border: 1px solid #000; padding: 6px; background: #f8f9fa;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <!-- Left: Business Info -->
              <div style="text-align: left; font-size: 8px; line-height: 1.3;">
                <p style="margin: 0; font-weight: bold;">OM MURUGAN AUTO WORKS</p>
                <p style="margin: 1px 0;">PAN: 26CORPP3939N1 | GSTIN: 33AABBA7890B1ZW</p>
                <p style="margin: 1px 0;">Bank: Indian Bank, A/c: 6789012345 | IFSC: IDIB000C123</p>
                <p style="margin: 1px 0;">All disputes subject to Chennai jurisdiction only</p>
              </div>

              <!-- Center: Thank You -->
              <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
                <p style="margin: 0; font-size: 11px; font-weight: bold; color: #20b2aa;">
                  Thank you for choosing OM MURUGAN AUTO WORKS
                </p>
                <p style="margin: 1px 0; font-size: 9px;">
                  Complete Multibrand Auto Care Services
                </p>
              </div>

              <!-- Right: Contact Info -->
              <div style="text-align: right; font-size: 8px; line-height: 1.3;">
                <p style="margin: 0; font-weight: bold;">Contact Information</p>
                <p style="margin: 1px 0;">Emergency: +91 98765 43210</p>
                <p style="margin: 1px 0;">Email: contact@ommunruganworks.com</p>
                <p style="margin: 1px 0;">Web: www.ommunruganworks.com</p>
              </div>
            </div>
          </div>

        </div>
      `;

      document.body.appendChild(pdfContent);

      // SPACE OPTIMIZED PDF GENERATION
      const totalItems = detailedInvoice.items?.length || 0;
      console.log(`📊 Generating PDF for ${totalItems} items...`);

      // Memory-efficient canvas settings based on item count
      let canvasScale = 2;
      let imageQuality = 0.95;

      if (totalItems > 50) {
        canvasScale = 1.2; // Very low scale for huge invoices
        imageQuality = 0.85;
      } else if (totalItems > 25) {
        canvasScale = 1.4; // Low scale for large invoices
        imageQuality = 0.9;
      } else if (totalItems > 15) {
        canvasScale = 1.6; // Reduced scale for medium invoices
        imageQuality = 0.92;
      }

      console.log(`🎯 Space optimization: Scale=${canvasScale}, Quality=${imageQuality} for ${totalItems} items`);

      const canvas = await html2canvas(pdfContent, {
        scale: canvasScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: pdfContent.scrollHeight,
        width: pdfContent.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        logging: false, // Disable logging to save memory
        removeContainer: true // Clean up immediately
      });

      const imgData = canvas.toDataURL('image/png', imageQuality);
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Page dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      console.log(`📄 PDF dimensions: ${imgWidth}mm x ${Math.round(imgHeight)}mm (${Math.ceil(imgHeight / pageHeight)} pages needed)`);

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed (for 20+ items)
      let pageNumber = 1;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
        console.log(`➕ Adding page ${pageNumber} for large invoice...`);
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      console.log(`✅ PDF complete: ${pageNumber} page(s) generated`);

      // Add footer with page numbers if multi-page
      if (pageNumber > 1) {
        for (let i = 1; i <= pageNumber; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(128, 128, 128);
          pdf.text(`Page ${i} of ${pageNumber} | ${totalItems} items`, 200, 285, { align: 'right' });
        }
      }

      // ENHANCED MEMORY CLEANUP
      try {
        // Remove DOM element immediately
        document.body.removeChild(pdfContent);

        // Clear canvas context to free GPU memory
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Set canvas size to 1x1 to free memory
        canvas.width = 1;
        canvas.height = 1;

        console.log('🧹 Memory cleanup completed');
      } catch (cleanupError) {
        console.warn('⚠️ Memory cleanup warning:', cleanupError);
      }

      // Download PDF
      const fileName = `Invoice_${detailedInvoice.invoice_number || invoice.id || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      console.log('✅ PDF generated successfully:', fileName);

      // Force garbage collection hint (if available)
      if (window.gc) {
        window.gc();
        console.log('♻️ Garbage collection triggered');
      }

    } catch (error: any) {
      console.error('❌ Error generating PDF:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      console.error('❌ Invoice data:', invoice);

      logger.logUserAction('PDF_GENERATION_ERROR', `invoice:${invoice.id}`, {
        invoice_number: invoice.invoice_number,
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack
      });

      // More specific error message
      let errorMessage = 'Error generating PDF. Please try again.';
      if (error.message) {
        errorMessage += '\nDetails: ' + error.message;
      }
      if (error.name === 'TypeError') {
        errorMessage += '\nThis might be a data formatting issue.';
      }

      alert(errorMessage);
    }
  };

  return (
    <button
      onClick={generatePDF}
      className={`inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 active:scale-95 transform transition-all duration-200 shadow-lg hover:shadow-xl border border-teal-400 ${className}`}
      title="Download PDF Invoice"
    >
      <FileDown className="w-5 h-5" />
      Download PDF
    </button>
  );
};

export default PDFInvoice;