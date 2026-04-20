import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Car, Receipt, TrendingUp, TrendingDown,
  Clock, Plus, BarChart3, Activity, FileText, Zap,
  IndianRupee, Wallet, BadgePercent, AlertTriangle
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DynamicInvoiceModal from '../components/DynamicInvoiceModal';
import QuotationModal from '../components/QuotationModal';
import ClientModal from '../components/ClientModal';

const fmt = (n: number) =>
  '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const pctLabel = (v: number) =>
  v > 0 ? `+${v}%` : v < 0 ? `${v}%` : '0%';

export default function Dashboard() {
  const [clientModal,    setClientModal]    = useState(false);
  const [invoiceModal,   setInvoiceModal]   = useState(false);
  const [quotationModal, setQuotationModal] = useState(false);
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['dashboard-stats'],
    queryFn: () => axios.get('/api/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: chartData = [] } = useQuery<any[]>({
    queryKey: ['revenue-chart'],
    queryFn: () => axios.get('/api/dashboard/revenue-chart').then(r => r.data),
    refetchInterval: 60_000,
  });

  // ── derived numbers ──────────────────────────────────────────────────────
  const totalBilled    = stats?.total_billed    ?? 0;
  const collected      = stats?.total_collected  ?? 0;
  const balanceDue     = stats?.total_balance_due ?? 0;
  const gst            = stats?.total_gst        ?? 0;
  const monthRevenue   = stats?.monthly_revenue   ?? 0;
  const revenueGrowth  = stats?.revenue_growth    ?? 0;

  const collectionRate = totalBilled > 0
    ? Math.round((collected / totalBilled) * 100)
    : 0;

  // ── quick actions ────────────────────────────────────────────────────────
  const quickActions = [
    { name: 'New Client',     icon: Users,    color: '#3B82F6', action: () => setClientModal(true) },
    { name: 'Add Vehicle',    icon: Car,      color: '#10B981', action: () => navigate('/vehicles') },
    { name: 'Create Quote',   icon: FileText, color: '#6366F1', action: () => setQuotationModal(true) },
    { name: 'Create Invoice', icon: Receipt,  color: '#8B5CF6', action: () => setInvoiceModal(true) },
    { name: 'View Reports',   icon: BarChart3, color: '#F97316', action: () => navigate('/reports') },
    { name: 'Invoices',       icon: Zap,      color: '#14B8A6', action: () => navigate('/invoices') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's your service center summary.</p>
          </div>
          <button
            onClick={() => setInvoiceModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Top Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Clients',  value: stats?.total_clients  ?? 0, icon: Users,   color: 'blue',   sub: `${stats?.total_vehicles ?? 0} vehicles` },
            { label: 'Total Invoices', value: stats?.total_invoices  ?? 0, icon: Receipt, color: 'purple', sub: `${stats?.paid_invoices ?? 0} paid · ${stats?.pending_invoices ?? 0} pending` },
            { label: 'This Month',     value: fmt(monthRevenue),           icon: TrendingUp, color: 'green',
              sub: revenueGrowth !== 0
                ? `${pctLabel(revenueGrowth)} vs last month`
                : 'No data last month',
              up: revenueGrowth >= 0,
            },
            { label: 'Balance Due',    value: fmt(balanceDue),             icon: AlertTriangle, color: 'red',  sub: `${stats?.pending_invoices ?? 0} unpaid invoices` },
          ].map(({ label, value, icon: Icon, color, sub, up }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                  ${color === 'blue'   ? 'bg-blue-50'   : ''}
                  ${color === 'purple' ? 'bg-purple-50' : ''}
                  ${color === 'green'  ? 'bg-green-50'  : ''}
                  ${color === 'red'    ? 'bg-red-50'    : ''}
                `}>
                  <Icon className={`w-5 h-5
                    ${color === 'blue'   ? 'text-blue-500'   : ''}
                    ${color === 'purple' ? 'text-purple-500' : ''}
                    ${color === 'green'  ? 'text-green-500'  : ''}
                    ${color === 'red'    ? 'text-red-500'    : ''}
                  `} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {sub && (
                <p className={`text-xs mt-1 font-medium
                  ${up === false ? 'text-red-500' : up === true ? 'text-green-600' : 'text-gray-400'}
                `}>{sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Collection Summary ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Collection Summary</h2>
              <p className="text-xs text-gray-500 mt-0.5">All-time totals across all invoices</p>
            </div>
            {/* Collection Rate bar */}
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Collection Rate</p>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(collectionRate, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{collectionRate}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
            {[
              { label: 'Total Billed',  value: fmt(totalBilled), icon: IndianRupee, color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Collected',     value: fmt(collected),   icon: Wallet,      color: 'text-green-600',  bg: 'bg-green-50' },
              { label: 'Balance Due',   value: fmt(balanceDue),  icon: Clock,       color: 'text-red-500',    bg: 'bg-red-50' },
              { label: 'GST Amount',    value: fmt(gst),         icon: BadgePercent, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="px-6 py-5">
                <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Revenue Chart + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Revenue Trend</h2>
                <p className="text-xs text-gray-500 mt-0.5">Last 12 months — billed vs collected</p>
              </div>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            {chartData.every(d => d.revenue === 0) ? (
              <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                No invoice data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11}
                    tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [fmt(val), name === 'revenue' ? 'Revenue' : 'Collected']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue"   name="Revenue"   stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="collected" name="Collected" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(({ name, icon: Icon, color, action }) => (
                <button
                  key={name}
                  onClick={action}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: color + '18' }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 group-hover:text-orange-700 text-center leading-tight">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Invoices ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Recent Invoices</h2>
            <button onClick={() => navigate('/invoices')}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600">
              View all →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Invoice #', 'Client', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.recent_invoices ?? []).map((inv: any) => {
                  const st = (inv.status || '').toLowerCase();
                  const statusStyle =
                    st === 'paid'    ? 'bg-green-100 text-green-700' :
                    st === 'overdue' ? 'bg-red-100 text-red-700'     :
                    st === 'partially_paid' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700';
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{inv.invoice_number}</td>
                      <td className="px-5 py-3.5 text-gray-600">{inv.client_name}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{fmt(inv.total_amount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle}`}>
                          {st.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })}
                {(!stats?.recent_invoices?.length) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No invoices yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modals */}
      <ClientModal isOpen={clientModal} onClose={() => setClientModal(false)} />
      <DynamicInvoiceModal isOpen={invoiceModal} onClose={() => setInvoiceModal(false)} />
      <QuotationModal isOpen={quotationModal} onClose={() => setQuotationModal(false)} />
    </div>
  );
}
