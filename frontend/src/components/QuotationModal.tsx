import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Plus, Trash2, Package, Download } from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';
// Old PDF generator import removed

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation?: any;
}

interface QuotationItem {
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
  { name: 'Engine Oil Change', hsn_sac: '8302', rate: 500, tax_rate: 18 },
  { name: 'Brake Service', hsn_sac: '8302', rate: 800, tax_rate: 18 },
  { name: 'AC Service', hsn_sac: '8302', rate: 1200, tax_rate: 18 },
  { name: 'Wheel Alignment', hsn_sac: '8302', rate: 600, tax_rate: 18 },
  { name: 'Battery Check', hsn_sac: '8302', rate: 200, tax_rate: 18 },
  { name: 'Transmission Service', hsn_sac: '8302', rate: 1500, tax_rate: 18 },
  { name: 'Suspension Service', hsn_sac: '8302', rate: 2000, tax_rate: 18 },
  { name: 'Engine Tune-up', hsn_sac: '8302', rate: 1800, tax_rate: 18 },
];

const COMMON_PARTS = [
  { name: 'Engine Oil (5L)', hsn_sac: '2710', rate: 2500, tax_rate: 18 },
  { name: 'Oil Filter', hsn_sac: '8421', rate: 350, tax_rate: 18 },
  { name: 'Air Filter', hsn_sac: '8421', rate: 450, tax_rate: 18 },
  { name: 'Brake Pads (Set)', hsn_sac: '8708', rate: 1500, tax_rate: 28 },
  { name: 'Spark Plugs (Set)', hsn_sac: '8511', rate: 800, tax_rate: 18 },
  { name: 'Battery', hsn_sac: '8507', rate: 4500, tax_rate: 18 },
  { name: 'Clutch Plate', hsn_sac: '8708', rate: 2800, tax_rate: 28 },
  { name: 'Tyre (1 piece)', hsn_sac: '4011', rate: 3500, tax_rate: 28 },
];

