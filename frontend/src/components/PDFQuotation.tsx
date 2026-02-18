import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { FileDown } from 'lucide-react';

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

const formatNumber = (value: number): string => {
  return isNaN(value) ? '0.00' : value.toFixed(2);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN');
};

const PDFQuotation: React.FC<PDFQuotationProps> = ({ quotation, className = '' }) => {
  const generatePDF = async () => {
    try {
      console.log('🚀 Generating PDF for quotation:', quotation.quotation_number);

      // Fetch detailed quotation data with items
      let detailedQuotation = quotation;
      if (!detailedQuotation.items || detailedQuotation.items.length === 0) {
        console.log('📋 Fetching detailed quotation data with items...');
        try {
          const token = localStorage.getItem('access_token');
          const headers: any = {
            'Content-Type': 'application/json'
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Direct backend call to bypass proxy issues
          const response = await fetch(`http://localhost:8000/api/quotations/${detailedQuotation.id}/test`, {
            headers
          });

          if (response.ok) {
            detailedQuotation = await response.json();
            console.log('✅ Detailed quotation fetched:', detailedQuotation);
            console.log('📋 Items found:', detailedQuotation.items?.length || 0);
            console.log('🏢 Client data:', detailedQuotation.client);
            console.log('🚗 Vehicle data:', detailedQuotation.vehicle);
          } else {
            console.warn('⚠️ Failed to fetch detailed quotation. Status:', response.status);
            console.warn('⚠️ Response:', await response.text());
          }
        } catch (error) {
          console.warn('⚠️ Error fetching detailed quotation:', error);
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

      // PDF HTML content - Traditional Quotation Format (copied from invoice)
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

          <!-- PAN and Quotation Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; border-bottom: 1px solid #000; background: #f8f9fa;">
            <div style="font-size: 12px; font-weight: bold;">
              PAN : 26CORPP3939N1
            </div>
            <div style="text-align: center; flex-grow: 1;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold;">QUOTATION</h2>
            </div>
            <div style="font-size: 11px; font-weight: bold;">
              ORIGINAL FOR CLIENT
            </div>
          </div>

          <!-- Traditional Customer & Vehicle Details Section -->
          <div style="display: flex; border-bottom: 1px solid #000;">
            <!-- Left Column - Customer & Vehicle Details -->
            <div style="flex: 1; padding: 8px; border-right: 1px solid #000;">
              <h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; background: #f8f9fa; padding: 3px; border: 1px solid #000;">
                Customer & Vehicle Details
              </h3>

              ${detailedQuotation.client ? `
                <p style="margin: 2px 0; font-size: 11px;"><strong>M/S</strong> ${detailedQuotation.client.name || 'N/A'}</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Address</strong> ${detailedQuotation.client.address || 'N/A'}</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Phone</strong> ${detailedQuotation.client.mobile || quotation.client.phone || 'N/A'}</p>
              ` : `
                <p style="margin: 2px 0; font-size: 11px;"><strong>M/S</strong> Customer Details Not Available</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Address</strong> N/A</p>
                <p style="margin: 2px 0; font-size: 11px;"><strong>Phone</strong> N/A</p>
              `}

              <div style="margin-top: 8px;">
                <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">Vehicle Details:</p>
                ${detailedQuotation.vehicle ? `
                  <p style="margin: 2px 0; font-size: 11px;">Vehicle No: ${detailedQuotation.vehicle.registration_number || 'N/A'}</p>
                  <p style="margin: 2px 0; font-size: 11px;">Make/Model: ${detailedQuotation.vehicle.brand_name || 'N/A'} ${detailedQuotation.vehicle.model_name || 'N/A'}</p>
                ` : `
                  <p style="margin: 2px 0; font-size: 11px;">Vehicle No: N/A</p>
                  <p style="margin: 2px 0; font-size: 11px;">Make/Model: N/A</p>
                `}
                <p style="margin: 2px 0; font-size: 11px;">GSTIN: ${detailedQuotation.client?.gst_number || '32AABBA7890B1ZB'}</p>
              </div>
            </div>

            <!-- Right Column - Quotation Details -->
            <div style="flex: 1; padding: 8px;">
              <p style="margin: 5px 0; font-size: 12px;">Place of Supply: ${detailedQuotation.place_of_supply || 'Tamil Nadu (33)'}</p>

              <table style="width: 100%; margin-top: 15px; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Quotation No.</td>
                  <td style="padding: 3px;">${detailedQuotation.quotation_number || 'N/A'}</td>
                  <td style="padding: 3px; font-weight: bold;">Quotation Date</td>
                  <td style="padding: 3px;">${formatDate(detailedQuotation.quotation_date)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Valid Until</td>
                  <td style="padding: 3px;">${formatDate(detailedQuotation.valid_until || '')}</td>
                  <td style="padding: 3px; font-weight: bold;">Work Order</td>
                  <td style="padding: 3px;">${detailedQuotation.work_order_no || 'WO-001'}</td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Estimate No.</td>
                  <td style="padding: 3px;">${detailedQuotation.estimate_no || 'EST-001'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Technician</td>
                  <td style="padding: 3px;">${detailedQuotation.technician_name || 'Service Team'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
                <tr>
                  <td style="padding: 3px; font-weight: bold;">Service Type</td>
                  <td style="padding: 3px;">${detailedQuotation.service_type || 'General Service'}</td>
                  <td style="padding: 3px;"></td>
                  <td style="padding: 3px;"></td>
                </tr>
              </table>
            </div>
          </div>

          <!-- ADVANCED: SEPARATE TABLES FOR SERVICES & PARTS -->
          ${(() => {
            console.log('📋 Quotation items debug:', detailedQuotation.items);
            console.log('📋 Total items count:', detailedQuotation.items?.length || 0);

            const services = detailedQuotation.items?.filter(item =>
              item.item_type === 'service' || item.type === 'service'
            ) || [];
            const parts = detailedQuotation.items?.filter(item =>
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
                    ${detailedQuotation.gst_enabled ? `
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
                const taxPercent = detailedQuotation.gst_enabled ? (detailedQuotation.tax_rate || 0) : 0;
                const taxAmount = detailedQuotation.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;

                htmlParts.push(`
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #000; padding: 3px;">${service.name || 'Car Service Package'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${service.hsn_sac || service.hsn_code || '9986'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${quantity}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(rate)}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(amount)}</td>
                    ${detailedQuotation.gst_enabled ? `
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
                  ${detailedQuotation.gst_enabled ? `
                  <td style="border: 1px solid #000; padding: 3px; text-align: center;">${detailedQuotation.tax_rate || 0}%</td>
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
                    ${detailedQuotation.gst_enabled ? `
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
                const taxPercent = detailedQuotation.gst_enabled ? (detailedQuotation.tax_rate || 0) : 0;
                const taxAmount = detailedQuotation.gst_enabled ? (amount * taxPercent / 100) : 0;
                const total = amount + taxAmount;

                htmlParts.push(`
                  <tr>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${index + 1}</td>
                    <td style="border: 1px solid #000; padding: 3px;">${part.name || 'Auto Part'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${part.hsn_sac || part.hsn_code || '8708'}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: center;">${quantity}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(rate)}</td>
                    <td style="border: 1px solid #000; padding: 3px; text-align: right;">₹${formatNumber(amount)}</td>
                    ${detailedQuotation.gst_enabled ? `
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
                <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">📊 QUOTATION SUMMARY</h4>
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
              console.log('⚠️ No services or parts found in quotation items');
              htmlParts.length = 0; // Clear array
              htmlParts.push(`
              <div style="margin-bottom: 30px; text-align: center; padding: 30px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">📋 No services or parts added to this quotation</p>
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
              <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">Quoted Amount in words:</p>
              <p style="margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase;">
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
              </p>
            </div>

            <!-- Right: Traditional Totals Table -->
            <div style="flex: 1; padding: 10px;">
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Taxable Amount</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(detailedQuotation.taxable_amount || 0)}</td>
                </tr>
                ${detailedQuotation.gst_enabled && quotation.cgst_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">CGST @ ${detailedQuotation.cgst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(quotation.cgst_amount || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">SGST @ ${detailedQuotation.sgst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(quotation.sgst_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedQuotation.igst_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">IGST @ ${detailedQuotation.igst_rate}%</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">₹${formatNumber(quotation.igst_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedQuotation.discount_amount > 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Discount</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">-₹${formatNumber(quotation.discount_amount || 0)}</td>
                </tr>
                ` : ''}
                ${detailedQuotation.round_off !== 0 ? `
                <tr>
                  <td style="padding: 3px 8px; border-bottom: 1px solid #ddd;">Round Off</td>
                  <td style="padding: 3px 8px; text-align: right; border-bottom: 1px solid #ddd;">${detailedQuotation.round_off >= 0 ? '+' : ''}₹${formatNumber(quotation.round_off || 0)}</td>
                </tr>
                ` : ''}
                <tr style="background: #f8f9fa;">
                  <td style="padding: 8px; font-weight: bold; border-top: 2px solid #000;">Quoted Amount</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; border-top: 2px solid #000;">₹${formatNumber(quotation.total_amount || 0)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Notes Section (if any) -->
          ${detailedQuotation.notes ? `
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px;">
            <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Notes:</p>
            <p style="margin: 0; font-size: 10px;">${detailedQuotation.notes}</p>
          </div>
          ` : ''}

          <!-- Quotation Validity Notice -->
          <div style="border: 1px solid #000; padding: 8px; margin-bottom: 8px; background: #fff8dc;">
            <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #b8860b;">📝 Quotation Terms:</p>
            <p style="margin: 0; font-size: 10px; color: #8b7355;">
              • This quotation is valid until ${formatDate(detailedQuotation.valid_until || '')} or 30 days from quotation date.<br>
              • Prices are subject to change without notice after validity period.<br>
              • Work will commence only after approval and advance payment.<br>
              • All warranties as per manufacturer/company policy.
            </p>
          </div>

          <!-- Insurance/Warranty badges -->
          ${detailedQuotation.insurance_claim || quotation.warranty_applicable ? `
          <div style="margin-bottom: 8px; text-align: center;">
            ${detailedQuotation.insurance_claim ? '<span style="background: #fee2e2; color: #dc2626; padding: 6px 10px; border: 1px solid #dc2626; margin: 0 3px; font-size: 10px; font-weight: bold;">INSURANCE WORK</span>' : ''}
            ${detailedQuotation.warranty_applicable ? '<span style="background: #dcfce7; color: #166534; padding: 6px 10px; border: 1px solid #166534; margin: 0 3px; font-size: 10px; font-weight: bold;">WARRANTY WORK</span>' : ''}
          </div>
          ` : ''}

          <!-- QR Code and Signature Section -->
          <div style="display: flex; border: 1px solid #000; margin-bottom: 8px;">
            <!-- Left: QR Code Section -->
            <div style="flex: 1; border-right: 1px solid #000; padding: 8px; text-align: center;">
              <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Scan QR Code to Verify Quotation</p>
              ${qrCodeDataUrl ? `
                <img src="${qrCodeDataUrl}" alt="Quotation Verification QR Code" style="width: 70px; height: 70px; margin: 0 auto; border: 1px solid #000;" />
              ` : `
                <div style="width: 70px; height: 70px; border: 1px solid #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 10px; background: #f8f9fa;">
                  QR CODE
                </div>
              `}
              <p style="margin: 3px 0 0 0; font-size: 8px;">Quotation #${detailedQuotation.quotation_number || 'N/A'}</p>
              <p style="margin: 1px 0 0 0; font-size: 7px; color: #666;">Verify at: ${window.location.origin}/verify-quotation</p>
            </div>

            <!-- Middle: Customer Approval -->
            <div style="flex: 1; border-right: 1px solid #000; padding: 8px; text-align: center;">
              <div style="height: 45px; margin-bottom: 5px;"></div>
              <div style="border-top: 1px solid #000; padding-top: 3px;">
                <p style="margin: 0; font-size: 10px; font-weight: bold;">Customer Approval</p>
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
                  Thank you for considering OM MURUGAN AUTO WORKS
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
      const totalItems = detailedQuotation.items?.length || 0;
      console.log(`📊 Generating PDF for ${totalItems} items...`);

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
        console.log(`➕ Adding page ${pageNumber} for large quotation...`);
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
      const fileName = `Quotation_${detailedQuotation.quotation_number || quotation.id || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      console.log('✅ PDF generated successfully:', fileName);

      // Force garbage collection hint (if available)
      if (window.gc) {
        window.gc();
        console.log('♻️ Garbage collection triggered');
      }

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
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