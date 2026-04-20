import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, Edit, Eye, Download, Receipt,
  DollarSign, CheckCircle, XCircle, Clock, X, ArrowRightCircle,
  TrendingUp, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import QuotationModal from '../components/QuotationModal';
import DynamicInvoiceModal from '../components/DynamicInvoiceModal';
import { generateTallyInvoicePDF } from '../utils/tallyPdfGenerator';
import { getStoredCompanySettings } from '../hooks/useCompanySettings';

const DEFAULT_COMPANY = {
  company_name: 'OM MURUGAN AUTO WORKS',
  address: '44HP+W4Q, Sidco Industrial Estate, Kalaignar Karunanidhi Nagar, Cholambedu, Chennai, Tamil Nadu 600062',
  gst_number: '33AXNPG2146F1ZR',
  email: 'gopalakrish.p86@gmail.com',
  phone: '9884551560',
};
import { useToast } from '../components/UI/Toast';

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-50  text-amber-700  border border-amber-200',  dot: 'bg-amber-400'  },
  accepted:  { label: 'Accepted',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-50    text-red-700    border border-red-200',    dot: 'bg-red-400'    },
  expired:   { label: 'Expired',   cls: 'bg-gray-100  text-gray-600   border border-gray-200',   dot: 'bg-gray-400'   },
  converted: { label: 'Converted', cls: 'bg-blue-50   text-blue-700   border border-blue-200',   dot: 'bg-blue-400'   },
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function QuotationsPage() {
  const toast = useToast();
  const [searchTerm,    setSearchTerm]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [isQModalOpen,  setIsQModalOpen]  = useState(false);
  const [isInvOpen,     setIsInvOpen]     = useState(false);
  const [editingQ,      setEditingQ]      = useState<any>(null);
  const [previewQ,      setPreviewQ]      = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: quotations, isLoading, error } = useQuery({
    queryKey: ['quotations', searchTerm, statusFilter],
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await axios.get(`/api/quotations?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data;
    },
    retry: (n, e: any) => e?.response?.status !== 401 && n < 3,
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => axios.post(`/api/quotations/${id}/convert-to-invoice`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Converted to invoice!'); },
    onError: () => toast.error('Failed to convert quotation'),
  });
  const acceptMutation = useMutation({
    mutationFn: (id: number) => axios.post(`/api/quotations/${id}/accept`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation accepted'); },
    onError: () => toast.error('Failed to accept quotation'),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: number) => axios.post(`/api/quotations/${id}/reject`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.warning('Quotation rejected'); },
    onError: () => toast.error('Failed to reject quotation'),
  });

  const handleEdit = async (q: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`/api/quotations/${q.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEditingQ(res.data); setIsQModalOpen(true);
    } catch { setEditingQ(q); setIsQModalOpen(true); }
  };

  const handlePreview = async (q: any) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`/api/quotations/${q.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPreviewQ(res.data);
    } catch { setPreviewQ(q); }
    setIsPreviewOpen(true);
  };

  const handleDownload = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`/api/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const co = { ...DEFAULT_COMPANY, ...(getStoredCompanySettings() || {}) };
      await generateTallyInvoicePDF({ ...res.data, _documentTitle: 'Quotation' }, co);
    } catch { toast.error('Failed to download PDF'); }
  };

  // Stats
  const pending   = quotations?.filter((q: any) => q.status === 'pending').length  || 0;
  const accepted  = quotations?.filter((q: any) => q.status === 'accepted').length || 0;
  const converted = quotations?.filter((q: any) => q.status === 'converted').length || 0;
  const totalAmt  = quotations?.reduce((s: number, q: any) => s + (q.total_amount || 0), 0) || 0;

  const stats = [
    { label: 'Pending',   value: pending,   icon: Clock,          bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   text: 'text-amber-700'   },
    { label: 'Accepted',  value: accepted,  icon: CheckCircle,    bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', text: 'text-emerald-700' },
    { label: 'Converted', value: converted, icon: ArrowRightCircle, bg: 'bg-blue-50',  iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    text: 'text-blue-700'    },
    { label: 'Total Value', value: fmt(totalAmt), icon: TrendingUp, bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', text: 'text-purple-700'  },
  ];

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage estimates and convert to invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsInvOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
            <Receipt className="w-4 h-4" /> Create Invoice
          </button>
          <button onClick={() => { setEditingQ(null); setIsQModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Create Quotation
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
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
            <input type="text" placeholder="Search by quotation number, customer, vehicle..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 min-w-[140px]">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">Failed to load quotations</h3>
            <p className="text-sm text-gray-500 mb-4">{(error as any)?.response?.status === 401 ? 'Please login to continue' : 'Something went wrong. Try again.'}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700">Retry</button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : !quotations?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No quotations found</h3>
            <p className="text-sm text-gray-500 mb-6">{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first quotation to get started'}</p>
            <button onClick={() => { setEditingQ(null); setIsQModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all">
              <Plus className="w-4 h-4" /> Create Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/50">
                  <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotation</th>
                  <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer & Vehicle</th>
                  <th className="text-right py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date / Validity</th>
                  <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q: any, idx: number) => {
                  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={q.id} className={`border-b border-gray-50 dark:border-gray-700/50 hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-gray-700/10'}`}>
                      {/* Quotation */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">#{q.quotation_number}</p>
                            <p className="text-xs text-gray-400">ID: {q.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-5">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.client_name || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{q.vehicle_registration || '—'}</p>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-5 text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(q.total_amount || 0)}</p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {sc.label}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-5">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(q.quotation_date).toLocaleDateString('en-GB')}</p>
                        {q.valid_until && (
                          <p className="text-xs text-gray-400 mt-0.5">Until {new Date(q.valid_until).toLocaleDateString('en-GB')}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview */}
                          <button onClick={() => handlePreview(q)} title="Preview"
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button onClick={() => handleEdit(q)} title="Edit"
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Download */}
                          <button onClick={() => handleDownload(q.id)} title="Download PDF"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-sm">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>

                          {/* Accept / Reject for pending */}
                          {q.status === 'pending' && (
                            <>
                              <button onClick={() => acceptMutation.mutate(q.id)} title="Accept"
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button onClick={() => rejectMutation.mutate(q.id)} title="Reject"
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Convert to invoice for accepted */}
                          {q.status === 'accepted' && (
                            <button onClick={() => convertMutation.mutate(q.id)} title="Convert to Invoice"
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
              Showing {quotations.length} quotation{quotations.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <QuotationModal isOpen={isQModalOpen} onClose={() => { setIsQModalOpen(false); setEditingQ(null); }} quotation={editingQ} />
      <DynamicInvoiceModal isOpen={isInvOpen} onClose={() => setIsInvOpen(false)} />

      {/* ── Preview Modal ── */}
      {isPreviewOpen && previewQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2"><FileText className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-white font-semibold">{previewQ.quotation_number}</h2>
                  <p className="text-blue-100 text-xs">Quotation Preview</p>
                </div>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{previewQ.client_name || '—'}</p>
                  <p className="text-sm text-gray-500">{previewQ.vehicle_registration || '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</p>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-medium text-gray-800 dark:text-gray-200">{new Date(previewQ.quotation_date).toLocaleDateString('en-GB')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Valid Until</span><span className="font-medium text-gray-800 dark:text-gray-200">{new Date(previewQ.valid_until).toLocaleDateString('en-GB')}</span></div>
                  <div className="flex justify-between text-sm items-center"><span className="text-gray-500">Status</span>
                    {(() => { const sc = STATUS_CONFIG[previewQ.status] || STATUS_CONFIG.pending; return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>{sc.label}</span>; })()}
                  </div>
                </div>
              </div>

              {/* Items */}
              {previewQ.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Services & Parts</p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rate</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewQ.items.map((item: any, i: number) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{item.name}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.type === 'service' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                {item.type === 'service' ? '🔧 Service' : '📦 Part'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity || item.qty}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{fmt(item.rate || 0)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{fmt(item.total || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total Estimate</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{fmt(previewQ.total_amount || 0)}</span>
              </div>

              {/* Notes */}
              {previewQ.notes && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Terms & Conditions</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{previewQ.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3">
              <button onClick={() => { setIsPreviewOpen(false); handleEdit(previewQ); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                <Edit className="w-4 h-4" /> Edit
              </button>
              <div className="flex-1" />
              <button onClick={() => handleDownload(previewQ.id)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
