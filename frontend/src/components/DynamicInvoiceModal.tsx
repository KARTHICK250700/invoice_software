import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, Car, User, Calendar, FileText, Calculator,
  Receipt, Truck, Wrench, CreditCard
} from 'lucide-react';
import axios from 'axios';
import VehicleOwnerSearch from './VehicleOwnerSearch';
import VehicleAutoComplete from './VehicleAutoComplete';
import PaymentSection from './PaymentSection';
import PDFInvoice from './PDFInvoice';

interface Invoice {
  id?: number;
  client_id: number;
  vehicle_id: number;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  taxable_amount: number;
  gst_enabled: boolean;
  tax_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount_amount: number;
  round_off: number;
  service_type?: string;
  km_reading_in?: number;
  km_reading_out?: number;
  challan_no?: string;
  challan_date?: string;
  eway_bill_no?: string;
  transport?: string;
  transport_id?: string;
  place_of_supply?: string;
  hsn_sac_code?: string;
  technician_name?: string;
  work_order_no?: string;
  estimate_no?: string;
  insurance_claim: boolean;
  warranty_applicable: boolean;
  items: InvoiceItem[];
}

interface DynamicInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
}

interface InvoiceItem {
  id: string;
  item_type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  quantity: number;
  rate: number | string;
  total: number;
}

interface FormData {
  client_id: string;
  vehicle_id: string;
  invoice_date: string;
  due_date: string;
  gst_enabled: boolean;
  tax_rate: number | string;
  cgst_rate: number | string;
  sgst_rate: number | string;
  igst_rate: number | string;
  taxable_amount: number | string;
  cgst_amount: number | string;
  sgst_amount: number | string;
  igst_amount: number | string;
  discount_amount: number | string;
  round_off: number | string;
  total_amount: number | string;
  service_type: string;
  km_reading_in: string;
  km_reading_out: string;
  challan_no: string;
  challan_date: string;
  eway_bill_no: string;
  transport: string;
  transport_id: string;
  place_of_supply: string;
  hsn_sac_code: string;
  technician_name: string;
  work_order_no: string;
  estimate_no: string;
  insurance_claim: boolean;
  warranty_applicable: boolean;
  notes: string;
  payment_method: string;
  payment_reference: string;
  payment_status: string;
  payment_date: string;
  payment_amount: number | string;
  payment_bank: string;
  payment_account: string;
  payment_notes: string;
  payment_type: string;
  advance_amount: number | string;
  advance_date: string;
  payment_due_days: number;
  late_fee_applicable: boolean;
  late_fee_amount: number | string;
  early_payment_discount: number | string;
  preferred_payment_method: string;
  credit_limit: number | string;
  credit_days: number;
  paid_amount: number | string;
  invoice_unique_id: string;
  mobile_invoice_sent: boolean;
  email_invoice_sent: boolean;
  whatsapp_sent: boolean;
  customer_mobile_alt: string;
  customer_email_alt: string;
}

const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

