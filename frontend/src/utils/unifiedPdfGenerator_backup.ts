import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UnifiedDocumentData {
  documentType: 'quotation' | 'invoice';
  documentNumber: string;
  documentDate: string;
  dueDate?: string;
  validUntil?: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientGst?: string;
  vehicleNumber: string;
  vehicleMake: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleType?: string;
  vehicleColor?: string;
  vehicleFuelType?: string;
  vin?: string;
  engineNumber?: string;
  chassisNumber?: string;
  placeOfSupply?: string;
  transportMode?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items: Array<{
    id: string;
    description: string;
    hsnSac?: string;
    quantity: number;
    rate: number;
    amount: number;
    total: number;
  }>;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;
}

interface CompanyInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  pan: string;
  website?: string;
  gstin?: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "OM MURUGAN AUTO WORKS",
  tagline: "Complete Multibrand Auto Care Services",
  address: "No.8 4th Main Road, Manikandapuram, Thirumullaivoyal, Chennai-600 062",
  phone: "9884551560",
  email: "ommurugan201205@gmail.com",
  pan: "AABCO1234M",
  website: "www.ommuruganiautoworks.com",
  gstin: "33AABCO1234M1ZX"
};

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function numberToWords(amount: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

  function convertHundreds(num: number): string {
    let result = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred > 0) {
      result += units[hundred] + ' Hundred';
    }

    if (remainder > 0) {
      if (result) result += ' ';
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;
        result += tens[ten];
        if (unit > 0) {
          result += '-' + units[unit];
        }
      }
    }

    return result;
  }

  if (amount === 0) return 'Zero';

  const rupees = Math.floor(amount);
  const paisa = Math.round((amount - rupees) * 100);

  let result = '';

  // Convert rupees
  if (rupees > 0) {
    const crores = Math.floor(rupees / 10000000);
    const lakhs = Math.floor((rupees % 10000000) / 100000);
    const thousands = Math.floor((rupees % 100000) / 1000);
    const hundreds = rupees % 1000;

    if (crores > 0) {
      result += convertHundreds(crores) + ' Crore';
    }
    if (lakhs > 0) {
      if (result) result += ' ';
      result += convertHundreds(lakhs) + ' Lakh';
    }
    if (thousands > 0) {
      if (result) result += ' ';
      result += convertHundreds(thousands) + ' Thousand';
    }
    if (hundreds > 0) {
      if (result) result += ' ';
      result += convertHundreds(hundreds);
    }
  }

  // Add paisa
  let paisaText = '';
  if (paisa > 0) {
    paisaText = ' and ' + convertHundreds(paisa) + ' Paisa';
  }

  return 'Rupees ' + result + paisaText + ' Only';
}

async function loadCompanyLogo(): Promise<string | null> {
  try {
    const response = await fetch('/logo.webp');
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Logo not found, proceeding without logo');
    return null;
  }
}

