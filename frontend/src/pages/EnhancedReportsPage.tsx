import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  TrendingUp,
  Users,
  Car,
  Receipt,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Clock,
  AlertCircle,
  Eye,
  Printer,
  Share2,
  Settings
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import axios from 'axios';
import AdvancedSearch from '../components/AdvancedSearch';
import { ReportService } from '../services/reportService';

interface ReportData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    chartData: Array<{
      month: string;
      revenue: number;
      expenses: number;
      profit: number;
    }>;
  };
  clients: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
    segments: Array<{
      name: string;
      value: number;
      color: string;
    }>;
  };
  services: {
    totalThisMonth: number;
    totalLastMonth: number;
    growth: number;
    byType: Array<{
      name: string;
      count: number;
      revenue: number;
      color: string;
    }>;
    topServices: Array<{
      name: string;
      count: number;
      revenue: number;
    }>;
  };
  invoices: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    pendingAmount: number;
    overdueAmount: number;
    statusData: Array<{
      status: string;
      count: number;
      amount: number;
      color: string;
    }>;
  };
  financial: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    outstandingAmount: number;
    collectionRate: number;
    monthlyTrend: Array<{
      month: string;
      income: number;
      expenses: number;
      profit: number;
    }>;
  };
}

const reportFilters = [
  {
    key: 'date_range',
    label: 'Date Range',
    type: 'dateRange' as const
  },
  {
    key: 'report_type',
    label: 'Report Type',
    type: 'select' as const,
    options: [
      { label: 'Revenue', value: 'revenue' },
      { label: 'Clients', value: 'clients' },
      { label: 'Services', value: 'services' },
      { label: 'Invoices', value: 'invoices' },
      { label: 'Financial', value: 'financial' }
    ]
  },
  {
    key: 'client_segment',
    label: 'Client Segment',
    type: 'select' as const,
    options: [
      { label: 'Individual', value: 'individual' },
      { label: 'Business', value: 'business' },
      { label: 'Fleet', value: 'fleet' }
    ]
  },
  {
    key: 'service_type',
    label: 'Service Type',
    type: 'select' as const,
    options: [
      { label: 'Engine Service', value: 'engine' },
      { label: 'Brake Service', value: 'brake' },
      { label: 'AC Service', value: 'ac' },
      { label: 'Electrical', value: 'electrical' },
      { label: 'Body Work', value: 'body' }
    ]
  }
];

