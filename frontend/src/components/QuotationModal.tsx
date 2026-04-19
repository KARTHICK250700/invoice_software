import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Package, FileText, ChevronDown, ChevronUp, Wrench, Box } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';

// Numeric input with scroll-to-change
function NumInput({ value, onChange, min = 0, max, step = 1, decimals = 2, className = '', prefix = '' }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; decimals?: number; className?: string; prefix?: string;
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
      {prefix && <span className="absolute left-2 text-gray-400 text-sm pointer-events-none">{prefix}</span>}
      <input
        type="text" inputMode="decimal" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onWheel={(e) => { e.preventDefault(); commit(String(prev.current + (e.deltaY < 0 ? step : -step))); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
          if (e.key === 'ArrowUp') { e.preventDefault(); commit(String(prev.current + step)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); commit(String(prev.current - step)); }
        }}
        className={`w-full border border-gray-200 rounded-lg py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all ${prefix ? 'pl-6 pr-3' : 'px-3'}`}
      />
    </div>
  );
}

interface QuotationModalProps { isOpen: boolean; onClose: () => void; quotation?: any; }
interface QuotationItem { id: string; type: 'service' | 'part'; name: string; hsn_sac: string; qty: number; rate: number; discount: number; tax_rate: number; total: number; }

const COMMON_SERVICES = [
  { name: 'Engine Oil Change', hsn_sac: '9986', rate: 500 },
  { name: 'Brake Service', hsn_sac: '9986', rate: 800 },
  { name: 'AC Service', hsn_sac: '9986', rate: 1200 },
  { name: 'Wheel Alignment', hsn_sac: '9986', rate: 600 },
  { name: 'Battery Check', hsn_sac: '9986', rate: 200 },
  { name: 'Transmission Service', hsn_sac: '9986', rate: 1500 },
  { name: 'Suspension Service', hsn_sac: '9986', rate: 2000 },
  { name: 'Engine Tune-up', hsn_sac: '9986', rate: 1800 },
];
const COMMON_PARTS = [
  { name: 'Engine Oil (5L)', hsn_sac: '2710', rate: 2500 },
  { name: 'Oil Filter', hsn_sac: '8421', rate: 350 },
  { name: 'Air Filter', hsn_sac: '8421', rate: 450 },
  { name: 'Brake Pads (Set)', hsn_sac: '8708', rate: 1500 },
  { name: 'Spark Plugs (Set)', hsn_sac: '8511', rate: 800 },
  { name: 'Battery', hsn_sac: '8507', rate: 4500 },
  { name: 'Clutch Plate', hsn_sac: '8708', rate: 2800 },
  { name: 'Tyre (1 piece)', hsn_sac: '4011', rate: 3500 },
];

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function QuotationModal({ isOpen, onClose, quotation }: QuotationModalProps) {
  const [formData, setFormData] = useState({
    client_id: '', vehicle_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'This quotation is valid for 30 days from the date of issue.'
  });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [totals, setTotals] = useState({ subtotal: 0, total_discount: 0, taxable_amount: 0, cgst_amount: 0, sgst_amount: 0, total_tax: 0, round_off: 0, total_amount: 0 });
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const queryClient = useQueryClient();

  const { data: quotationItems } = useQuery({
    queryKey: ['quotation-items', quotation?.id],
    queryFn: () => {
      if (!quotation?.id) return Promise.resolve(null);
      const token = localStorage.getItem('access_token');
      return axios.get(`/api/quotations/${quotation.id}/items`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    },
    enabled: !!quotation?.id,
  });

  const { data: servicePackages } = useQuery({
    queryKey: ['service-packages'],
    queryFn: () => {
      const token = localStorage.getItem('access_token');
      return axios.get('/api/quotations/templates/service-packages', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/quotations/', data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); onClose(); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => axios.put(`/api/quotations/${quotation.id}`, data, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); onClose(); },
  });

  useEffect(() => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
    const total_discount = items.reduce((s, i) => s + (i.discount || 0), 0);
    const taxable_amount = subtotal - total_discount;
    let cgst = 0, sgst = 0;
    items.forEach(i => { const t = ((i.qty * i.rate) - (i.discount || 0)) * i.tax_rate / 100; cgst += t / 2; sgst += t / 2; });
    const total_tax = cgst + sgst;
    const gross = taxable_amount + total_tax;
    const round_off = Math.round(gross) - gross;
    setTotals({ subtotal, total_discount, taxable_amount, cgst_amount: cgst, sgst_amount: sgst, total_tax, round_off, total_amount: Math.round(gross) });
  }, [items]);

  const fmtDate = (d: any): string => {
    if (!d) return new Date().toISOString().split('T')[0];
    if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}$/)) return d;
    if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
    try { return new Date(d).toISOString().split('T')[0]; } catch { return new Date().toISOString().split('T')[0]; }
  };

  useEffect(() => {
    if (quotation?.id) {
      setFormData({ client_id: quotation.client_id?.toString() || '', vehicle_id: quotation.vehicle_id?.toString() || '', quotation_date: fmtDate(quotation.quotation_date), valid_until: fmtDate(quotation.valid_until), notes: quotation.notes || 'This quotation is valid for 30 days from the date of issue.' });
      const token = localStorage.getItem('access_token');
      const h = { Authorization: `Bearer ${token}` };
      if (quotation.client_id) axios.get(`/api/clients/${quotation.client_id}`, { headers: h }).then(r => setSelectedClient(r.data)).catch(() => {});
      if (quotation.vehicle_id) axios.get(`/api/vehicles/${quotation.vehicle_id}`, { headers: h }).then(r => setSelectedVehicle(r.data)).catch(() => {});
    } else { resetForm(); }
  }, [quotation]);

  useEffect(() => {
    if (!quotation?.id || !quotationItems?.items?.length) return;
    setItems(quotationItems.items.map((i: any) => ({
      id: `item-${i.id}`, type: i.item_type || i.type || 'service', name: i.name || '',
      hsn_sac: i.hsn_sac || i.hsn_sac_code || '9986', qty: i.quantity || i.qty || 1,
      rate: i.rate || i.unit_price || 0, discount: i.discount || 0, tax_rate: i.tax_rate ?? 0, total: i.total || 0
    })));
  }, [quotationItems, quotation?.id]);

  const addItem = () => setItems(prev => [...prev, { id: Date.now().toString(), type: 'service', name: '', hsn_sac: '9986', qty: 1, rate: 0, discount: 0, tax_rate: 18, total: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(prev => prev.map(i => {
    if (i.id !== id) return i;
    const u = { ...i, [field]: value };
    if (['qty', 'rate', 'discount', 'tax_rate'].includes(field)) u.total = (u.qty * u.rate) - (u.discount || 0);
    return u;
  }));

  const loadPackage = (pkg: any) => {
    setItems(pkg.items.map((i: any) => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), type: i.type, name: i.name, hsn_sac: i.hsn_sac, qty: i.qty, rate: i.rate, discount: 0, tax_rate: i.tax_rate || 18, total: i.qty * i.rate })));
    setShowTemplates(false);
  };

  const resetForm = () => { setFormData({ client_id: '', vehicle_id: '', quotation_date: new Date().toISOString().split('T')[0], valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], notes: 'This quotation is valid for 30 days from the date of issue.' }); setItems([]); setSelectedClient(null); setSelectedVehicle(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, client_id: parseInt(formData.client_id), vehicle_id: parseInt(formData.vehicle_id), items, ...totals, status: 'pending' };
    quotation ? updateMutation.mutate(data) : createMutation.mutate(data);
  };

  if (!isOpen) return null;
  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl p-2">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">
                {quotation ? 'Edit Quotation' : 'New Quotation'}
              </h2>
              <p className="text-blue-100 text-xs">Om Murugan Car Service Center</p>
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

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quotation Date *</label>
                <input type="date" value={formData.quotation_date} onChange={(e) => setFormData(p => ({ ...p, quotation_date: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Valid Until *</label>
                <input type="date" value={formData.valid_until} onChange={(e) => setFormData(p => ({ ...p, valid_until: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {/* Templates */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Package className="w-4 h-4 text-blue-500" />
                  Service Templates
                </div>
                {showTemplates ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showTemplates && servicePackages?.packages && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                  {servicePackages.packages.map((pkg: any) => (
                    <button key={pkg.id} type="button" onClick={() => loadPackage(pkg)}
                      className="text-left p-3 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all group">
                      <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{pkg.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{pkg.items.length} items · ₹{(pkg.estimated_total / 1000).toFixed(0)}k</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Services & Parts</h3>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-2 text-gray-400">
                  <Package className="w-8 h-8" />
                  <p className="text-sm">No items added yet</p>
                  <button type="button" onClick={addItem} className="text-blue-500 text-sm hover:underline">+ Add first item</button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    style={{ gridTemplateColumns: '120px 1fr 80px 60px 90px 70px 70px 70px 40px' }}>
                    <div className="px-3 py-3">Type</div>
                    <div className="px-3 py-3">Description</div>
                    <div className="px-3 py-3">HSN/SAC</div>
                    <div className="px-3 py-3 text-center">Qty</div>
                    <div className="px-3 py-3 text-right">Rate (₹)</div>
                    <div className="px-3 py-3 text-right">Disc (₹)</div>
                    <div className="px-3 py-3 text-center">GST%</div>
                    <div className="px-3 py-3 text-right">Total</div>
                    <div className="px-3 py-3"></div>
                  </div>

                  {/* Table Rows */}
                  {items.map((item, idx) => {
                    const lineTotal = ((item.qty * item.rate) - (item.discount || 0)) * (1 + item.tax_rate / 100);
                    const suggestions = item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS;
                    return (
                      <div key={item.id} className={`grid border-b border-gray-100 last:border-0 items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        style={{ gridTemplateColumns: '120px 1fr 80px 60px 90px 70px 70px 70px 40px' }}>

                        {/* Type */}
                        <div className="px-3 py-2">
                          <select value={item.type} onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="service">🔧 Service</option>
                            <option value="part">📦 Part</option>
                          </select>
                        </div>

                        {/* Name */}
                        <div className="px-3 py-2">
                          <input type="text" value={item.name} list={`sugg-${item.id}`}
                            onChange={(e) => {
                              updateItem(item.id, 'name', e.target.value);
                              const match = suggestions.find(s => s.name === e.target.value);
                              if (match) { updateItem(item.id, 'rate', match.rate); updateItem(item.id, 'hsn_sac', match.hsn_sac); }
                            }}
                            placeholder="Enter description..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <datalist id={`sugg-${item.id}`}>{suggestions.map(s => <option key={s.name} value={s.name} />)}</datalist>
                        </div>

                        {/* HSN */}
                        <div className="px-3 py-2">
                          <input type="text" value={item.hsn_sac} onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        {/* Qty */}
                        <div className="px-3 py-2">
                          <NumInput value={item.qty} min={0.01} step={1} decimals={2} onChange={(v) => updateItem(item.id, 'qty', v)} />
                        </div>

                        {/* Rate */}
                        <div className="px-3 py-2">
                          <NumInput value={item.rate} min={0} step={50} decimals={2} prefix="₹" onChange={(v) => updateItem(item.id, 'rate', v)} />
                        </div>

                        {/* Discount */}
                        <div className="px-3 py-2">
                          <NumInput value={item.discount} min={0} step={10} decimals={2} prefix="₹" onChange={(v) => updateItem(item.id, 'discount', v)} />
                        </div>

                        {/* GST% */}
                        <div className="px-3 py-2">
                          <NumInput value={item.tax_rate} min={0} max={100} step={1} decimals={0} onChange={(v) => updateItem(item.id, 'tax_rate', v)} />
                        </div>

                        {/* Total */}
                        <div className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                          {fmt(lineTotal)}
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

            {/* Totals + Notes */}
            <div className="grid grid-cols-2 gap-6">
              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Terms & Conditions</label>
                <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter terms and conditions..." />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-medium text-gray-800">{fmt(totals.subtotal)}</span></div>
                  {totals.total_discount > 0 && <div className="flex justify-between text-red-500"><span>Discount</span><span className="font-medium">-{fmt(totals.total_discount)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>Taxable Amount</span><span className="font-medium text-gray-800">{fmt(totals.taxable_amount)}</span></div>
                  {totals.cgst_amount > 0 && <>
                    <div className="flex justify-between text-gray-500 text-xs"><span>CGST</span><span>{fmt(totals.cgst_amount)}</span></div>
                    <div className="flex justify-between text-gray-500 text-xs"><span>SGST</span><span>{fmt(totals.sgst_amount)}</span></div>
                  </>}
                  {totals.round_off !== 0 && <div className="flex justify-between text-gray-500 text-xs"><span>Round Off</span><span>{totals.round_off > 0 ? '+' : ''}{totals.round_off.toFixed(2)}</span></div>}
                  <div className="flex justify-between border-t border-gray-200 pt-2 mt-1">
                    <span className="font-bold text-gray-800 text-base">Total</span>
                    <span className="font-bold text-blue-600 text-lg">{fmt(totals.total_amount)}</span>
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
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2">
              {isLoading ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>
              ) : quotation ? '✓ Update Quotation' : '✓ Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
