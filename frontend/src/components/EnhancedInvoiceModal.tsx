import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Car, User, FileText, Calculator, Camera, Upload } from 'lucide-react';
import axios from 'axios';

interface EnhancedInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
}

interface InvoiceItem {
  id: string;
  type: 'service' | 'part';
  name: string;
  description?: string;
  hsn_sac: string;
  qty: number;
  unit_price: number;
  discount: number;
  discount_type: 'percent' | 'amount';
  taxable_value: number;
  igst_rate: number;
  igst_amount: number;
  total: number;
  category?: string;
  warranty?: number;
  is_oem?: boolean;
}

interface PaymentRecord {
  id: string;
  payment_method: string;
  amount: number;
  transaction_id?: string;
  payment_date: string;
  notes?: string;
}

const SERVICE_TYPES = [
  'General Service',
  'Periodic Maintenance',
  'Accident Repair',
  'Insurance Claim',
  'Breakdown Repair',
  'Wheel Alignment / Tyre',
  'Electrical / Mechanical'
];

const SERVICE_CATEGORIES = [
  'Engine',
  'Body',
  'Electrical',
  'Transmission',
  'Brakes',
  'Suspension',
  'AC/Cooling',
  'Interior'
];

const PAYMENT_METHODS = [
  'UPI',
  'Cash',
  'Card',
  'Bank Transfer',
  'Cheque'
];

const PAYMENT_STATUS_OPTIONS = [
  'Paid',
  'Pending',
  'Partially Paid'
];

const COMMON_SERVICES = [
  { name: 'Engine Oil Change', category: 'Engine', hsn_sac: '8302', labor_hours: 1, rate: 500 },
  { name: 'Brake Service', category: 'Brakes', hsn_sac: '8302', labor_hours: 2, rate: 800 },
  { name: 'AC Service', category: 'AC/Cooling', hsn_sac: '8302', labor_hours: 1.5, rate: 1200 },
  { name: 'Wheel Alignment', category: 'Suspension', hsn_sac: '8302', labor_hours: 1, rate: 600 },
  { name: 'Battery Check', category: 'Electrical', hsn_sac: '8302', labor_hours: 0.5, rate: 200 },
  { name: 'Transmission Service', category: 'Transmission', hsn_sac: '8302', labor_hours: 2, rate: 1500 },
  { name: 'Engine Tune-up', category: 'Engine', hsn_sac: '8302', labor_hours: 3, rate: 1800 }
];

const COMMON_PARTS = [
  { name: 'Engine Oil (5L)', hsn_code: '2710', unit_price: 2500, is_oem: true, warranty: 6 },
  { name: 'Oil Filter', hsn_code: '8421', unit_price: 350, is_oem: true, warranty: 6 },
  { name: 'Air Filter', hsn_code: '8421', unit_price: 450, is_oem: true, warranty: 12 },
  { name: 'Brake Pads (Set)', hsn_code: '8708', unit_price: 1500, is_oem: false, warranty: 12 },
  { name: 'Spark Plugs (Set)', hsn_code: '8511', unit_price: 800, is_oem: true, warranty: 24 },
  { name: 'Battery', hsn_code: '8507', unit_price: 4500, is_oem: false, warranty: 36 },
  { name: 'Clutch Plate', hsn_code: '8708', unit_price: 2800, is_oem: false, warranty: 24 },
  { name: 'Tyre (1 piece)', hsn_code: '4011', unit_price: 3500, is_oem: false, warranty: 60 }
];