export default function DynamicInvoiceModal({ isOpen, onClose, invoice }: DynamicInvoiceModalProps) {
  const [activeTab, setActiveTab] = useState('basic');

  // State for client and vehicle selections (needed for auto-complete components)
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isLoadingEditData, setIsLoadingEditData] = useState<boolean>(false);
  // State declarations are now clean and working

  // Enhanced form data with all backend fields
  const [formData, setFormData] = useState<FormData>({
    // Basic Details
    client_id: '',
    vehicle_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',

    // GST Configuration (Optional)
    gst_enabled: false,
    tax_rate: '',
    cgst_rate: '',
    sgst_rate: '',
    igst_rate: '',

    // Amounts
    taxable_amount: 0.0,
    cgst_amount: 0.0,
    sgst_amount: 0.0,
    igst_amount: 0.0,
    discount_amount: 0.0,
    round_off: 0.0,
    total_amount: 0.0,

    // Car Service Fields
    service_type: '',
    km_reading_in: '',
    km_reading_out: '',
    challan_no: '',
    challan_date: '',
    eway_bill_no: '',
    transport: '',
    transport_id: '',
    place_of_supply: 'Tamil Nadu (33)',
    hsn_sac_code: '8302',

    // Additional Fields
    technician_name: '',
    work_order_no: '',
    estimate_no: '',
    insurance_claim: false,
    warranty_applicable: false,

    // Payment Fields
    payment_status: 'pending',
    payment_method: 'Cash',
    payment_reference: '',
    payment_date: '',
    payment_amount: 0.0,
    payment_bank: '',
    payment_account: '',
    payment_notes: '',
    payment_type: 'Full',
    advance_amount: 0.0,
    advance_date: '',
    payment_due_days: 30,
    late_fee_applicable: false,
    late_fee_amount: 0.0,
    early_payment_discount: 0.0,
    preferred_payment_method: '',
    credit_limit: 0.0,
    credit_days: 0,
    paid_amount: 0.0,

    // Invoice Unique Features
    invoice_unique_id: '',
    mobile_invoice_sent: false,
    email_invoice_sent: false,
    whatsapp_sent: false,
    customer_mobile_alt: '',
    customer_email_alt: '',

    notes: ''
  });

  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Auto-selection state for services and parts
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [serviceSearchTerm, setServiceSearchTerm] = useState<string>('');
  const [partSearchTerm, setPartSearchTerm] = useState<string>('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Service Types for Car Service Center
  const SERVICE_TYPES = [
    'General Service', 'Oil Change', 'Brake Service', 'AC Service',
    'Engine Repair', 'Transmission Service', 'Body Work', 'Electrical Repair',
    'Suspension Service', 'Wheel Alignment', 'Tyre Service', 'Battery Service'
  ];

  // Technician list (can be fetched from backend)
  const TECHNICIANS = [
    'Murugan - Senior Technician',
    'Kumar - Engine Specialist',
    'Ravi - Body Work Expert',
    'Suresh - Electrical Technician',
    'Ganesh - AC Specialist',
    'Prakash - Brake Expert'
  ];

  // Common services and parts
  const COMMON_SERVICES = [
    { name: 'Engine Oil Change', hsn_sac: '9986' },
    { name: 'Brake Pad Replacement', hsn_sac: '8708' },
    { name: 'AC Gas Filling', hsn_sac: '8415' },
    { name: 'Battery Check & Service', hsn_sac: '8507' },
    { name: 'Tyre Rotation', hsn_sac: '4011' }
  ];

  const COMMON_PARTS = [
    { name: 'Engine Oil (5L)', hsn_sac: '2710' },
    { name: 'Oil Filter', hsn_sac: '8421' },
    { name: 'Air Filter', hsn_sac: '8421' },
    { name: 'Brake Pads (Set)', hsn_sac: '8708' },
    { name: 'Spark Plugs (Set)', hsn_sac: '8511' },
    { name: 'Battery (12V)', hsn_sac: '8507' },
    { name: 'Brake Oil (1L)', hsn_sac: '3819' },
    { name: 'Tyre (1 piece)', hsn_sac: '4011' },
    { name: 'Coolant (1L)', hsn_sac: '3820' }
  ];

  const tabs = [
    { id: 'basic', label: 'Basic Details', icon: FileText },
    { id: 'service', label: 'Service Info', icon: Wrench },
    { id: 'items', label: 'Items & Services', icon: Receipt },
    { id: 'gst', label: 'GST Settings', icon: Calculator },
    { id: 'transport', label: 'Transport', icon: Truck },
  ];

  // Calculate GST and totals automatically
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    let cgst = 0, sgst = 0, igst = 0;

    if (formData.gst_enabled) {
      // For intra-state (Chennai/Tamil Nadu), use CGST + SGST
      const cgstRate = typeof formData.cgst_rate === 'string' ? parseInt(formData.cgst_rate) || 0 : formData.cgst_rate || 0;
      const sgstRate = typeof formData.sgst_rate === 'string' ? parseInt(formData.sgst_rate) || 0 : formData.sgst_rate || 0;
      cgst = (subtotal * cgstRate) / 100;
      sgst = (subtotal * sgstRate) / 100;
      igst = 0; // No IGST for intra-state
    }

    const discountAmount = typeof formData.discount_amount === 'string' ? parseFloat(formData.discount_amount) : formData.discount_amount;
    const roundOff = typeof formData.round_off === 'string' ? parseFloat(formData.round_off) : formData.round_off;
    const totalAmount = subtotal + cgst + sgst + igst - discountAmount + roundOff;

    setFormData(prev => ({
      ...prev,
      taxable_amount: subtotal,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: totalAmount
    }));
  }, [items, formData.gst_enabled, formData.cgst_rate, formData.sgst_rate, formData.igst_rate, formData.discount_amount, formData.round_off]);

  // Add new item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      item_type: 'service',
      name: '',
      hsn_sac: '',
      quantity: 1,
      rate: '',
      total: 0
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Update item
  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Recalculate total when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          const rate = typeof updatedItem.rate === 'string' ? parseInt(updatedItem.rate) || 0 : updatedItem.rate || 0;
          updatedItem.total = updatedItem.quantity * rate;
        }

        return updatedItem;
      }
      return item;
    }));
  };

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🌐 API CALL STARTING');
      console.log('  🎯 Operation:', invoice ? 'UPDATE' : 'CREATE');
      console.log('  🔗 URL:', invoice ? `/api/invoices/${invoice.id}` : '/api/invoices/');
      console.log('  📤 Data being sent:');
      console.log('    - client_id:', data.client_id, typeof data.client_id);
      console.log('    - vehicle_id:', data.vehicle_id, typeof data.vehicle_id);
      console.log('    - items count:', data.items?.length || 0);
      console.log('    - Complete payload:', data);

      const response = invoice
        ? await axios.put(`/api/invoices/${invoice.id}`, data)
        : await axios.post('/api/invoices/', data);

      console.log('🎉 API CALL SUCCESS');
      console.log('  📥 Response data:', response.data);

      return response.data;
    },
    onSuccess: (responseData) => {
      console.log('✅ Invoice saved successfully');
      console.log('  📊 Saved invoice data:', responseData);
      console.log('  🆔 Saved client_id:', responseData.client_id);
      console.log('  🚗 Saved vehicle_registration:', responseData.vehicle_registration);
      console.log('  🧹 Cleaning up state...');

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setItems([]); // Clear items
      setSelectedClient(null);
      setSelectedVehicle(null);
      setActiveDropdown(null);
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Invoice operation failed:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // Show specific validation errors
      if (error.response?.status === 422 && error.response?.data?.detail) {
        const validationErrors = error.response.data.detail;
        console.error('❌ Validation errors:', validationErrors);

        let errorMessage = 'Validation errors:\n';
        validationErrors.forEach((err: any) => {
          errorMessage += `- ${err.loc?.join('.')} → ${err.msg}\n`;
        });
        alert(errorMessage);
      } else {
        alert('Failed to save invoice. Please check all fields and try again.');
      }
    },
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      client_id: '',
      vehicle_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      gst_enabled: false,
      tax_rate: '',
      cgst_rate: '',
      sgst_rate: '',
      igst_rate: '',
      taxable_amount: 0.0,
      cgst_amount: 0.0,
      sgst_amount: 0.0,
      igst_amount: 0.0,
      discount_amount: 0.0,
      round_off: 0.0,
      total_amount: 0.0,
      service_type: '',
      km_reading_in: '',
      km_reading_out: '',
      challan_no: '',
      challan_date: '',
      eway_bill_no: '',
      transport: '',
      transport_id: '',
      place_of_supply: 'Tamil Nadu (33)',
      hsn_sac_code: '8302',
      technician_name: '',
      work_order_no: '',
      estimate_no: '',
      insurance_claim: false,
      warranty_applicable: false,
      payment_status: 'pending',
      payment_method: 'Cash',
      payment_reference: '',
      payment_date: '',
      payment_amount: 0.0,
      payment_bank: '',
      payment_account: '',
      payment_notes: '',
      payment_type: 'Full',
      advance_amount: 0.0,
      advance_date: '',
      payment_due_days: 30,
      late_fee_applicable: false,
      late_fee_amount: 0.0,
      early_payment_discount: 0.0,
      preferred_payment_method: '',
      credit_limit: 0.0,
      credit_days: 0,
      paid_amount: 0.0,
      invoice_unique_id: '',
      mobile_invoice_sent: false,
      email_invoice_sent: false,
      whatsapp_sent: false,
      customer_mobile_alt: '',
      customer_email_alt: '',
      notes: ''
    });
    setItems([]);
    setSelectedClient(null);
    setSelectedVehicle(null);
  };

  // Helper functions for PDF generation (copied from PDFInvoice component)
  const formatNumber = (value: number): string => {
    return isNaN(value) ? '0.00' : value.toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Create temporary invoice object for PDF generation in CREATE mode
  const createTempInvoiceForPDF = () => {
    if (!formData.client_id || !formData.vehicle_id || !selectedClient || !selectedVehicle) {
      alert('Please select both client and vehicle before generating PDF.');
      return null;
    }

    return {
      id: 0, // Temporary ID for CREATE mode
      invoice_number: `DRAFT-${Date.now()}`, // Temporary invoice number
      client_id: parseInt(formData.client_id),
      vehicle_id: parseInt(formData.vehicle_id),
      invoice_date: formData.invoice_date || new Date().toISOString().split('T')[0],
      due_date: formData.due_date || null,

      // GST Configuration
      gst_enabled: formData.gst_enabled || false,
      tax_rate: typeof formData.tax_rate === 'string' ? parseInt(formData.tax_rate) || 0 : formData.tax_rate || 0,
      cgst_rate: typeof formData.cgst_rate === 'string' ? parseInt(formData.cgst_rate) || 0 : formData.cgst_rate || 0,
      sgst_rate: typeof formData.sgst_rate === 'string' ? parseInt(formData.sgst_rate) || 0 : formData.sgst_rate || 0,
      igst_rate: typeof formData.igst_rate === 'string' ? parseInt(formData.igst_rate) || 0 : formData.igst_rate || 0,

      // Amounts
      taxable_amount: typeof formData.taxable_amount === 'string' ? parseFloat(formData.taxable_amount) || 0.0 : formData.taxable_amount,
      cgst_amount: typeof formData.cgst_amount === 'string' ? parseFloat(formData.cgst_amount) || 0.0 : formData.cgst_amount,
      sgst_amount: typeof formData.sgst_amount === 'string' ? parseFloat(formData.sgst_amount) || 0.0 : formData.sgst_amount,
      igst_amount: typeof formData.igst_amount === 'string' ? parseFloat(formData.igst_amount) || 0.0 : formData.igst_amount,
      discount_amount: typeof formData.discount_amount === 'string' ? parseFloat(formData.discount_amount) || 0.0 : formData.discount_amount,
      round_off: typeof formData.round_off === 'string' ? parseFloat(formData.round_off) || 0.0 : formData.round_off,
      total_amount: typeof formData.total_amount === 'string' ? parseFloat(formData.total_amount) || 0.0 : formData.total_amount,

      // Service fields
      service_type: formData.service_type || null,
      km_reading_in: formData.km_reading_in ? parseInt(formData.km_reading_in.toString()) : null,
      km_reading_out: formData.km_reading_out ? parseInt(formData.km_reading_out.toString()) : null,
      technician_name: formData.technician_name || null,
      work_order_no: formData.work_order_no || null,
      estimate_no: formData.estimate_no || null,
      challan_no: formData.challan_no || null,
      challan_date: formData.challan_date || null,
      eway_bill_no: formData.eway_bill_no || null,
      transport: formData.transport || null,
      transport_id: formData.transport_id || null,
      place_of_supply: formData.place_of_supply || null,
      hsn_sac_code: formData.hsn_sac_code || null,
      insurance_claim: formData.insurance_claim || false,
      warranty_applicable: formData.warranty_applicable || false,
      notes: formData.notes || null,

      // Include current items
      items: items,

      // Include selected client and vehicle data for PDF
      client: selectedClient,
      vehicle: selectedVehicle
    };
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 🚀 Enhanced debugging for save operation
    console.log('🚀 SAVE OPERATION STARTED');
    console.log('  📋 Form Data Vehicle ID:', formData.vehicle_id);
    console.log('  🚗 Selected Vehicle Object:', selectedVehicle);
    console.log('  🏷️  Selected Vehicle ID from Object:', selectedVehicle?.id);
    console.log('  👤 Form Data Client ID:', formData.client_id);
    console.log('  👨‍💼 Selected Client Object:', selectedClient);
    console.log('  💾 Is Edit Mode?', !!invoice);

    // 🔍 Sync vehicle_id if vehicle is selected but form data is missing
    if (selectedVehicle && (!formData.vehicle_id || formData.vehicle_id !== selectedVehicle.id.toString())) {
      console.warn('⚠️  Syncing vehicle_id from selected vehicle:', selectedVehicle.id);
      const updatedFormData = { ...formData, vehicle_id: selectedVehicle.id.toString() };
      setFormData(updatedFormData);
      // Continue with the updated data
      setTimeout(() => handleSubmit(e), 100); // Re-trigger with updated data
      return;
    }

    // 🔍 Sync client_id if client is selected but form data is missing
    if (selectedClient && (!formData.client_id || formData.client_id !== selectedClient.id.toString())) {
      console.warn('⚠️  Syncing client_id from selected client:', selectedClient.id);
      const updatedFormData = { ...formData, client_id: selectedClient.id.toString() };
      setFormData(updatedFormData);
      // Continue with the updated data
      setTimeout(() => handleSubmit(e), 100); // Re-trigger with updated data
      return;
    }

    // Validate required fields
    if (!formData.client_id || !formData.vehicle_id) {
      console.error('❌ VALIDATION FAILED:');
      console.error('  - Client ID missing:', !formData.client_id);
      console.error('  - Vehicle ID missing:', !formData.vehicle_id);
      console.error('  - Form Data:', formData);
      console.error('  - Selected Client:', selectedClient);
      console.error('  - Selected Vehicle:', selectedVehicle);
      alert('Please select both client and vehicle before submitting.');
      return;
    }

    console.log('✅ VALIDATION PASSED - Creating invoice data object');

    const invoiceData = {
      client_id: parseInt(formData.client_id),
      vehicle_id: parseInt(formData.vehicle_id),

      // Include invoice number if editing (required for database)
      ...(invoice ? { invoice_number: invoice.invoice_number } : {}),

      // Dates
      invoice_date: formData.invoice_date ? new Date(formData.invoice_date).toISOString() : new Date().toISOString(),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      challan_date: formData.challan_date ? new Date(formData.challan_date).toISOString() : null,

      // GST Configuration
      gst_enabled: formData.gst_enabled || false,
      tax_rate: typeof formData.tax_rate === 'string' ? parseInt(formData.tax_rate) || 0 : formData.tax_rate || 0,
      cgst_rate: typeof formData.cgst_rate === 'string' ? parseInt(formData.cgst_rate) || 0 : formData.cgst_rate || 0,
      sgst_rate: typeof formData.sgst_rate === 'string' ? parseInt(formData.sgst_rate) || 0 : formData.sgst_rate || 0,
      igst_rate: typeof formData.igst_rate === 'string' ? parseInt(formData.igst_rate) || 0 : formData.igst_rate || 0,

      // Amounts (ensure they are numbers)
      taxable_amount: typeof formData.taxable_amount === 'string' ? parseFloat(formData.taxable_amount) || 0.0 : formData.taxable_amount,
      cgst_amount: typeof formData.cgst_amount === 'string' ? parseFloat(formData.cgst_amount) || 0.0 : formData.cgst_amount,
      sgst_amount: typeof formData.sgst_amount === 'string' ? parseFloat(formData.sgst_amount) || 0.0 : formData.sgst_amount,
      igst_amount: typeof formData.igst_amount === 'string' ? parseFloat(formData.igst_amount) || 0.0 : formData.igst_amount,
      discount_amount: typeof formData.discount_amount === 'string' ? parseFloat(formData.discount_amount) || 0.0 : formData.discount_amount,
      round_off: typeof formData.round_off === 'string' ? parseFloat(formData.round_off) || 0.0 : formData.round_off,
      total_amount: typeof formData.total_amount === 'string' ? parseFloat(formData.total_amount) || 0.0 : formData.total_amount,

      // Car Service Fields
      service_type: formData.service_type || null,
      km_reading_in: formData.km_reading_in ? parseInt(formData.km_reading_in.toString()) : null,
      km_reading_out: formData.km_reading_out ? parseInt(formData.km_reading_out.toString()) : null,
      challan_no: formData.challan_no || null,
      eway_bill_no: formData.eway_bill_no || null,
      transport: formData.transport || null,
      transport_id: formData.transport_id || null,
      place_of_supply: formData.place_of_supply || "Tamil Nadu (33)",
      hsn_sac_code: formData.hsn_sac_code || "8302",

      // Additional Fields
      technician_name: formData.technician_name || null,
      work_order_no: formData.work_order_no || null,
      estimate_no: formData.estimate_no || null,
      insurance_claim: formData.insurance_claim || false,
      warranty_applicable: formData.warranty_applicable || false,

      // Items - ensure all required fields are present and valid
      items: items.map(item => ({
        item_type: item.item_type || item.type || "service",
        name: item.name || "Unnamed Item",
        hsn_sac: item.hsn_sac || item.hsn_code || "0000",
        quantity: item.quantity || 1,                    // Ensure not null
        rate: typeof item.rate === 'string' ? parseInt(item.rate) || 0 : item.rate || item.unit_price || 0,         // Ensure not null
        total: item.total || 0                           // Ensure not null
      })),

      notes: formData.notes || ''
    };

    console.log('🚀 SUBMITTING INVOICE DATA:');
    console.log('Form Data client_id:', formData.client_id, typeof formData.client_id);
    console.log('Form Data vehicle_id:', formData.vehicle_id, typeof formData.vehicle_id);
    console.log('Selected Client:', selectedClient?.id);
    console.log('Selected Vehicle:', selectedVehicle?.id);
    console.log('Raw Items before mapping:', items);
    console.log('Mapped Items:', invoiceData.items);
    console.log('Complete Invoice Data:', invoiceData);

    createInvoiceMutation.mutate(invoiceData);
  };

  // Load invoice data when editing
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (invoice && isOpen) {
        try {
        // Enhanced error handling for invoice edit data loading
        console.log('🚀 Loading invoice data for edit:', invoice);
        console.log('Invoice client_id:', invoice.client_id, 'type:', typeof invoice.client_id);
        console.log('Invoice vehicle_id:', invoice.vehicle_id, 'type:', typeof invoice.vehicle_id);
        console.log('All invoice fields:', Object.keys(invoice));

        // Check authentication
        const token = localStorage.getItem('access_token');
        console.log('Authentication token available:', !!token);
        if (!token) {
          console.error('❌ No authentication token available!');
          alert('Please login first to edit invoices');
          return;
        }

        // Safely extract and validate invoice data
        const safeClientId = invoice.client_id ? invoice.client_id.toString() : '';
        const safeVehicleId = invoice.vehicle_id ? invoice.vehicle_id.toString() : '';

        // Validate essential data
        if (!safeClientId) {
          console.warn('Warning: Invoice has no client_id:', invoice.id);
        }
        if (!safeVehicleId) {
          console.warn('Warning: Invoice has no vehicle_id:', invoice.id);
        }

        setFormData({
          ...formData,
          client_id: safeClientId,
          vehicle_id: safeVehicleId,
          invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
          due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
          challan_date: invoice.challan_date ? invoice.challan_date.split('T')[0] : '',
        });

        // 🔄 ALWAYS fetch complete invoice data for edit mode
        console.log('🔄 Fetching complete invoice data for edit mode:', invoice.id);
        setIsLoadingEditData(true);
        try {
          const response = await axios.get(`/api/invoices/${invoice.id}/test`);
          const completeInvoice = response.data;
          console.log('Complete invoice data fetched:', completeInvoice);

          // Set items first
          if (completeInvoice?.items && completeInvoice.items.length > 0) {
            console.log('✅ Setting invoice items:', completeInvoice.items.length, 'items');
            setItems(completeInvoice.items);
          } else {
            console.log('⚠️ No items found in invoice');
            setItems([]);
          }

          // Set client data - prioritize complete API response
          if (completeInvoice?.client && completeInvoice.client.id) {
            console.log('✅ Setting client from complete API:', completeInvoice.client.name);
            setSelectedClient(completeInvoice.client);
          } else if (invoice.client && invoice.client.id) {
            console.log('✅ Setting client from initial data:', invoice.client.name);
            setSelectedClient(invoice.client);
          } else if (completeInvoice.client_id || invoice.client_id) {
            // Fetch client details if only ID is available
            const clientId = completeInvoice.client_id || invoice.client_id;
            console.log('🔄 Fetching client details for ID:', clientId);
            try {
              const clientResponse = await axios.get(`/api/clients/${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('✅ Client fetched by ID:', clientResponse.data.name);
              setSelectedClient(clientResponse.data);
            } catch (error) {
              console.error('❌ Failed to fetch client by ID:', error);
              setSelectedClient(null);
            }
          } else {
            console.warn('⚠️ No valid client data found');
            setSelectedClient(null);
          }

          // Set vehicle data - prioritize complete API response with detailed logging
          console.log('🚗 VEHICLE LOADING DEBUG:');
          console.log('  - completeInvoice.vehicle:', completeInvoice?.vehicle);
          console.log('  - completeInvoice.vehicle_id:', completeInvoice?.vehicle_id);
          console.log('  - invoice.vehicle:', invoice.vehicle);
          console.log('  - invoice.vehicle_id:', invoice.vehicle_id);

          if (completeInvoice?.vehicle && completeInvoice.vehicle.id) {
            console.log('✅ Setting vehicle from complete API:', completeInvoice.vehicle.registration_number);
            setSelectedVehicle(completeInvoice.vehicle);
          } else if (invoice.vehicle && invoice.vehicle.id) {
            console.log('✅ Setting vehicle from initial data:', invoice.vehicle.registration_number);
            setSelectedVehicle(invoice.vehicle);
          } else if (completeInvoice.vehicle_id || invoice.vehicle_id) {
            // Fetch vehicle details if only ID is available
            const vehicleId = completeInvoice.vehicle_id || invoice.vehicle_id;
            console.log('🔄 Fetching vehicle details for ID:', vehicleId);
            try {
              const vehicleResponse = await axios.get(`/api/vehicles/${vehicleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('✅ Vehicle fetched by ID:', vehicleResponse.data);
              console.log('  - Registration:', vehicleResponse.data.registration_number);
              console.log('  - ID:', vehicleResponse.data.id);
              setSelectedVehicle(vehicleResponse.data);
            } catch (error) {
              console.error('❌ Failed to fetch vehicle by ID:', error);
              console.error('  - Vehicle ID attempted:', vehicleId);
              console.error('  - Error details:', error);
              setSelectedVehicle(null);
            }
          } else {
            console.warn('⚠️ No valid vehicle data found');
            console.warn('  - No vehicle object and no vehicle_id available');
            setSelectedVehicle(null);
          }

        } catch (error) {
          console.error('❌ Failed to fetch complete invoice data:', error);
          setIsLoadingEditData(false);

          // Fallback to using the original invoice data
          console.log('🔄 Using fallback data from original invoice object');

          // Set items from original invoice if available
          if (invoice.items && invoice.items.length > 0) {
            console.log('Setting items from original invoice:', invoice.items);
            setItems(invoice.items);
          } else {
            setItems([]);
          }

          // Set client from original invoice
          if (invoice.client && invoice.client.id) {
            console.log('Setting client from original invoice:', invoice.client);
            setSelectedClient(invoice.client);
          } else {
            setSelectedClient(null);
          }

          // Set vehicle from original invoice
          if (invoice.vehicle && invoice.vehicle.id) {
            console.log('Setting vehicle from original invoice:', invoice.vehicle);
            setSelectedVehicle(invoice.vehicle);
          } else {
            setSelectedVehicle(null);
          }

          setIsLoadingEditData(false);
          console.log('✅ Edit data loading completed successfully');
        }

        // 🎯 COMPREHENSIVE DATA VALIDATION SUMMARY
        console.log('📊 EDIT FORM DATA LOADED SUMMARY:');
        console.log('✅ Basic Data:');
        console.log(`  - Invoice ID: ${invoice.id}`);
        console.log(`  - Invoice Number: ${invoice.invoice_number}`);
        console.log(`  - Invoice Date: ${invoice.invoice_date}`);
        console.log(`  - Due Date: ${invoice.due_date}`);
        console.log(`  - Total Amount: ${invoice.total_amount}`);

        // Wait a bit for all async operations to complete, then check final state
        setTimeout(() => {
          // Get current state values for checking
          const currentClient = selectedClient;
          const currentVehicle = selectedVehicle;
          const currentItems = items;

          console.log('🔍 Final loaded state check after async operations:');
          console.log('  - Client loaded:', !!currentClient, currentClient?.name || 'No name');
          console.log('  - Vehicle loaded:', !!currentVehicle, currentVehicle?.registration_number || 'No registration');
          console.log('  - Items loaded:', currentItems.length, 'items');

          if (items.length > 0) {
            console.log('  - Item details:');
            items.forEach((item, i) => {
              console.log(`    ${i+1}. ${item.type || item.item_type}: ${item.name} - Qty: ${item.quantity}, Total: ${item.total}`);
            });
          } else {
            console.log('  ⚠️  No items loaded - this might be an issue!');
          }

          if (!selectedClient) {
            console.log('  ⚠️  No client loaded - this might be an issue!');
          }

          if (!selectedVehicle) {
            console.log('  ⚠️  No vehicle loaded - this might be an issue!');
          }
        }, 2000); // Wait longer for all async operations to complete

        } catch (error) {
          console.error('Error loading invoice data for edit:', error);
          // Reset to defaults on error
          setSelectedClient(null);
          setSelectedVehicle(null);
          alert('Error loading invoice data. Some details may not be available.');
        }
      } else {
        // Reset selections for new invoice
        console.log('🆕 Creating new invoice - resetting all state');
        setSelectedClient(null);
        setSelectedVehicle(null);
        setItems([]); // Clear items for new invoice
        resetForm(); // Reset all form data
      }
    };

    loadInvoiceData();
  }, [invoice, isOpen]);

  // Fetch available services and parts for auto-selection
  useEffect(() => {
    const fetchServicesAndParts = async () => {
      if (isOpen) {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return;

          // Fetch services
          const servicesResponse = await axios.get('/api/services/services', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('Available services fetched:', servicesResponse.data);
          setAvailableServices(servicesResponse.data || []);

          // Fetch parts
          const partsResponse = await axios.get('/api/services/parts', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log('Available parts fetched:', partsResponse.data);
          setAvailableParts(partsResponse.data || []);

        } catch (error) {
          console.error('Failed to fetch services/parts:', error);
          // Set default fallback data
          setAvailableServices([
            { id: 1, name: 'Oil Change', hsn_sac_code: '9986' },
            { id: 2, name: 'Brake Service', hsn_sac_code: '9986' },
            { id: 3, name: 'AC Service', hsn_sac_code: '9986' }
          ]);
          setAvailableParts([
            { id: 1, name: 'Engine Oil', hsn_sac_code: '8708' },
            { id: 2, name: 'Brake Pads', hsn_sac_code: '8708' },
            { id: 3, name: 'Air Filter', hsn_sac_code: '8708' }
          ]);
        }
      }
    };

    fetchServicesAndParts();
  }, [isOpen]);

  // Monitor when edit data loading is complete and log final state
  useEffect(() => {
    if (invoice && !isLoadingEditData) {
      // This runs after the edit data loading is complete
      setTimeout(() => {
        console.log('🔍 FINAL STATE CHECK - Edit data loading completed:');
        console.log('  ✅ Client:', !!selectedClient ? `${selectedClient.name} (ID: ${selectedClient.id})` : '❌ Not loaded');
        console.log('  ✅ Vehicle:', !!selectedVehicle ? `${selectedVehicle.registration_number} (ID: ${selectedVehicle.id})` : '❌ Not loaded');
        console.log('  ✅ Items:', items.length > 0 ? `${items.length} items loaded` : '❌ No items loaded');

        if (!selectedClient && invoice.client_id) {
          console.error('🚨 CLIENT LOADING FAILED - Expected client_id:', invoice.client_id);
        }
        if (!selectedVehicle && invoice.vehicle_id) {
          console.error('🚨 VEHICLE LOADING FAILED - Expected vehicle_id:', invoice.vehicle_id);
          console.error('    Available invoice data:', invoice);
        }
        if (items.length === 0 && invoice.id) {
          console.error('🚨 ITEMS LOADING FAILED - Expected items for invoice:', invoice.id);
        }
      }, 500); // Small delay to ensure state updates are complete
    }
  }, [isLoadingEditData, selectedClient, selectedVehicle, items, invoice]);

  // Enhanced modal close handler with state cleanup
  const handleModalClose = () => {
    console.log('🚪 Modal closing - cleaning up state');
    setItems([]);
    setSelectedClient(null);
    setSelectedVehicle(null);
    setActiveDropdown(null);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h2>
          <button
            onClick={handleModalClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-500 text-purple-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden">
          <div className="h-96 overflow-y-auto p-6">
            {/* Basic Details Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Client and Vehicle Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <VehicleOwnerSearch
                    onClientSelect={(client: any) => {
                      setSelectedClient(client);
                      setFormData(prev => ({
                        ...prev,
                        client_id: client ? client.id.toString() : ''
                      }));
                    }}
                    selectedClient={selectedClient}
                  />

                  <VehicleAutoComplete
                    onVehicleSelect={(vehicle: any) => {
                      console.log('🚗 Vehicle selected in autocomplete:', vehicle);
                      setSelectedVehicle(vehicle);
                      const vehicleId = vehicle ? vehicle.id.toString() : '';
                      console.log('  🆔 Setting vehicle_id in formData:', vehicleId);
                      setFormData(prev => {
                        const updated = {
                          ...prev,
                          vehicle_id: vehicleId
                        };
                        console.log('  📋 FormData after vehicle update:', updated);
                        return updated;
                      });
                    }}
                    selectedVehicle={selectedVehicle}
                    clientId={selectedClient?.id}
                  />
                </div>

                {/* Invoice Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.invoice_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Item Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={item.item_type}
                            onChange={(e) => updateItem(item.id, 'item_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="service">Service</option>
                            <option value="part">Part</option>
                          </select>
                        </div>

                        {/* Item Name */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={item.name}
                              onFocus={() => setActiveDropdown(item.id)}
                              onBlur={() => {
                                // Delay closing dropdown to allow onMouseDown to execute
                                setTimeout(() => {
                                  setActiveDropdown(null);
                                }, 150);
                              }}
                              onChange={(e) => {
                                updateItem(item.id, 'name', e.target.value);
                                setActiveDropdown(item.id);
                                if (item.item_type === 'service') {
                                  setServiceSearchTerm(e.target.value);
                                } else {
                                  setPartSearchTerm(e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setActiveDropdown(null);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder={item.item_type === 'service' ? 'Search services...' : 'Search parts...'}
                            />

                            {/* Dropdown for suggestions */}
                            {item.name && activeDropdown === item.id && (
                              <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                                {(item.item_type === 'service' ? availableServices : availableParts)
                                  .filter((availableItem) =>
                                    availableItem.name.toLowerCase().includes(item.name.toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((availableItem) => (
                                    <div
                                      key={availableItem.id}
                                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                      onMouseDown={(e) => {
                                        // preventDefault() stops the input from losing focus (onBlur)
                                        e.preventDefault();
                                        console.log('🎯 Selected item:', availableItem);
                                        console.log('📝 Updating only item name...');
                                        // Only update the item name - let user manually enter HSN and rate
                                        updateItem(item.id, 'name', availableItem.name);
                                        console.log('✅ Item name updated, closing dropdown');
                                        setActiveDropdown(null);
                                        if (item.item_type === 'service') {
                                          setServiceSearchTerm('');
                                        } else {
                                          setPartSearchTerm('');
                                        }
                                      }}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">{availableItem.name}</span>
                                      </div>
                                      {availableItem.description && (
                                        <div className="text-xs text-gray-400">{availableItem.description}</div>
                                      )}
                                    </div>
                                  ))
                                }
                                {(item.item_type === 'service' ? availableServices : availableParts)
                                  .filter((availableItem) =>
                                    availableItem.name.toLowerCase().includes(item.name.toLowerCase())
                                  ).length === 0 && (
                                  <div className="px-3 py-2 text-gray-500 text-sm">
                                    No {item.item_type}s found matching "{item.name}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* HSN/SAC */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">HSN/SAC</label>
                          <input
                            type="text"
                            value={item.hsn_sac}
                            onChange={(e) => updateItem(item.id, 'hsn_sac', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        {/* Rate */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter rate (e.g. 1200)"
                            value={item.rate}
                            onChange={(e) => updateItem(item.id, 'rate', parseInt(e.target.value) || '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Total and Remove Button */}
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-semibold text-gray-900">
                          Total: ₹{formatNumber(item.total)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Invoice Totals */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Invoice Totals</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Taxable Amount:</span>
                      <span className="font-medium">₹{formatNumber(formData.taxable_amount)}</span>
                    </div>
                    {formData.gst_enabled && (
                      <>
                        <div className="flex justify-between">
                          <span>CGST ({typeof formData.cgst_rate === 'string' ? parseInt(formData.cgst_rate) || 0 : formData.cgst_rate || 0}%):</span>
                          <span className="font-medium">₹{formatNumber(formData.cgst_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST ({typeof formData.sgst_rate === 'string' ? parseInt(formData.sgst_rate) || 0 : formData.sgst_rate || 0}%):</span>
                          <span className="font-medium">₹{formatNumber(formData.sgst_amount)}</span>
                        </div>
                      </>
                    )}
                    {parseFloat(formData.discount_amount.toString()) > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="font-medium text-red-600">-₹{formatNumber(formData.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-bold">Total Amount:</span>
                      <span className="font-bold text-lg text-green-600">₹{formatNumber(formData.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GST Settings Tab */}
            {activeTab === 'gst' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="gst_enabled"
                    checked={formData.gst_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_enabled: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="gst_enabled" className="text-sm font-medium text-gray-700">
                    Enable GST Calculation
                  </label>
                </div>

                {formData.gst_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CGST Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter CGST rate (e.g. 9)"
                        value={formData.cgst_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, cgst_rate: parseInt(e.target.value) || '' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SGST Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter SGST rate (e.g. 9)"
                        value={formData.sgst_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, sgst_rate: parseInt(e.target.value) || '' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discount Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Round Off (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.round_off}
                      onChange={(e) => setFormData(prev => ({ ...prev, round_off: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Service Info Tab */}
            {activeTab === 'service' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
                    <select
                      value={formData.service_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, service_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Service Type</option>
                      {SERVICE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Technician</label>
                    <select
                      value={formData.technician_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, technician_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select Technician</option>
                      {TECHNICIANS.map(tech => (
                        <option key={tech} value={tech}>{tech}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">KM Reading (In)</label>
                    <input
                      type="number"
                      value={formData.km_reading_in}
                      onChange={(e) => setFormData(prev => ({ ...prev, km_reading_in: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">KM Reading (Out)</label>
                    <input
                      type="number"
                      value={formData.km_reading_out}
                      onChange={(e) => setFormData(prev => ({ ...prev, km_reading_out: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Order No</label>
                    <input
                      type="text"
                      value={formData.work_order_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_order_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimate No</label>
                    <input
                      type="text"
                      value={formData.estimate_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimate_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="insurance_claim"
                      checked={formData.insurance_claim}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurance_claim: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="insurance_claim" className="text-sm font-medium text-gray-700">
                      Insurance Claim
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="warranty_applicable"
                      checked={formData.warranty_applicable}
                      onChange={(e) => setFormData(prev => ({ ...prev, warranty_applicable: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="warranty_applicable" className="text-sm font-medium text-gray-700">
                      Warranty Applicable
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Transport Tab */}
            {activeTab === 'transport' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Challan No</label>
                    <input
                      type="text"
                      value={formData.challan_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, challan_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Challan Date</label>
                    <input
                      type="date"
                      value={formData.challan_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, challan_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Way Bill No</label>
                    <input
                      type="text"
                      value={formData.eway_bill_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, eway_bill_no: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transport</label>
                    <input
                      type="text"
                      value={formData.transport}
                      onChange={(e) => setFormData(prev => ({ ...prev, transport: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Additional notes or instructions..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            {/* Separate PDF Generation Button for CREATE and EDIT modes */}
            {invoice ? (
              // EDIT mode - use existing invoice
              <PDFInvoice
                invoice={invoice}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              />
            ) : (
              // CREATE mode - use temporary invoice from current form data
              <button
                type="button"
                onClick={() => {
                  const tempInvoice = createTempInvoiceForPDF();
                  if (tempInvoice) {
                    // Create a temporary PDFInvoice component and trigger its generation
                    const tempDiv = document.createElement('div');
                    tempDiv.style.display = 'none';
                    document.body.appendChild(tempDiv);

                    // Manually trigger PDF generation using the same logic as PDFInvoice
                    const generateTempPDF = async () => {
                      try {
                        const { default: jsPDF } = await import('jspdf');
                        const { default: html2canvas } = await import('html2canvas');

                        console.log('🚀 Generating PDF for CREATE mode invoice:', tempInvoice.invoice_number);

                        // Load company logo
                        let logoDataUrl = '';
                        try {
                          const logoResponse = await fetch('/logo.webp');
                          if (logoResponse.ok) {
                            const logoBlob = await logoResponse.blob();
                            logoDataUrl = await new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onloadend = () => resolve(reader.result as string);
                              reader.readAsDataURL(logoBlob);
                            });
                            console.log('✅ Company logo loaded successfully for CREATE mode');
                          }
                        } catch (logoError) {
                          console.warn('⚠️ Logo not found, using text header:', logoError);
                        }

                        // Create a temporary div for PDF content (same as PDFInvoice component)
                        const pdfContent = document.createElement('div');
                        pdfContent.id = 'pdf-content-create';
                        pdfContent.style.position = 'absolute';
                        pdfContent.style.left = '-9999px';
                        pdfContent.style.width = '210mm';
                        pdfContent.style.padding = '20px';
                        pdfContent.style.fontFamily = 'Arial, sans-serif';
                        pdfContent.style.backgroundColor = 'white';

                        // Use the same HTML template as PDFInvoice component
                        pdfContent.innerHTML = `
                          <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
                            <!-- Header with Logo -->
                            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px;">
                              <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                ${logoDataUrl ? `
                                  <img src="${logoDataUrl}" alt="Company Logo" style="height: 78px; width: auto; margin-right: 15px; object-fit: contain;" />
                                ` : `
                                  <div style="width: 78px; height: 78px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                    <span style="color: #6366f1; font-size: 30px; font-weight: bold;">🚗</span>
                                  </div>
                                `}
                                <div style="text-align: left;">
                                  <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">
                                    PREMIUM AUTO CARE
                                  </h1>
                                  <p style="color: #6366f1; margin: 2px 0; font-size: 12px; font-weight: 500;">
                                    Professional Automotive Services & Parts
                                  </p>
                                </div>
                              </div>
                              <div style="text-align: center; color: #6b7280; font-size: 12px; line-height: 1.4;">
                                <p style="margin: 3px 0;">📍 No.45, Anna Salai, Chennai - 600002, Tamil Nadu | 📞 +91 98765 43210 / +91 44 28123456</p>
                                <p style="margin: 3px 0;">✉️ contact@premiumautocare.com | 🌐 www.premiumautocare.com</p>
                                <p style="margin: 3px 0; font-weight: 500; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; display: inline-block;">GST No: 33AABCP2345M1ZX</p>
                              </div>
                            </div>

                            <!-- Invoice Title -->
                            <div style="text-align: center; margin-bottom: 30px;">
                              <h2 style="color: #1f2937; margin: 0; font-size: 24px; background: #f3f4f6; padding: 10px; border-radius: 8px;">
                                INVOICE ${tempInvoice.id === 0 ? '(DRAFT)' : ''}
                              </h2>
                            </div>

                            <!-- Invoice Info Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                              <!-- Left Column -->
                              <div>
                                <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                  <h3 style="color: #6366f1; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                                    📄 Invoice Details
                                  </h3>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice No:</strong> ${tempInvoice.invoice_number || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice Date:</strong> ${formatDate(tempInvoice.invoice_date)}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Due Date:</strong> ${formatDate(tempInvoice.due_date || '')}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Place of Supply:</strong> ${tempInvoice.place_of_supply || 'Tamil Nadu (33)'}</p>
                                </div>

                                ${tempInvoice.client ? `
                                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
                                  <h3 style="color: #0ea5e9; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #e0f2fe; padding-bottom: 5px;">
                                    👤 Customer Details
                                  </h3>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${tempInvoice.client.name || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Mobile:</strong> ${tempInvoice.client.mobile || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${tempInvoice.client.email || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Address:</strong> ${tempInvoice.client.address || 'N/A'}</p>
                                  ${tempInvoice.client.gst_number ? `<p style="margin: 5px 0; font-size: 14px;"><strong>GST No:</strong> ${tempInvoice.client.gst_number}</p>` : ''}
                                </div>
                                ` : ''}
                              </div>

                              <!-- Right Column -->
                              <div>
                                ${tempInvoice.vehicle ? `
                                <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                  <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #dcfce7; padding-bottom: 5px;">
                                    🚗 Vehicle Details
                                  </h3>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Registration:</strong> ${tempInvoice.vehicle.registration_number || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Make & Model:</strong> ${tempInvoice.vehicle.make || ''} ${tempInvoice.vehicle.model || ''}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Year:</strong> ${tempInvoice.vehicle.year || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Color:</strong> ${tempInvoice.vehicle.color || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Engine:</strong> ${tempInvoice.vehicle.engine_number || 'N/A'}</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Chassis:</strong> ${tempInvoice.vehicle.chassis_number || 'N/A'}</p>
                                </div>
                                ` : ''}

                                ${tempInvoice.service_type || tempInvoice.technician_name ? `
                                <div style="background: #fef7ff; padding: 15px; border-radius: 8px;">
                                  <h3 style="color: #9333ea; margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #f3e8ff; padding-bottom: 5px;">
                                    🔧 Service Info
                                  </h3>
                                  ${tempInvoice.service_type ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Service Type:</strong> ${tempInvoice.service_type}</p>` : ''}
                                  ${tempInvoice.technician_name ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Technician:</strong> ${tempInvoice.technician_name}</p>` : ''}
                                  ${tempInvoice.km_reading_in ? `<p style="margin: 5px 0; font-size: 14px;"><strong>KM Reading (In):</strong> ${tempInvoice.km_reading_in}</p>` : ''}
                                  ${tempInvoice.km_reading_out ? `<p style="margin: 5px 0; font-size: 14px;"><strong>KM Reading (Out):</strong> ${tempInvoice.km_reading_out}</p>` : ''}
                                  ${tempInvoice.work_order_no ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Work Order:</strong> ${tempInvoice.work_order_no}</p>` : ''}
                                </div>
                                ` : ''}
                              </div>
                            </div>

                            <!-- ADVANCED: SEPARATE TABLES FOR SERVICES & PARTS (CREATE MODE) -->
                            ${(() => {
                              console.log('📋 CREATE Mode Invoice items debug:', tempInvoice.items);
                              console.log('📋 CREATE Mode Total items count:', tempInvoice.items?.length || 0);

                              const services = tempInvoice.items?.filter(item =>
                                item.item_type === 'service' || item.type === 'service'
                              ) || [];
                              const parts = tempInvoice.items?.filter(item =>
                                item.item_type === 'part' || item.type === 'part'
                              ) || [];

                              console.log('🔧 CREATE Mode Services found:', services.length, services);
                              console.log('🔩 CREATE Mode Parts found:', parts.length, parts);

                              let html = '';

                              // SERVICES TABLE (if any services exist)
                              if (services.length > 0) {
                                html += `
                                <div style="margin-bottom: 20px;">
                                  <h3 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 16px; background: #dbeafe; padding: 8px 15px; border-radius: 6px; border-left: 4px solid #1d4ed8;">
                                    🔧 SERVICES PERFORMED (${services.length} items)
                                  </h3>
                                  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 11px;">
                                    <thead>
                                      <tr style="background: #1d4ed8; color: white;">
                                        <th style="padding: 6px 8px; text-align: left; font-size: 11px; width: 8%;">S.No</th>
                                        <th style="padding: 6px 8px; text-align: left; font-size: 11px; width: 50%;">Service Description</th>
                                        <th style="padding: 6px 8px; text-align: center; font-size: 11px; width: 12%;">HSN/SAC</th>
                                        <th style="padding: 6px 8px; text-align: center; font-size: 11px; width: 8%;">Qty</th>
                                        <th style="padding: 6px 8px; text-align: right; font-size: 11px; width: 11%;">Rate (₹)</th>
                                        <th style="padding: 6px 8px; text-align: right; font-size: 11px; width: 11%;">Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${services.map((service, index) => `
                                        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : 'background: white;'}">
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${index + 1}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; font-weight: 500; line-height: 1.2;">${service.name || 'Unnamed Service'}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${service.hsn_sac || service.hsn_code || 'N/A'}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${service.quantity || 1}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: right;">₹${formatNumber(typeof service.rate === 'string' ? parseInt(service.rate) || 0 : service.rate || service.unit_price || 0)}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: right; font-weight: bold;">₹${formatNumber(service.total || 0)}</td>
                                        </tr>
                                      `).join('')}
                                      <tr style="background: #dbeafe; border-top: 2px solid #1d4ed8;">
                                        <td colspan="5" style="padding: 6px 8px; font-size: 11px; font-weight: bold; text-align: right;">Services Subtotal:</td>
                                        <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; text-align: right; color: #1d4ed8;">₹${formatNumber(services.reduce((sum, service) => sum + (service.total || 0), 0))}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>`;
                              }

                              // PARTS TABLE (if any parts exist)
                              if (parts.length > 0) {
                                html += `
                                <div style="margin-bottom: 20px;">
                                  <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px; background: #dcfce7; padding: 8px 15px; border-radius: 6px; border-left: 4px solid #166534;">
                                    🔩 PARTS SUPPLIED (${parts.length} items)
                                  </h3>
                                  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; font-size: 11px;">
                                    <thead>
                                      <tr style="background: #166534; color: white;">
                                        <th style="padding: 6px 8px; text-align: left; font-size: 11px; width: 8%;">S.No</th>
                                        <th style="padding: 6px 8px; text-align: left; font-size: 11px; width: 45%;">Part Description</th>
                                        <th style="padding: 6px 8px; text-align: center; font-size: 11px; width: 12%;">Part No/HSN</th>
                                        <th style="padding: 6px 8px; text-align: center; font-size: 11px; width: 8%;">Qty</th>
                                        <th style="padding: 6px 8px; text-align: center; font-size: 11px; width: 8%;">Unit</th>
                                        <th style="padding: 6px 8px; text-align: right; font-size: 11px; width: 9%;">Rate (₹)</th>
                                        <th style="padding: 6px 8px; text-align: right; font-size: 11px; width: 10%;">Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${parts.map((part, index) => `
                                        <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f0fdf4;' : 'background: white;'}">
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${index + 1}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; font-weight: 500; line-height: 1.2;">${part.name || 'Unnamed Part'}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${part.hsn_sac || part.hsn_code || 'N/A'}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">${part.quantity || 1}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: center;">Nos</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: right;">₹${formatNumber(typeof part.rate === 'string' ? parseInt(part.rate) || 0 : part.rate || part.unit_price || 0)}</td>
                                          <td style="padding: 5px 8px; font-size: 10px; text-align: right; font-weight: bold;">₹${formatNumber(part.total || 0)}</td>
                                        </tr>
                                      `).join('')}
                                      <tr style="background: #dcfce7; border-top: 2px solid #166534;">
                                        <td colspan="6" style="padding: 6px 8px; font-size: 11px; font-weight: bold; text-align: right;">Parts Subtotal:</td>
                                        <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; text-align: right; color: #166534;">₹${formatNumber(parts.reduce((sum, part) => sum + (part.total || 0), 0))}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>`;
                              }

                              // COMBINED SUMMARY (if both services and parts exist)
                              if (services.length > 0 && parts.length > 0) {
                                const servicesTotal = services.reduce((sum, service) => sum + (service.total || 0), 0);
                                const partsTotal = parts.reduce((sum, part) => sum + (part.total || 0), 0);
                                html += `
                                <div style="margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                                  <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">📊 DRAFT WORK SUMMARY</h4>
                                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 12px;">
                                    <div>
                                      <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                                        <span>🔧 Services (${services.length} items):</span>
                                        <span style="font-weight: bold;">₹${formatNumber(servicesTotal)}</span>
                                      </p>
                                      <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                                        <span>🔩 Parts (${parts.length} items):</span>
                                        <span style="font-weight: bold;">₹${formatNumber(partsTotal)}</span>
                                      </p>
                                    </div>
                                    <div>
                                      <p style="margin: 3px 0; display: flex; justify-content: space-between;">
                                        <span>📋 Total Items:</span>
                                        <span style="font-weight: bold;">${services.length + parts.length}</span>
                                      </p>
                                      <p style="margin: 3px 0; display: flex; justify-content: space-between; border-top: 1px solid #d1d5db; padding-top: 3px;">
                                        <span style="font-weight: bold;">💰 Subtotal:</span>
                                        <span style="font-weight: bold; color: #059669;">₹${formatNumber(servicesTotal + partsTotal)}</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>`;
                              }

                              // FALLBACK: If no items at all
                              if (services.length === 0 && parts.length === 0) {
                                console.log('⚠️ CREATE Mode: No services or parts found in draft invoice');
                                html = `
                                <div style="margin-bottom: 30px; text-align: center; padding: 30px; background: #f9fafb; border: 2px dashed #d1d5db; border-radius: 8px;">
                                  <p style="color: #6b7280; font-size: 14px; margin: 0;">📋 No services or parts added to this draft invoice</p>
                                </div>`;
                              }

                              return html;
                            })()}

                            <!-- Totals Section -->
                            <div style="display: grid; grid-template-columns: 1fr 400px; gap: 30px; margin-bottom: 30px;">
                              <!-- Left: Notes -->
                              <div>
                                ${tempInvoice.notes ? `
                                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                  <h4 style="color: #d97706; margin: 0 0 10px 0; font-size: 14px;">📝 Notes:</h4>
                                  <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">${tempInvoice.notes}</p>
                                </div>
                                ` : ''}

                                ${tempInvoice.insurance_claim || tempInvoice.warranty_applicable ? `
                                <div style="margin-top: 15px; display: flex; gap: 15px;">
                                  ${tempInvoice.insurance_claim ? '<span style="background: #fee2e2; color: #dc2626; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">🛡️ Insurance Claim</span>' : ''}
                                  ${tempInvoice.warranty_applicable ? '<span style="background: #dcfce7; color: #166534; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold;">✅ Warranty</span>' : ''}
                                </div>
                                ` : ''}
                              </div>

                              <!-- Right: Totals -->
                              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
                                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px; text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">
                                  💰 Invoice Summary
                                </h3>
                                <div style="space-y: 8px;">
                                  <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
                                    <span>Taxable Amount:</span>
                                    <span style="font-weight: bold;">₹${formatNumber(tempInvoice.taxable_amount || 0)}</span>
                                  </div>

                                  ${tempInvoice.gst_enabled && tempInvoice.cgst_amount > 0 ? `
                                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb;">
                                    <span>CGST (${tempInvoice.cgst_rate}%):</span>
                                    <span>₹${formatNumber(tempInvoice.cgst_amount || 0)}</span>
                                  </div>
                                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb;">
                                    <span>SGST (${tempInvoice.sgst_rate}%):</span>
                                    <span>₹${formatNumber(tempInvoice.sgst_amount || 0)}</span>
                                  </div>
                                  ` : ''}

                                  ${tempInvoice.igst_amount > 0 ? `
                                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #e5e7eb;">
                                    <span>IGST (${tempInvoice.igst_rate}%):</span>
                                    <span>₹${formatNumber(tempInvoice.igst_amount || 0)}</span>
                                  </div>
                                  ` : ''}

                                  ${tempInvoice.discount_amount > 0 ? `
                                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #dc2626;">
                                    <span>Discount:</span>
                                    <span>-₹${formatNumber(tempInvoice.discount_amount || 0)}</span>
                                  </div>
                                  ` : ''}

                                  ${tempInvoice.round_off !== 0 ? `
                                  <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
                                    <span>Round Off:</span>
                                    <span>${tempInvoice.round_off >= 0 ? '+' : ''}₹${formatNumber(tempInvoice.round_off || 0)}</span>
                                  </div>
                                  ` : ''}

                                  <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: bold; background: #6366f1; color: white; margin: 10px -10px 0; padding: 15px 10px; border-radius: 6px;">
                                    <span>Total Amount:</span>
                                    <span>₹${formatNumber(tempInvoice.total_amount || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <!-- Footer -->
                            <div style="margin-top: 40px; border-top: 2px solid #e5e7eb; padding-top: 20px;">
                              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; text-align: center;">
                                <div>
                                  <div style="height: 60px; border-bottom: 1px solid #9ca3af; margin-bottom: 10px;"></div>
                                  <p style="color: #6b7280; font-size: 12px; margin: 0;">Customer Signature</p>
                                </div>
                                <div>
                                  <div style="height: 60px; border-bottom: 1px solid #9ca3af; margin-bottom: 10px;"></div>
                                  <p style="color: #6b7280; font-size: 12px; margin: 0;">Authorized Signature</p>
                                </div>
                              </div>

                              <div style="text-align: center; margin-top: 30px; padding: 15px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 8px; border: 1px solid #d1d5db;">
                                <p style="color: #374151; font-size: 12px; margin: 0 0 5px 0; font-weight: 600;">
                                  🙏 Thank you for choosing Premium Auto Care!
                                </p>
                                <p style="color: #6b7280; font-size: 11px; margin: 0;">
                                  📧 contact@premiumautocare.com | 🌐 www.premiumautocare.com | 📞 Emergency: +91 98765 43210
                                </p>
                                <p style="color: #9ca3af; font-size: 10px; margin: 5px 0 0 0; font-style: italic;">
                                  "Your trusted partner in automotive excellence since 2010"
                                </p>
                              </div>
                            </div>
                          </div>
                        `;
                        document.body.appendChild(pdfContent);

                        // ADVANCED PDF GENERATION: Optimized for 20+ items (CREATE MODE)
                        const totalItems = tempInvoice.items?.length || 0;
                        console.log(`📊 Generating DRAFT PDF for ${totalItems} items...`);

                        // Enhanced canvas settings for large invoices
                        const canvas = await html2canvas(pdfContent, {
                          scale: totalItems > 15 ? 1.5 : 2, // Reduce scale for large invoices to save memory
                          useCORS: true,
                          allowTaint: true,
                          backgroundColor: '#ffffff',
                          height: pdfContent.scrollHeight,
                          width: pdfContent.scrollWidth,
                          scrollX: 0,
                          scrollY: 0
                        });

                        const imgData = canvas.toDataURL('image/png', 0.95); // Slightly compress for large files
                        const pdf = new jsPDF('p', 'mm', 'a4');

                        // Page dimensions
                        const imgWidth = 210; // A4 width in mm
                        const pageHeight = 295; // A4 height in mm
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        let heightLeft = imgHeight;
                        let position = 0;

                        console.log(`📄 DRAFT PDF dimensions: ${imgWidth}mm x ${Math.round(imgHeight)}mm (${Math.ceil(imgHeight / pageHeight)} pages needed)`);

                        // Add first page
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;

                        // Add additional pages if needed (for 20+ items)
                        let pageNumber = 1;
                        while (heightLeft >= 0) {
                          position = heightLeft - imgHeight;
                          pdf.addPage();
                          pageNumber++;
                          console.log(`➕ Adding page ${pageNumber} for large DRAFT invoice...`);
                          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                          heightLeft -= pageHeight;
                        }

                        console.log(`✅ DRAFT PDF complete: ${pageNumber} page(s) generated`);

                        // Add footer with page numbers if multi-page (DRAFT specific)
                        if (pageNumber > 1) {
                          for (let i = 1; i <= pageNumber; i++) {
                            pdf.setPage(i);
                            pdf.setFontSize(8);
                            pdf.setTextColor(220, 38, 38); // Red color for draft
                            pdf.text(`DRAFT Page ${i} of ${pageNumber} | ${totalItems} items`, 200, 285, { align: 'right' });
                          }
                        }

                        // Clean up
                        document.body.removeChild(pdfContent);

                        // Download PDF
                        const fileName = `Invoice_DRAFT_${tempInvoice.invoice_number}_${new Date().toISOString().split('T')[0]}.pdf`;
                        pdf.save(fileName);

                        console.log('✅ PDF generated successfully for CREATE mode:', fileName);

                      } catch (error) {
                        console.error('❌ Error generating PDF for CREATE mode:', error);
                        alert('Error generating PDF. Please try again.');
                      }
                    };

                    generateTempPDF();
                    document.body.removeChild(tempDiv);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Generate PDF Draft (before saving)"
              >
                📄 PDF Draft
              </button>
            )}

            <button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {createInvoiceMutation.isPending ? 'Saving...' : (invoice ? 'Update Invoice' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}