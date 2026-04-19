import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Package, FileText, Receipt } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';
import { logger } from '../utils/logger';
import { useToast } from './UI/Toast';

// ── Numeric scroll/arrow input ──────────────────────────────────────────────
function NumInput({ value, onChange, min = 0, max, step = 1, decimals = 2, className = '', prefix = '' }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; decimals?: number; className?: string; prefix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const prev = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== prev.current) { prev.current = value; setDraft(parseFloat(value.toFixed(decimals)).toString()); }
  }, [value, decimals]);

  const clamp = (v: number) => { let r = isNaN(v) ? min : v; if (max !== undefined) r = Math.min(r, max); return Math.max(r, min); };
  const commit = (raw: string) => { const f = clamp(parseFloat(raw)); prev.current = f; setDraft(parseFloat(f.toFixed(decimals)).toString()); onChange(f); };

  // Use non-passive wheel listener so preventDefault works (React's onWheel is passive in modern browsers)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      commit(String(prev.current + (e.deltaY < 0 ? step : -step)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [step]);

  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="absolute left-2 text-gray-400 text-xs pointer-events-none">{prefix}</span>}
      <input
        ref={inputRef}
        type="text" inputMode="decimal" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
          if (e.key === 'ArrowUp') { e.preventDefault(); commit(String(prev.current + step)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); commit(String(prev.current - step)); }
        }}
        className={`w-full border border-gray-200 rounded-lg py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white transition-all ${prefix ? 'pl-5 pr-2' : 'px-2'}`}
      />
    </div>
  );
}

interface InvoiceModalProps { isOpen: boolean; onClose: () => void; invoice?: any; }

interface InvoiceItem {
  id: string;
  type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  qty: number;
  rate: number;
  disc_pct: number;       // discount %
  igst_rate: number;      // GST %
  taxable_value: number;  // qty * rate * (1 - disc/100)
  igst_amount: number;    // taxable * igst_rate / 100
  total: number;          // taxable + igst_amount
}

const COMMON_SERVICES = [
  { name: 'Engine Oil Change', hsn_sac: '9986', rate: 500 },
  { name: 'Brake Service',     hsn_sac: '9986', rate: 800 },
  { name: 'AC Service',        hsn_sac: '9986', rate: 1200 },
  { name: 'Wheel Alignment',   hsn_sac: '9986', rate: 600 },
  { name: 'Battery Check',     hsn_sac: '9986', rate: 200 },
  { name: 'Transmission Service', hsn_sac: '9986', rate: 1500 },
  { name: 'Suspension Service',   hsn_sac: '9986', rate: 2000 },
  { name: 'Engine Tune-up',    hsn_sac: '9986', rate: 1800 },
];
const COMMON_PARTS = [
  { name: 'Engine Oil (5L)',   hsn_sac: '2710', rate: 2500 },
  { name: 'Oil Filter',        hsn_sac: '8421', rate: 350 },
  { name: 'Air Filter',        hsn_sac: '8421', rate: 450 },
  { name: 'Brake Pads (Set)',  hsn_sac: '8708', rate: 1500 },
  { name: 'Spark Plugs (Set)', hsn_sac: '8511', rate: 800 },
  { name: 'Battery',           hsn_sac: '8507', rate: 4500 },
  { name: 'Clutch Plate',      hsn_sac: '8708', rate: 2800 },
  { name: 'Tyre (1 piece)',    hsn_sac: '4011', rate: 3500 },
];

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function calcItem(item: InvoiceItem): InvoiceItem {
  const taxable_value = item.qty * item.rate * (1 - (item.disc_pct || 0) / 100);
  const igst_amount   = taxable_value * item.igst_rate / 100;
  const total         = taxable_value + igst_amount;
  return { ...item, taxable_value, igst_amount, total };
}