export default function EnhancedInvoiceModal({ isOpen, onClose, invoice }: EnhancedInvoiceModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Invoice Details
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_status: 'pending',

    // Customer Details
    client_id: '',
    customer_name: '',
    mobile_number: '',
    email: '',
    billing_address: '',
    pickup_drop_required: false,

    // Vehicle Details
    vehicle_id: '',
    vehicle_number: '',
    vehicle_brand: '',
    vehicle_model: '',
    chassis_number: '',
    engine_number: '',
    fuel_type: '',
    km_reading_in: '',
    km_reading_out: '',
    service_type: '',

    // Transport & Billing
    challan_no: '',
    challan_date: new Date().toISOString().split('T')[0],
    transport: '',
    transport_id: '',
    place_of_supply: 'Tamil Nadu (33)',
    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totals, setTotals] = useState({
    taxable_amount: 0,
    discount_amount: 0,
    igst_amount: 0,
    total_amount: 0,
    paid_amount: 0,
    balance_due: 0
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customerSignature, setCustomerSignature] = useState('');
  const [technicianSignature, setTechnicianSignature] = useState('');

  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => axios.get('/api/clients/?search=').then(res => res.data),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => axios.get('/api/vehicles/?search=').then(res => res.data),
  });

  const { data: vehicleBrands } = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: () => axios.get('/api/vehicles/brands').then(res => res.data),
  });

  // Calculate totals whenever items or payments change
  useEffect(() => {
    const taxable_amount = items.reduce((sum, item) => sum + item.taxable_value, 0);
    const discount_amount = items.reduce((sum, item) => {
      if (item.discount_type === 'percent') {
        return sum + (item.unit_price * item.qty * item.discount / 100);
      }
      return sum + (item.discount * item.qty);
    }, 0);
    const igst_amount = items.reduce((sum, item) => sum + item.igst_amount, 0);
    const total_amount = taxable_amount + igst_amount;
    const paid_amount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance_due = total_amount - paid_amount;

    setTotals({
      taxable_amount,
      discount_amount,
      igst_amount,
      total_amount,
      paid_amount,
      balance_due
    });
  }, [items, payments]);

  const addItem = (type: 'service' | 'part') => {
    const newItem: InvoiceItem = {
      id: `${type}_${Date.now()}`,
      type,
      name: '',
      hsn_sac: type === 'service' ? '8302' : '8421',
      qty: 1,
      unit_price: 0,
      discount: 0,
      discount_type: 'percent',
      taxable_value: 0,
      igst_rate: 18,
      igst_amount: 0,
      total: 0,
      category: '',
      warranty: type === 'part' ? 12 : undefined,
      is_oem: type === 'part' ? true : undefined
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Recalculate totals for this item
        const baseAmount = updatedItem.qty * updatedItem.unit_price;
        let discountAmount = 0;

        if (updatedItem.discount_type === 'percent') {
          discountAmount = baseAmount * (updatedItem.discount / 100);
        } else {
          discountAmount = updatedItem.discount * updatedItem.qty;
        }

        updatedItem.taxable_value = baseAmount - discountAmount;
        updatedItem.igst_amount = updatedItem.taxable_value * (updatedItem.igst_rate / 100);
        updatedItem.total = updatedItem.taxable_value + updatedItem.igst_amount;

        return updatedItem;
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addPayment = () => {
    const newPayment: PaymentRecord = {
      id: `payment_${Date.now()}`,
      payment_method: 'Cash',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    setPayments(prev => [...prev, newPayment]);
  };

  const updatePayment = (id: string, field: keyof PaymentRecord, value: any) => {
    setPayments(prev => prev.map(payment =>
      payment.id === id ? { ...payment, [field]: value } : payment
    ));
  };

  const deletePayment = (id: string) => {
    setPayments(prev => prev.filter(payment => payment.id !== id));
  };

  const handleQuickAddService = (service: typeof COMMON_SERVICES[0]) => {
    const newItem: InvoiceItem = {
      id: `service_${Date.now()}`,
      type: 'service',
      name: service.name,
      category: service.category,
      hsn_sac: service.hsn_sac,
      qty: service.labor_hours,
      unit_price: service.rate,
      discount: 0,
      discount_type: 'percent',
      taxable_value: service.labor_hours * service.rate,
      igst_rate: 18,
      igst_amount: (service.labor_hours * service.rate) * 0.18,
      total: (service.labor_hours * service.rate) * 1.18
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleQuickAddPart = (part: typeof COMMON_PARTS[0]) => {
    const newItem: InvoiceItem = {
      id: `part_${Date.now()}`,
      type: 'part',
      name: part.name,
      hsn_sac: part.hsn_code,
      qty: 1,
      unit_price: part.unit_price,
      discount: 0,
      discount_type: 'percent',
      taxable_value: part.unit_price,
      igst_rate: 18,
      igst_amount: part.unit_price * 0.18,
      total: part.unit_price * 1.18,
      warranty: part.warranty,
      is_oem: part.is_oem
    };
    setItems(prev => [...prev, newItem]);
  };

  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/invoices/', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
      resetForm();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const invoiceData = {
      ...formData,
      items,
      payments,
      ...totals,
      attachments: selectedFiles,
      customer_signature: customerSignature,
      technician_signature: technicianSignature
    };

    createInvoiceMutation.mutate(invoiceData);
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_status: 'pending',
      client_id: '',
      customer_name: '',
      mobile_number: '',
      email: '',
      billing_address: '',
      pickup_drop_required: false,
      vehicle_id: '',
      vehicle_number: '',
      vehicle_brand: '',
      vehicle_model: '',
      chassis_number: '',
      engine_number: '',
      fuel_type: '',
      km_reading_in: '',
      km_reading_out: '',
      service_type: '',
      challan_no: '',
      challan_date: new Date().toISOString().split('T')[0],
      transport: '',
      transport_id: '',
      place_of_supply: 'Tamil Nadu (33)',
      notes: ''
    });
    setItems([]);
    setPayments([]);
    setSelectedFiles([]);
    setCustomerSignature('');
    setTechnicianSignature('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {invoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <p className="text-sm text-gray-600">
              OM MURUGAN AUTO WORKS - Complete Invoice Management
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'basic', label: 'Invoice Details', icon: FileText },
            { id: 'customer', label: 'Customer & Vehicle', icon: User },
            { id: 'services', label: 'Services & Parts', icon: Calculator },
            { id: 'payments', label: 'Payments', icon: Car },
            { id: 'attachments', label: 'Photos & Signature', icon: Camera }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Invoice Details */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                    className="input-field"
                  >
                    {PAYMENT_STATUS_OPTIONS.map(status => (
                      <option key={status} value={status.toLowerCase().replace(' ', '_')}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select Service Type</option>
                    {SERVICE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challan Number
                  </label>
                  <input
                    type="text"
                    value={formData.challan_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, challan_no: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challan Date
                  </label>
                  <input
                    type="date"
                    value={formData.challan_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, challan_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formData.place_of_supply}
                    onChange={(e) => setFormData(prev => ({ ...prev, place_of_supply: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Customer & Vehicle Details */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Customer Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                    className="input-field"
                    placeholder="Enter mobile number (unique ID)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="pickup_drop"
                    checked={formData.pickup_drop_required}
                    onChange={(e) => setFormData(prev => ({ ...prev, pickup_drop_required: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="pickup_drop" className="text-sm font-medium text-gray-700">
                    Vehicle Pickup / Drop Required
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Billing Address
                </label>
                <textarea
                  value={formData.billing_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 pt-4 border-t">Vehicle Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_number: e.target.value.toUpperCase() }))}
                    className="input-field"
                    placeholder="TN 01 AB 1234"
                    style={{ textTransform: 'uppercase' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Brand *
                  </label>
                  <select
                    value={formData.vehicle_brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_brand: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">Select Brand</option>
                    {vehicleBrands?.map((brand: any) => (
                      <option key={brand.id} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                    className="input-field"
                    placeholder="Auto-filled or manual entry"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chassis Number
                  </label>
                  <input
                    type="text"
                    value={formData.chassis_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, chassis_number: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    value={formData.engine_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, engine_number: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    KM Reading (In)
                  </label>
                  <input
                    type="number"
                    value={formData.km_reading_in}
                    onChange={(e) => setFormData(prev => ({ ...prev, km_reading_in: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    KM Reading (Out)
                  </label>
                  <input
                    type="number"
                    value={formData.km_reading_out}
                    onChange={(e) => setFormData(prev => ({ ...prev, km_reading_out: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Services & Parts Tab */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Services & Parts</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addItem('service')}
                    className="btn-secondary text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Service
                  </button>
                  <button
                    type="button"
                    onClick={() => addItem('part')}
                    className="btn-secondary text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Part
                  </button>
                </div>
              </div>

              {/* Quick Add Services */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Quick Add Common Services</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {COMMON_SERVICES.map((service, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickAddService(service)}
                      className="text-left p-2 bg-blue-50 hover:bg-blue-100 rounded text-sm"
                    >
                      <div className="font-medium">{service.name}</div>
                      <div className="text-gray-600">{service.category} • ₹{service.rate}/hr • {service.labor_hours}h</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Add Parts */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-2">Quick Add Common Parts</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {COMMON_PARTS.map((part, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickAddPart(part)}
                      className="text-left p-2 bg-green-50 hover:bg-green-100 rounded text-sm"
                    >
                      <div className="font-medium">{part.name}</div>
                      <div className="text-gray-600">
                        ₹{part.unit_price} • {part.is_oem ? 'OEM' : 'Aftermarket'} • {part.warranty}M Warranty
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Type</th>
                      <th className="border border-gray-300 p-2 text-left">Item Name</th>
                      <th className="border border-gray-300 p-2 text-left">HSN/SAC</th>
                      <th className="border border-gray-300 p-2 text-left">Qty</th>
                      <th className="border border-gray-300 p-2 text-left">Rate</th>
                      <th className="border border-gray-300 p-2 text-left">Discount</th>
                      <th className="border border-gray-300 p-2 text-left">Tax %</th>
                      <th className="border border-gray-300 p-2 text-left">Total</th>
                      <th className="border border-gray-300 p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-gray-300 p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className="w-full p-1 border rounded"
                            placeholder="Item name"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={item.hsn_sac}
                            onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                            className="w-full p-1 border rounded"
                            placeholder="HSN/SAC"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-20 p-1 border rounded"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="w-24 p-1 border rounded"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td className="border border-gray-300 p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-16 p-1 border rounded"
                              step="0.01"
                              min="0"
                            />
                            <select
                              value={item.discount_type}
                              onChange={(e) => updateItem(item.id, 'discount_type', e.target.value)}
                              className="w-12 p-1 border rounded text-xs"
                            >
                              <option value="percent">%</option>
                              <option value="amount">₹</option>
                            </select>
                          </div>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input
                            type="number"
                            value={item.igst_rate}
                            onChange={(e) => updateItem(item.id, 'igst_rate', parseFloat(e.target.value) || 0)}
                            className="w-16 p-1 border rounded"
                            step="0.01"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="border border-gray-300 p-2 font-medium">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="bg-gray-50 p-4 rounded">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Taxable Amount:</span>
                    <div className="font-semibold">₹{totals.taxable_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Discount:</span>
                    <div className="font-semibold text-red-600">-₹{totals.discount_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">IGST:</span>
                    <div className="font-semibold">₹{totals.igst_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <div className="font-bold text-lg">₹{totals.total_amount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Payment Details</h3>
                <button
                  type="button"
                  onClick={addPayment}
                  className="btn-secondary text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Payment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-blue-600">Total Billed</div>
                  <div className="text-xl font-bold text-blue-800">₹{totals.total_amount.toFixed(2)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-green-600">Amount Received</div>
                  <div className="text-xl font-bold text-green-800">₹{totals.paid_amount.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 p-4 rounded">
                  <div className="text-sm text-red-600">Balance Due</div>
                  <div className="text-xl font-bold text-red-800">₹{totals.balance_due.toFixed(2)}</div>
                </div>
              </div>

              {/* Payment Records */}
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border border-gray-300 rounded p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          value={payment.payment_method}
                          onChange={(e) => updatePayment(payment.id, 'payment_method', e.target.value)}
                          className="input-field"
                        >
                          {PAYMENT_METHODS.map(method => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="input-field"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          value={payment.transaction_id || ''}
                          onChange={(e) => updatePayment(payment.id, 'transaction_id', e.target.value)}
                          className="input-field"
                          placeholder="For digital payments"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={payment.payment_date}
                          onChange={(e) => updatePayment(payment.id, 'payment_date', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => deletePayment(payment.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={payment.notes || ''}
                        onChange={(e) => updatePayment(payment.id, 'notes', e.target.value)}
                        className="input-field"
                        placeholder="Payment notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos & Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Photos & Attachments</h3>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Photos (Before Service, After Service, Damage, Part Proof)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700">Upload photos</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each</p>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">{selectedFiles.length} file(s) selected</p>
                  </div>
                )}
              </div>

              {/* Digital Signatures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Signature
                  </label>
                  <div className="border border-gray-300 rounded p-4 min-h-[120px] bg-gray-50">
                    <p className="text-sm text-gray-500">Digital signature pad will be implemented here</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technician Signature
                  </label>
                  <div className="border border-gray-300 rounded p-4 min-h-[120px] bg-gray-50">
                    <p className="text-sm text-gray-500">Digital signature pad will be implemented here</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Any additional notes about the service..."
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createInvoiceMutation.isPending ? 'Creating Invoice...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}