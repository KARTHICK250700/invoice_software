import { useState, useEffect } from 'react';
import {
  Receipt, Plus, Search, Edit, FileText,
  Calendar, Clock, CheckCircle, AlertCircle, XCircle,
  RefreshCw, Trash2, MoreVertical, TrendingUp
} from 'lucide-react';
import { useInvoices } from '../hooks/useDynamicApi';
import DynamicInvoiceModal from '../components/DynamicInvoiceModal';
import PDFInvoice from '../components/PDFInvoice';
import SecureDeleteModal from '../components/SecureDeleteModal';
import axios from 'axios';
import { logger } from '../utils/logger';
import { useToast } from '../components/UI/Toast';

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string; Icon: any }> = {
  paid:           { label: 'Paid',           cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400', Icon: CheckCircle },
  pending:        { label: 'Pending',        cls: 'bg-amber-50  text-amber-700  border border-amber-200',   dot: 'bg-amber-400',   Icon: Clock         },
  partially_paid: { label: 'Partial',        cls: 'bg-blue-50   text-blue-700   border border-blue-200',    dot: 'bg-blue-400',    Icon: AlertCircle   },
  'partially paid':{ label: 'Partial',       cls: 'bg-blue-50   text-blue-700   border border-blue-200',    dot: 'bg-blue-400',    Icon: AlertCircle   },
  overdue:        { label: 'Overdue',        cls: 'bg-red-50    text-red-700    border border-red-200',     dot: 'bg-red-400',     Icon: XCircle       },
  cancelled:      { label: 'Cancelled',      cls: 'bg-gray-100  text-gray-600   border border-gray-200',    dot: 'bg-gray-400',    Icon: XCircle       },
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function EnhancedInvoicesPage() {
  const toast = useToast();
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('all');
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [editingInvoice,   setEditingInvoice]   = useState<any>(null);
  const [showActionsMenu,  setShowActionsMenu]  = useState<number | null>(null);
  const [deleteModalOpen,  setDeleteModalOpen]  = useState(false);
  const [invoiceToDelete,  setInvoiceToDelete]  = useState<any>(null);

  const { useGetInvoices } = useInvoices();
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(searchTerm   && { search: searchTerm }),
  };
  const { data: invoices = [], isLoading, refetch } = useGetInvoices(filters);

  useEffect(() => {
    if (showActionsMenu === null) return;
    const handler = () => setShowActionsMenu(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActionsMenu]);

  const handleEdit = async (invoice: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`/api/invoices/${invoice.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEditingInvoice(res.data);
    } catch { setEditingInvoice(invoice); }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingInvoice(null); };

  const handleDeleteInvoice = (invoice: any) => { setInvoiceToDelete(invoice); setDeleteModalOpen(true); setShowActionsMenu(null); };

  const handleConfirmDelete = async (password: string) => {
    if (!invoiceToDelete) return;
    try {
      await axios.delete(`/api/invoices/${invoiceToDelete.id}`, { data: { password } });
      refetch();
      toast.success(`Invoice ${invoiceToDelete.invoice_number} deleted successfully`);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleStatusUpdate = async (invoice: any, newStatus: string) => {
    try {
      const res = await axios.patch(`/api/invoices/${invoice.id}/status`, { payment_status: newStatus });
      refetch();
      toast.info(res.data.message || 'Status updated');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
    setShowActionsMenu(null);
  };

  // Stats
  const stats = invoices.reduce((acc: any, inv: any) => {
    acc.total++;
    acc.totalAmount += parseFloat(inv.total_amount || '0') || 0;
    if (inv.payment_status === 'paid')    acc.paid++;
    if (inv.payment_status === 'pending') acc.pending++;
    if (inv.payment_status === 'overdue') acc.overdue++;
    return acc;
  }, { total: 0, paid: 0, pending: 0, overdue: 0, totalAmount: 0 });

  logger.logComponent({ component: 'EnhancedInvoicesPage', action: 'RENDER', details: { count: invoices.length } });

  const statCards = [
    { label: 'Total Invoices', value: stats.total,   icon: FileText,     bg: 'bg-gray-50',    iconBg: 'bg-gray-200',    iconColor: 'text-gray-600',    text: 'text-gray-700'    },
    { label: 'Paid',           value: stats.paid,    icon: CheckCircle,  bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', text: 'text-emerald-700' },
    { label: 'Pending',        value: stats.pending, icon: Clock,        bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   text: 'text-amber-700'   },
    { label: 'Total Value',    value: fmt(stats.totalAmount), icon: TrendingUp, bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', text: 'text-indigo-700' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Professional billing and invoice management with GST support</p>
        </div>
        <button onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white/60 shadow-sm`}>
            <div className="flex items-center gap-3">
              <div className={`${s.iconBg} w-10 h-10 rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div>
                <p className={`text-xs font-medium ${s.text} opacity-80`}>{s.label}</p>
                <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by invoice number, client name, or vehicle..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-w-[150px]">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={() => refetch()} title="Refresh"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Invoice Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm">Loading invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No invoices found</h3>
            <p className="text-sm text-gray-500 mb-6">{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first invoice to get started'}</p>
            <button onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all">
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer & Vehicle</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Info</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount & GST</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice: any, idx: number) => {
                  const sc = STATUS_CONFIG[invoice.payment_status] || STATUS_CONFIG.pending;
                  const totalGST = (Number(invoice.cgst_amount) || 0) + (Number(invoice.sgst_amount) || 0) + (Number(invoice.igst_amount) || 0);
                  return (
                    <tr key={invoice.id}
                      className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-indigo-50/20 dark:hover:bg-gray-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-800/20'}`}>

                      {/* Invoice Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{invoice.invoice_number}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                            </div>
                            {invoice.due_date && (
                              <p className="text-xs text-gray-400">Due: {new Date(invoice.due_date).toLocaleDateString('en-GB')}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer & Vehicle */}
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{invoice.client_name || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{invoice.vehicle_registration || '—'}</p>
                        {invoice.km_reading_in && <p className="text-xs text-gray-400">KM: {invoice.km_reading_in}</p>}
                      </td>

                      {/* Service Info */}
                      <td className="py-3 px-4">
                        {invoice.service_type ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">
                            ⚙️ {invoice.service_type}
                          </span>
                        ) : <span className="text-xs text-gray-400">General Service</span>}
                        {invoice.technician_name && <p className="text-xs text-gray-400 mt-1">Tech: {invoice.technician_name}</p>}
                      </td>

                      {/* Amount & GST */}
                      <td className="py-3 px-4 text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(Number(invoice.total_amount) || 0)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Sub: {fmt(Number(invoice.subtotal) || 0)}</p>
                        {invoice.gst_enabled && totalGST > 0
                          ? <p className="text-xs text-gray-400">GST: {fmt(totalGST)}</p>
                          : <p className="text-xs text-gray-400">GST: N/A</p>
                        }
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {sc.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit */}
                          <button onClick={() => handleEdit(invoice)} title="Edit Invoice"
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Download PDF — green pill */}
                          <PDFInvoice invoice={invoice} iconOnly />

                          {/* More (Status + Delete) */}
                          <div className="relative">
                            <button onClick={() => setShowActionsMenu(showActionsMenu === invoice.id ? null : invoice.id)} title="More Actions"
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {showActionsMenu === invoice.id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg z-20 border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
                                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Change Status</div>
                                {invoice.payment_status !== 'pending' && (
                                  <button onClick={() => handleStatusUpdate(invoice, 'pending')}
                                    className="w-full text-left px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Mark as Pending
                                  </button>
                                )}
                                {invoice.payment_status !== 'paid' && (
                                  <button onClick={() => handleStatusUpdate(invoice, 'paid')}
                                    className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Mark as Paid
                                  </button>
                                )}
                                {invoice.payment_status !== 'partially_paid' && (
                                  <button onClick={() => handleStatusUpdate(invoice, 'partially_paid')}
                                    className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> Mark as Partial
                                  </button>
                                )}
                                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                <button onClick={() => handleDeleteInvoice(invoice)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 className="w-4 h-4" /> Delete Invoice
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
              Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <DynamicInvoiceModal isOpen={isModalOpen} onClose={handleCloseModal} invoice={editingInvoice} />
      <SecureDeleteModal
        isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setInvoiceToDelete(null); }}
        onConfirm={handleConfirmDelete} itemType="Invoice"
        itemName={invoiceToDelete?.invoice_number || ''}
        description={`Client: ${invoiceToDelete?.client_name || ''} | Amount: ${fmt(Number(invoiceToDelete?.total_amount) || 0)}`}
      />
    </div>
  );
}
