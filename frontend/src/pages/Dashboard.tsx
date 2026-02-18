import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Car,
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Zap
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import InvoiceModal from '../components/InvoiceModal';
import QuotationModal from '../components/QuotationModal';
import ClientModal from '../components/ClientModal';
import PageHeader, { QuickStats } from '../components/UI/PageHeader';
import ModernCard, { CardHeader, CardContent, CardActions, ModernButton } from '../components/UI/ModernCard';
import { LoadingState, EmptyState } from '../components/UI/LoadingSkeletons';

interface DashboardStats {
  total_clients: number;
  total_vehicles: number;
  total_invoices: number;
  pending_invoices: number;
  monthly_revenue: number;
  outstanding_amount: number;
  recent_invoices: any[];
}

export default function Dashboard() {
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => axios.get('/api/dashboard/stats').then(res => res.data),
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => axios.get('/api/dashboard/revenue-chart').then(res => res.data),
  });

  // Mock data for charts
  const serviceData = [
    { name: 'Engine Service', value: 35, color: '#8B5CF6' },
    { name: 'Brake Service', value: 25, color: '#A855F7' },
    { name: 'AC Service', value: 20, color: '#C084FC' },
    { name: 'Electrical', value: 15, color: '#D8B4FE' },
    { name: 'Others', value: 5, color: '#E9D5FF' },
  ];

  const quickActions = [
    {
      name: 'New Client',
      icon: Users,
      color: 'bg-blue-500',
      action: () => setIsClientModalOpen(true)
    },
    {
      name: 'Add Vehicle',
      icon: Car,
      color: 'bg-green-500',
      action: () => navigate('/vehicles')
    },
    {
      name: 'Create Quote',
      icon: FileText,
      color: 'bg-indigo-500',
      action: () => setIsQuotationModalOpen(true)
    },
    {
      name: 'Create Invoice',
      icon: Receipt,
      color: 'bg-purple-500',
      action: () => setIsInvoiceModalOpen(true)
    },
    {
      name: 'View Reports',
      icon: BarChart3,
      color: 'bg-orange-500',
      action: () => navigate('/reports')
    },
    {
      name: 'Quotations',
      icon: FileText,
      color: 'bg-teal-500',
      action: () => navigate('/quotations')
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." size="lg" />;
  }

  // Prepare stats for QuickStats component
  const quickStatsData = [
    {
      label: 'Total Clients',
      value: stats?.total_clients || 0,
      trend: '+12%',
      trendDirection: 'up' as const,
      icon: Users,
      color: 'blue' as const
    },
    {
      label: 'Total Vehicles',
      value: stats?.total_vehicles || 0,
      trend: '+5%',
      trendDirection: 'up' as const,
      icon: Car,
      color: 'green' as const
    },
    {
      label: 'Pending Invoices',
      value: stats?.pending_invoices || 0,
      trend: '-8%',
      trendDirection: 'down' as const,
      icon: Receipt,
      color: 'orange' as const
    },
    {
      label: 'Monthly Revenue',
      value: `₹${(stats?.monthly_revenue || 0).toLocaleString()}`,
      trend: '+23%',
      trendDirection: 'up' as const,
      icon: DollarSign,
      color: 'purple' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Page Header */}
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with your service center."
        breadcrumbs={[]}
        actions={
          <div className="flex gap-3">
            <ModernButton
              variant="secondary"
              icon={BarChart3}
              onClick={() => navigate('/reports')}
            >
              Reports
            </ModernButton>
            <ModernButton
              variant="primary"
              icon={Plus}
              onClick={() => setIsInvoiceModalOpen(true)}
            >
              New Invoice
            </ModernButton>
          </div>
        }
        stats={<QuickStats stats={quickStatsData} />}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

        {/* Quick Actions */}
        <ModernCard>
          <CardHeader
            title="Quick Actions"
            subtitle="Get things done faster"
            icon={Zap}
            color="purple"
          />
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <ModernButton
                    key={action.name}
                    variant="ghost"
                    onClick={action.action}
                    className="flex-col h-auto py-4 px-3 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white mb-2`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.name}</span>
                  </ModernButton>
                );
              })}
            </div>
          </CardContent>
        </ModernCard>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <ModernCard className="lg:col-span-2" hover={false}>
            <CardHeader
              title="Revenue Trend"
              subtitle="Last 12 months performance"
              icon={Activity}
              color="blue"
              actions={
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">
                    +23% this month
                  </span>
                </div>
              }
            />
            <CardContent>
              <div className="h-64 w-full" style={{height: '256px'}}>
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={revenueChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
              </div>
            </CardContent>
          </ModernCard>

          {/* Service Distribution */}
          <ModernCard hover={false}>
            <CardHeader
              title="Service Types"
              subtitle="Distribution breakdown"
              icon={PieChart}
              color="green"
            />
            <CardContent>
              <div className="h-64 w-full" style={{height: '256px'}}>
            <ResponsiveContainer width="100%" height={256}>
              <RechartsPieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {serviceData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </ModernCard>
        </div>

        {/* Recent Invoices */}
        <ModernCard hover={false}>
          <CardHeader
            title="Recent Invoices"
            subtitle="Latest transactions"
            icon={Receipt}
            color="orange"
            actions={
              <ModernButton variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
                View all
              </ModernButton>
            }
          />
          <CardContent>
            <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Invoice #</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_invoices?.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium text-gray-900">#{invoice.invoice_number}</td>
                  <td className="py-3 px-4 text-gray-600">{invoice.client_name}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">₹{invoice.total_amount?.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-sm">
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!stats?.recent_invoices || stats.recent_invoices.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No recent invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </div>
          </CardContent>
        </ModernCard>
      </div>

      {/* Modals */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      <QuotationModal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
      />
    </div>
  );
}