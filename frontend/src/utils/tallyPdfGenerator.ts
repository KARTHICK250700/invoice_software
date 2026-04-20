/**
 * Tally-Style Indian GST Tax Invoice / Quotation PDF Generator
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
  const n = parseFloat(String(v ?? 0));
  return isNaN(n) ? 0 : n;
}

/** 2 decimal places for amounts */
function fmt2(v: any): string {
  return n2(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Show rate without trailing .00 for whole numbers (9% not 9.00%) */
function fmtRate(v: number): string {
  return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(2);
}

function numberToWordsINR(amount: number): string {
  const units = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                 'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
                 'Seventeen','Eighteen','Nineteen'];
  const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function chunk(n: number): string {
    if (n === 0) return '';
    if (n < 20)  return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + units[n % 10] : '');
    return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + chunk(n % 100) : '');
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
  if (paisa)  result += ' and ' + chunk(paisa) + ' Paisa';
  return result + ' Only';
}

// ── main generator ────────────────────────────────────────────────────────────
export async function generateTallyInvoicePDF(invoice: any, co: any = {}): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = 210;
  const M   = 8;          // page margin
  const IW  = PW - 2 * M; // inner width = 194 mm
  const BLK: [number, number, number] = [0, 0, 0];

  const hline = (y: number, x1 = M, x2 = PW - M, lw = 0.25) => {
    doc.setDrawColor(...BLK); doc.setLineWidth(lw);
    doc.line(x1, y, x2, y);
  };
  const vline = (x: number, y1: number, y2: number, lw = 0.25) => {
    doc.setDrawColor(...BLK); doc.setLineWidth(lw);
    doc.line(x, y1, x, y2);
  };
  const t = (s: string, x: number, y: number, opts?: any) => {
    doc.setTextColor(...BLK);
    doc.text(s, x, y, opts);
  };

  let curY = M;

  // ── 1. TITLE ──────────────────────────────────────────────────────────────
  const docTitle = invoice._documentTitle === 'Quotation' ? 'Quotation' : 'Tax Invoice';
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  t(docTitle, PW / 2, curY + 5, { align: 'center' });
  curY += 9;
  hline(curY);

  // ── 2. HEADER  (company left | invoice meta right) ───────────────────────
  const HDR_H  = 46;
  const SPLIT  = M + 90;  // x of vertical divider
  const RW     = PW - M - SPLIT;
  const midR   = SPLIT + RW / 2;

  const company = {
    name:  co.company_name || 'OM MURUGAN AUTO WORKS',
    addr:  co.address      || '44HP+W4Q, Sidco Industrial Estate, Kalaignar Karunanidhi Nagar, Cholambedu, Chennai, Tamil Nadu 600062',
    gstin: co.gst_number   || '33AXNPG2146F1ZR',
    email: co.email        || 'gopalakrish.p86@gmail.com',
  };

  // Company info — left
  let lY = curY + 5;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  t(company.name, M + 2, lY); lY += 4;
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.splitTextToSize(company.addr, 82).forEach((line: string) => { t(line, M + 2, lY); lY += 3; });
  lY += 1;
  t(`GSTIN/UIN: ${company.gstin}`, M + 2, lY);           lY += 3;
  t('State Name : Tamil Nadu, Code : 33', M + 2, lY);     lY += 3;
  t(`E-Mail : ${company.email}`, M + 2, lY);

  // Invoice meta grid — right (7 rows)
  const vehicleMeta = [invoice.vehicle?.brand_name, invoice.vehicle?.model_name].filter(Boolean).join(' ') || '';
  const metaRows: [string, string, string, string][] = [
    ['Invoice No.',          invoice.invoice_number || '',                   'Dated',                 formatDateIN(invoice.invoice_date)],
    ['Delivery Note',        '',                                              'Mode/Terms of Payment', invoice.payment_method || ''],
    ['Reference No. & Date.', invoice.challan_no || '',                      'Other References',      vehicleMeta],
    ["Buyer's Order No.",    '',                                              'Dated',                 ''],
    ['Dispatch Doc No.',     invoice.vehicle?.registration_number || '',     'Delivery Note Date',    ''],
    ['Dispatched through',   '',                                              'Destination',           invoice.km_reading_in ? `${invoice.km_reading_in}Km` : ''],
    ['Terms of Delivery',    '',                                              '',                      ''],
  ];

  const rowH = Math.floor(HDR_H / metaRows.length);  // ~6 mm each
  let rY = curY;
  metaRows.forEach(([l1, v1, l2, v2]) => {
    const top = rY;
    // Left label
    doc.setFontSize(6.2); doc.setFont('helvetica', 'normal');
    t(l1, SPLIT + 2, top + 3.5);
    // Left value (bold, below label)
    doc.setFont('helvetica', 'bold');
    if (v1) t(v1, SPLIT + 2, top + 6.5);
    // Right sub-column
    if (l2) {
      doc.setFont('helvetica', 'normal');
      t(l2, midR + 2, top + 3.5);
      doc.setFont('helvetica', 'bold');
      if (v2) t(v2, midR + 2, top + 6.5);
      vline(midR, top, top + rowH);
    }
    rY += rowH;
    if (rY < curY + HDR_H) hline(rY, SPLIT, PW - M);
  });

  vline(SPLIT, curY, curY + HDR_H);
  curY += HDR_H;
  hline(curY);

  // ── 3. CONSIGNEE + BUYER ──────────────────────────────────────────────────
  const CUST_H = 34;
  const custMid = M + IW / 2;
  const client  = invoice.client || {};
  const cName   = client.name    || 'N/A';
  const cAddr   = client.address || '';
  const cGST    = client.gst_number || '';
  const cVeh    = invoice.vehicle?.registration_number || '';

  const drawCust = (sx: number, w: number, label: string) => {
    let cy = curY + 4;
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLK);
    t(label, sx + 1, cy); cy += 4;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    t(cName, sx + 1, cy); cy += 4;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.splitTextToSize(cAddr, w - 3).slice(0, 2).forEach((line: string) => { t(line, sx + 1, cy); cy += 3; });
    if (cVeh) { t(cVeh, sx + 1, cy); cy += 3; }
    if (cGST) { t(`GSTIN/UIN : ${cGST}`, sx + 1, cy); cy += 3; }
    t('State Name : Tamil Nadu, Code : 33', sx + 1, cy);
  };

  drawCust(M,       IW / 2, 'Consignee (Ship to)');
  drawCust(custMid, IW / 2, 'Buyer (Bill to)');
  vline(custMid, curY, curY + CUST_H);
  curY += CUST_H;
  hline(curY);

  // ── 4. ITEMS TABLE ────────────────────────────────────────────────────────
  const items: any[] = invoice.items || [];
  const hsnFallback  = invoice.hsn_sac_code || '8708';

  // Fixed column widths (must sum to IW = 194)
  // Sl(8) | Desc(auto≈90) | HSN(22) | Qty(16) | Rate(22) | per(10) | Amount(26) = 104 fixed + auto
  const COL_WIDTHS = [8, 'auto' as const, 22, 16, 22, 10, 26];

  // Item rows only — NO blank padding rows
  const bodyRows = items.map((item: any, i: number) => {
    const qty    = n2(item.quantity || item.qty || 1);
    const rate   = n2(item.rate    || item.unit_price || 0);
    const amount = n2(item.total   || item.total_price || qty * rate);
    const hsn    = item.hsn_sac || item.hsn_code || hsnFallback;
    return [
      String(i + 1),
      item.name || item.service_name || item.part_name || '',
      hsn,
      String(qty),
      fmt2(rate),
      '',           // "per" column — left blank for services
      fmt2(amount),
    ];
  });

  // Totals
  const subtotal   = items.reduce((s: number, item: any) => {
    const qty  = n2(item.quantity || item.qty || 1);
    const rate = n2(item.rate || item.unit_price || 0);
    return s + n2(item.total || item.total_price || qty * rate);
  }, 0);

  const cgstRate   = n2(invoice.cgst_rate ?? 9);
  const sgstRate   = n2(invoice.sgst_rate ?? 9);
  const cgstAmt    = n2(invoice.cgst_amount) || (subtotal * cgstRate / 100);
  const sgstAmt    = n2(invoice.sgst_amount) || (subtotal * sgstRate / 100);
  const grandTotal = n2(invoice.total_amount) || (subtotal + cgstAmt + sgstAmt);

  // Subtotal / CGST / SGST appended as body rows (styled via didParseCell)
  const N = bodyRows.length;  // actual item count
  const subtotalRow = ['', '', '', '', '', '', fmt2(subtotal)];
  const cgstRow     = ['', `Output CGST @${fmtRate(cgstRate)}%`, '', '', fmtRate(cgstRate), '%', fmt2(cgstAmt)];
  const sgstRow     = ['', `Output SGST @ ${fmtRate(sgstRate)}%`, '', '', fmtRate(sgstRate), '%', fmt2(sgstAmt)];

  autoTable(doc, {
    startY: curY,
    // Repeat header on every page (supports 200+ items)
    showHead: 'everyPage',
    showFoot: 'lastPage',
    head: [[
      { content: 'Sl\nNo.',             styles: { halign: 'center' } },
      { content: 'Description of Goods', styles: { halign: 'left'   } },
      { content: 'HSN/SAC',             styles: { halign: 'center' } },
      { content: 'Quantity',            styles: { halign: 'right'  } },
      { content: 'Rate',                styles: { halign: 'right'  } },
      { content: 'per',                 styles: { halign: 'center' } },
      { content: 'Amount',              styles: { halign: 'right'  } },
    ]],
    body: [...bodyRows, subtotalRow, cgstRow, sgstRow],
    foot: [[
      {
        content: 'Total',
        colSpan: 6,
        styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
      },
      {
        // Use "Rs." — jsPDF default helvetica font does not support the rupee glyph
        content: `Rs. ${fmt2(grandTotal)}`,
        styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 },
      },
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [0, 0, 0],
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8      },
      1: { halign: 'left',   cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 22     },
      3: { halign: 'right',  cellWidth: 16     },
      4: { halign: 'right',  cellWidth: 22     },
      5: { halign: 'center', cellWidth: 10     },
      6: { halign: 'right',  cellWidth: 26     },
    },
    margin: { left: M, right: M, top: M + 4, bottom: M + 4 },
    tableWidth: IW,
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const ri = data.row.index;
      const ci = data.column.index;
      if (ri < N) {
        if (ci === 1) data.cell.styles.fontStyle = 'bold';
      } else if (ri === N) {
        data.cell.styles.fontStyle = 'bold';
      } else {
        if (ci === 1) data.cell.styles.fontStyle = 'italic';
        else          data.cell.styles.fontStyle = 'normal';
      }
    },
    // Draw page border on every page
    didDrawPage: (data) => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(M, M, IW, doc.internal.pageSize.getHeight() - 2 * M);
    },
  });

  curY = (doc as any).lastAutoTable.finalY;

  // ── 5. AMOUNT IN WORDS ────────────────────────────────────────────────────
  const amtWords = numberToWordsINR(grandTotal);
  doc.setFontSize(6.8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLK);
  t('Amount Chargeable (in words)', M + 1, curY + 4);
  doc.setFont('helvetica', 'italic');
  t('E. & O.E', PW - M - 1, curY + 4, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  t(`INR ${amtWords}`, M + 1, curY + 9);
  curY += 13;
  hline(curY);

  // ── 6. HSN/SAC TAX SUMMARY TABLE ─────────────────────────────────────────
  const totalTax = cgstAmt + sgstAmt;
  autoTable(doc, {
    startY: curY,
    head: [[
      { content: 'HSN/SAC',          styles: { halign: 'center' } },
      { content: 'Taxable\nValue',   styles: { halign: 'right'  } },
      { content: 'CGST\nRate',       styles: { halign: 'center' } },
      { content: 'CGST\nAmount',     styles: { halign: 'right'  } },
      { content: 'SGST/UTGST\nRate', styles: { halign: 'center' } },
      { content: 'SGST/UTGST\nAmount', styles: { halign: 'right' } },
      { content: 'Total\nTax Amount', styles: { halign: 'right' } },
    ]],
    body: [[
      { content: hsnFallback,          styles: { halign: 'center' } },
      { content: fmt2(subtotal),       styles: { halign: 'right'  } },
      { content: `${fmtRate(cgstRate)}%`, styles: { halign: 'center' } },
      { content: fmt2(cgstAmt),        styles: { halign: 'right'  } },
      { content: `${fmtRate(sgstRate)}%`, styles: { halign: 'center' } },
      { content: fmt2(sgstAmt),        styles: { halign: 'right'  } },
      { content: fmt2(totalTax),       styles: { halign: 'right'  } },
    ]],
    foot: [[
      { content: 'Total',              styles: { halign: 'center', fontStyle: 'bold' } },
      { content: fmt2(subtotal),       styles: { halign: 'right',  fontStyle: 'bold' } },
      { content: '',                   styles: {} },
      { content: fmt2(cgstAmt),        styles: { halign: 'right',  fontStyle: 'bold' } },
      { content: '',                   styles: {} },
      { content: fmt2(sgstAmt),        styles: { halign: 'right',  fontStyle: 'bold' } },
      { content: fmt2(totalTax),       styles: { halign: 'right',  fontStyle: 'bold' } },
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7,
      font: 'helvetica',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
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
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLK);
  t(`Tax Amount (in words) : INR ${taxWords}`, M + 1, curY + 5);
  curY += 10;
  hline(curY);

  // ── 8. DECLARATION + SIGNATURE ───────────────────────────────────────────
  const DECL_H  = 28;
  const declMid = M + 125;
  vline(declMid, curY, curY + DECL_H);

  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  t('Declaration', M + 1, curY + 5);
  const declLines = doc.splitTextToSize(
    'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    112
  );
  declLines.forEach((line: string, i: number) => t(line, M + 1, curY + 10 + i * 3.5));

  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  t(`for ${company.name}`, declMid + 2, curY + 8);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  t('Authorised Signatory', declMid + 2, curY + DECL_H - 4);

  curY += DECL_H;
  hline(curY);

  // ── 9. FOOTER ─────────────────────────────────────────────────────────────
  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  t('This is a Computer Generated Invoice', PW / 2, curY + 5, { align: 'center' });
  curY += 10;

  // ── OUTER BORDER ──────────────────────────────────────────────────────────
  doc.setDrawColor(...BLK);
  doc.setLineWidth(0.5);
  doc.rect(M, M, IW, curY - M);

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const prefix = invoice._documentTitle === 'Quotation' ? 'quotation' : 'invoice';
  doc.save(`${prefix}-${invoice.invoice_number || invoice.id || 'draft'}.pdf`);
}

/** Quotation PDF — same Tally format, "Quotation" title */
export async function generateTallyQuotationPDF(quotation: any, co: any = {}): Promise<void> {
  return generateTallyInvoicePDF({ ...quotation, _documentTitle: 'Quotation' }, co);
}
