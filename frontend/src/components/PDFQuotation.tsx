import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { FileDown } from 'lucide-react';
import { API_CONFIG } from '../config/api';
import { getStoredCompanySettings } from '../hooks/useCompanySettings';
import { useToast } from './UI/Toast';

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

const formatNumber = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined) return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN');
};

const PDFQuotation: React.FC<PDFQuotationProps> = ({ quotation, className = '' }) => {
  const toast = useToast();
  const generatePDF = async () => {
    try {

      // Load company settings
      const co = getStoredCompanySettings();

      // Always fetch full quotation data from enriched endpoint (includes client, vehicle, items)
      let detailedQuotation: any = quotation;
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(API_CONFIG.buildEndpoint(`/api/quotations/${(quotation as any).id}`), { headers });

        if (response.ok) {
          const freshData = await response.json();
          // MERGE — don't replace! Keep original props, override with fresh data
          detailedQuotation = { ...quotation, ...freshData };
        } else {
        }
      } catch (error) {
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
        }
      } catch (logoError) {
      }

      // Generate QR Code for quotation verification
      let qrCodeDataUrl = '';
      try {
        const verificationUrl = `${window.location.origin}/verify-quotation/${detailedQuotation.id || quotation.id}`;
        qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 100,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (qrError) {
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

      // PDF HTML content - PREMIUM Quotation Format
      pdfContent.innerHTML = `
        <div style="max-width: 794px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff;">

          <!-- TOP ACCENT STRIPE -->
          <div style="height: 5px; background: linear-gradient(90deg, #0f172a 0%, #065f46 45%, #10b981 75%, #34d399 100%);"></div>

          <!-- PREMIUM DARK HEADER -->
          <div style="background: #0f172a; padding: 22px 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <!-- Left: Logo + Company Info -->
              <div style="display: flex; align-items: center; gap: 18px;">
                ${logoDataUrl ? `
                  <img src="${logoDataUrl}" alt="Logo" style="height: 70px; width: auto; border-radius: 10px; border: 2px solid #334155; object-fit: contain;" />
                ` : ''}
                <div>
                  <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 1px; text-transform: uppercase; line-height: 1.1;">
                    ${co.company_name}
                  </h1>
                  <p style="margin: 5px 0 0 0; font-size: 10px; color: #64748b; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">
                    Complete Multibrand Auto Care Services
                  </p>
                  <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">${co.address}</p>
                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">GST: ${co.gst_number}&nbsp;&nbsp;|&nbsp;&nbsp;PAN: ${co.pan_number}</p>
                </div>
              </div>
              <!-- Right: Contact Info -->
              <div style="text-align: right;">
                <div style="font-size: 9px; font-weight: 800; color: #34d399; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Contact</div>
                <div style="font-size: 11px; color: #cbd5e1; line-height: 2;">
                  <div>&#128222; ${co.phone}</div>
                  <div>&#9993; ${co.email}</div>
                  <div>&#127760; ${co.website}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- DOCUMENT TITLE BAR - Green for Quotation -->
          <div style="background: #065f46; display: flex; justify-content: space-between; align-items: center; padding: 11px 28px;">
            <span style="font-size: 10px; font-weight: 700; color: #a7f3d0; letter-spacing: 0.5px;">PAN: ${co.pan_number}</span>
            <span style="font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 5px;">QUOTATION</span>
            <span style="font-size: 10px; font-weight: 700; color: #a7f3d0; letter-spacing: 0.5px;">ORIGINAL FOR CLIENT</span>
          </div>

          <!-- BILL TO + QUOTATION DETAILS -->
          <div style="display: flex; border-bottom: 2px solid #e2e8f0;">
            <!-- Customer + Vehicle -->
            <div style="flex: 1; padding: 18px 22px; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 2px solid #065f46; padding-bottom: 5px; margin-bottom: 10px;">Bill To</div>
              <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">${detailedQuotation.client?.name || 'N/A'}</div>
              <div style="font-size: 11px; color: #475569;">${detailedQuotation.client?.address || ''}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">Ph: ${detailedQuotation.client?.mobile || detailedQuotation.client?.phone || 'N/A'}</div>
              ${detailedQuotation.client?.gst_number ? `<div style="font-size: 10px; color: #64748b; margin-top: 3px;">GSTIN: ${detailedQuotation.client.gst_number}</div>` : ''}

              <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Vehicle</div>
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                  <tr><td style="color: #64748b; padding: 3px 0; width: 44%;">Registration No.</td><td style="font-weight: 700; color: #0f172a; padding: 3px 0;">${detailedQuotation.vehicle?.registration_number || 'N/A'}</td></tr>
                  <tr><td style="color: #64748b; padding: 3px 0;">Make / Model</td><td style="font-weight: 600; color: #0f172a; padding: 3px 0;">${detailedQuotation.vehicle?.brand_name || ''} ${detailedQuotation.vehicle?.model_name || ''}</td></tr>
                  ${detailedQuotation.vehicle?.color ? `<tr><td style="color: #64748b; padding: 3px 0;">Color</td><td style="font-weight: 600; color: #0f172a; padding: 3px 0;">${detailedQuotation.vehicle.color}</td></tr>` : ''}
                </table>
              </div>
            </div>

            <!-- Quotation Meta -->
            <div style="flex: 1; padding: 18px 22px; background: #f0fdf4;">
              <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase; border-bottom: 2px solid #065f46; padding-bottom: 5px; margin-bottom: 10px;">Quotation Details</div>
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; padding: 4px 0; font-weight: 600; width: 44%;">Quotation No.</td>
                  <td style="font-weight: 800; color: #065f46; font-size: 13px; padding: 4px 0;">${detailedQuotation.quotation_number || 'N/A'}</td>
                </tr>
                <tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Quotation Date</td><td style="color: #0f172a; padding: 3px 0;">${formatDate(detailedQuotation.quotation_date)}</td></tr>
                ${detailedQuotation.valid_until ? `<tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Valid Until</td><td style="color: #ef4444; font-weight: 700; padding: 3px 0;">${formatDate(detailedQuotation.valid_until)}</td></tr>` : ''}
                ${detailedQuotation.service_type ? `<tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Service Type</td><td style="color: #0f172a; padding: 3px 0;">${detailedQuotation.service_type}</td></tr>` : ''}
                ${detailedQuotation.technician_name ? `<tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Technician</td><td style="color: #0f172a; padding: 3px 0;">${detailedQuotation.technician_name}</td></tr>` : ''}
                ${detailedQuotation.work_order_no ? `<tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Work Order</td><td style="color: #0f172a; padding: 3px 0;">${detailedQuotation.work_order_no}</td></tr>` : ''}
                <tr><td style="color: #64748b; padding: 3px 0; font-weight: 600;">Place of Supply</td><td style="color: #0f172a; padding: 3px 0;">${detailedQuotation.place_of_supply || 'Tamil Nadu (33)'}</td></tr>
              </table>
            </div>
          </div>

          <!-- PREMIUM ITEMS SECTION -->
          <div style="padding: 0 0 4px 0;">
          ${(() => {

            const services = detailedQuotation.items?.filter(item =>
              item.item_type === 'service' || item.type === 'service'
            ) || [];
            const parts = detailedQuotation.items?.filter(item =>
              item.item_type === 'part' || item.type === 'part'
            ) || [];


            const htmlParts = [];

            // PREMIUM SERVICES TABLE
            htmlParts.push(`
              <div style="background: #f0fdf4; padding: 7px 22px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; background: #065f46; border-radius: 50%; display: inline-block;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase;">Services</span>
              </div>
              <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #065f46; color: #ffffff;">
                    <th style="padding: 9px 10px; text-align: center; font-weight: 700; width: 36px;">Sr.</th>
                    <th style="padding: 9px 12px; text-align: left; font-weight: 700;">Service Description</th>
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">HSN/SAC</th>
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">Qty</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Rate</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Amount</th>
                    ${detailedQuotation.gst_enabled ? `
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">Tax %</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Tax Amt</th>` : ''}
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Total</th>
                  </tr>
                </thead>
                <tbody>`);

            if (services.length > 0) {
              services.forEach((service, index) => {
                const rate = service.rate || service.unit_price || 0;
                const quantity = service.quantity || 1;
                const amount = rate * quantity;
                const taxPercent = detailedQuotation.gst_enabled ? (detailedQuotation.tax_rate || 0) : 0;
                const taxAmount = detailedQuotation.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;
                const rowBg = index % 2 === 0 ? '#f0fdf4' : '#ffffff';

                htmlParts.push(`
                  <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 10px; text-align: center; color: #64748b; font-size: 11px;">${index + 1}</td>
                    <td style="padding: 8px 12px; font-weight: 600; color: #0f172a; font-size: 11px;">${service.name || 'Service'}</td>
                    <td style="padding: 8px 8px; text-align: center; color: #64748b; font-size: 11px;">${service.hsn_sac || service.hsn_code || '9986'}</td>
                    <td style="padding: 8px 8px; text-align: center; color: #0f172a; font-size: 11px;">${quantity}</td>
                    <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(rate)}</td>
                    <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(amount)}</td>
                    ${detailedQuotation.gst_enabled ? `
                    <td style="padding: 8px 8px; text-align: center; color: #64748b; font-size: 11px;">${taxPercent}%</td>
                    <td style="padding: 8px 10px; text-align: right; color: #64748b; font-size: 11px;">&#8377;${formatNumber(taxAmount)}</td>` : ''}
                    <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(total)}</td>
                  </tr>`);
              });
            } else {
              htmlParts.push(`
                <tr style="background: #f0fdf4;"><td colspan="${detailedQuotation.gst_enabled ? 9 : 7}" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic;">No services added</td></tr>`);
            }

            htmlParts.push(`</tbody></table></div>`);

            // PREMIUM PARTS TABLE
            htmlParts.push(`
              <div style="background: #f0fdf4; padding: 7px 22px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                <span style="font-size: 10px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase;">Parts &amp; Materials</span>
              </div>
              <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background: #047857; color: #ffffff;">
                    <th style="padding: 9px 10px; text-align: center; font-weight: 700; width: 36px;">Sr.</th>
                    <th style="padding: 9px 12px; text-align: left; font-weight: 700;">Part Description</th>
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">HSN/SAC</th>
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">Qty</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Rate</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Amount</th>
                    ${detailedQuotation.gst_enabled ? `
                    <th style="padding: 9px 8px; text-align: center; font-weight: 700;">Tax %</th>
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Tax Amt</th>` : ''}
                    <th style="padding: 9px 10px; text-align: right; font-weight: 700;">Total</th>
                  </tr>
                </thead>
                <tbody>`);

            if (parts.length > 0) {
              parts.forEach((part, index) => {
                const rate = part.rate || part.unit_price || 0;
                const quantity = part.quantity || 1;
                const amount = rate * quantity;
                const taxPercent = detailedQuotation.gst_enabled ? (detailedQuotation.tax_rate || 0) : 0;
                const taxAmount = detailedQuotation.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;
                const rowBg = index % 2 === 0 ? '#f0fdf4' : '#ffffff';

                htmlParts.push(`
                  <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px 10px; text-align: center; color: #64748b; font-size: 11px;">${index + 1}</td>
                    <td style="padding: 8px 12px; font-weight: 600; color: #0f172a; font-size: 11px;">${part.name || 'Auto Part'}</td>
                    <td style="padding: 8px 8px; text-align: center; color: #64748b; font-size: 11px;">${part.hsn_sac || part.hsn_code || '8708'}</td>
                    <td style="padding: 8px 8px; text-align: center; color: #0f172a; font-size: 11px;">${quantity}</td>
                    <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(rate)}</td>
                    <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(amount)}</td>
                    ${detailedQuotation.gst_enabled ? `
                    <td style="padding: 8px 8px; text-align: center; color: #64748b; font-size: 11px;">${taxPercent}%</td>
                    <td style="padding: 8px 10px; text-align: right; color: #64748b; font-size: 11px;">&#8377;${formatNumber(taxAmount)}</td>` : ''}
                    <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #0f172a; font-size: 11px;">&#8377;${formatNumber(total)}</td>
                  </tr>`);
              });
            } else {
              htmlParts.push(`
                <tr style="background: #f0fdf4;"><td colspan="${detailedQuotation.gst_enabled ? 9 : 7}" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; font-style: italic;">No parts added</td></tr>`);
            }

            htmlParts.push(`</tbody></table></div>`);

            // FALLBACK: If no items at all
            if (services.length === 0 && parts.length === 0) {
              htmlParts.length = 0;
              htmlParts.push(`
              <div style="margin: 0; text-align: center; padding: 32px; background: #f0fdf4; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                <div style="font-size: 32px; margin-bottom: 8px;">&#128203;</div>
                <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 600;">No services or parts added to this quotation</p>
              </div>`);
            }

            const result = htmlParts.join('');
            htmlParts.length = 0;
            return result;
          })()}
          </div>

          <!-- PREMIUM TOTALS SECTION -->
          <div style="display: flex; border-top: 2px solid #065f46; border-bottom: 1px solid #e2e8f0;">
            <!-- Left: Amount in Words + Terms -->
            <div style="flex: 1; padding: 16px 22px; background: #f0fdf4; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">Quoted Amount in Words</div>
              <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; line-height: 1.6;">
                RUPEES ${(() => {
                  const amount = Math.floor(detailedQuotation.total_amount || 0);
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
              </div>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #a7f3d0;">
                <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px;">Terms</div>
                <div style="font-size: 10px; color: #475569; line-height: 1.6;">
                  &#x2022; Valid until ${formatDate(detailedQuotation.valid_until || '')} or 30 days from issue<br>
                  &#x2022; Work commences after approval &amp; advance payment<br>
                  &#x2022; Prices subject to change after validity period
                </div>
              </div>
              ${detailedQuotation.notes ? `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #a7f3d0;">
                <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">Notes</div>
                <div style="font-size: 11px; color: #475569;">${detailedQuotation.notes}</div>
              </div>` : ''}
            </div>

            <!-- Right: Tax Summary + Total -->
            <div style="flex: 1; padding: 16px 22px;">
              <div style="font-size: 9px; font-weight: 800; color: #065f46; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">Tax Summary</div>
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #475569;">Taxable Amount</td>
                  <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: 600;">&#8377;${formatNumber(detailedQuotation.taxable_amount || 0)}</td>
                </tr>
                ${detailedQuotation.gst_enabled && quotation.cgst_amount > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #475569;">CGST @ ${detailedQuotation.cgst_rate}%</td>
                  <td style="padding: 5px 0; text-align: right; color: #0f172a;">&#8377;${formatNumber(quotation.cgst_amount || 0)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #475569;">SGST @ ${detailedQuotation.sgst_rate}%</td>
                  <td style="padding: 5px 0; text-align: right; color: #0f172a;">&#8377;${formatNumber(quotation.sgst_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedQuotation.igst_amount > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #475569;">IGST @ ${detailedQuotation.igst_rate}%</td>
                  <td style="padding: 5px 0; text-align: right;">&#8377;${formatNumber(quotation.igst_amount || 0)}</td>
                </tr>` : ''}
                ${detailedQuotation.discount_amount > 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #16a34a;">Discount</td>
                  <td style="padding: 5px 0; text-align: right; color: #16a34a; font-weight: 600;">-&#8377;${formatNumber(quotation.discount_amount || 0)}</td>
                </tr>` : ''}
                ${detailedQuotation.round_off !== 0 ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 0; color: #475569;">Round Off</td>
                  <td style="padding: 5px 0; text-align: right; color: #0f172a;">${detailedQuotation.round_off >= 0 ? '+' : ''}&#8377;${formatNumber(quotation.round_off || 0)}</td>
                </tr>` : ''}
              </table>
              <!-- PREMIUM GREEN TOTAL BOX -->
              <div style="background: #065f46; color: #ffffff; padding: 13px 16px; margin-top: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">QUOTED AMOUNT</span>
                <span style="font-size: 18px; font-weight: 900; letter-spacing: 0.5px;">&#8377;${formatNumber(quotation.total_amount || 0)}</span>
              </div>
              ${detailedQuotation.insurance_claim || quotation.warranty_applicable ? `
              <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                ${detailedQuotation.insurance_claim ? '<span style="background: #fef2f2; color: #dc2626; padding: 4px 10px; border: 1px solid #fca5a5; border-radius: 4px; font-size: 10px; font-weight: 700;">INSURANCE WORK</span>' : ''}
                ${detailedQuotation.warranty_applicable ? '<span style="background: #f0fdf4; color: #16a34a; padding: 4px 10px; border: 1px solid #86efac; border-radius: 4px; font-size: 10px; font-weight: 700;">WARRANTY WORK</span>' : ''}
              </div>` : ''}
            </div>
          </div>

          <!-- PREMIUM SIGNATURE SECTION -->
          <div style="display: flex; border-bottom: 1px solid #e2e8f0;">
            <!-- QR Code -->
            <div style="width: 140px; padding: 16px 18px; border-right: 1px solid #e2e8f0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase;">Verify</div>
              ${qrCodeDataUrl ? `
                <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 68px; height: 68px; border: 1px solid #e2e8f0; border-radius: 4px;" />
              ` : `
                <div style="width: 68px; height: 68px; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f0fdf4;"><span style="font-size: 10px; color: #94a3b8;">QR</span></div>
              `}
              <div style="font-size: 8px; color: #94a3b8; margin-top: 5px;">${detailedQuotation.quotation_number || ''}</div>
            </div>

            <!-- Customer Approval -->
            <div style="flex: 1; padding: 16px 22px; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: flex-end;">
              <div style="height: 50px;"></div>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Customer Approval</div>
                <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Accepted &amp; Approved</div>
              </div>
            </div>

            <!-- Authorized Signatory -->
            <div style="flex: 1; padding: 16px 22px; background: #f0fdf4; display: flex; flex-direction: column; justify-content: flex-end;">
              <div style="height: 50px;"></div>
              <div style="border-top: 1px solid #cbd5e1; padding-top: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Authorized Signatory</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">for ${co.company_name}</div>
              </div>
            </div>
          </div>

          <!-- PREMIUM DARK FOOTER -->
          <div style="background: #0f172a; padding: 16px 28px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 9px; color: #64748b; line-height: 1.8;">
                <div style="color: #94a3b8; font-weight: 700; margin-bottom: 3px; text-transform: uppercase; font-size: 8px; letter-spacing: 1px;">Legal</div>
                <div>GST: ${co.gst_number} &nbsp;|&nbsp; PAN: ${co.pan_number}</div>
                <div>All disputes subject to Chennai jurisdiction only</div>
              </div>
              <div style="text-align: center; padding: 0 20px;">
                <div style="font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">Thank you for considering</div>
                <div style="font-size: 11px; font-weight: 700; color: #34d399; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">${co.company_name}</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Complete Multibrand Auto Care Services</div>
              </div>
              <div style="text-align: right; font-size: 9px; color: #64748b; line-height: 1.8;">
                <div style="color: #94a3b8; font-weight: 700; margin-bottom: 3px; text-transform: uppercase; font-size: 8px; letter-spacing: 1px;">Contact</div>
                <div>${co.phone}</div>
                <div>${co.email}</div>
                <div>${co.website}</div>
              </div>
            </div>
          </div>

          <!-- BOTTOM ACCENT STRIPE -->
          <div style="height: 4px; background: linear-gradient(90deg, #34d399, #10b981, #065f46, #0f172a);"></div>

        </div>
      `;

      document.body.appendChild(pdfContent);

      // SPACE OPTIMIZED PDF GENERATION
      const totalItems = detailedQuotation.items?.length || 0;

      // Memory-efficient canvas settings based on item count
      let canvasScale = 2;
      let imageQuality = 0.95;

      if (totalItems > 50) {
        canvasScale = 1.2; // Very low scale for huge quotations
        imageQuality = 0.85;
      } else if (totalItems > 25) {
        canvasScale = 1.4; // Low scale for large quotations
        imageQuality = 0.9;
      } else if (totalItems > 15) {
        canvasScale = 1.6; // Reduced scale for medium quotations
        imageQuality = 0.92;
      }


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


      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed (for 20+ items)
      let pageNumber = 1;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pageNumber++;
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }


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

      } catch (cleanupError) {
      }

      // Download PDF
      const fileName = `Quotation_${detailedQuotation.quotation_number || quotation.id || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);


      // Force garbage collection hint (if available)
      if (window.gc) {
        window.gc();
      }

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  return (
    <button
      onClick={generatePDF}
      className={`inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transform transition-all duration-200 shadow-lg hover:shadow-xl border border-blue-400 ${className}`}
      title="Download PDF Quotation"
    >
      <FileDown className="w-5 h-5" />
      Download Quotation PDF
    </button>
  );
};

export default PDFQuotation;