export default function InvoiceModal({ isOpen, onClose, invoice }: InvoiceModalProps) {
  const toast = useToast();

  const [formData, setFormData] = useState({
    client_id: '', vehicle_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    challan_no: '',
    challan_date: new Date().toISOString().split('T')[0],
    transport: '', transport_id: '',
    place_of_supply: 'Tamil Nadu (33)',
    payment_status: 'pending',
    notes: 'Payment due within 30 days.'
  });

  const [items, setItems]   = useState<InvoiceItem[]>([]);
  const [totals, setTotals] = useState({ taxable_amount: 0, igst_amount: 0, cgst_amount: 0, sgst_amount: 0, round_off: 0, total_amount: 0 });
  const [selectedClient,  setSelectedClient]  = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const queryClient = useQueryClient();

  // Fetch items when editing
  const { data: invoiceItems } = useQuery({
    queryKey: ['invoice-items', invoice?.id],
    queryFn: () => {
      if (!invoice?.id) return Promise.resolve(null);
      const token = localStorage.getItem('access_token');
      return axios.get(`/api/invoices/${invoice.id}/items`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    },
    enabled: !!invoice?.id,
  });

  // Recalculate totals
  useEffect(() => {
    const taxable_amount = items.reduce((s, i) => s + i.taxable_value, 0);
    const igst_amount    = items.reduce((s, i) => s + i.igst_amount,   0);
    const gross          = taxable_amount + igst_amount;
    const round_off      = Math.round(gross) - gross;
    setTotals({
      taxable_amount,
      igst_amount,
      cgst_amount: igst_amount / 2,
      sgst_amount: igst_amount / 2,
      round_off,
      total_amount: Math.round(gross)
    });
  }, [items]);

  const fmtDate = (d: any): string => {
    if (!d) return new Date().toISOString().split('T')[0];
    if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
    if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
    try { return new Date(d).toISOString().split('T')[0]; } catch { return new Date().toISOString().split('T')[0]; }
  };

  // Populate form when editing
  useEffect(() => {
    if (invoice?.id) {
      setFormData({
        client_id:      invoice.client_id?.toString()  || '',
        vehicle_id:     invoice.vehicle_id?.toString() || '',
        invoice_date:   fmtDate(invoice.invoice_date),
        challan_no:     invoice.challan_no     || '',
        challan_date:   fmtDate(invoice.challan_date),
        transport:      invoice.transport      || '',
        transport_id:   invoice.transport_id   || '',
        place_of_supply: invoice.place_of_supply || 'Tamil Nadu (33)',
        payment_status: invoice.payment_status  || 'pending',
        notes:          invoice.notes           || 'Payment due within 30 days.'
      });
      const h = { Authorization: `Bearer ${localStorage.getItem('access_token')}` };
      if (invoice.client_id) axios.get(`/api/clients/${invoice.client_id}`, { headers: h }).then(r => setSelectedClient(r.data)).catch(() => {});
      if (invoice.vehicle_id) axios.get(`/api/vehicles/${invoice.vehicle_id}`, { headers: h }).then(r => setSelectedVehicle(r.data?.data || r.data)).catch(() => {});
    } else {
      resetForm();
    }
  }, [invoice]);

  // Map fetched items
  useEffect(() => {
    if (!invoice?.id || !invoiceItems) return;
    const loaded: InvoiceItem[] = [];
    const mapItem = (raw: any, type: 'service' | 'part') => {
      const qty  = raw.quantity || raw.qty || 1;
      const rate = raw.unit_price || raw.rate || 0;
      const base: InvoiceItem = { id: `${type}-${raw.id}`, type, name: raw.service_name || raw.part_name || raw.name || '', hsn_sac: raw.hsn_sac_code || raw.hsn_sac || '9986', qty, rate, disc_pct: raw.disc_pct || 0, igst_rate: raw.igst_rate ?? 18, taxable_value: 0, igst_amount: 0, total: 0 };
      return calcItem(base);
    };
    (invoiceItems.services || []).forEach((s: any) => loaded.push(mapItem(s, 'service')));
    (invoiceItems.parts    || []).forEach((p: any) => loaded.push(mapItem(p, 'part')));
    if (loaded.length > 0) setItems(loaded);
  }, [invoiceItems, invoice?.id]);

  const addItem = () => setItems(prev => [...prev, calcItem({ id: Date.now().toString(), type: 'service', name: '', hsn_sac: '9986', qty: 1, rate: 0, disc_pct: 0, igst_rate: 18, taxable_value: 0, igst_amount: 0, total: 0 })]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(prev => prev.map(i => i.id !== id ? i : calcItem({ ...i, [field]: value })));

  const resetForm = () => {
    setFormData({ client_id: '', vehicle_id: '', invoice_date: new Date().toISOString().split('T')[0], challan_no: '', challan_date: new Date().toISOString().split('T')[0], transport: '', transport_id: '', place_of_supply: 'Tamil Nadu (33)', payment_status: 'pending', notes: 'Payment due within 30 days.' });
    setItems([]); setSelectedClient(null); setSelectedVehicle(null);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      logger.info('InvoiceModal: Creating invoice', data);
      return axios.post('/api/invoices/', data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onClose(); resetForm(); },
    onError: (e: any) => { logger.error('InvoiceModal: Create failed', e); toast.error(e.response?.data?.detail || 'Failed to create invoice'); }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`/api/invoices/${invoice.id}`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update invoice')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.vehicle_id) { toast.error('Please select both customer and vehicle.'); return; }
    if (items.length === 0) { toast.error('Please add at least one item.'); return; }
    const data = {
      ...formData,
      client_id:  parseInt(formData.client_id),
      vehicle_id: parseInt(formData.vehicle_id),
      items,
      taxable_amount: totals.taxable_amount,
      igst_amount:    totals.igst_amount,
      total_amount:   totals.total_amount,
    };
    invoice ? updateMutation.mutate(data) : createMutation.mutate(data);
  };

  if (!isOpen) return null;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Grid columns: Type | Name | HSN | Qty | Rate | Disc% | GST% | Taxable | Total | Del
  const COLS = '110px 1fr 72px 52px 82px 56px 56px 82px 78px 36px';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">
                {invoice ? 'Edit Invoice' : 'New Invoice'}
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
                <VehicleOwnerSearch selectedClient={selectedClient} onClientSelect={(c) => { setSelectedClient(c); setFormData(p => ({ ...p, client_id: c?.id?.toString() || '' })); }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vehicle *</label>
                <VehicleAutoComplete selectedVehicle={selectedVehicle} onVehicleSelect={(v) => { setSelectedVehicle(v); setFormData(p => ({ ...p, vehicle_id: v?.id?.toString() || '' })); }} required clientId={selectedClient?.id} />
              </div>
            </div>

            {/* Dates + Challan */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Invoice Date *</label>
                <input type="date" value={formData.invoice_date} onChange={(e) => setFormData(p => ({ ...p, invoice_date: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
                <input type="date" value={formData.challan_date} onChange={(e) => setFormData(p => ({ ...p, challan_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Payment Status</label>
                <select value={formData.payment_status} onChange={(e) => setFormData(p => ({ ...p, payment_status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Quick Add */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Add</p>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Services</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SERVICES.map(s => (
                    <button key={s.name} type="button"
                      onClick={() => setItems(prev => [...prev, calcItem({ id: Date.now().toString() + Math.random(), type: 'service', name: s.name, hsn_sac: s.hsn_sac, qty: 1, rate: s.rate, disc_pct: 0, igst_rate: 18, taxable_value: 0, igst_amount: 0, total: 0 })])}
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
                    <button key={p.name} type="button"
                      onClick={() => setItems(prev => [...prev, calcItem({ id: Date.now().toString() + Math.random(), type: 'part', name: p.name, hsn_sac: p.hsn_sac, qty: 1, rate: p.rate, disc_pct: 0, igst_rate: 18, taxable_value: 0, igst_amount: 0, total: 0 })])}
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
                <h3 className="text-sm font-semibold text-gray-700">Invoice Items</h3>
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
                  {/* Header Row */}
                  <div className="grid bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide"
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

                  {/* Item Rows */}
                  {items.map((item, idx) => {
                    const suggestions = item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS;
                    return (
                      <div key={item.id}
                        className={`grid border-b border-gray-100 last:border-0 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        style={{ gridTemplateColumns: COLS }}>

                        {/* Type */}
                        <div className="px-3 py-2">
                          <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="service">🔧 Service</option>
                            <option value="part">📦 Part</option>
                          </select>
                        </div>

                        {/* Name */}
                        <div className="px-3 py-2">
                          <input type="text" value={item.name} list={`sugg-inv-${item.id}`}
                            onChange={(e) => {
                              updateItem(item.id, 'name', e.target.value);
                              const match = suggestions.find(s => s.name === e.target.value);
                              if (match) { updateItem(item.id, 'rate', match.rate); updateItem(item.id, 'hsn_sac', match.hsn_sac); }
                            }}
                            placeholder="Enter item description..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <datalist id={`sugg-inv-${item.id}`}>{suggestions.map(s => <option key={s.name} value={s.name} />)}</datalist>
                        </div>

                        {/* HSN */}
                        <div className="px-3 py-2">
                          <input type="text" value={item.hsn_sac} onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        {/* Qty */}
                        <div className="px-3 py-2">
                          <NumInput value={item.qty} min={0.01} step={1} decimals={2} onChange={(v) => updateItem(item.id, 'qty', v)} />
                        </div>

                        {/* Rate */}
                        <div className="px-3 py-2">
                          <NumInput value={item.rate} min={0} step={50} decimals={2} prefix="₹" onChange={(v) => updateItem(item.id, 'rate', v)} />
                        </div>

                        {/* Disc% */}
                        <div className="px-3 py-2">
                          <NumInput value={item.disc_pct} min={0} max={100} step={1} decimals={0} onChange={(v) => updateItem(item.id, 'disc_pct', v)} />
                        </div>

                        {/* GST% */}
                        <div className="px-3 py-2">
                          <NumInput value={item.igst_rate} min={0} max={100} step={1} decimals={0} onChange={(v) => updateItem(item.id, 'igst_rate', v)} />
                        </div>

                        {/* Taxable */}
                        <div className="px-3 py-2 text-right text-xs text-gray-500 font-medium">
                          {fmt(item.taxable_value)}
                        </div>

                        {/* Total */}
                        <div className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                          {fmt(item.total)}
                        </div>

                        {/* Delete */}
                        <div className="px-2 py-2 flex justify-center">
                          <button type="button" onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all">
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
                <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Additional notes or payment terms..." />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Invoice Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Taxable Amount</span><span className="font-medium text-gray-800">{fmt(totals.taxable_amount)}</span></div>
                  {totals.igst_amount > 0 && (
                    <>
                      <div className="flex justify-between text-gray-500 text-xs"><span>CGST (50%)</span><span>{fmt(totals.cgst_amount)}</span></div>
                      <div className="flex justify-between text-gray-500 text-xs"><span>SGST (50%)</span><span>{fmt(totals.sgst_amount)}</span></div>
                    </>
                  )}
                  {totals.round_off !== 0 && (
                    <div className="flex justify-between text-gray-500 text-xs"><span>Round Off</span><span>{totals.round_off > 0 ? '+' : ''}{totals.round_off.toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="font-bold text-gray-800 text-base">Total Amount</span>
                    <span className="font-bold text-indigo-600 text-lg">{fmt(totals.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <div className="flex-1" />
            <button type="submit" disabled={isLoading || items.length === 0}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2">
              {isLoading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
              ) : invoice ? '✓ Update Invoice' : '✓ Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
