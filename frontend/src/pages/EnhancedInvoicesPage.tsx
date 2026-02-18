import { useState, useEffect } from 'react';
import {
  Receipt, Plus, Search, Edit, Eye, Filter, FileText,
  Calendar, DollarSign, Clock, CheckCircle, AlertCircle, XCircle,
  Settings, RefreshCw, QrCode, Truck, Trash2, MoreVertical
} from 'lucide-react';
import { useInvoices } from '../hooks/useDynamicApi';
import DynamicInvoiceModal from '../components/DynamicInvoiceModal';
import PDFInvoice from '../components/PDFInvoice';
import SecureDeleteModal from '../components/SecureDeleteModal';
import axios from 'axios';

export default function EnhancedInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  const {
    useGetInvoices,
    usePreviewInvoice
  } = useInvoices();

  // Build filters for the API
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(searchTerm && { search: searchTerm }),
  };

  const { data: invoices = [], isLoading, refetch } = useGetInvoices(filters);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showActionsMenu !== null) {
        setShowActionsMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const handleEdit = (invoice: any) => {
    setEditingInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsInvoiceModalOpen(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (invoice: any) => {
    setInvoiceToDelete(invoice);
    setDeleteModalOpen(true);
    setShowActionsMenu(null);
  };

  const handleConfirmDelete = async (password: string) => {
    if (!invoiceToDelete) return;

    try {
      await axios.delete(`/api/invoices/${invoiceToDelete.id}`, {
        data: { password }
      });
      refetch(); // Refresh the invoice list
      alert(`Invoice ${invoiceToDelete.invoice_number} deleted successfully`);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete invoice';
      throw new Error(errorMessage);
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const handleStatusUpdate = async (invoice: any, newStatus: string) => {
    try {
      const response = await axios.patch(`/api/invoices/${invoice.id}/status`, {
        payment_status: newStatus
      });
      refetch(); // Refresh the invoice list
      alert(response.data.message);
    } catch (error: any) {
      console.error('Status update error:', error);
      alert(error.response?.data?.detail || 'Failed to update status');
    }
    setShowActionsMenu(null);
  };

  const handleSelectInvoice = (invoiceId: number) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId);
    } else {
      newSelected.add(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map((inv: any) => inv.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'partially paid': { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getServiceTypeDisplay = (serviceType: string) => {
    if (!serviceType) return null;
    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-50 text-purple-700">
        <Settings className="w-3 h-3 mr-1" />
        {serviceType}
      </span>
    );
  };

  const getGSTDisplay = (invoice: any) => {
    if (!invoice.gst_enabled) {
      return <span className="text-xs text-gray-500">GST: Not applicable</span>;
    }

    const totalGST = (invoice.cgst_amount || 0) + (invoice.sgst_amount || 0) + (invoice.igst_amount || 0);
    return (
      <div className="text-xs text-gray-600">
        <div>GST: ₹{totalGST.toFixed(2)}</div>
        {invoice.cgst_amount > 0 && (
          <div>CGST: {invoice.cgst_rate}%, SGST: {invoice.sgst_rate}%</div>
        )}
        {invoice.igst_amount > 0 && (
          <div>IGST: {invoice.igst_rate}%</div>
        )}
      </div>
    );
  };

  // Calculate summary statistics
  const invoiceStats = invoices.reduce((stats: any, invoice: any) => {
    stats.total++;
    stats.totalAmount += invoice.total_amount || 0;

    if (invoice.payment_status === 'paid') stats.paid++;
    else if (invoice.payment_status === 'pending') stats.pending++;
    else if (invoice.payment_status === 'overdue') stats.overdue++;

    return stats;
  }, {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading invoices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Receipt className="w-8 h-8 mr-3 text-blue-600" />
              Invoices Management
            </h1>
            <p className="text-gray-600 mt-1">Professional billing and invoice management with GST support</p>
          </div>
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Invoice
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-gray-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoiceStats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Paid</p>
                <p className="text-2xl font-bold text-green-900">{invoiceStats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{invoiceStats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Value</p>
                <p className="text-2xl font-bold text-blue-900">₹{invoiceStats.totalAmount.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by number, client name, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partially paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => refetch()}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedInvoices.size} invoice(s) selected
              </span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                  Bulk Download
                </button>
                <button className="px-3 py-1 border border-blue-300 text-blue-700 text-sm rounded hover:bg-blue-100 transition-colors">
                  Send Emails
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No invoices found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & GST
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.has(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(invoice.invoice_date).toLocaleDateString()}
                        </div>
                        {invoice.due_date && (
                          <div className="text-xs text-gray-400">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.client_name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Truck className="w-3 h-3 mr-1" />
                          {invoice.vehicle_registration}
                        </div>
                        {invoice.km_reading_in && (
                          <div className="text-xs text-gray-400">
                            KM: {invoice.km_reading_in}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getServiceTypeDisplay(invoice.service_type)}
                        {invoice.technician_name && (
                          <div className="text-xs text-gray-500">
                            Tech: {invoice.technician_name}
                          </div>
                        )}
                        {invoice.work_order_no && (
                          <div className="text-xs text-gray-500">
                            WO: {invoice.work_order_no}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{invoice.total_amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Subtotal: ₹{invoice.subtotal?.toFixed(2) || '0.00'}
                        </div>
                        {getGSTDisplay(invoice)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.payment_status)}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <PDFInvoice
                          invoice={invoice}
                          className="text-green-600 hover:text-green-900 p-1 bg-transparent hover:bg-green-50 rounded transition-colors"
                        />

                        {invoice.unique_access_code && (
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/invoice/view/${invoice.unique_access_code}`;
                              navigator.clipboard.writeText(url);
                              alert('QR link copied to clipboard!');
                            }}
                            className="text-purple-600 hover:text-purple-900"
                            title="Copy QR Link"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        )}

                        {/* Status Update & Delete Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setShowActionsMenu(showActionsMenu === invoice.id ? null : invoice.id)}
                            className="text-gray-600 hover:text-gray-900"
                            title="More Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {showActionsMenu === invoice.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <div className="py-1">
                                {/* Status Update Options */}
                                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Change Status</div>
                                {invoice.payment_status !== 'pending' && (
                                  <button
                                    onClick={() => handleStatusUpdate(invoice, 'pending')}
                                    className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50 flex items-center"
                                  >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Mark as Pending
                                  </button>
                                )}
                                {invoice.payment_status !== 'paid' && (
                                  <button
                                    onClick={() => handleStatusUpdate(invoice, 'paid')}
                                    className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark as Paid
                                  </button>
                                )}
                                {invoice.payment_status !== 'partially_paid' && (
                                  <button
                                    onClick={() => handleStatusUpdate(invoice, 'partially_paid')}
                                    className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Mark as Partially Paid
                                  </button>
                                )}

                                <div className="border-t border-gray-100"></div>

                                {/* Delete Option */}
                                <button
                                  onClick={() => handleDeleteInvoice(invoice)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Invoice
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Invoice Modal */}
      <DynamicInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseModal}
        invoice={editingInvoice}
      />

      {/* Secure Delete Modal */}
      <SecureDeleteModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        itemType="Invoice"
        itemName={invoiceToDelete?.invoice_number || ''}
        description={`Client: ${invoiceToDelete?.client_name || ''} | Amount: ₹${invoiceToDelete?.total_amount?.toFixed(2) || '0.00'}`}
      />
    </div>
  );
}