export async function generateUnifiedPDF(
  data: UnifiedDocumentData,
  companyInfo: CompanyInfo = defaultCompanyInfo
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const isQuotation = data.documentType === 'quotation';

  // Define layout constants for quotations
  const borderMargin = 12;
  const contentMargin = 18;
  let currentY = isQuotation ? 25 : 15;

  // Create main border for quotations only
  if (isQuotation) {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.rect(borderMargin, borderMargin, pageWidth - (borderMargin * 2), pageHeight - (borderMargin * 2));
  }

  // Colors for quotation
  const primaryColor: [number, number, number] = isQuotation
    ? [34, 60, 108]      // Professional dark blue for quotations
    : [220, 53, 69];     // Red for invoices
  const secondaryColor: [number, number, number] = isQuotation
    ? [52, 144, 67]      // Professional green for parts
    : [255, 133, 27];    // Orange accent for invoices

  // === HEADER SECTION ===
  if (isQuotation) {
    // Logo positioned inside border
    try {
      const logoData = await loadCompanyLogo();
      if (logoData) {
        doc.addImage(logoData, 'PNG', contentMargin, currentY, 25, 25);
      } else {
        // Fallback logo
        doc.setFillColor(...primaryColor);
        doc.circle(contentMargin + 12.5, currentY + 12.5, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('🔧', contentMargin + 9, currentY + 15);
      }
    } catch (error) {
      // Fallback logo
      doc.setFillColor(...primaryColor);
      doc.circle(contentMargin + 12.5, currentY + 12.5, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('🔧', contentMargin + 9, currentY + 15);
    }

    // Company name and details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, contentMargin + 30, currentY + 10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.tagline, contentMargin + 30, currentY + 16);

    // QUOTATION title - right aligned
    doc.setFillColor(...primaryColor);
    doc.rect(pageWidth - 80, currentY, 65, 20, 'F');

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(pageWidth - 80, currentY, 65, 20);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', pageWidth - 47.5, currentY + 10, { align: 'center' });

    doc.setFontSize(8);
    doc.text('ESTIMATE FOR APPROVAL', pageWidth - 47.5, currentY + 16, { align: 'center' });

    currentY += 18; // Reduced from 30
  } else {
    // Original invoice header code would go here
    currentY += 35;
  }

  // === DOCUMENT DETAILS SECTION ===
  if (isQuotation) {
    // Quote number and details - right side
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');

    const uniformDocNumber = data.documentNumber.startsWith('QT-') ? data.documentNumber : `QT-${data.documentNumber}`;
    doc.text(`Quote No: ${uniformDocNumber}`, pageWidth - contentMargin, currentY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${formatDate(data.documentDate)}`, pageWidth - contentMargin, currentY + 4, { align: 'right' }); // Reduced from +5

    if (data.validUntil) {
      doc.text(`Valid Until: ${formatDate(data.validUntil)}`, pageWidth - contentMargin, currentY + 8, { align: 'right' }); // Reduced from +10
    }

    currentY += 15; // Reduced from 20

    // Company address section
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    const addressLines = [
      companyInfo.address,
      `Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`,
      `PAN: ${companyInfo.pan} | GST: ${companyInfo.gstin}`
    ];

    addressLines.forEach(line => {
      doc.text(line, contentMargin, currentY);
      currentY += 3; // Reduced from 4
    });

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(contentMargin, currentY + 2, pageWidth - contentMargin, currentY + 2); // Reduced from +3
    currentY += 6; // Reduced from 10
  }

  // === CLIENT AND VEHICLE INFORMATION SECTION ===
  if (isQuotation) {
    // Two column layout for client and vehicle info
    const leftColX = contentMargin;
    const rightColX = pageWidth / 2 + 5;
    const colWidth = (pageWidth - (contentMargin * 2) - 10) / 2;

    // Client Information Header
    doc.setFillColor(...primaryColor);
    doc.rect(leftColX, currentY, colWidth, 12, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(leftColX, currentY, colWidth, 12);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE TO:', leftColX + 3, currentY + 8);

    // Vehicle Information Header
    doc.setFillColor(...secondaryColor);
    doc.rect(rightColX, currentY, colWidth, 12, 'F');
    doc.rect(rightColX, currentY, colWidth, 12);

    doc.setTextColor(255, 255, 255);
    doc.text('VEHICLE DETAILS:', rightColX + 3, currentY + 8);

    currentY += 12; // Reduced from 15

    // Client Information Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(leftColX, currentY, colWidth, 20); // Reduced from 25

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', leftColX + 3, currentY + 4); // Reduced from +5
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientName, leftColX + 20, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text('Phone:', leftColX + 3, currentY + 8); // Reduced from +10
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientPhone, leftColX + 20, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.text('Address:', leftColX + 3, currentY + 12); // Reduced from +15
    doc.setFont('helvetica', 'normal');
    const address = data.clientAddress.length > 30 ? data.clientAddress.substring(0, 30) + '...' : data.clientAddress;
    doc.text(address, leftColX + 20, currentY + 12);

    if (data.clientGst) {
      doc.setFont('helvetica', 'bold');
      doc.text('GST:', leftColX + 3, currentY + 16); // Reduced from +20
      doc.setFont('helvetica', 'normal');
      doc.text(data.clientGst, leftColX + 20, currentY + 16);
    }

    // Vehicle Information Box
    doc.rect(rightColX, currentY, colWidth, 20); // Reduced from 25

    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle No:', rightColX + 3, currentY + 4); // Reduced from +5
    doc.setFont('helvetica', 'normal');
    doc.text(data.vehicleNumber, rightColX + 25, currentY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text('Make/Model:', rightColX + 3, currentY + 8); // Reduced from +10
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.vehicleMake} ${data.vehicleModel || ''}`, rightColX + 25, currentY + 8);

    doc.setFont('helvetica', 'bold');
    doc.text('Year:', rightColX + 3, currentY + 12); // Reduced from +15
    doc.setFont('helvetica', 'normal');
    doc.text(data.vehicleYear || 'N/A', rightColX + 25, currentY + 12);

    currentY += 25; // Reduced from 30
  }

  // Color and Fuel Type
  if (data.vehicleColor) {
    doc.setFont('helvetica', 'bold');
    doc.text('COLOR:', 108, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.vehicleColor, 130, currentY + 12);
  }

  if (data.vehicleFuelType) {
    doc.setFont('helvetica', 'bold');
    doc.text('FUEL:', 150, currentY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.vehicleFuelType, 165, currentY + 12);
  }

  // VIN or Engine Number
  if (data.vin) {
    doc.setFont('helvetica', 'bold');
    doc.text('VIN:', 108, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6); // Smaller font for VIN
    doc.text(data.vin.substring(0, 12) + '...', 125, currentY + 15); // Truncate if too long
    doc.setFontSize(7); // Reset font
  } else if (data.engineNumber) {
    doc.setFont('helvetica', 'bold');
    doc.text('ENGINE:', 108, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(data.engineNumber, 130, currentY + 15);
  }

  // Place of Supply
  if (data.placeOfSupply) {
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLY:', 108, currentY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text(data.placeOfSupply, 130, currentY + 18);
  }

    // Items categorization for quotations
    const services: typeof data.items = [];
    const parts: typeof data.items = [];

    data.items.forEach(item => {
      const desc = item.description.toLowerCase();
      const isPartItem = desc.includes('part') || desc.includes('filter') ||
                        desc.includes('oil') || desc.includes('pad') ||
                        desc.includes('disc') || desc.includes('belt') ||
                        desc.includes('fluid') || desc.includes('brake');

      if (isPartItem) {
        parts.push(item);
      } else {
        services.push(item);
      }
    });

    // Services Table with proper borders for quotations
    if (services.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SERVICES PERFORMED', contentMargin, currentY);
      currentY += 3; // Reduced from 5

      const serviceRows = services.map((item, index) => [
        (index + 1).toString(),
        item.hsnSac || '9954',
        item.description,
        item.quantity.toString(),
        formatCurrency(item.rate),
        formatCurrency(item.total)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'HSN', 'DESCRIPTION OF SERVICES', 'QTY', 'RATE', 'TOTAL']],
        body: serviceRows,
        margin: { left: contentMargin, right: contentMargin },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1, // Reduced from 2
          lineColor: [0, 0, 0],
          lineWidth: 1
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'left', cellWidth: 85 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 25 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 5; // Reduced from 8
    }

    // Parts Table with proper borders for quotations
    if (parts.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PARTS USED', contentMargin, currentY);
      currentY += 3; // Reduced from 5

      const partRows = parts.map((item, index) => [
        (index + 1).toString(),
        item.hsnSac || '8708',
        item.description,
        item.quantity.toString(),
        formatCurrency(item.rate),
        formatCurrency(item.total)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'HSN', 'DESCRIPTION OF PARTS', 'QTY', 'RATE', 'TOTAL']],
        body: partRows,
        margin: { left: contentMargin, right: contentMargin },
        headStyles: {
          fillColor: secondaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 1, // Reduced from 2
          lineColor: [0, 0, 0],
          lineWidth: 1
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'left', cellWidth: 85 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 25 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 5; // Reduced from 8
    }

    // === TOTALS SECTION ===
    const totalsBoxX = pageWidth - contentMargin - 70;
    const totalsBoxWidth = 70;

    // Background for totals
    doc.setFillColor(248, 248, 248);
    doc.rect(totalsBoxX, currentY, totalsBoxWidth, 28, 'F'); // Reduced from 35

    // Border for totals
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);
    doc.rect(totalsBoxX, currentY, totalsBoxWidth, 28); // Reduced from 35

    // Total calculations
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    let totalsY = currentY + 3; // Reduced from +5
    doc.text('Taxable Amount:', totalsBoxX + 3, totalsY);
    doc.text(formatCurrency(data.taxableAmount), totalsBoxX + totalsBoxWidth - 3, totalsY, { align: 'right' });

    if (data.cgstAmount > 0) {
      totalsY += 4; // Reduced from 5
      doc.text(`CGST (${data.cgstRate}%):`, totalsBoxX + 3, totalsY);
      doc.text(formatCurrency(data.cgstAmount), totalsBoxX + totalsBoxWidth - 3, totalsY, { align: 'right' });

      totalsY += 4; // Reduced from 5
      doc.text(`SGST (${data.sgstRate}%):`, totalsBoxX + 3, totalsY);
      doc.text(formatCurrency(data.sgstAmount), totalsBoxX + totalsBoxWidth - 3, totalsY, { align: 'right' });
    }

    // Grand Total
    totalsY += 6; // Reduced from 8
    doc.setFillColor(...primaryColor);
    doc.rect(totalsBoxX, totalsY - 2, totalsBoxWidth, 10, 'F'); // Reduced from 12
    doc.rect(totalsBoxX, totalsY - 2, totalsBoxWidth, 10); // Reduced from 12

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTE TOTAL:', totalsBoxX + 3, totalsY + 3);
    doc.text(formatCurrency(data.grandTotal), totalsBoxX + totalsBoxWidth - 3, totalsY + 3, { align: 'right' });

    currentY += 35; // Reduced from 45

    // === FOOTER SECTION ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing our services!', contentMargin, currentY);
    doc.text('This quotation is valid for 30 days from the date of issue.', contentMargin, currentY + 4); // Reduced from +5

    // Signature section
    currentY += 10; // Reduced from 15
    doc.setFont('helvetica', 'bold');
    doc.text('Authorized Signature:', contentMargin, currentY);
    doc.text('Customer Signature:', pageWidth - 80, currentY);

    currentY += 15; // Reduced from 20
    doc.line(contentMargin, currentY, contentMargin + 60, currentY);
    doc.line(pageWidth - 80, currentY, pageWidth - contentMargin, currentY);

  // Save the PDF
  const filename = `${isQuotation ? 'quotation' : 'invoice'}-${data.documentNumber}.pdf`;
  doc.save(filename);
}

// Export functions for quotations
export async function generateExactFormatQuotationPDF(data: any): Promise<void> {
  const quotationData: UnifiedDocumentData = {
    documentType: 'quotation',
    documentNumber: data.quotationNumber || 'QT-0001',
    documentDate: data.quotationDate || new Date().toISOString().split('T')[0],
    validUntil: data.dueDate || data.validUntil,
    clientName: data.clientName || 'N/A',
    clientAddress: data.clientAddress || 'N/A',
    clientPhone: data.clientPhone || 'N/A',
    clientGst: data.clientGst,
    vehicleNumber: data.vehicleNumber || 'N/A',
    vehicleMake: data.vehicleMake || 'N/A',
    vehicleModel: data.vehicleModel,
    vehicleYear: data.vehicleYear,
    vin: data.vin,
    placeOfSupply: data.placeOfSupply || 'Chennai, Tamil Nadu',
    transportMode: data.transportMode,
    items: data.items || [],
    taxableAmount: data.taxableAmount || 0,
    cgstRate: data.cgstRate || 9,
    cgstAmount: data.cgstAmount || 0,
    sgstRate: data.sgstRate || 9,
    sgstAmount: data.sgstAmount || 0,
    totalTax: data.totalTax || 0,
    grandTotal: data.grandTotal || 0
  };

  return generateUnifiedPDF(quotationData);
}

// Export functions for invoices
export async function generateExactFormatInvoicePDF(data: any): Promise<void> {
  const invoiceData: UnifiedDocumentData = {
    documentType: 'invoice',
    documentNumber: data.invoiceNumber || 'INV-0001',
    documentDate: data.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: data.dueDate,
    clientName: data.clientName || 'N/A',
    clientAddress: data.clientAddress || 'N/A',
    clientPhone: data.clientPhone || 'N/A',
    clientGst: data.clientGst,
    vehicleNumber: data.vehicleNumber || 'N/A',
    vehicleMake: data.vehicleMake || 'N/A',
    vehicleModel: data.vehicleModel,
    vehicleYear: data.vehicleYear,
    vin: data.vin,
    placeOfSupply: data.placeOfSupply || 'Chennai, Tamil Nadu',
    transportMode: data.transportMode,
    paymentStatus: data.paymentStatus,
    paymentMethod: data.paymentMethod,
    items: data.items || [],
    taxableAmount: data.taxableAmount || 0,
    cgstRate: data.cgstRate || 9,
    cgstAmount: data.cgstAmount || 0,
    sgstRate: data.sgstRate || 9,
    sgstAmount: data.sgstAmount || 0,
    totalTax: data.totalTax || 0,
    grandTotal: data.grandTotal || 0
  };

  return generateUnifiedPDF(invoiceData);
}

// Helper function to convert API data
export function convertApiDataToUnifiedFormat(apiData: any, documentType: 'quotation' | 'invoice'): UnifiedDocumentData {
  return {
    documentType,
    documentNumber: apiData.quotation_number || apiData.invoice_number || apiData.id?.toString() || '0001',
    documentDate: apiData.quotation_date || apiData.invoice_date || apiData.created_at || new Date().toISOString().split('T')[0],
    dueDate: apiData.due_date,
    validUntil: apiData.valid_until,
    clientName: apiData.client?.name || apiData.client_name || 'N/A',
    clientAddress: apiData.client?.address || apiData.client_address || 'N/A',
    clientPhone: apiData.client?.phone || apiData.client_phone || 'N/A',
    clientGst: apiData.client?.gst_number || apiData.client_gst || undefined,
    vehicleNumber: apiData.vehicle?.registration_number || apiData.vehicle_number || 'N/A',
    vehicleMake: apiData.vehicle?.make || apiData.vehicle_make || 'N/A',
    vehicleModel: apiData.vehicle?.model || apiData.vehicle_model || undefined,
    vehicleYear: apiData.vehicle?.year?.toString() || apiData.vehicle_year || undefined,
    vehicleType: apiData.vehicle?.vehicle_type || apiData.vehicle_type || undefined,
    vehicleColor: apiData.vehicle?.color || apiData.vehicle_color || undefined,
    vehicleFuelType: apiData.vehicle?.fuel_type || apiData.vehicle_fuel_type || undefined,
    vin: apiData.vehicle?.vin_number || apiData.vin || undefined,
    engineNumber: apiData.vehicle?.engine_number || apiData.engine_number || undefined,
    chassisNumber: apiData.vehicle?.chassis_number || apiData.chassis_number || undefined,
    placeOfSupply: apiData.place_of_supply || 'Chennai, Tamil Nadu',
    transportMode: apiData.transport_mode || undefined,
    paymentStatus: apiData.payment_status || undefined,
    paymentMethod: apiData.payment_method || undefined,
    items: (apiData.items || []).map((item: any) => ({
      id: item.id?.toString() || Math.random().toString(),
      description: item.name || item.description || 'Service/Part',
      hsnSac: item.hsn_sac || '8302',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      amount: item.amount || (item.quantity * item.rate) || 0,
      total: item.total || item.amount || (item.quantity * item.rate) || 0
    })),
    taxableAmount: apiData.subtotal || apiData.taxable_amount || 0,
    cgstRate: apiData.cgst_rate || 9,
    cgstAmount: apiData.cgst_amount || 0,
    sgstRate: apiData.sgst_rate || 9,
    sgstAmount: apiData.sgst_amount || 0,
    totalTax: apiData.total_tax || (apiData.cgst_amount + apiData.sgst_amount) || 0,
    grandTotal: apiData.total_amount || apiData.grand_total || 0
  };
}

export default generateUnifiedPDF;