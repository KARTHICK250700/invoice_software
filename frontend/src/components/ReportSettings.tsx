import React, { useState } from 'react';
import { Settings, Save, RefreshCw, Clock, Mail, Calendar, Filter } from 'lucide-react';

interface ReportSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ReportSettings) => void;
}

interface ReportSettings {
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  emailReports: boolean;
  emailFrequency: 'daily' | 'weekly' | 'monthly';
  defaultDateRange: 'week' | 'month' | 'quarter' | 'year';
  defaultChartType: 'line' | 'bar' | 'area' | 'pie';
  includeComparison: boolean;
  showTrends: boolean;
  decimalPlaces: number;
  currencySymbol: string;
  reportFormats: string[];
  scheduledReports: Array<{
    id: string;
    name: string;
    frequency: string;
    recipients: string[];
    format: string;
    enabled: boolean;
  }>;
}

const defaultSettings: ReportSettings = {
  autoRefresh: true,
  refreshInterval: 10,
  emailReports: false,
  emailFrequency: 'weekly',
  defaultDateRange: 'month',
  defaultChartType: 'line',
  includeComparison: true,
  showTrends: true,
  decimalPlaces: 2,
  currencySymbol: '₹',
  reportFormats: ['pdf', 'excel'],
  scheduledReports: []
};

export default function ReportSettings({ isOpen, onClose, onSave }: ReportSettingsProps) {
  const [settings, setSettings] = useState<ReportSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'automation' | 'export'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const updateSettings = (key: keyof ReportSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addScheduledReport = () => {
    const newReport = {
      id: Date.now().toString(),
      name: 'Monthly Revenue Report',
      frequency: 'monthly',
      recipients: [],
      format: 'pdf',
      enabled: true
    };

    setSettings(prev => ({
      ...prev,
      scheduledReports: [...prev.scheduledReports, newReport]
    }));
  };

  const removeScheduledReport = (id: string) => {
    setSettings(prev => ({
      ...prev,
      scheduledReports: prev.scheduledReports.filter(report => report.id !== id)
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'display', label: 'Display', icon: Filter },
    { id: 'automation', label: 'Automation', icon: RefreshCw },
    { id: 'export', label: 'Export', icon: Mail }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="dark-card rounded-xl shadow-2xl border dark-border max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark-border">
          <div>
            <h2 className="text-xl font-semibold dark-text">Report Settings</h2>
            <p className="dark-text-muted text-sm">Customize your reporting preferences</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            ×
          </button>
        </div>

        <div className="flex">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r dark-border p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark-text'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium dark-text mb-4">General Settings</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium dark-text">Auto Refresh</label>
                        <p className="text-sm dark-text-muted">Automatically refresh report data</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.autoRefresh}
                        onChange={(e) => updateSettings('autoRefresh', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    {settings.autoRefresh && (
                      <div>
                        <label className="block text-sm font-medium dark-text mb-2">Refresh Interval</label>
                        <select
                          value={settings.refreshInterval}
                          onChange={(e) => updateSettings('refreshInterval', parseInt(e.target.value))}
                          className="input-field w-full"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium dark-text mb-2">Default Date Range</label>
                      <select
                        value={settings.defaultDateRange}
                        onChange={(e) => updateSettings('defaultDateRange', e.target.value)}
                        className="input-field w-full"
                      >
                        <option value="week">Last Week</option>
                        <option value="month">Last Month</option>
                        <option value="quarter">Last Quarter</option>
                        <option value="year">Last Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text mb-2">Currency Symbol</label>
                      <input
                        type="text"
                        value={settings.currencySymbol}
                        onChange={(e) => updateSettings('currencySymbol', e.target.value)}
                        className="input-field w-24"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium dark-text mb-4">Display Preferences</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark-text mb-2">Default Chart Type</label>
                      <select
                        value={settings.defaultChartType}
                        onChange={(e) => updateSettings('defaultChartType', e.target.value)}
                        className="input-field w-full"
                      >
                        <option value="line">Line Chart</option>
                        <option value="bar">Bar Chart</option>
                        <option value="area">Area Chart</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium dark-text">Include Comparison</label>
                        <p className="text-sm dark-text-muted">Show previous period comparison</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.includeComparison}
                        onChange={(e) => updateSettings('includeComparison', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium dark-text">Show Trends</label>
                        <p className="text-sm dark-text-muted">Display trend indicators and arrows</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showTrends}
                        onChange={(e) => updateSettings('showTrends', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark-text mb-2">Decimal Places</label>
                      <select
                        value={settings.decimalPlaces}
                        onChange={(e) => updateSettings('decimalPlaces', parseInt(e.target.value))}
                        className="input-field w-32"
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'automation' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium dark-text mb-4">Email Reports</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium dark-text">Enable Email Reports</label>
                        <p className="text-sm dark-text-muted">Automatically send reports via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailReports}
                        onChange={(e) => updateSettings('emailReports', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                    </div>

                    {settings.emailReports && (
                      <div>
                        <label className="block text-sm font-medium dark-text mb-2">Email Frequency</label>
                        <select
                          value={settings.emailFrequency}
                          onChange={(e) => updateSettings('emailFrequency', e.target.value)}
                          className="input-field w-full"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium dark-text">Scheduled Reports</h3>
                    <button
                      onClick={addScheduledReport}
                      className="btn-primary text-sm"
                    >
                      Add Schedule
                    </button>
                  </div>

                  <div className="space-y-3">
                    {settings.scheduledReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border dark-border rounded-lg">
                        <div>
                          <div className="font-medium dark-text">{report.name}</div>
                          <div className="text-sm dark-text-muted">{report.frequency} • {report.format}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={report.enabled}
                            onChange={(e) => {
                              const updated = settings.scheduledReports.map(r =>
                                r.id === report.id ? { ...r, enabled: e.target.checked } : r
                              );
                              updateSettings('scheduledReports', updated);
                            }}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <button
                            onClick={() => removeScheduledReport(report.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {settings.scheduledReports.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No scheduled reports yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium dark-text mb-4">Export Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark-text mb-2">Available Formats</label>
                      <div className="space-y-2">
                        {['pdf', 'excel', 'csv', 'json'].map((format) => (
                          <label key={format} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={settings.reportFormats.includes(format)}
                              onChange={(e) => {
                                const formats = e.target.checked
                                  ? [...settings.reportFormats, format]
                                  : settings.reportFormats.filter(f => f !== format);
                                updateSettings('reportFormats', formats);
                              }}
                              className="w-4 h-4 text-primary-600 rounded"
                            />
                            <span className="capitalize dark-text">{format}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t dark-border pt-4">
                      <h4 className="font-medium dark-text mb-3">Export Templates</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border dark-border rounded-lg">
                          <span className="dark-text">Executive Summary</span>
                          <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                        </div>
                        <div className="flex items-center justify-between p-3 border dark-border rounded-lg">
                          <span className="dark-text">Detailed Report</span>
                          <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                        </div>
                        <div className="flex items-center justify-between p-3 border dark-border rounded-lg">
                          <span className="dark-text">Financial Summary</span>
                          <button className="text-primary-600 hover:text-primary-700 text-sm">Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t dark-border">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}