import { useState } from 'react';
import {
  FileText,
  TrendingUp,
  Users,
  Car,
  Receipt,
  Download,
  Settings,
  Plus,
  RefreshCw,
  BarChart3,
  Activity,
  Zap,
  Clock,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useLiveReports, useLiveChartData } from '../hooks/useLiveReports';
import EnhancedReportsPage from './EnhancedReportsPage';
import ReportSettings from '../components/ReportSettings';
import ReportBuilder from '../components/ReportBuilder';

export default function ReportsPage() {
  const [activeView, setActiveView] = useState<'overview' | 'enhanced' | 'custom'>('overview');
  const [showSettings, setShowSettings] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [animateChanges] = useState(true);

  // Use the live reports hook
  const {
    data: liveData,
    isLoading,
    isRefetching,
    isRealTime,
    lastUpdate,
    forceRefresh,
    toggleRealTime,
    hasChanges
  } = useLiveReports(refreshInterval);

  // Live chart data
  const { data: revenueChartData } = useLiveChartData('revenue');
  const { data: servicesChartData } = useLiveChartData('services');

  // Show enhanced reports view
  if (activeView === 'enhanced') {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveView('overview')}
            className="btn-secondary"
          >
            ← Back to Live Dashboard
          </button>
          <h1 className="text-2xl font-bold dark-text">Enhanced Analytics</h1>
        </div>
        <EnhancedReportsPage />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 dark-text">Loading live data...</span>
      </div>
    );
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-3 h-3 text-green-500" />;
    if (change < 0) return <ArrowDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatChange = (change: number, isPercentage = false) => {
    const prefix = change > 0 ? '+' : '';
    const suffix = isPercentage ? '%' : '';
    return `${prefix}${change.toFixed(isPercentage ? 1 : 0)}${suffix}`;
  };

  const handleExportReport = async (format: string) => {
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // Generate CSV format
      const csvData = [];

      // Report Header
      csvData.push(['Live Business Report']);
      csvData.push(['Generated Date', new Date().toLocaleDateString('en-GB')]);
      csvData.push(['Generated Time', new Date().toLocaleTimeString('en-GB')]);
      csvData.push(['Currency', 'Indian Rupees (INR)']);
      csvData.push(['']); // Empty row

      // Business Summary - Clean numerical data only
      csvData.push(['BUSINESS SUMMARY']);
      csvData.push(['Metric', 'Value', 'Change', 'Growth Percentage']);
      csvData.push(['Total Revenue INR', liveData?.revenue?.total || 0, liveData?.revenue?.change || 0, liveData?.revenue?.growth?.toFixed(2) || 0]);
      csvData.push(['This Month Revenue INR', liveData?.revenue?.thisMonth || 0, '', '']);
      csvData.push(['Total Clients', liveData?.clients?.total || 0, liveData?.clients?.change || 0, liveData?.clients?.growth?.toFixed(2) || 0]);
      csvData.push(['New Clients This Month', liveData?.clients?.newThisMonth || 0, '', '']);
      csvData.push(['Services This Month', liveData?.services?.thisMonth || 0, liveData?.services?.change || 0, liveData?.services?.growth?.toFixed(2) || 0]);
      csvData.push(['Pending Invoices Count', liveData?.invoices?.pending || 0, '', '']);
      csvData.push(['Overdue Invoices Count', liveData?.invoices?.overdue || 0, '', '']);
      csvData.push(['Outstanding Amount INR', liveData?.invoices?.pendingAmount || 0, '', '']);
      csvData.push(['Current Month Profit INR', liveData?.financial?.profit || 0, '', '']);
      csvData.push(['']); // Empty row

      // Monthly Revenue Analysis - Pure numbers
      csvData.push(['MONTHLY REVENUE ANALYSIS']);
      csvData.push(['Month', 'Revenue INR', 'Expenses INR', 'Profit INR']);
      revenueChartData?.forEach(item => {
        csvData.push([item.month, item.revenue || 0, item.expenses || 0, item.profit || 0]);
      });
      csvData.push(['']); // Empty row

      // Service Performance - Clean data
      csvData.push(['SERVICE PERFORMANCE']);
      csvData.push(['Service Type', 'Service Count', 'Revenue INR', 'Percentage Share']);
      const totalServiceRevenue = servicesChartData?.reduce((sum, item) => sum + (item.revenue || 0), 0) || 1;
      servicesChartData?.forEach(item => {
        const percentage = ((item.revenue || 0) / totalServiceRevenue * 100).toFixed(2);
        csvData.push([item.name, item.count || 0, item.revenue || 0, percentage]);
      });
      csvData.push(['']); // Empty row

      // Summary Statistics
      csvData.push(['REPORT SUMMARY']);
      csvData.push(['Total Database Records Analyzed', (liveData?.clients?.total || 0) + (liveData?.invoices?.pending || 0)]);
      csvData.push(['Data Source', 'Live Database Connection']);
      csvData.push(['Report Type', 'Real-time Business Analytics']);

      // Convert to CSV string
      const csvString = csvData.map(row =>
        row.map(cell =>
          typeof cell === 'string' && cell.includes(',')
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(',')
      ).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `live-report-${timestamp}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Generate JSON format (existing functionality)
      const exportData = {
        timestamp: new Date().toISOString(),
        data: liveData,
        charts: {
          revenue: revenueChartData,
          services: servicesChartData
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `live-report-${timestamp}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold dark-text">Live Reports Dashboard</h1>
            <div className="flex items-center gap-2">
              {isRealTime ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">LIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-sm font-medium dark-text-muted">PAUSED</span>
                </div>
              )}
              {hasChanges && animateChanges && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-700 dark:text-blue-300">Updated</span>
                </div>
              )}
            </div>
          </div>
          <p className="dark-text-muted">
            Real-time business analytics • Last updated:{' '}
            <span className="font-medium">
              {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'Never'}
            </span>
            {isRefetching && (
              <span className="inline-flex items-center gap-1 ml-2 text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Updating...
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 dark-text-muted" />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="input-field text-sm py-1 w-32"
            >
              <option value={10000}>10 sec</option>
              <option value={30000}>30 sec</option>
              <option value={60000}>1 min</option>
              <option value={300000}>5 min</option>
            </select>
          </div>

          <button
            onClick={toggleRealTime}
            className={`btn-secondary ${!isRealTime ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : ''}`}
          >
            <Activity className="w-4 h-4" />
            {isRealTime ? 'Pause' : 'Resume'} Live Updates
          </button>

          <button
            onClick={forceRefresh}
            disabled={isRefetching}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Now
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="btn-secondary"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

          <div className="relative group">
            <button className="btn-primary">
              <Download className="w-4 h-4" />
              Export Live Data
            </button>
            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border dark-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExportReport('json')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <FileText className="w-4 h-4" />
                Current Data (JSON)
              </button>
              <button
                onClick={() => handleExportReport('csv')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 w-full text-left"
              >
                <Receipt className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Metric */}
        <div className={`card transition-all duration-500 ${liveData?.revenue.change !== 0 && animateChanges ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Total Revenue</p>
              <p className="text-2xl font-bold dark-text">₹{liveData?.revenue.total.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">+{liveData?.revenue.growth.toFixed(1)}% growth</span>
            </div>
            {liveData?.revenue.change !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${getChangeColor(liveData.revenue.change)}`}>
                {getChangeIcon(liveData.revenue.change)}
                {formatChange(liveData.revenue.change)}
              </div>
            )}
          </div>
        </div>

        {/* Clients Metric */}
        <div className={`card transition-all duration-500 ${liveData?.clients.change !== 0 && animateChanges ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Total Clients</p>
              <p className="text-2xl font-bold dark-text">{liveData?.clients.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark-text-muted">+{liveData?.clients.newThisMonth} this month</span>
            {liveData?.clients.change !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${getChangeColor(liveData.clients.change)}`}>
                {getChangeIcon(liveData.clients.change)}
                {formatChange(liveData.clients.change)}
              </div>
            )}
          </div>
        </div>

        {/* Services Metric */}
        <div className={`card transition-all duration-500 ${liveData?.services.change !== 0 && animateChanges ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Services This Month</p>
              <p className="text-2xl font-bold dark-text">{liveData?.services.thisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">+{liveData?.services.growth.toFixed(1)}% growth</span>
            </div>
            {liveData?.services.change !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${getChangeColor(liveData.services.change)}`}>
                {getChangeIcon(liveData.services.change)}
                {formatChange(liveData.services.change)}
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Amount Metric */}
        <div className={`card transition-all duration-500 ${liveData?.invoices.change !== 0 && animateChanges ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium dark-text-muted">Outstanding</p>
              <p className="text-2xl font-bold dark-text">₹{liveData?.financial.outstanding.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-500">{liveData?.invoices.overdue} overdue</span>
            </div>
            {liveData?.invoices.change !== 0 && (
              <div className={`flex items-center gap-1 text-xs ${getChangeColor(liveData.invoices.change)}`}>
                {getChangeIcon(liveData.invoices.change)}
                {formatChange(liveData.invoices.change)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold dark-text">Live Revenue Trend</h3>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm dark-text-muted">Updates every {refreshInterval/1000}s</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData || []}>
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

        {/* Services Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold dark-text">Live Service Distribution</h3>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm dark-text-muted">Real-time data</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={servicesChartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={12} />
                <YAxis stroke="var(--chart-axis)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standard Reports */}
        <div className="card">
          <h3 className="text-lg font-semibold dark-text mb-4">Live Reports</h3>
          <div className="space-y-3">
            <button
              onClick={() => setActiveView('enhanced')}
              className="w-full flex items-center justify-between p-3 border dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div className="text-left">
                  <div className="font-medium dark-text group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    Enhanced Analytics
                  </div>
                  <div className="text-sm dark-text-muted">Interactive charts with live data</div>
                </div>
              </div>
              <div className="text-primary-600 dark:text-primary-400">→</div>
            </button>

            <button
              onClick={() => handleExportReport('json')}
              className="w-full flex items-center justify-between p-3 border dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <div className="font-medium dark-text group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    Live Data Snapshot
                  </div>
                  <div className="text-sm dark-text-muted">Export current real-time data</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Live Insights */}
        <div className="card">
          <h3 className="text-lg font-semibold dark-text mb-4">Live Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <div className="font-medium text-green-800 dark:text-green-200 text-sm">Revenue Growing</div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Revenue is up {liveData?.revenue.growth.toFixed(1)}% with live tracking active
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <div className="font-medium text-blue-800 dark:text-blue-200 text-sm">Client Activity</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {liveData?.clients.total} total clients, {liveData?.clients.newThisMonth} added this month
                </div>
              </div>
            </div>

            {liveData?.invoices.overdue > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <div className="font-medium text-orange-800 dark:text-orange-200 text-sm">Payment Alert</div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">
                    {liveData?.invoices.overdue} overdue invoices need attention
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => {}}
      />

      <ReportBuilder
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        onSave={() => {}}
      />
    </div>
  );
}