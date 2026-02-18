import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Car, User, Calendar, FileText, Calculator } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';

interface InvoiceModalProps {
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
  taxable_value: number;
  igst_rate: number;
  igst_amount: number;
  total: number;
}

const COMMON_SERVICES = [
  { name: 'Engine Oil Change', hsn_sac: '8302', rate: 500 },
  { name: 'Brake Service', hsn_sac: '8302', rate: 800 },
  { name: 'AC Service', hsn_sac: '8302', rate: 1200 },
  { name: 'Wheel Alignment', hsn_sac: '8302', rate: 600 },
  { name: 'Battery Check', hsn_sac: '8302', rate: 200 },
  { name: 'Transmission Service', hsn_sac: '8302', rate: 1500 },
  { name: 'Suspension Service', hsn_sac: '8302', rate: 2000 },
  { name: 'Engine Tune-up', hsn_sac: '8302', rate: 1800 },
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

export default function InvoiceModal({ isOpen, onClose, invoice }: InvoiceModalProps) {
  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    challan_no: '',
    challan_date: new Date().toISOString().split('T')[0],
    transport: '',
    transport_id: '',
    place_of_supply: 'Tamil Nadu (33)',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [totals, setTotals] = useState({
    taxable_amount: 0,
    igst_amount: 0,
    total_amount: 0
  });

  // State for auto-complete selections
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

  const queryClient = useQueryClient();

  // Removed client and vehicle queries - now handled by auto-complete components

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

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.post('/api/invoices/', data, { headers }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
      resetForm();
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.put(`/api/invoices/${invoice.id}`, data, { headers }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    },
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const taxable_amount = items.reduce((sum, item) => sum + item.taxable_value, 0);
    const igst_amount = items.reduce((sum, item) => sum + item.igst_amount, 0);
    const total_amount = taxable_amount + igst_amount;

    setTotals({ taxable_amount, igst_amount, total_amount });
  }, [items]);

  // Update formData when invoice prop changes (for editing)
  useEffect(() => {
    if (invoice) {
      setFormData({
        client_id: invoice.client_id?.toString() || '',
        vehicle_id: invoice.vehicle_id?.toString() || '',
        invoice_date: invoice.invoice_date ? new Date(invoice.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        challan_no: invoice.challan_no || '',
        challan_date: invoice.challan_date ? new Date(invoice.challan_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        transport: invoice.transport || '',
        transport_id: invoice.transport_id || '',
        place_of_supply: invoice.place_of_supply || 'Tamil Nadu (33)',
        notes: invoice.notes || ''
      });

      // Set selected client and vehicle for auto-complete components
      if (invoice.client) {
        setSelectedClient(invoice.client);
      }
      if (invoice.vehicle) {
        setSelectedVehicle(invoice.vehicle);
      }

      // Set invoice items if they exist
      if (invoice.services || invoice.parts) {
        const invoiceItems: InvoiceItem[] = [];

        // Add services
        if (invoice.services && invoice.services.length > 0) {
          invoice.services.forEach((service: any) => {
            invoiceItems.push({
              id: `service-${service.id}`,
              type: 'service',
              name: service.service_name || service.name || '',
              hsn_sac: service.hsn_sac_code || '8302',
              qty: service.quantity || 1,
              rate: service.unit_price || 0,
              taxable_value: service.total_price || 0,
              igst_rate: 18, // Default IGST rate
              igst_amount: (service.total_price || 0) * 0.18,
              total: (service.total_price || 0) + ((service.total_price || 0) * 0.18)
            });
          });
        }

        // Add parts
        if (invoice.parts && invoice.parts.length > 0) {
          invoice.parts.forEach((part: any) => {
            invoiceItems.push({
              id: `part-${part.id}`,
              type: 'part',
              name: part.part_name || part.name || '',
              hsn_sac: part.hsn_sac_code || '8708',
              qty: part.quantity || 1,
              rate: part.unit_price || 0,
              taxable_value: part.total_price || 0,
              igst_rate: 18, // Default IGST rate
              igst_amount: (part.total_price || 0) * 0.18,
              total: (part.total_price || 0) + ((part.total_price || 0) * 0.18)
            });
          });
        }

        setItems(invoiceItems);
      }
    } else {
      // Reset form for new invoice
      setFormData({
        client_id: '',
        vehicle_id: '',
        invoice_date: new Date().toISOString().split('T')[0],
        challan_no: '',
        challan_date: new Date().toISOString().split('T')[0],
        transport: '',
        transport_id: '',
        place_of_supply: 'Tamil Nadu (33)',
        notes: ''
      });
      setSelectedClient(null);
      setSelectedVehicle(null);
      setItems([]);
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
      taxable_value: 0,
      igst_rate: 18,
      igst_amount: 0,
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

        // Recalculate when qty or rate changes
        if (field === 'qty' || field === 'rate') {
          updatedItem.taxable_value = updatedItem.qty * updatedItem.rate;
          updatedItem.igst_amount = (updatedItem.taxable_value * updatedItem.igst_rate) / 100;
          updatedItem.total = updatedItem.taxable_value + updatedItem.igst_amount;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const selectCommonItem = (itemId: string, commonItem: any, type: 'service' | 'part') => {
    updateItem(itemId, 'name', commonItem.name);
    updateItem(itemId, 'hsn_sac', commonItem.hsn_sac);
    updateItem(itemId, 'rate', commonItem.rate);
    updateItem(itemId, 'type', type);
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      vehicle_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      challan_no: '',
      challan_date: new Date().toISOString().split('T')[0],
      transport: '',
      transport_id: '',
      place_of_supply: 'Tamil Nadu (33)',
      notes: ''
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
      taxable_amount: totals.taxable_amount,
      igst_amount: totals.igst_amount,
      total_amount: totals.total_amount
    };

    if (invoice) {
      updateInvoiceMutation.mutate(invoiceData);
    } else {
      createInvoiceMutation.mutate(invoiceData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Header */}
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <div className="flex items-center gap-4 mb-4">
            <img src="/logo.webp" alt="OM MURUGAN AUTO WORKS" className="h-16 w-16 rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-purple-800">OM MURUGAN AUTO WORKS</h1>
              <p className="text-purple-600 font-medium">COMPLETE MULTIBRAND AUTO CARE SERVICES</p>
              <p className="text-sm text-gray-600">No.8 4th Main Road, Manikandapuram, Thirumullaivoyal, Chennai-600 062</p>
              <p className="text-sm text-gray-600">Cell: 9884551560 | Email: ommurugan201205@gmail.com</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer & Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Selection with Auto-complete */}
            <VehicleOwnerSearch
              selectedClient={selectedClient}
              onClientSelect={handleClientSelect}
              required={true}
            />

            {/* Vehicle Selection with Auto-complete */}
            <VehicleAutoComplete
              selectedVehicle={selectedVehicle}
              onVehicleSelect={handleVehicleSelect}
              required={true}
              clientId={selectedClient?.id}
            />

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                required
                className="input-field"
              />
            </div>

            {/* Challan Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Challan No.
              </label>
              <input
                type="text"
                value={formData.challan_no}
                onChange={(e) => setFormData(prev => ({ ...prev, challan_no: e.target.value }))}
                className="input-field"
                placeholder="Enter challan number"
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Services & Parts</h3>
              <button
                type="button"
                onClick={addItem}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    {/* Item Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                        className="input-field"
                      >
                        <option value="service">Service</option>
                        <option value="part">Part</option>
                      </select>
                    </div>

                    {/* Item Name with Quick Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="input-field"
                        placeholder="Enter item name"
                        list={`${item.type}-options-${item.id}`}
                      />
                      <datalist id={`${item.type}-options-${item.id}`}>
                        {(item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS).map((commonItem, index) => (
                          <option key={index} value={commonItem.name} />
                        ))}
                      </datalist>

                      {/* Quick Selection Buttons */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS).slice(0, 4).map((commonItem, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectCommonItem(item.id, commonItem, item.type)}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          >
                            {commonItem.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* HSN/SAC */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">HSN/SAC</label>
                      <input
                        type="text"
                        value={item.hsn_sac}
                        onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                        className="input-field"
                        placeholder="HSN/SAC"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        className="input-field"
                        min="1"
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Taxable Value (Auto-calculated) */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Taxable Value</label>
                      <div className="input-field bg-gray-50">₹{item.taxable_value.toFixed(2)}</div>
                    </div>

                    {/* IGST Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IGST %</label>
                      <select
                        value={item.igst_rate}
                        onChange={(e) => updateItem(item.id, 'igst_rate', parseFloat(e.target.value))}
                        className="input-field"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    {/* IGST Amount (Auto-calculated) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IGST Amount</label>
                      <div className="input-field bg-gray-50">₹{item.igst_amount.toFixed(2)}</div>
                    </div>

                    {/* Total (Auto-calculated) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                      <div className="input-field bg-gray-50 font-semibold">₹{item.total.toFixed(2)}</div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Taxable Amount:</span>
              <span className="text-lg">₹{totals.taxable_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Add: IGST:</span>
              <span className="text-lg">₹{totals.igst_amount.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total Amount After Tax:</span>
                <span className="text-xl font-bold text-purple-600">₹{totals.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="input-field"
              placeholder="Additional notes or terms and conditions"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending || items.length === 0}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(createInvoiceMutation.isPending || updateInvoiceMutation.isPending) ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}