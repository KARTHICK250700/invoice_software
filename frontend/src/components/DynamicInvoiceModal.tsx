import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Package, Receipt } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';

// ── Scroll / Arrow numeric input ──────────────────────────────────────────
function NumInput({ value, onChange, min = 0, max, step = 1, decimals = 2, prefix = '', className = '' }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; decimals?: number; prefix?: string; className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const prev = useRef(value);

  useEffect(() => {
    if (value !== prev.current) { prev.current = value; setDraft(parseFloat(value.toFixed(decimals)).toString()); }
  }, [value, decimals]);

  const clamp = (v: number) => { let r = isNaN(v) ? min : v; if (max !== undefined) r = Math.min(r, max); return Math.max(r, min); };
  const commit = (raw: string) => { const f = clamp(parseFloat(raw)); prev.current = f; setDraft(parseFloat(f.toFixed(decimals)).toString()); onChange(f); };

  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="absolute left-2 text-gray-400 text-xs pointer-events-none">{prefix}</span>}
      <input
        type="text" inputMode="decimal" value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onWheel={e => { e.preventDefault(); commit(String(prev.current + (e.deltaY < 0 ? step : -step))); }}
        onKeyDown={e => {
          if (e.key === 'Enter') commit(draft);
          if (e.key === 'ArrowUp') { e.preventDefault(); commit(String(prev.current + step)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); commit(String(prev.current - step)); }
        }}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${prefix ? 'pl-5 pr-2' : 'px-2'}`}
      />
    </div>
  );
}

interface DynamicInvoiceModalProps { isOpen: boolean; onClose: () => void; invoice?: any; }

interface InvoiceItem {
  id: string;
  type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  qty: number;
  rate: number;
  discount: number;   // disc %
  tax_rate: number;   // gst %
  total: number;      // pre-tax line total (stored)
}

const COMMON_SERVICES = [
  { name: 'Engine Oil Change',    hsn_sac: '8302', rate: 500,  tax_rate: 0 },
  { name: 'Brake Service',        hsn_sac: '8302', rate: 800,  tax_rate: 0 },
  { name: 'AC Service',           hsn_sac: '8302', rate: 1200, tax_rate: 0 },
  { name: 'Wheel Alignment',      hsn_sac: '8302', rate: 600,  tax_rate: 0 },
  { name: 'Battery Check',        hsn_sac: '8302', rate: 200,  tax_rate: 0 },
  { name: 'Transmission Service', hsn_sac: '8302', rate: 1500, tax_rate: 0 },
  { name: 'Suspension Service',   hsn_sac: '8302', rate: 2000, tax_rate: 0 },
  { name: 'Engine Tune-up',       hsn_sac: '8302', rate: 1800, tax_rate: 0 },
];
const COMMON_PARTS = [
  { name: 'Engine Oil (5L)',   hsn_sac: '2710', rate: 2500, tax_rate: 0 },
  { name: 'Oil Filter',        hsn_sac: '8421', rate: 350,  tax_rate: 0 },
  { name: 'Air Filter',        hsn_sac: '8421', rate: 450,  tax_rate: 0 },
  { name: 'Brake Pads (Set)',  hsn_sac: '8708', rate: 1500, tax_rate: 0 },
  { name: 'Spark Plugs (Set)', hsn_sac: '8511', rate: 800,  tax_rate: 0 },
  { name: 'Battery',           hsn_sac: '8507', rate: 4500, tax_rate: 0 },
  { name: 'Clutch Plate',      hsn_sac: '8708', rate: 2800, tax_rate: 0 },
  { name: 'Tyre (1 piece)',    hsn_sac: '4011', rate: 3500, tax_rate: 0 },
];

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
// Grid columns: Type | Name | HSN | Qty | Rate | Disc% | GST% | Taxable | Total | Del
const COLS = '120px 1fr 80px 60px 90px 64px 64px 88px 82px 40px';

export default function DynamicInvoiceModal({ isOpen, onClose, invoice }: DynamicInvoiceModalProps) {
  const [formData, setFormData] = useState({
    client_id: '', vehicle_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    payment_status: 'pending',
    notes: 'Payment due within 30 days.'
  });

  const [items, setItems]   = useState<InvoiceItem[]>([]);
  const [totals, setTotals] = useState({ subtotal: 0, total_discount: 0, taxable_amount: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_tax: 0, round_off: 0, total_amount: 0 });
  const [selectedClient,  setSelectedClient]  = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const queryClient = useQueryClient();

  // Recalculate totals when items change
  useEffect(() => {
    let subtotal_before_discount = 0, total_discount = 0, cgst_amount = 0, sgst_amount = 0;
    items.forEach(item => {
      const base = item.qty * item.rate;
      const disc = base * (item.discount / 100);
      const taxable = base - disc;
      subtotal_before_discount += base;
      total_discount += disc;
      const tax = taxable * (item.tax_rate / 100);
      cgst_amount += tax / 2;
      sgst_amount += tax / 2;
    });
    const taxable_amount = subtotal_before_discount - total_discount;
    const total_tax = cgst_amount + sgst_amount;
    const gross = taxable_amount + total_tax;
    const round_off = Math.round(gross) - gross;
    setTotals({ subtotal: subtotal_before_discount, total_discount, taxable_amount, cgst_amount, sgst_amount, igst_amount: 0, total_tax, round_off, total_amount: gross + round_off });
  }, [items]);

  // Load invoice data when editing
  useEffect(() => {
    if (!invoice) { resetForm(); return; }

    setFormData({
      client_id:      invoice.client_id?.toString()  || '',
      vehicle_id:     invoice.vehicle_id?.toString() || '',
      invoice_date:   invoice.invoice_date?.split('T')[0]  || new Date().toISOString().split('T')[0],
      due_date:       invoice.due_date?.split('T')[0]      || '',
      payment_status: invoice.payment_status || 'pending',
      notes:          invoice.notes          || 'Payment due within 30 days.'
    });

    const h = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
    if (invoice.client)    setSelectedClient(invoice.client);
    else if (invoice.client_id) axios.get(`/api/clients/${invoice.client_id}`, { headers: h }).then(r => setSelectedClient(r.data)).catch(() => {});

    if (invoice.vehicle)    setSelectedVehicle(invoice.vehicle);
    else if (invoice.vehicle_id) axios.get(`/api/vehicles/${invoice.vehicle_id}`, { headers: h }).then(r => setSelectedVehicle(r.data)).catch(() => {});

    const mapItems = (rawItems: any[]) => rawItems.map((item: any) => ({
      id: item.id?.toString() || Date.now().toString(),
      type: (item.item_type || item.type || 'service') as 'service' | 'part',
      name: item.name || item.service_name || item.part_name || '',
      hsn_sac: item.hsn_sac || item.hsn_sac_code || '8302',
      qty: item.quantity || item.qty || 1,
      rate: item.rate || item.unit_price || 0,
      discount: item.discount || 0,
      tax_rate: item.tax_rate ?? 0,
      total: item.total || item.total_price || ((item.quantity || 1) * (item.rate || item.unit_price || 0))
    }));

    if (invoice.items?.length) { setItems(mapItems(invoice.items)); return; }

    if (invoice.id) {
      axios.get(`/api/invoices/${invoice.id}/items`, { headers: h })
        .then(res => {
          const allItems = [
            ...(res.data.services || []).map((s: any) => ({ ...s, item_type: 'service' })),
            ...(res.data.parts    || []).map((p: any) => ({ ...p, item_type: 'part'    })),
          ];
          if (allItems.length) setItems(mapItems(allItems));
        }).catch(() => {});
    }
  }, [invoice]);

  const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), type: 'service', name: '', hsn_sac: '8302', qty: 1, rate: 0, discount: 0, tax_rate: 0, total: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(prev => prev.map(item => {
    if (item.id !== id) return item;
    const u = { ...item, [field]: value };
    if (['qty', 'rate', 'discount', 'tax_rate'].includes(field)) {
      const base = u.qty * u.rate;
      u.total = base - base * (u.discount / 100);
    }
    return u;
  }));

  const addQuickItem = (itemData: any, type: 'service' | 'part') => {
    setItems(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).slice(2), type, name: itemData.name, hsn_sac: itemData.hsn_sac, qty: 1, rate: itemData.rate, discount: 0, tax_rate: itemData.tax_rate, total: itemData.rate }]);
  };

  const resetForm = () => {
    setFormData({ client_id: '', vehicle_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], payment_status: 'pending', notes: 'Payment due within 30 days.' });
    setItems([]); setSelectedClient(null); setSelectedVehicle(null);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/invoices/', data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); resetForm(); onClose(); },
  });
  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`/api/invoices/${invoice.id}`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); resetForm(); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      client_id:  parseInt(formData.client_id),
      vehicle_id: parseInt(formData.vehicle_id),
      items,
      subtotal: totals.subtotal, total_discount: totals.total_discount, taxable_amount: totals.taxable_amount,
      cgst_amount: totals.cgst_amount, sgst_amount: totals.sgst_amount, igst_amount: 0,
      total_tax: totals.total_tax, round_off: totals.round_off, total_amount: totals.total_amount,
      discount_amount: totals.total_discount, tax_amount: totals.total_tax,
      gst_enabled: true, tax_rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18
    };
    invoice ? updateMutation.mutate(data) : createMutation.mutate(data);
  };

  if (!isOpen) return null;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Gradient Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">
                {invoice ? 'Edit Invoice' : 'Create New Invoice'}
              </h2>
              <p className="text-indigo-100 text-xs">Om Murugan Auto Works</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Customer & Vehicle */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Customer *</label>
                <VehicleOwnerSearch selectedClient={selectedClient} onClientSelect={c => { setSelectedClient(c); setFormData(p => ({ ...p, client_id: c?.id?.toString() || '' })); }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vehicle *</label>
                <VehicleAutoComplete selectedVehicle={selectedVehicle} onVehicleSelect={v => { setSelectedVehicle(v); setFormData(p => ({ ...p, vehicle_id: v?.id?.toString() || '' })); }} required clientId={selectedClient?.id} />
              </div>
            </div>

            {/* Dates + Payment Status */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Invoice Date *</label>
                <input type="date" value={formData.invoice_date} onChange={e => setFormData(p => ({ ...p, invoice_date: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
                <input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payment Status</label>
                <select value={formData.payment_status} onChange={e => setFormData(p => ({ ...p, payment_status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Quick Add */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Add</p>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Services</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SERVICES.map(s => (
                    <button key={s.name} type="button" onClick={() => addQuickItem(s, 'service')}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full hover:bg-blue-100 transition-colors">
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Parts</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_PARTS.map(p => (
                    <button key={p.name} type="button" onClick={() => addQuickItem(p, 'part')}
                      className="px-3 py-1 text-xs bg-green-50 text-green-600 border border-green-100 rounded-full hover:bg-green-100 transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invoice Items</h3>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 text-gray-400">
                  <Package className="w-8 h-8" />
                  <p className="text-sm">No items added yet</p>
                  <button type="button" onClick={addItem} className="text-indigo-500 text-sm hover:underline">+ Add first item</button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid bg-gray-50 dark:bg-gray-800 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={{ gridTemplateColumns: COLS }}>
                    <div className="px-3 py-3">Type</div>
                    <div className="px-3 py-3">Item Name</div>
                    <div className="px-3 py-3">HSN/SAC</div>
                    <div className="px-3 py-3 text-center">Qty</div>
                    <div className="px-3 py-3 text-right">Rate (₹)</div>
                    <div className="px-3 py-3 text-center">Disc%</div>
                    <div className="px-3 py-3 text-center">GST%</div>
                    <div className="px-3 py-3 text-right">Taxable</div>
                    <div className="px-3 py-3 text-right">Total (₹)</div>
                    <div className="px-3 py-3"></div>
                  </div>

                  {/* Rows */}
                  {items.map((item, idx) => {
                    const base    = item.qty * item.rate;
                    const discAmt = base * (item.discount / 100);
                    const taxable = base - discAmt;
                    const gstAmt  = taxable * (item.tax_rate / 100);
                    const lineTotal = taxable + gstAmt;
                    const suggestions = item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS;
                    return (
                      <div key={item.id}
                        className={`grid border-b border-gray-100 last:border-0 items-center ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/40'}`}
                        style={{ gridTemplateColumns: COLS }}>

                        {/* Type */}
                        <div className="px-3 py-3">
                          <select value={item.type} onChange={e => updateItem(item.id, 'type', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="service">🔧 Service</option>
                            <option value="part">📦 Part</option>
                          </select>
                        </div>

                        {/* Name */}
                        <div className="px-3 py-3">
                          <input type="text" value={item.name} list={`sugg-dyn-${item.id}`}
                            onChange={e => {
                              updateItem(item.id, 'name', e.target.value);
                              const match = suggestions.find(s => s.name === e.target.value);
                              if (match) { updateItem(item.id, 'rate', match.rate); updateItem(item.id, 'hsn_sac', match.hsn_sac); }
                            }}
                            placeholder="Enter item description..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800" />
                          <datalist id={`sugg-dyn-${item.id}`}>{suggestions.map(s => <option key={s.name} value={s.name} />)}</datalist>
                        </div>

                        {/* HSN */}
                        <div className="px-3 py-3">
                          <input type="text" value={item.hsn_sac} onChange={e => updateItem(item.id, 'hsn_sac', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800" />
                        </div>

                        {/* Qty */}
                        <div className="px-3 py-3">
                          <NumInput value={item.qty} min={0.01} step={1} decimals={2} onChange={v => updateItem(item.id, 'qty', v)} />
                        </div>

                        {/* Rate */}
                        <div className="px-3 py-3">
                          <NumInput value={item.rate} min={0} step={50} decimals={2} prefix="₹" onChange={v => updateItem(item.id, 'rate', v)} />
                        </div>

                        {/* Disc% */}
                        <div className="px-3 py-3">
                          <NumInput value={item.discount} min={0} max={100} step={1} decimals={1} onChange={v => updateItem(item.id, 'discount', v)} />
                        </div>

                        {/* GST% */}
                        <div className="px-3 py-3">
                          <NumInput value={item.tax_rate} min={0} max={100} step={1} decimals={0} onChange={v => updateItem(item.id, 'tax_rate', v)} />
                        </div>

                        {/* Taxable */}
                        <div className="px-3 py-3 text-right text-xs text-gray-500 font-medium">
                          {fmt(taxable)}
                        </div>

                        {/* Total */}
                        <div className="px-3 py-3 text-right text-sm font-bold text-gray-800 dark:text-gray-200">
                          {fmt(lineTotal)}
                        </div>

                        {/* Delete */}
                        <div className="px-2 py-3 flex justify-center">
                          <button type="button" onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes + Summary */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none dark:bg-gray-800"
                  placeholder="Additional notes or payment terms..." />
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Invoice Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span className="font-medium text-gray-800 dark:text-gray-200">{fmt(totals.subtotal)}</span></div>
                  {totals.total_discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span className="font-medium">-{fmt(totals.total_discount)}</span></div>}
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Taxable Amount</span><span className="font-medium text-gray-800 dark:text-gray-200">{fmt(totals.taxable_amount)}</span></div>
                  {totals.total_tax > 0 && <>
                    <div className="flex justify-between text-gray-500 text-xs"><span>CGST</span><span>{fmt(totals.cgst_amount)}</span></div>
                    <div className="flex justify-between text-gray-500 text-xs"><span>SGST</span><span>{fmt(totals.sgst_amount)}</span></div>
                  </>}
                  {totals.round_off !== 0 && <div className="flex justify-between text-gray-500 text-xs"><span>Round Off</span><span>{totals.round_off > 0 ? '+' : ''}{totals.round_off.toFixed(2)}</span></div>}
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-base">Total Amount</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{fmt(totals.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex items-center gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
              Cancel
            </button>
            <div className="flex-1" />
            <button type="submit" disabled={isLoading || items.length === 0}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2">
              {isLoading
                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
                : invoice ? '✓ Update Invoice' : '✓ Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