export default function QuotationModal({ isOpen, onClose, quotation }: QuotationModalProps) {
  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    notes: 'This quotation is valid for 30 days from the date of issue.'
  });

  const [items, setItems] = useState<QuotationItem[]>([]);
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
  const [showServicePackages, setShowServicePackages] = useState(false);

  const queryClient = useQueryClient();

  // Fetch service packages for templates
  const { data: servicePackages } = useQuery({
    queryKey: ['service-packages'],
    queryFn: () => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      return axios.get('/api/quotations/templates/service-packages', { headers }).then(res => res.data);
    },
  });

  const createQuotationMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return axios.post('/api/quotations/', data, { headers }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      onClose();
      resetForm();
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: (data: any) => {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      return axios.put(`/api/quotations/${quotation.id}`, data, { headers }).then(res => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      onClose();
    },
  });

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const total_discount = items.reduce((sum, item) => sum + item.discount, 0);
    const taxable_amount = subtotal - total_discount;

    // Calculate GST (assuming intrastate - CGST + SGST)
    let total_tax = 0;
    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;

    items.forEach(item => {
      const item_taxable = (item.qty * item.rate) - item.discount;
      const tax_amount = (item_taxable * item.tax_rate) / 100;
      total_tax += tax_amount;

      // For Chennai (intrastate), split into CGST + SGST
      cgst_amount += tax_amount / 2;
      sgst_amount += tax_amount / 2;
    });

    const gross_total = taxable_amount + total_tax;
    const round_off = Math.round(gross_total) - gross_total;
    const total_amount = Math.round(gross_total);

    setTotals({
      subtotal,
      total_discount,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      total_tax,
      round_off,
      total_amount
    });
  }, [items]);

  // Helper function to format date for input field
  const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString().split('T')[0];

    // If it's already in YYYY-MM-DD format, return as is
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }

    // If it's in datetime format (YYYY-MM-DDTHH:MM:SS), extract date part
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }

    // Try to parse as Date and format
    try {
      return new Date(dateValue).toISOString().split('T')[0];
    } catch (error) {
      console.warn('Invalid date format:', dateValue);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Load quotation data for edit mode
  useEffect(() => {
    if (quotation && quotation.id) {
      console.log('Loading quotation data for edit:', quotation);

      // Set form data with properly formatted dates
      setFormData({
        client_id: quotation.client_id?.toString() || '',
        vehicle_id: quotation.vehicle_id?.toString() || '',
        quotation_date: formatDateForInput(quotation.quotation_date),
        valid_until: formatDateForInput(quotation.valid_until),
        notes: quotation.notes || 'This quotation is valid for 30 days from the date of issue.'
      });

      // Set selected client and vehicle for auto-complete
      if (quotation.client_name) {
        setSelectedClient({
          id: quotation.client_id,
          name: quotation.client_name,
          mobile: '' // We don't have this in the response, but it's optional
        });
      }

      if (quotation.vehicle_registration) {
        setSelectedVehicle({
          id: quotation.vehicle_id,
          registration_number: quotation.vehicle_registration
        });
      }

      // Set items
      if (quotation.items && Array.isArray(quotation.items)) {
        const formattedItems = quotation.items.map((item: any) => ({
          id: item.id?.toString() || Date.now().toString(),
          type: item.item_type || item.type || 'service',
          name: item.name || '',
          hsn_sac: item.hsn_sac || '8302',
          qty: item.quantity || item.qty || 1,
          rate: item.rate || 0,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || 18,
          total: item.total || 0
        }));
        setItems(formattedItems);
      }
    } else {
      // Reset form for create mode
      resetForm();
    }
  }, [quotation]);

  const addItem = () => {
    const newItem: QuotationItem = {
      id: Date.now().toString(),
      type: 'service',
      name: '',
      hsn_sac: '8302',
      qty: 1,
      rate: 0,
      discount: 0,
      tax_rate: 18,
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

        // Recalculate total when qty or rate changes
        if (field === 'qty' || field === 'rate') {
          updatedItem.total = updatedItem.qty * updatedItem.rate;
        }

        return updatedItem;
      }
      return item;
    }));
  };


  const loadServicePackage = (packageData: any) => {
    // Clear existing items and load package items
    const packageItems = packageData.items.map((item: any) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: item.type as 'service' | 'part',
      name: item.name,
      hsn_sac: item.hsn_sac,
      qty: item.qty,
      rate: item.rate,
      total: item.qty * item.rate
    }));

    setItems(packageItems);
    setShowServicePackages(false);
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
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'This quotation is valid for 30 days from the date of issue.'
    });
    setItems([]);
    setSelectedClient(null);
    setSelectedVehicle(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quotationData = {
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
      status: 'pending'
    };

    if (quotation) {
      updateQuotationMutation.mutate(quotationData);
    } else {
      createQuotationMutation.mutate(quotationData);
    }
  };

  const handleGeneratePDF = async () => {
    // Prepare data for PDF generation
    const quotationNumber = quotation?.quotation_number || `QT-${(quotation?.id || 1).toString().padStart(4, '0')}`;
    
    // Assuming a fixed GST rate for simplicity, this could be more dynamic
    const gstRate = items.length > 0 ? items[0].tax_rate : 18;

    // const pdfData: ExactQuotationData = {
    //   quotationNumber: quotationNumber,
    //   quotationDate: formData.quotation_date,
    //   dueDate: formData.valid_until,
    //   clientName: selectedClient?.name || '',
    //   clientAddress: selectedClient?.address || '',
    //   clientPhone: selectedClient?.mobile || '',
    //   vehicleNumber: selectedVehicle?.registration_number || '',
    //   vehicleMake: selectedVehicle?.make || '',
    //   vehicleModel: selectedVehicle?.model || '',
    //   vehicleYear: selectedVehicle?.year?.toString() || '',
    //   vin: selectedVehicle?.vin || '',
    //   items: items.map(item => ({
    //     id: item.id,
    //     description: item.name,
    //     hsnSac: item.hsn_sac,
    //     quantity: item.qty,
    //     rate: item.rate,
    //     amount: item.qty * item.rate,
    //     total: item.total,
    //   })),
    //   taxableAmount: totals.taxable_amount,
    //   cgstRate: gstRate / 2,
    //   cgstAmount: totals.cgst_amount,
    //   sgstRate: gstRate / 2,
    //   sgstAmount: totals.sgst_amount,
    //   totalTax: totals.total_tax,
    //   grandTotal: totals.total_amount,
    // };

    // Generate and download PDF - Old generator removed
    // Use PDFQuotation component instead
    console.log('PDF generation moved to PDFQuotation component');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-0 z-50">
      <div className="bg-white max-w-6xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-1 py-0">
          <h2 className="text-xs font-medium">
            {quotation ? 'Edit' : 'Create'} Quotation
          </h2>
          <button
            onClick={onClose}
            className="p-0 hover:opacity-70"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Company Header */}
        <div className="px-1 py-0">
          <div className="flex items-center gap-1">
            <img src="/logo.webp" alt="LOGO" className="h-4 w-4" />
            <div>
              <h1 className="text-xs font-medium">OM MURUGAN AUTO WORKS</h1>
              <p className="text-xs opacity-70">Chennai | 9884551560 | QUOTATION</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {/* Customer & Vehicle Details */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Customer Selection with Auto-complete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <VehicleOwnerSearch
                selectedClient={selectedClient}
                onClientSelect={handleClientSelect}
                required={true}
              />
            </div>

            {/* Vehicle Selection with Auto-complete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
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
            {/* Quotation Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date *</label>
              <input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
                required
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                required
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Service Packages Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Service Templates</h3>
              <button
                type="button"
                onClick={() => setShowServicePackages(!showServicePackages)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Package className="w-4 h-4" />
                {showServicePackages ? 'Hide Templates' : 'Show Templates'}
              </button>
            </div>

            {showServicePackages && servicePackages?.packages && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded border">
                {servicePackages.packages.map((pkg: any) => (
                  <div key={pkg.id} className="bg-white border border-gray-200 rounded p-2 hover:shadow-sm transition-shadow">
                    <h4 className="text-xs font-medium text-gray-800 mb-1">{pkg.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {pkg.items.length} items | ₹{(pkg.estimated_total/1000).toFixed(0)}k
                    </p>
                    <button
                      type="button"
                      onClick={() => loadServicePackage(pkg)}
                      className="w-full px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Services & Parts</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowServicePackages(!showServicePackages)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Service Templates"
                >
                  <Package className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>
            </div>

            {/* Table Header - Improved Spacing */}
            <div className="grid grid-cols-12 gap-1 py-2 bg-gray-100 border-b border-gray-300 text-xs font-semibold text-gray-700">

              <div className="col-span-4 px-2 text-center">Description</div>
              <div className="px-2 text-center">HSN</div>
              <div className="px-2 text-center">Qty</div>
              <div className="col-span-2 px-2 text-center">Rate</div>
              <div className="col-span-2 px-2 text-center">Taxable</div>
              <div className="px-2 text-center">GST%</div>
              <div className="px-2 text-center">Total</div>
            </div>

            {/* Table Body */}
            <div className="border border-gray-300 bg-white">
              {items.map((item, index) => (
                <div key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-12 gap-1 py-1">
                    {/* Description */}
                    <div className="col-span-4 px-2 flex gap-2">
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                        className="w-20 text-xs border border-gray-300 rounded px-1 py-1 bg-white focus:outline-none focus:border-blue-500"
                        title="Type"
                      >
                        <option value="service">Service</option>
                        <option value="part">Parts</option>
                      </select>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        placeholder="Service or Part name"
                        list={`${item.type}-options-${item.id}`}
                      />
                      <datalist id={`${item.type}-options-${item.id}`}>
                        {(item.type === 'service' ? COMMON_SERVICES : COMMON_PARTS).map((commonItem, index) => (
                          <option key={index} value={commonItem.name} />
                        ))}
                      </datalist>
                    </div>

                    {/* HSN */}
                    <div className="px-2">
                      <input
                        type="text"
                        value={item.hsn_sac}
                        onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        placeholder="HSN"
                      />
                    </div>

                    {/* Qty */}
                    <div className="px-2">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 text-center"
                        min="1"
                      />
                    </div>

                    {/* Rate */}
                    <div className="col-span-2 px-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 text-right"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    {/* Taxable Value */}
                    <div className="col-span-2 px-2 text-xs py-2 text-right font-medium">₹{((item.qty * item.rate) - item.discount).toFixed(0)}</div>

                    {/* GST Rate */}
                    <div className="px-2">
                      <select
                        value={item.tax_rate}
                        onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value))}
                        className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:outline-none focus:border-blue-500"
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    {/* Total + Remove */}
                    <div className="px-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-right">₹{(((item.qty * item.rate) - item.discount) * (1 + item.tax_rate / 100)).toFixed(0)}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:bg-red-100 rounded p-1 ml-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Discount row */}
                  <div className="grid grid-cols-12 gap-1 py-1 bg-gray-50">
                    <div className="col-span-6 px-2"></div>
                    <div className="col-span-2 px-2">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 text-right"
                        placeholder="Discount"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-4 px-2 text-xs text-gray-500 py-2">
                      {item.discount > 0 && `Discount: -₹${item.discount.toFixed(0)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Section */}
          <div className="mt-1">
            <div className="flex justify-end">
              <div className="bg-gray-50 border border-gray-300 rounded p-1 w-44">
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{totals.subtotal.toFixed(0)}</span>
                  </div>
                  {totals.total_discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span className="font-medium">-₹{totals.total_discount.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxable Amount:</span>
                    <span className="font-medium">₹{totals.taxable_amount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST:</span>
                    <span className="font-medium">₹{totals.cgst_amount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">SGST:</span>
                    <span className="font-medium">₹{totals.sgst_amount.toFixed(0)}</span>
                  </div>
                  {totals.round_off !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Round Off:</span>
                      <span className="font-medium">₹{totals.round_off.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-300 pt-1 mt-1">
                    <span className="font-semibold text-gray-800">Total Amount:</span>
                    <span className="font-bold text-blue-600">₹{totals.total_amount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Terms & Conditions</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Enter terms and conditions..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>

            {/* PDF Generation Button */}
            <button
              type="button"
              onClick={handleGeneratePDF}
              disabled={items.length === 0 || !selectedClient || !selectedVehicle}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Generate PDF Preview"
            >
              <Download className="w-4 h-4" />
              Generate PDF
            </button>

            <button
              type="submit"
              disabled={createQuotationMutation.isPending || updateQuotationMutation.isPending || items.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {(createQuotationMutation.isPending || updateQuotationMutation.isPending) ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                quotation ? 'Update Quotation' : 'Create Quotation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}