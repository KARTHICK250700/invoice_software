import axios from 'axios';
import { dashboardService } from './dynamicApi';

// Mock API service for reports
export class ReportService {
  private static baseURL = '/api/reports';

  // Generate mock data for development
  private static generateMockData() {
    const currentDate = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      revenue: {
        total: 2450000 + Math.random() * 100000,
        thisMonth: 245000 + Math.random() * 50000,
        lastMonth: 220000 + Math.random() * 40000,
        growth: 8.5 + Math.random() * 10,
        chartData: months.slice(0, 6).map((month, index) => ({
          month,
          revenue: 180000 + Math.random() * 80000,
          expenses: 120000 + Math.random() * 40000,
          profit: 60000 + Math.random() * 40000
        }))
      },
      clients: {
        total: 156 + Math.floor(Math.random() * 20),
        active: 142 + Math.floor(Math.random() * 15),
        newThisMonth: 12 + Math.floor(Math.random() * 8),
        growth: 8.3 + Math.random() * 5,
        segments: [
          { name: 'Individual', value: 89 + Math.floor(Math.random() * 10), color: '#8B5CF6' },
          { name: 'Business', value: 45 + Math.floor(Math.random() * 10), color: '#06D6A0' },
          { name: 'Fleet', value: 22 + Math.floor(Math.random() * 5), color: '#F59E0B' }
        ]
      },
      services: {
        totalThisMonth: 89 + Math.floor(Math.random() * 20),
        totalLastMonth: 82 + Math.floor(Math.random() * 15),
        growth: 8.5 + Math.random() * 5,
        byType: [
          { name: 'Engine Service', count: 25 + Math.floor(Math.random() * 10), revenue: 85000 + Math.random() * 20000, color: '#EF4444' },
          { name: 'Brake Service', count: 18 + Math.floor(Math.random() * 8), revenue: 54000 + Math.random() * 15000, color: '#F97316' },
          { name: 'AC Service', count: 15 + Math.floor(Math.random() * 8), revenue: 67500 + Math.random() * 15000, color: '#EAB308' },
          { name: 'Electrical', count: 12 + Math.floor(Math.random() * 6), revenue: 36000 + Math.random() * 10000, color: '#22C55E' },
          { name: 'Body Work', count: 19 + Math.floor(Math.random() * 8), revenue: 95000 + Math.random() * 20000, color: '#3B82F6' }
        ],
        topServices: [
          { name: 'Complete Engine Overhaul', count: 8 + Math.floor(Math.random() * 4), revenue: 32000 + Math.random() * 8000 },
          { name: 'AC System Repair', count: 12 + Math.floor(Math.random() * 5), revenue: 28800 + Math.random() * 6000 },
          { name: 'Brake System Service', count: 15 + Math.floor(Math.random() * 6), revenue: 22500 + Math.random() * 5000 }
        ]
      },
      invoices: {
        total: 134 + Math.floor(Math.random() * 20),
        paid: 89 + Math.floor(Math.random() * 15),
        pending: 32 + Math.floor(Math.random() * 10),
        overdue: 13 + Math.floor(Math.random() * 5),
        pendingAmount: 125000 + Math.random() * 50000,
        overdueAmount: 48500 + Math.random() * 20000,
        statusData: [
          { status: 'Paid', count: 89 + Math.floor(Math.random() * 15), amount: 1890000 + Math.random() * 200000, color: '#10B981' },
          { status: 'Pending', count: 32 + Math.floor(Math.random() * 10), amount: 125000 + Math.random() * 50000, color: '#F59E0B' },
          { status: 'Overdue', count: 13 + Math.floor(Math.random() * 5), amount: 48500 + Math.random() * 20000, color: '#EF4444' }
        ]
      },
      financial: {
        totalRevenue: 2450000 + Math.random() * 200000,
        totalExpenses: 1650000 + Math.random() * 150000,
        netProfit: 800000 + Math.random() * 100000,
        outstandingAmount: 173500 + Math.random() * 50000,
        collectionRate: 92.9 + Math.random() * 5,
        monthlyTrend: months.slice(0, 6).map((month, index) => ({
          month,
          income: 180000 + Math.random() * 80000,
          expenses: 120000 + Math.random() * 40000,
          profit: 60000 + Math.random() * 40000
        }))
      },
      insights: [
        {
          type: 'positive',
          title: 'Revenue Growth',
          message: 'Revenue increased by 15.2% compared to last month',
          icon: 'trending-up',
          color: 'green'
        },
        {
          type: 'neutral',
          title: 'Client Acquisition',
          message: `${12 + Math.floor(Math.random() * 8)} new clients acquired this month`,
          icon: 'users',
          color: 'blue'
        },
        {
          type: 'warning',
          title: 'Pending Payments',
          message: `₹${(173500 + Math.random() * 50000).toFixed(0)} in outstanding payments`,
          icon: 'alert-circle',
          color: 'orange'
        }
      ]
    };
  }

  // Get summary data for reports dashboard
  static async getSummary(filters?: Record<string, any>) {
    try {
      // Try to use dashboard service first for real data
      const dashboardData = await dashboardService.getStats();
      if (dashboardData) {
        return {
          revenue: {
            total: dashboardData.total_revenue || 0,
            growth: dashboardData.revenue_growth || 0,
            thisMonth: dashboardData.monthly_revenue || 0
          },
          clients: {
            total: dashboardData.total_clients || 0,
            newThisMonth: dashboardData.new_clients || 0,
            growth: dashboardData.client_growth || 0
          },
          services: {
            thisMonth: dashboardData.monthly_services || 0,
            growth: dashboardData.service_growth || 0
          },
          invoices: {
            pending: dashboardData.pending_invoices || 0,
            overdue: dashboardData.overdue_invoices || 0,
            pendingAmount: dashboardData.pending_amount || 0
          },
          financial: {
            profit: dashboardData.net_profit || 0,
            outstanding: dashboardData.outstanding_amount || 0
          }
        };
      }
    } catch (apiError) {
      console.warn('Dashboard API not available, using dynamic mock data');
    }

    // Fallback to enhanced mock data
    const mockData = this.generateMockData();
    return {
      revenue: {
        total: mockData.revenue.total,
        growth: mockData.revenue.growth,
        thisMonth: mockData.revenue.thisMonth
      },
      clients: {
        total: mockData.clients.total,
        newThisMonth: mockData.clients.newThisMonth,
        growth: mockData.clients.growth
      },
      services: {
        thisMonth: mockData.services.totalThisMonth,
        growth: mockData.services.growth
      },
      invoices: {
        pending: mockData.invoices.pending,
        overdue: mockData.invoices.overdue,
        pendingAmount: mockData.invoices.pendingAmount
      },
      financial: {
        profit: mockData.financial.netProfit,
        outstanding: mockData.financial.outstandingAmount
      }
    };
  }

  // Get detailed report data
  static async getReportData(reportType: string, filters?: Record<string, any>) {
    try {
      // Try multiple API endpoints for real data
      if (reportType === 'overview' || reportType === 'revenue') {
        const revenueData = await dashboardService.getRevenueData();
        if (revenueData) {
          const mockData = this.generateMockData();
          return {
            ...mockData,
            revenue: {
              ...mockData.revenue,
              ...revenueData
            }
          };
        }
      }

      const params = new URLSearchParams({ report_type: reportType, ...filters });
      const response = await axios.get(`${this.baseURL}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.warn(`Using enhanced dynamic mock data for ${reportType} report`);
      return this.generateMockData();
    }
  }

  // Export report in various formats
  static async exportReport(format: string, reportType: string, filters?: Record<string, any>) {
    try {
      const response = await axios.post(`${this.baseURL}/export`, {
        format,
        report_type: reportType,
        filters,
        timestamp: new Date().toISOString()
      }, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.warn('Export API not available, generating mock export');

      // Generate mock export data
      const mockData = this.generateMockData();
      const exportData = JSON.stringify(mockData, null, 2);

      return new Blob([exportData], {
        type: format === 'pdf' ? 'application/pdf' :
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              'text/csv'
      });
    }
  }

  // Save custom report configuration
  static async saveCustomReport(report: any) {
    try {
      const response = await axios.post(`${this.baseURL}/custom`, report);
      return response.data;
    } catch (error) {
      console.warn('Saving to localStorage instead of API');

      const existingReports = JSON.parse(localStorage.getItem('custom-reports') || '[]');
      const updatedReports = [...existingReports, report];
      localStorage.setItem('custom-reports', JSON.stringify(updatedReports));

      return report;
    }
  }

  // Get custom reports
  static async getCustomReports() {
    try {
      const response = await axios.get(`${this.baseURL}/custom`);
      return response.data;
    } catch (error) {
      console.warn('Loading custom reports from localStorage');
      return JSON.parse(localStorage.getItem('custom-reports') || '[]');
    }
  }

  // Save report settings
  static async saveSettings(settings: any) {
    try {
      const response = await axios.post(`${this.baseURL}/settings`, settings);
      return response.data;
    } catch (error) {
      console.warn('Saving settings to localStorage');
      localStorage.setItem('report-settings', JSON.stringify(settings));
      return settings;
    }
  }

  // Get report settings
  static async getSettings() {
    try {
      const response = await axios.get(`${this.baseURL}/settings`);
      return response.data;
    } catch (error) {
      console.warn('Loading settings from localStorage');
      return JSON.parse(localStorage.getItem('report-settings') || '{}');
    }
  }

  // Get real-time metrics (for auto-refresh)
  static async getRealTimeMetrics() {
    try {
      const response = await axios.get(`${this.baseURL}/realtime`);
      return response.data;
    } catch (error) {
      // Generate fresh mock data for real-time feel
      const baseData = this.generateMockData();
      return {
        timestamp: new Date().toISOString(),
        revenue: {
          total: baseData.revenue.total + (Math.random() - 0.5) * 10000,
          growth: baseData.revenue.growth + (Math.random() - 0.5) * 2
        },
        activeServices: baseData.services.totalThisMonth + Math.floor((Math.random() - 0.5) * 10),
        pendingInvoices: baseData.invoices.pending + Math.floor((Math.random() - 0.5) * 5),
        newClients: baseData.clients.newThisMonth + Math.floor((Math.random() - 0.5) * 3)
      };
    }
  }

  // Schedule automated report
  static async scheduleReport(schedule: any) {
    try {
      const response = await axios.post(`${this.baseURL}/schedule`, schedule);
      return response.data;
    } catch (error) {
      console.warn('Scheduling not available, saving locally');

      const existingSchedules = JSON.parse(localStorage.getItem('scheduled-reports') || '[]');
      const updatedSchedules = [...existingSchedules, { ...schedule, id: Date.now().toString() }];
      localStorage.setItem('scheduled-reports', JSON.stringify(updatedSchedules));

      return schedule;
    }
  }

  // Get data sources available for reporting
  static getDataSources() {
    return [
      {
        id: 'revenue',
        name: 'Revenue Data',
        description: 'Financial revenue information',
        tables: ['invoices', 'payments'],
        fields: ['amount', 'date', 'client_id', 'status']
      },
      {
        id: 'clients',
        name: 'Client Data',
        description: 'Customer information and metrics',
        tables: ['clients', 'client_services'],
        fields: ['name', 'created_date', 'total_spent', 'service_count']
      },
      {
        id: 'services',
        name: 'Service Data',
        description: 'Service types and performance',
        tables: ['services', 'service_items'],
        fields: ['service_type', 'duration', 'cost', 'completion_date']
      },
      {
        id: 'vehicles',
        name: 'Vehicle Data',
        description: 'Vehicle information and service history',
        tables: ['vehicles', 'vehicle_services'],
        fields: ['make', 'model', 'year', 'last_service_date']
      },
      {
        id: 'invoices',
        name: 'Invoice Data',
        description: 'Billing and payment information',
        tables: ['invoices', 'invoice_items'],
        fields: ['invoice_number', 'amount', 'status', 'due_date']
      }
    ];
  }

  // Validate report configuration
  static validateReportConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Report name is required');
    }

    if (!config.widgets || config.widgets.length === 0) {
      errors.push('At least one widget is required');
    }

    if (config.widgets) {
      config.widgets.forEach((widget: any, index: number) => {
        if (!widget.title || widget.title.trim() === '') {
          errors.push(`Widget ${index + 1} must have a title`);
        }

        if (!widget.dataSource) {
          errors.push(`Widget ${index + 1} must have a data source`);
        }

        if (widget.type === 'chart' && !widget.chartType) {
          errors.push(`Chart widget ${index + 1} must specify a chart type`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ReportService;