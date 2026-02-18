import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Plus, Search, Edit3, Eye, FileDown, Filter, FileText, Trash } from 'lucide-react';
import axios from 'axios';
import DynamicInvoiceModal from '../components/DynamicInvoiceModal';
import QuotationModal from '../components/QuotationModal';
import PDFInvoice from '../components/PDFInvoice';

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', searchTerm, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return axios.get(`/api/invoices?${params.toString()}`).then(res => res.data);
    },
  });

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) =>
      axios.delete(`/api/invoices/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice. Please try again.');
    }
  });

  const handleDeleteInvoice = (invoice: any) => {
    if (window.confirm(`Are you sure you want to delete invoice #${invoice.invoice_number}? This action cannot be undone.`)) {
      deleteInvoiceMutation.mutate(invoice.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage billing and invoices</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsQuotationModalOpen(true)}
            className="btn-secondary"
          >
            <FileText className="w-4 h-4" />
            Create Quotation
          </button>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by number, client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex space-x-4 py-4">
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        ) : invoices?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">#{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-500">ID: {invoice.id}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-gray-900">{invoice.client_name}</div>
                      <div className="text-sm text-gray-500">{invoice.vehicle_registration}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">₹{invoice.total_amount?.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">Paid: ₹{invoice.paid_amount?.toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.issue_date).toLocaleDateString()}
                      </div>
                      {invoice.due_date && (
                        <div className="text-xs text-gray-500">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(`/invoice/${invoice.unique_access_code || invoice.id}`, '_blank')}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              console.log('Loading invoice for edit:', invoice.id);

                              // Fetch complete invoice details for editing with enhanced error handling
                              const token = localStorage.getItem('access_token');
                              if (!token) {
                                alert('Authentication required. Please login again.');
                                return;
                              }

                              const headers = {
                                'Authorization': `Bearer ${token}`,
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                              };
                              console.log('Making fresh API call to:', `/api/invoices/${invoice.id}`);
                              const response = await axios.get(`/api/invoices/${invoice.id}`, {
                                headers,
                                params: { _t: Date.now() } // Cache busting
                              });

                              // Debug: Log exact API response
                              console.log('🔍 BACKEND API RESPONSE ANALYSIS:');
                              console.log('✅ API call successful to:', `/api/invoices/${invoice.id}`);
                              console.log('📊 COMPLETE RESPONSE DATA:');
                              console.log(JSON.stringify(response.data, null, 2));

                              console.log('\n🔍 DATA ANALYSIS:');
                              console.log(`✅ Invoice ID: ${response.data?.id}`);
                              console.log(`✅ Invoice Number: ${response.data?.invoice_number}`);
                              console.log(`✅ Client ID: ${response.data?.client_id} (type: ${typeof response.data?.client_id})`);
                              console.log(`✅ Vehicle ID: ${response.data?.vehicle_id} (type: ${typeof response.data?.vehicle_id})`);
                              console.log(`✅ Total Amount: ${response.data?.total_amount}`);

                              console.log('\n👥 CLIENT DATA:');
                              console.log(`Has client object: ${!!response.data?.client}`);
                              if (response.data?.client) {
                                console.log(`Client name: ${response.data.client.name}`);
                                console.log(`Client phone: ${response.data.client.phone}`);
                              } else {
                                console.log('❌ No client object in response');
                              }

                              console.log('\n🚗 VEHICLE DATA:');
                              console.log(`Has vehicle object: ${!!response.data?.vehicle}`);
                              if (response.data?.vehicle) {
                                console.log(`Vehicle registration: ${response.data.vehicle.registration_number}`);
                                console.log(`Vehicle model: ${response.data.vehicle.model_name}`);
                              } else {
                                console.log('❌ No vehicle object in response');
                              }

                              console.log('\n📝 ITEMS DATA:');
                              console.log(`Has items array: ${!!response.data?.items}`);
                              console.log(`Items count: ${response.data?.items?.length || 0}`);
                              if (response.data?.items?.length > 0) {
                                response.data.items.forEach((item, i) => {
                                  console.log(`  ${i+1}. ${item.type}: ${item.name} - Qty: ${item.quantity}, Total: ₹${item.total}`);
                                });
                              } else {
                                console.log('❌ No items in response');
                              }

                              // Validate the response data
                              const invoiceData = response.data;
                              if (!invoiceData) {
                                throw new Error('No invoice data received from server');
                              }

                              console.log('Invoice data loaded successfully:', invoiceData);

                              // Check if essential data is present and warn user if not
                              if (!invoiceData.client_id) {
                                console.warn('Warning: Invoice has no client data');
                                alert('Warning: This invoice has no client data. Some fields may be blank.');
                              }
                              if (!invoiceData.vehicle_id) {
                                console.warn('Warning: Invoice has no vehicle data');
                                alert('Warning: This invoice has no vehicle data. Some fields may be blank.');
                              }

                              setEditingInvoice(invoiceData);
                              setIsInvoiceModalOpen(true);

                            } catch (error) {
                              console.error('Failed to fetch invoice details:', error);

                              // Provide specific error messages based on error type
                              if (error.response?.status === 404) {
                                alert('Invoice not found. It may have been deleted.');
                              } else if (error.response?.status === 401) {
                                alert('Authentication expired. Please login again.');
                              } else if (error.response?.status === 400) {
                                alert(`Data error: ${error.response.data.detail || 'Invalid invoice data'}`);
                              } else {
                                alert('Failed to load invoice details. Using basic data - some fields may not be available.');
                              }

                              // Fallback to basic invoice data if fetch fails
                              console.log('Using fallback invoice data:', invoice);
                              setEditingInvoice(invoice);
                              setIsInvoiceModalOpen(true);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Invoice"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <PDFInvoice invoice={invoice} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" />
                        <button
                          onClick={() => handleDeleteInvoice(invoice)}
                          disabled={deleteInvoiceMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete Invoice"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6">Create your first invoice to get started</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsQuotationModalOpen(true)}
                className="btn-secondary"
              >
                <FileText className="w-4 h-4" />
                Create Quotation
              </button>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Invoice
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      <DynamicInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice}
      />

      {/* Quotation Modal */}
      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
      />
    </div>
  );
}