export default function EnhancedReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [searchFilters, setSearchFilters] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [isExporting, setIsExporting] = useState(false);

  // Fetch dynamic report data
  const { data: reportData, isLoading, refetch, isRefetching } = useQuery<ReportData>({
    queryKey: ['reports', selectedReport, searchFilters, dateRange],
    queryFn: async () => {
      const filters = {
        ...searchFilters,
        date_from: dateRange.from,
        date_to: dateRange.to
      };

      // Use ReportService for dynamic data
      return await ReportService.getReportData(selectedReport, filters);
    },
    staleTime: 30 * 1000, // 30 seconds for more dynamic feel
    refetchInterval: 2 * 60 * 1000, // 2 minutes for real-time updates
    retry: 1
  });

  // Use dynamic data from ReportService - no more static mock data
  const data = reportData || {
    revenue: { total: 0, thisMonth: 0, lastMonth: 0, growth: 0, chartData: [] },
    clients: { total: 0, active: 0, newThisMonth: 0, growth: 0, segments: [] },
    services: { totalThisMonth: 0, totalLastMonth: 0, growth: 0, byType: [], topServices: [] },
    invoices: { total: 0, paid: 0, pending: 0, overdue: 0, pendingAmount: 0, overdueAmount: 0, statusData: [] },
    financial: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, outstandingAmount: 0, collectionRate: 0, monthlyTrend: [] }
  };

  const handleSearch = (term: string, filters: Record<string, any>) => {
    setSearchTerm(term);
    setSearchFilters(filters);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      // Use ReportService for exporting
      const blob = await ReportService.exportReport(format, selectedReport, {
        ...searchFilters,
        date_range: dateRange
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dynamic-report-${selectedReport}-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback: generate client-side export with current data
      generateClientSideExport(format);
    } finally {
      setIsExporting(false);
    }
  };

  const generateClientSideExport = (format: string) => {
    // Simplified client-side export with dynamic data
    const timestamp = new Date().toISOString().split('T')[0];
    const exportData = {
      reportType: selectedReport,
      generatedAt: new Date().toISOString(),
      filters: searchFilters,
      dateRange,
      data: data,
      summary: {
        totalRevenue: data.revenue?.total || 0,
        totalClients: data.clients?.total || 0,
        activeServices: data.services?.totalThisMonth || 0,
        pendingAmount: data.financial?.outstandingAmount || 0
      }
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dynamic-report-backup-${timestamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'revenue', name: 'Revenue', icon: TrendingUp },
    { id: 'clients', name: 'Clients', icon: Users },
    { id: 'services', name: 'Services', icon: Car },
    { id: 'invoices', name: 'Invoices', icon: Receipt },
    { id: 'financial', name: 'Financial', icon: DollarSign }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark-text">Dynamic Reports</h1>
          <p className="dark-text-muted mt-1">
            Real-time business analytics and reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="relative group">
            <button className="btn-primary">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border dark-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <FileText className="w-4 h-4" />
                PDF Report
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <Download className="w-4 h-4" />
                Excel Export
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <Receipt className="w-4 h-4" />
                CSV Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium dark-text">Report Filters</h2>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 dark-text-muted" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="input-field text-sm py-1"
            />
            <span className="dark-text-muted">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="input-field text-sm py-1"
            />
          </div>
        </div>

        <AdvancedSearch
          filters={reportFilters}
          onSearch={handleSearch}
          placeholder="Search reports by type, client, service..."
          showAdvanced={false}
        />
      </div>

      {/* Report Type Selector */}
      <div className="card">
        <h3 className="text-lg font-medium dark-text mb-4">Report Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  selectedReport === type.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium dark-text">{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Metric */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Total Revenue</p>
              <p className="text-2xl font-bold dark-text">₹{data.revenue.total.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500">+{data.revenue.growth}% from last month</span>
          </div>
        </div>

        {/* Clients Metric */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Total Clients</p>
              <p className="text-2xl font-bold dark-text">{data.clients.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm dark-text-muted">{data.clients.active} active</span>
            <span className="text-sm text-blue-500">+{data.clients.newThisMonth} this month</span>
          </div>
        </div>

        {/* Services Metric */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Services This Month</p>
              <p className="text-2xl font-bold dark-text">{data.services.totalThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500">+{data.services.growth}% growth</span>
          </div>
        </div>

        {/* Outstanding Amount Metric */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Outstanding</p>
              <p className="text-2xl font-bold dark-text">₹{data.financial.outstandingAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-500">{data.invoices.overdue} overdue invoices</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {selectedReport === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold dark-text">Revenue Trend</h3>
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--chart-axis)" fontSize={12} />
                  <YAxis stroke="var(--chart-axis)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      color: 'var(--tooltip-text)',
                      border: '1px solid var(--tooltip-border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="2"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold dark-text">Service Distribution</h3>
              <PieChart className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.services.byType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {data.services.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Report Details */}
      {selectedReport === 'revenue' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold dark-text mb-6">Monthly Revenue Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenue.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--chart-axis)" fontSize={12} />
                  <YAxis stroke="var(--chart-axis)" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Services Report Details */}
      {selectedReport === 'services' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold dark-text mb-6">Service Revenue by Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.services.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={12} />
                    <YAxis stroke="var(--chart-axis)" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold dark-text mb-6">Top Services</h3>
              <div className="space-y-4">
                {data.services.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium dark-text">{service.name}</div>
                      <div className="text-sm dark-text-muted">{service.count} services</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold dark-text">₹{service.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Status Report */}
      {selectedReport === 'invoices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold dark-text mb-6">Invoice Status Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={data.invoices.statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.invoices.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold dark-text mb-6">Payment Summary</h3>
              <div className="space-y-4">
                {data.invoices.statusData.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${status.color}10` }}>
                    <div>
                      <div className="font-medium dark-text">{status.status} Invoices</div>
                      <div className="text-sm dark-text-muted">{status.count} invoices</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold dark-text">₹{status.amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold dark-text mb-4">Quick Report Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Report
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Settings className="w-4 h-4" />
            Schedule Report
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}