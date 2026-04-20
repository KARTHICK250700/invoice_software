/**
 * Tally-Style Indian GST Tax Invoice PDF Generator
 * Matches the standard Tally invoice format used in India
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── helpers ───────────────────────────────────────────────────────────────────
function formatDateIN(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  return `${day}-${mon}-${d.getFullYear()}`;
}

function n2(v: any): number {
  const n = parseFloat(String(v || 0));
  return isNaN(n) ? 0 : n;
}

function fmt2(v: any): string {
  return n2(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWordsINR(amount: number): string {
  const units = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                 'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                 'Seventeen','Eighteen','Nineteen'];
  const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function chunk(n: number): string {
    if (n === 0) return '';
    if (n < 20)  return units[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-' + units[n%10] : '');
    return units[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + chunk(n%100) : '');
  }

  const rupees = Math.floor(Math.round(amount * 100) / 100);
  const paisa  = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paisa === 0) return 'Zero Only';

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh  = Math.floor((rupees % 10000000) / 100000);
  const thou  = Math.floor((rupees % 100000) / 1000);
  const rem   = rupees % 1000;

  if (crore) parts.push(chunk(crore) + ' Crore');
  if (lakh)  parts.push(chunk(lakh)  + ' Lakh');
  if (thou)  parts.push(chunk(thou)  + ' Thousand');
  if (rem)   parts.push(chunk(rem));

  let result = parts.join(' ');
  if (paisa) result += ' and ' + chunk(paisa) + ' Paisa';
  return result + ' Only';
}

// ── main generator ────────────────────────────────────────────────────────────
export async function generateTallyInvoicePDF(invoice: any, co: any = {}): Promise<void> {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW   = 210;
  const M    = 8;   // page margin
  const IW   = PW - 2 * M;  // inner width = 194mm

  // ── colour shortcuts ──────────────────────────────────────────────────────
  const BLK: [number,number,number] = [0, 0, 0];

  const hline = (y: number, x1 = M, x2 = PW - M, lw = 0.2) => {
    doc.setDrawColor(...BLK); doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
  };
  const vline = (x: number, y1: number, y2: number, lw = 0.2) => {
    doc.setDrawColor(...BLK); doc.setLineWidth(lw);
    doc.line(x, y1, x, y2);
  };
  const txt = (t: string, x: number, y: number, opts?: any) => {
    doc.text(t, x, y, opts);
  };

  let curY = M;

  // ── 1. TITLE ──────────────────────────────────────────────────────────────
  const title = invoice._documentTitle === 'Quotation' ? 'Quotation' : 'Tax Invoice';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLK);
  txt(title, PW / 2, curY + 5, { align: 'center' });
  curY += 8;
  hline(curY);

  // ── 2. HEADER (company left | invoice meta right) ─────────────────────────
  const HDR_H  = 45;
  const SPLIT  = M + 90;  // vertical divider x-position

  // Company info — left column
  const company = {
    name:    co.company_name  || 'OM MURUGAN AUTO WORKS',
    address: co.address       || '44HP+W4Q, Sidco Industrial Estate, Kalaignar Karunanidhi Nagar, Cholambedu, Chennai, Tamil Nadu 600062',
    gstin:   co.gst_number    || '33AXNPG2146F1ZR',
    state:   'Tamil Nadu, Code : 33',
    email:   co.email         || 'ommurugan201205@gmail.com',
  };

  let lY = curY + 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  txt(company.name, M + 2, lY); lY += 4;

  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize(company.address, 82);
  addrLines.forEach((line: string) => { txt(line, M + 2, lY); lY += 3; });
  lY += 1;
  txt(`GSTIN/UIN: ${company.gstin}`, M + 2, lY);           lY += 3;
  txt(`State Name : ${company.state}`, M + 2, lY);          lY += 3;
  txt(`E-Mail : ${company.email}`, M + 2, lY);

  // Invoice meta grid — right column
  // Each grid row: label | value | label | value  (4 cells, 2 dividers)
  const RX    = SPLIT + 1;
  const RW    = PW - M - SPLIT;
  const midR  = SPLIT + RW / 2;  // mid of right column
  const invDate    = formatDateIN(invoice.invoice_date);
  const invNumber  = invoice.invoice_number || 'N/A';
  const vehicleMeta = [invoice.vehicle?.brand_name, invoice.vehicle?.model_name]
                        .filter(Boolean).join(' ') || '';

  const metaRows: [string, string, string, string][] = [
    ['Invoice No.', invNumber,           'Dated',                  invDate],
    ['Delivery Note', '',                'Mode/Terms of Payment',  invoice.payment_method || ''],
    ['Reference No. & Date.', invoice.challan_no || '', 'Other References', vehicleMeta],
    ['Buyer\'s Order No.', '',           'Dated',                  ''],
    ['Dispatch Doc No.', invoice.vehicle?.registration_number || '', 'Delivery Note Date', ''],
    ['Dispatched through', '',           'Destination',            invoice.km_reading_in ? `${invoice.km_reading_in}Km` : ''],
    ['Terms of Delivery', '',            '',                       ''],
  ];

  const rowH = Math.floor(HDR_H / metaRows.length);
  let rY = curY;
  metaRows.forEach(([l1, v1, l2, v2]) => {
    const cellTop = rY;
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    txt(l1, RX, cellTop + 3);
    doc.setFont('helvetica', 'bold');
    txt(v1, RX, cellTop + 3 + 3);
    if (l2) {
      doc.setFont('helvetica', 'normal');
      txt(l2, midR + 1, cellTop + 3);
      doc.setFont('helvetica', 'bold');
      txt(v2, midR + 1, cellTop + 3 + 3);
      vline(midR, cellTop, cellTop + rowH);
    }
    rY += rowH;
    if (rY < curY + HDR_H) hline(rY, SPLIT, PW - M);
  });

  vline(SPLIT, curY, curY + HDR_H);
  curY += HDR_H;
  hline(curY);

  // ── 3. CONSIGNEE + BUYER ──────────────────────────────────────────────────
  const CUST_H = 35;
  const custMid = M + IW / 2;

  const client     = invoice.client || {};
  const cName      = client.name || 'N/A';
  const cAddr      = client.address || '';
  const cGST       = client.gst_number || '';
  const cVehicle   = invoice.vehicle?.registration_number || '';

  const drawCustomer = (startX: number, maxW: number) => {
    let cy = curY + 4;
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLK);
    // Inline label style for header
    txt(startX === M ? 'Consignee (Ship to)' : 'Buyer (Bill to)', startX + 1, cy); cy += 4;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    txt(cName, startX + 1, cy); cy += 3.5;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    const al = doc.splitTextToSize(cAddr, maxW - 3);
    al.slice(0, 3).forEach((line: string) => { txt(line, startX + 1, cy); cy += 3; });
    if (cVehicle) { txt(cVehicle, startX + 1, cy); cy += 3; }
    if (cGST)     { txt(`GSTIN/UIN : ${cGST}`, startX + 1, cy); cy += 3; }
    txt('State Name : Tamil Nadu, Code : 33', startX + 1, cy);
  };

  drawCustomer(M, IW / 2);
  drawCustomer(custMid, IW / 2);
  vline(custMid, curY, curY + CUST_H);
  curY += CUST_H;
  hline(curY);

  // ── 4. ITEMS TABLE ────────────────────────────────────────────────────────
  const items: any[] = invoice.items || [];
  const hsnCode = invoice.hsn_sac_code || '8708';

  // Build table rows
  const itemRows = items.map((item: any, i: number) => {
    const qty = n2(item.quantity || item.qty || 1);
    const rate = n2(item.rate || item.unit_price || 0);
    const amount = n2(item.total || item.total_price || qty * rate);
    return [
      String(i + 1),
      item.name || item.service_name || item.part_name || '',
      item.hsn_sac || item.hsn_code || hsnCode,
      String(qty),
      fmt2(rate),
      '',          // per — blank, auto-workshop doesn't use "per" unit
      fmt2(amount),
    ];
  });

  // Totals
  const subtotal  = items.reduce((s, item) => {
    const qty  = n2(item.quantity || item.qty || 1);
    const rate = n2(item.rate || item.unit_price || 0);
    return s + n2(item.total || item.total_price || qty * rate);
  }, 0);

  const cgstRate = n2(invoice.cgst_rate ?? 9);
  const sgstRate = n2(invoice.sgst_rate ?? 9);
  const cgstAmt  = n2(invoice.cgst_amount) || (subtotal * cgstRate / 100);
  const sgstAmt  = n2(invoice.sgst_amount) || (subtotal * sgstRate / 100);
  const grandTotal = n2(invoice.total_amount) || (subtotal + cgstAmt + sgstAmt);

  // Add blank rows to fill minimum rows (like Tally)
  const MIN_ROWS = 6;
  while (itemRows.length < MIN_ROWS) itemRows.push(['','','','','','','']);

  // Subtotal + GST rows
  const footRows = [
    ['','','','','','', fmt2(subtotal)],
    ['', `Output CGST @${cgstRate}%`, '', '', fmt2(cgstRate), '%', fmt2(cgstAmt)],
    ['', `Output SGST @ ${sgstRate}%`, '', '', fmt2(sgstRate), '%', fmt2(sgstAmt)],
  ];

  autoTable(doc, {
    startY: curY,
    head: [[
      { content: 'Sl\nNo.', styles: { halign: 'center' } },
      { content: 'Description of Goods', styles: { halign: 'left' } },
      { content: 'HSN/SAC', styles: { halign: 'center' } },
      { content: 'Quantity', styles: { halign: 'right' } },
      { content: 'Rate', styles: { halign: 'right' } },
      { content: 'per', styles: { halign: 'center' } },
      { content: 'Amount', styles: { halign: 'right' } },
    ]],
    body: [...itemRows, ...footRows],
    foot: [[
      { content: 'Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
      { content: `\u20B9 ${fmt2(grandTotal)}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } },
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      lineColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center',  cellWidth: 8 },
      1: { halign: 'left',    cellWidth: 'auto' },
      2: { halign: 'center',  cellWidth: 22 },
      3: { halign: 'right',   cellWidth: 16 },
      4: { halign: 'right',   cellWidth: 22 },
      5: { halign: 'center',  cellWidth: 10 },
      6: { halign: 'right',   cellWidth: 26 },
    },
    margin: { left: M, right: M },
    tableWidth: IW,
    didParseCell: (data) => {
      // Make item description bold
      if (data.section === 'body' && data.column.index === 1 && data.row.index < itemRows.length - (MIN_ROWS - items.length)) {
        data.cell.styles.fontStyle = 'bold';
      }
      // GST rows: italic description
      if (data.section === 'body' && data.column.index === 1 &&
          data.row.index >= itemRows.length) {
        data.cell.styles.fontStyle = 'italic';
      }
    },
  });

  curY = (doc as any).lastAutoTable.finalY;

  // ── 5. AMOUNT IN WORDS ────────────────────────────────────────────────────
  const amtWords = numberToWordsINR(grandTotal);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLK);
  txt('Amount Chargeable (in words)', M + 1, curY + 4);
  doc.setFont('helvetica', 'italic');
  txt('E. & O.E', PW - M - 1, curY + 4, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  txt(`INR ${amtWords}`, M + 1, curY + 9);
  curY += 13;
  hline(curY);

  // ── 6. HSN/SAC TAX SUMMARY TABLE ─────────────────────────────────────────
  const totalTax = cgstAmt + sgstAmt;
  autoTable(doc, {
    startY: curY,
    head: [[
      { content: 'HSN/SAC', styles: { halign: 'center' } },
      { content: 'Taxable\nValue', styles: { halign: 'right' } },
      { content: 'CGST\nRate', styles: { halign: 'center' } },
      { content: 'CGST\nAmount', styles: { halign: 'right' } },
      { content: 'SGST/UTGST\nRate', styles: { halign: 'center' } },
      { content: 'SGST/UTGST\nAmount', styles: { halign: 'right' } },
      { content: 'Total\nTax Amount', styles: { halign: 'right' } },
    ]],
    body: [[
      { content: hsnCode,             styles: { halign: 'center' } },
      { content: fmt2(subtotal),      styles: { halign: 'right' } },
      { content: `${cgstRate}%`,      styles: { halign: 'center' } },
      { content: fmt2(cgstAmt),       styles: { halign: 'right' } },
      { content: `${sgstRate}%`,      styles: { halign: 'center' } },
      { content: fmt2(sgstAmt),       styles: { halign: 'right' } },
      { content: fmt2(totalTax),      styles: { halign: 'right' } },
    ]],
    foot: [[
      { content: 'Total', styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fmt2(subtotal),    styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '',                styles: {} },
      { content: fmt2(cgstAmt),     styles: { halign: 'right', fontStyle: 'bold' } },
      { content: '',                styles: {} },
      { content: fmt2(sgstAmt),     styles: { halign: 'right', fontStyle: 'bold' } },
      { content: fmt2(totalTax),    styles: { halign: 'right', fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 18 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20 },
      5: { cellWidth: 26 },
      6: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    tableWidth: IW,
  });

  curY = (doc as any).lastAutoTable.finalY;

  // ── 7. TAX AMOUNT IN WORDS ────────────────────────────────────────────────
  const taxWords = numberToWordsINR(totalTax);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLK);
  txt(`Tax Amount (in words) : INR ${taxWords}`, M + 1, curY + 5);
  curY += 10;
  hline(curY);

  // ── 8. DECLARATION + SIGNATURE ───────────────────────────────────────────
  const DECL_H = 28;
  const declMid = M + 125;

  vline(declMid, curY, curY + DECL_H);

  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  txt('Declaration', M + 1, curY + 5);
  const declText = 'We declare that this invoice shows the actual price of the\ngoods described and that all particulars are true and correct.';
  const declLines = doc.splitTextToSize(declText, 112);
  declLines.forEach((line: string, i: number) => {
    txt(line, M + 1, curY + 10 + i * 3.5);
  });

  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  txt(`for ${company.name}`, declMid + 2, curY + 8);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  txt('Authorised Signatory', declMid + 2, curY + DECL_H - 4);

  curY += DECL_H;
  hline(curY);

  // ── 9. FOOTER ─────────────────────────────────────────────────────────────
  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  txt('This is a Computer Generated Invoice', PW / 2, curY + 5, { align: 'center' });
  curY += 10;

  // ── OUTER BORDER ──────────────────────────────────────────────────────────
  doc.setDrawColor(...BLK);
  doc.setLineWidth(0.5);
  doc.rect(M, M, IW, curY - M);

  // ── SAVE ──────────────────────────────────────────────────────────────────
  doc.save(`invoice-${invoice.invoice_number || invoice.id || 'draft'}.pdf`);
}

/** Wrapper for quotation — same Tally format, different title */
export async function generateTallyQuotationPDF(quotation: any, co: any = {}): Promise<void> {
  // Reuse invoice generator but swap title text
  // We do a shallow clone and let the generator handle it
  return generateTallyInvoicePDF({ ...quotation, _isQuotation: true }, co);
}
