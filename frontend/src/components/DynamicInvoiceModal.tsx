import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Trash2, Package, Loader2 } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';

// ScrollInput: plain text box — scroll up to increase, scroll down to decrease
function Stepper({ value, onChange, min = 0, max, step = 1, decimals = 2, className = '' }: {
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; decimals?: number; className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setDraft(parseFloat(value.toFixed(decimals)).toString());
    }
  }, [value, decimals]);

  const clamp = (v: number) => {
    let r = isNaN(v) ? min : v;
    if (max !== undefined) r = Math.min(r, max);
    return Math.max(r, min);
  };

  const commit = (raw: string) => {
    const final = clamp(parseFloat(raw));
    prevValue.current = final;
    setDraft(parseFloat(final.toFixed(decimals)).toString());
    onChange(final);
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? step : -step;
    commit(String(prevValue.current + delta));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onWheel={handleWheel}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(draft);
        if (e.key === 'ArrowUp') { e.preventDefault(); commit(String(prevValue.current + step)); }
        if (e.key === 'ArrowDown') { e.preventDefault(); commit(String(prevValue.current - step)); }
      }}
      className={`w-full text-xs text-center border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400 focus:bg-blue-50 bg-white ${className}`}
    />
  );
}

interface DynamicInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
}

interface InvoiceItem {
  id: string;
  type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  qty: number;
  rate: number;
  discount: number;
  tax_rate: number;
  total: number;
}

const COMMON_SERVICES = [
  { name: 'Engine Oil Change', hsn_sac: '8302', rate: 500, tax_rate: 0 },
  { name: 'Brake Service', hsn_sac: '8302', rate: 800, tax_rate: 0 },
  { name: 'AC Service', hsn_sac: '8302', rate: 1200, tax_rate: 0 },
  { name: 'Wheel Alignment', hsn_sac: '8302', rate: 600, tax_rate: 0 },
  { name: 'Battery Check', hsn_sac: '8302', rate: 200, tax_rate: 0 },
  { name: 'Transmission Service', hsn_sac: '8302', rate: 1500, tax_rate: 0 },
  { name: 'Suspension Service', hsn_sac: '8302', rate: 2000, tax_rate: 0 },
  { name: 'Engine Tune-up', hsn_sac: '8302', rate: 1800, tax_rate: 0 },
];

const COMMON_PARTS = [
  { name: 'Engine Oil (5L)', hsn_sac: '2710', rate: 2500, tax_rate: 0 },
  { name: 'Oil Filter', hsn_sac: '8421', rate: 350, tax_rate: 0 },
  { name: 'Air Filter', hsn_sac: '8421', rate: 450, tax_rate: 0 },
  { name: 'Brake Pads (Set)', hsn_sac: '8708', rate: 1500, tax_rate: 0 },
  { name: 'Spark Plugs (Set)', hsn_sac: '8511', rate: 800, tax_rate: 0 },
  { name: 'Battery', hsn_sac: '8507', rate: 4500, tax_rate: 0 },
  { name: 'Clutch Plate', hsn_sac: '8708', rate: 2800, tax_rate: 0 },
  { name: 'Tyre (1 piece)', hsn_sac: '4011', rate: 3500, tax_rate: 0 },
];

