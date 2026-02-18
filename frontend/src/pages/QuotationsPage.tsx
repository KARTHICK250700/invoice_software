import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, Edit, Eye, Download, Receipt, DollarSign, CheckCircle, XCircle, Clock, Ban, X } from 'lucide-react';
import axios from 'axios';
import QuotationModal from '../components/QuotationModal';
import InvoiceModal from '../components/InvoiceModal';
import { generateQuotationPDF } from '../utils/quotationPdfGenerator';

// Old PDF generator removed - using new quotationPdfGenerator based on invoice format

export default function QuotationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [previewQuotation, setPreviewQuotation] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: quotations, isLoading, error } = useQuery({
    queryKey: ['quotations', searchTerm, statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(`/api/quotations?${params.toString()}`, { headers });
      return response.data;
    },
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: (quotationId: number) => axios.post(`/api/quotations/${quotationId}/convert-to-invoice`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const acceptQuotationMutation = useMutation({
    mutationFn: (quotationId: number) => axios.post(`/api/quotations/${quotationId}/accept`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const rejectQuotationMutation = useMutation({
    mutationFn: (quotationId: number) => axios.post(`/api/quotations/${quotationId}/reject`).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      converted: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const handleEditQuotation = async (quotation: any) => {
    console.log('Edit clicked for quotation:', quotation);

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('No auth token found');
        alert('Please login first to edit quotations');
        return;
      }

      // Ensure auth header is set
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch complete quotation data including items
      const response = await axios.get(`/api/quotations/${quotation.id}`, { headers });
      console.log('Fetched quotation data for edit:', response.data);

      setEditingQuotation(response.data);
      setIsQuotationModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching quotation for edit:', error);

      if (error.response?.status === 422) {
        console.error('Validation error:', error.response.data);
        alert('Data validation error. Please check the quotation data format.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert('Authentication failed. Please login again.');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } else {
        console.warn('Using fallback data due to API error');
        // Fallback to using the data from the list
        setEditingQuotation(quotation);
        setIsQuotationModalOpen(true);
      }
    }
  };

  const handleConvertToInvoice = (quotationId: number) => {
    if (window.confirm('Are you sure you want to convert this quotation to an invoice?')) {
      convertToInvoiceMutation.mutate(quotationId);
    }
  };

  const handleAcceptQuotation = (quotationId: number) => {
    if (window.confirm('Are you sure you want to accept this quotation?')) {
      acceptQuotationMutation.mutate(quotationId);
    }
  };

  const handleRejectQuotation = (quotationId: number) => {
    if (window.confirm('Are you sure you want to reject this quotation?')) {
      rejectQuotationMutation.mutate(quotationId);
    }
  };

  const handlePreviewQuotation = async (quotation: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const response = await axios.get(`/api/quotations/${quotation.id}`, { headers });
      setPreviewQuotation(response.data);
      setIsPreviewModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching quotation for preview:', error);
      if (error.response?.status === 401) {
        alert('Please login to preview quotations');
        return;
      }
      setPreviewQuotation(quotation);
      setIsPreviewModalOpen(true);
    }
  };

  const handleDownloadQuotation = async (quotationId: number) => {
    try {
      // Fetch full quotation data including items
      const quotationResponse = await axios.get(`/api/quotations/${quotationId}`);
      const quotation = quotationResponse.data;

      // Generate and download PDF using the new invoice-based format
      await generateQuotationPDF(quotation);
    } catch (error) {
      console.error('Error downloading quotation:', error);
      alert('Failed to download quotation PDF. Please try again.');
    }
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600 text-xs">Manage estimates and quotations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="btn-secondary text-sm px-4 py-2"
          >
            <Receipt className="w-4 h-4" />
            Create Invoice
          </button>
          <button
            onClick={() => setIsQuotationModalOpen(true)}
            className="btn-primary text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            Create Quotation
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card py-1 px-2">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 py-1 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field md:w-auto py-1 text-xs"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="card overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-red-500 mb-4">
              <FileText className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load quotations</h3>
            <p className="text-gray-500 mb-4">
              {(error as any)?.response?.status === 401
                ? 'Please login to view quotations'
                : 'There was an error loading quotations. Please try again.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : quotations?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[100px]">Quotation</th>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[180px]">Customer & Vehicle</th>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[80px]">Amount</th>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[70px]">Status</th>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[120px]">Date & Validity</th>
                  <th className="text-left py-1 px-1 font-semibold text-gray-700 text-xs min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation: any) => (
                  <tr key={quotation.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1 px-1">
                      <div className="font-medium text-gray-900 text-xs">#{quotation.quotation_number}</div>
                      <div className="text-xs text-gray-500">ID:{quotation.id}</div>
                    </td>
                    <td className="py-1 px-1">
                      <div className="text-gray-900 text-xs">{quotation.client_name}</div>
                      <div className="text-xs text-gray-500">{quotation.vehicle_registration}</div>
                    </td>
                    <td className="py-1 px-1">
                      <div className="font-medium text-gray-900 text-xs">₹{quotation.total_amount?.toLocaleString()}</div>
                    </td>
                    <td className="py-1 px-1">
                      <span className={`px-1 py-0.5 rounded text-xs font-medium ${getStatusBadge(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className="py-1 px-1">
                      <div className="text-xs text-gray-900">
                        {new Date(quotation.quotation_date).toLocaleDateString()}
                      </div>
                      {quotation.valid_until && (
                        <div className="text-xs text-gray-500">
                          Until: {new Date(quotation.valid_until).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => handlePreviewQuotation(quotation)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="Preview Quotation"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuotation(quotation)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Quotation"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadQuotation(quotation.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md rounded-lg transition-all duration-200 transform hover:scale-105 text-sm font-medium"
                          title="Download Quotation PDF"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>

                        {/* Status management buttons */}
                        {quotation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptQuotation(quotation.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Accept Quotation"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectQuotation(quotation.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Reject Quotation"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {quotation.status === 'accepted' && (
                          <button
                            onClick={() => handleConvertToInvoice(quotation.id)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                            title="Convert to Invoice"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
            <p className="text-gray-500 mb-6">Create your first quotation to get started</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="btn-secondary"
              >
                <Receipt className="w-4 h-4" />
                Create Invoice
              </button>
              <button
                onClick={() => setIsQuotationModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Quotation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-1">
        <div className="card bg-yellow-50 border-yellow-200 py-1 px-2">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-yellow-100 rounded flex items-center justify-center">
              <FileText className="w-3 h-3 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-yellow-600">Pending</p>
              <p className="text-sm font-bold text-yellow-700">
                {quotations?.filter((q: any) => q.status === 'pending').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-green-50 border-green-200 py-1 px-2">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
              <FileText className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600">Accepted</p>
              <p className="text-sm font-bold text-green-700">
                {quotations?.filter((q: any) => q.status === 'accepted').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-blue-50 border-blue-200 py-1 px-2">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
              <DollarSign className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600">Converted</p>
              <p className="text-sm font-bold text-blue-700">
                {quotations?.filter((q: any) => q.status === 'converted').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-purple-50 border-purple-200 py-1 px-2">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
              <Receipt className="w-3 h-3 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-purple-600">Total</p>
              <p className="text-xs font-bold text-purple-700">
                ₹{Math.round(quotations?.reduce((sum: number, q: any) => sum + (q.total_amount || 0), 0)/1000) || '0'}k
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Modal */}
      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setEditingQuotation(null);
        }}
        quotation={editingQuotation}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Quotation Preview Modal */}
      {isPreviewModalOpen && previewQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Quotation Preview - {previewQuotation.quotation_number}
              </h2>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6 space-y-6">
              {/* Company Header */}
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-blue-800">OM MURUGAN AUTO WORKS</h1>
                    <p className="text-blue-600 font-medium">COMPLETE MULTIBRAND AUTO CARE SERVICES</p>
                    <p className="text-sm text-gray-600">No.8 4th Main Road, Manikandapuram, Thirumullaivoyal, Chennai-600 062</p>
                    <p className="text-sm text-gray-600">Cell: 9884551560 | Email: ommurugan201205@gmail.com</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">QUOTATION</p>
              </div>

              {/* Quotation Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
                  <p><span className="font-medium">Name:</span> {previewQuotation.client_name}</p>
                  <p><span className="font-medium">Vehicle:</span> {previewQuotation.vehicle_registration}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Quotation Details</h3>
                  <p><span className="font-medium">Number:</span> {previewQuotation.quotation_number}</p>
                  <p><span className="font-medium">Date:</span> {new Date(previewQuotation.quotation_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Valid Until:</span> {new Date(previewQuotation.valid_until).toLocaleDateString()}</p>
                  <p><span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(previewQuotation.status)}`}>
                      {previewQuotation.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Parts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Item</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Qty</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Rate</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewQuotation.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="py-3 px-4">{item.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.type === 'service' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">{item.quantity || item.qty}</td>
                          <td className="py-3 px-4">₹{item.rate?.toFixed(2)}</td>
                          <td className="py-3 px-4">₹{item.total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Estimate:</span>
                  <span className="text-xl font-bold text-blue-600">₹{previewQuotation.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {previewQuotation.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Terms & Conditions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{previewQuotation.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadQuotation(previewQuotation.id)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Quotation PDF
                </button>
                <button
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    handleEditQuotation(previewQuotation);
                  }}
                  className="flex-1 btn-secondary px-6 py-3"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}