export default function DynamicInvoiceModal({ isOpen, onClose, invoice }: DynamicInvoiceModalProps) {
  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    payment_status: 'pending',
    notes: 'Payment due within 30 days.'
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    total_discount: 0,
    taxable_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_tax: 0,
    round_off: 0,
    total_amount: 0
  });

  // State for auto-complete selections
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const queryClient = useQueryClient();

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.post('/api/invoices/', data, { headers });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
    }
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await axios.put(`/api/invoices/${invoice.id}`, data, { headers });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      resetForm();
      onClose();
    },
    onError: (error) => {
    }
  });

  // Calculate totals when items change
  // item.total is already the PRE-TAX line total (qty × rate − discount%)
  useEffect(() => {
    let subtotal_before_discount = 0;
    let total_discount = 0;
    let cgst_amount = 0;
    let sgst_amount = 0;

    items.forEach(item => {
      const base = item.qty * item.rate;
      const disc = base * (item.discount / 100);
      const taxable = base - disc;

      subtotal_before_discount += base;
      total_discount += disc;

      // Intrastate GST: split equally into CGST + SGST
      const tax = taxable * (item.tax_rate / 100);
      cgst_amount += tax / 2;
      sgst_amount += tax / 2;
    });

    const taxable_amount = subtotal_before_discount - total_discount;
    const total_tax = cgst_amount + sgst_amount;
    const beforeRoundOff = taxable_amount + total_tax;
    const round_off = Math.round(beforeRoundOff) - beforeRoundOff;
    const total_amount = beforeRoundOff + round_off;

    setTotals({
      subtotal: subtotal_before_discount,
      total_discount,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount: 0,
      total_tax,
      round_off,
      total_amount
    });
  }, [items]);

  // Load invoice data when editing
  useEffect(() => {
    if (!invoice) {
      // Reset form for new invoice
      setFormData({
        client_id: '',
        vehicle_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_status: 'pending',
        notes: 'Payment due within 30 days.'
      });
      setSelectedClient(null);
      setSelectedVehicle(null);
      setItems([]);
      return;
    }

    setFormData({
      client_id: invoice.client_id?.toString() || '',
      vehicle_id: invoice.vehicle_id?.toString() || '',
      invoice_date: invoice.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      due_date: invoice.due_date?.split('T')[0] || '',
      payment_status: invoice.payment_status || 'pending',
      notes: invoice.notes || 'Payment due within 30 days.'
    });

    // ── Populate client & vehicle autocomplete fields ──
    // If full nested objects are present (from /api/invoices/{id}), use them directly
    if (invoice.client) {
      setSelectedClient(invoice.client);
    } else if (invoice.client_id) {
      // Fetch client details if only ID is present
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      axios.get(`/api/clients/${invoice.client_id}`, { headers })
        .then(res => setSelectedClient(res.data))
        .catch(() => {});
    }

    if (invoice.vehicle) {
      setSelectedVehicle(invoice.vehicle);
    } else if (invoice.vehicle_id) {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      axios.get(`/api/vehicles/${invoice.vehicle_id}`, { headers })
        .then(res => setSelectedVehicle(res.data))
        .catch(() => {});
    }

    const mapItems = (rawItems: any[]) =>
      rawItems.map((item: any) => ({
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

    // Try loading items from the invoice object first (set by EnhancedInvoicesPage after fetching full detail)
    const inlineItems = invoice.items;
    if (inlineItems && inlineItems.length > 0) {
      setItems(mapItems(inlineItems));
      return;
    }

    // Fallback: fetch items from the dedicated items endpoint
    if (invoice.id) {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      axios.get(`/api/invoices/${invoice.id}/items`, { headers })
        .then(res => {
          const data = res.data;
          // Combine services + parts into a unified list
          const allItems = [
            ...(data.services || []).map((s: any) => ({ ...s, item_type: 'service' })),
            ...(data.parts || []).map((p: any) => ({ ...p, item_type: 'part' })),
          ];
          if (allItems.length > 0) setItems(mapItems(allItems));
        })
        .catch(err => console.error('Could not load invoice items:', err));
    }
  }, [invoice]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'service',
      name: '',
      hsn_sac: '8302',
      qty: 1,
      rate: 0,
      discount: 0,
      tax_rate: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Recalculate total (pre-tax) whenever qty, rate, or discount changes
        if (['qty', 'rate', 'discount', 'tax_rate'].includes(field)) {
          const baseAmount = updatedItem.qty * updatedItem.rate;
          const discountAmt = baseAmount * (updatedItem.discount / 100);
          updatedItem.total = baseAmount - discountAmt; // pre-tax total
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const addQuickItem = (itemData: any, type: 'service' | 'part') => {
    const newItem: InvoiceItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: type,
      name: itemData.name,
      hsn_sac: itemData.hsn_sac,
      qty: 1,
      rate: itemData.rate,
      discount: 0,
      tax_rate: itemData.tax_rate,
      total: itemData.rate
    };
    setItems([...items, newItem]);
  };

  // Handlers for auto-complete selections
  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      client_id: client ? client.id.toString() : ''
    }));
  };

  const handleVehicleSelect = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setFormData(prev => ({
      ...prev,
      vehicle_id: vehicle ? vehicle.id.toString() : ''
    }));
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      vehicle_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_status: 'pending',
      notes: 'Payment due within 30 days.'
    });
    setItems([]);
    setSelectedClient(null);
    setSelectedVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceData = {
      ...formData,
      client_id: parseInt(formData.client_id),  // Convert to integer
      vehicle_id: parseInt(formData.vehicle_id), // Convert to integer
      items: items,
      subtotal: totals.subtotal,
      total_discount: totals.total_discount,
      taxable_amount: totals.taxable_amount,
      cgst_amount: totals.cgst_amount,
      sgst_amount: totals.sgst_amount,
      igst_amount: totals.igst_amount,
      total_tax: totals.total_tax,
      round_off: totals.round_off,
      total_amount: totals.total_amount,
      discount_amount: totals.total_discount,
      tax_amount: totals.total_tax,
      gst_enabled: true,
      tax_rate: 18.0,
      cgst_rate: 9.0,
      sgst_rate: 9.0,
      igst_rate: 18.0
    };

    if (invoice) {
      updateInvoiceMutation.mutate(invoiceData);
    } else {
      createInvoiceMutation.mutate(invoiceData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {invoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          {/* Company Header */}
          <div className="px-1 py-0">
            <div className="flex items-center gap-1">
              <img src="/logo.webp" alt="LOGO" className="h-4 w-4" />
              <div>
                <h1 className="text-xs font-medium">OM MURUGAN AUTO WORKS</h1>
                <p className="text-xs opacity-70">Chennai | 9884551560 | INVOICE</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {/* Customer & Vehicle Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Customer Selection with Auto-complete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
                <VehicleOwnerSearch
                  selectedClient={selectedClient}
                  onClientSelect={handleClientSelect}
                  required={true}
                />
              </div>

              {/* Vehicle Selection with Auto-complete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle *</label>
                <VehicleAutoComplete
                  selectedVehicle={selectedVehicle}
                  onVehicleSelect={handleVehicleSelect}
                  required={true}
                  clientId={selectedClient?.id}
                />
              </div>
            </div>

            {/* Date Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Invoice Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  required
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Add</h3>

              {/* Common Services */}
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 mb-1">Services</h4>
                <div className="flex flex-wrap gap-1">
                  {COMMON_SERVICES.map((service, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addQuickItem(service, 'service')}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      {service.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Common Parts */}
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-1">Parts</h4>
                <div className="flex flex-wrap gap-1">
                  {COMMON_PARTS.map((part, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addQuickItem(part, 'part')}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      {part.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">Invoice Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {/* Items Table */}
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 w-20">Type</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700">Item Name</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-700 w-20">HSN/SAC</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-14">Qty</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-20">Rate (₹)</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-16">Disc%</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-16">GST%</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-24">Taxable (₹)</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-700 w-24">Total (₹)</th>
                        <th className="px-2 py-2 text-center font-medium text-gray-700 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const base = item.qty * item.rate;
                        const discAmt = base * (item.discount / 100);
                        const taxable = base - discAmt;
                        const gstAmt = taxable * (item.tax_rate / 100);
                        const lineTotal = taxable + gstAmt;
                        return (
                        <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-2 py-1">
                            <select
                              value={item.type}
                              onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                              className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                            >
                              <option value="service">Service</option>
                              <option value="part">Part</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              placeholder="Item name"
                              className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={item.hsn_sac}
                              onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                              placeholder="HSN/SAC"
                              className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Stepper
                              value={item.qty}
                              min={0.01}
                              step={1}
                              decimals={2}
                              onChange={(v) => updateItem(item.id, 'qty', v)}
                              className="w-full"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Stepper
                              value={item.rate}
                              min={0}
                              step={10}
                              decimals={2}
                              onChange={(v) => updateItem(item.id, 'rate', v)}
                              className="w-full"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Stepper
                              value={item.discount}
                              min={0}
                              max={100}
                              step={1}
                              decimals={1}
                              onChange={(v) => updateItem(item.id, 'discount', v)}
                              className="w-full"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <Stepper
                              value={item.tax_rate}
                              min={0}
                              max={100}
                              step={1}
                              decimals={0}
                              onChange={(v) => updateItem(item.id, 'tax_rate', v)}
                              className="w-full"
                            />
                          </td>
                          {/* Taxable = base − discount */}
                          <td className="px-2 py-1 text-right text-xs text-gray-600">
                            {taxable.toFixed(2)}
                          </td>
                          {/* Total = taxable + GST */}
                          <td className="px-2 py-1 text-right text-xs font-semibold text-gray-900">
                            {lineTotal.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No items added yet. Click "Add Item" to start adding invoice items.
                </div>
              )}
            </div>

            {/* Payment Status */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partially_paid">Partially Paid</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Totals Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Invoice Totals</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span>₹{totals.total_discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxable Amount:</span>
                    <span>₹{totals.taxable_amount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST:</span>
                    <span>₹{totals.cgst_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST:</span>
                    <span>₹{totals.sgst_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Round Off:</span>
                    <span>₹{totals.round_off.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-1 mt-2">
                    <span>Total Amount:</span>
                    <span>₹{totals.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Saving...</>
                  : invoice ? 'Update Invoice' : 'Create Invoice'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}