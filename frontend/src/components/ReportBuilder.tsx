import React, { useState } from 'react';
import {
  Plus,
  X,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Calendar,
  Filter,
  Download,
  Save,
  Eye
} from 'lucide-react';

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: CustomReport) => void;
}

interface ReportWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'text';
  title: string;
  dataSource: string;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  filters: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

interface CustomReport {
  id: string;
  name: string;
  description: string;
  widgets: ReportWidget[];
  layout: 'grid' | 'dashboard' | 'document';
  refreshInterval: number;
  dateRange: {
    from: string;
    to: string;
  };
}

const widgetTypes = [
  {
    type: 'metric',
    name: 'Key Metric',
    icon: Activity,
    description: 'Single number with trend'
  },
  {
    type: 'chart',
    name: 'Chart',
    icon: BarChart3,
    description: 'Various chart types'
  },
  {
    type: 'table',
    name: 'Data Table',
    icon: Filter,
    description: 'Tabular data display'
  },
  {
    type: 'text',
    name: 'Text Block',
    icon: Calendar,
    description: 'Custom text content'
  }
];

const dataSources = [
  { value: 'revenue', label: 'Revenue Data' },
  { value: 'clients', label: 'Client Data' },
  { value: 'services', label: 'Service Data' },
  { value: 'invoices', label: 'Invoice Data' },
  { value: 'vehicles', label: 'Vehicle Data' }
];

const chartTypes = [
  { value: 'line', label: 'Line Chart', icon: TrendingUp },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: Activity }
];

export default function ReportBuilder({ isOpen, onClose, onSave }: ReportBuilderProps) {
  const [report, setReport] = useState<CustomReport>({
    id: Date.now().toString(),
    name: 'Untitled Report',
    description: '',
    widgets: [],
    layout: 'grid',
    refreshInterval: 10,
    dateRange: {
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    }
  });

  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'preview'>('design');

  if (!isOpen) return null;

  const addWidget = (type: string) => {
    const newWidget: ReportWidget = {
      id: Date.now().toString(),
      type: type as any,
      title: `New ${type}`,
      dataSource: dataSources[0].value,
      chartType: type === 'chart' ? 'line' : undefined,
      filters: {},
      position: {
        x: 0,
        y: 0,
        w: type === 'metric' ? 3 : 6,
        h: type === 'metric' ? 2 : 4
      },
      config: {}
    };

    setReport(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));

    setSelectedWidget(newWidget.id);
    setShowWidgetPanel(false);
  };

  const updateWidget = (widgetId: string, updates: Partial<ReportWidget>) => {
    setReport(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      )
    }));
  };

  const removeWidget = (widgetId: string) => {
    setReport(prev => ({
      ...prev,
      widgets: prev.widgets.filter(widget => widget.id !== widgetId)
    }));
    setSelectedWidget(null);
  };

  const handleSave = () => {
    onSave(report);
    onClose();
  };

  const selectedWidgetData = report.widgets.find(w => w.id === selectedWidget);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="dark-card rounded-xl shadow-2xl border dark-border w-full max-w-7xl h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark-border">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold dark-text">Report Builder</h2>
              <p className="dark-text-muted text-sm">Create custom reports with drag-and-drop widgets</p>
            </div>
            <input
              type="text"
              value={report.name}
              onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
              className="input-field text-lg font-medium w-64"
              placeholder="Report name"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {[
                { id: 'design', label: 'Design', icon: BarChart3 },
                { id: 'data', label: 'Data', icon: Filter },
                { id: 'preview', label: 'Preview', icon: Eye }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              ×
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Left Sidebar - Widget Palette */}
          <div className="w-80 border-r dark-border p-4 overflow-y-auto">
            {activeTab === 'design' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium dark-text">Widgets</h3>
                  <button
                    onClick={() => setShowWidgetPanel(!showWidgetPanel)}
                    className="btn-primary text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </button>
                </div>

                {showWidgetPanel && (
                  <div className="space-y-2 mb-6">
                    {widgetTypes.map((widget) => {
                      const Icon = widget.icon;
                      return (
                        <button
                          key={widget.type}
                          onClick={() => addWidget(widget.type)}
                          className="w-full flex items-center gap-3 p-3 border dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                        >
                          <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          <div>
                            <div className="font-medium dark-text">{widget.name}</div>
                            <div className="text-sm dark-text-muted">{widget.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Widget List */}
                <div className="space-y-2">
                  {report.widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedWidget === widget.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setSelectedWidget(widget.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium dark-text">{widget.title}</div>
                          <div className="text-sm dark-text-muted capitalize">{widget.type}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWidget(widget.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h3 className="font-medium dark-text mb-4">Data Sources</h3>
                <div className="space-y-3">
                  {dataSources.map((source) => (
                    <div key={source.value} className="p-3 border dark-border rounded-lg">
                      <div className="font-medium dark-text">{source.label}</div>
                      <div className="text-sm dark-text-muted">Available for reporting</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div>
                <h3 className="font-medium dark-text mb-4">Report Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium dark-text mb-2">Layout</label>
                    <select
                      value={report.layout}
                      onChange={(e) => setReport(prev => ({ ...prev, layout: e.target.value as any }))}
                      className="input-field w-full"
                    >
                      <option value="grid">Grid Layout</option>
                      <option value="dashboard">Dashboard Layout</option>
                      <option value="document">Document Layout</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark-text mb-2">Refresh Interval</label>
                    <select
                      value={report.refreshInterval}
                      onChange={(e) => setReport(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                      className="input-field w-full"
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium dark-text mb-2">Description</label>
                    <textarea
                      value={report.description}
                      onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field w-full h-24 resize-none"
                      placeholder="Describe this report..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 p-4 overflow-auto">
            {activeTab === 'design' && (
              <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                {report.widgets.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium dark-text mb-2">Start Building Your Report</h3>
                      <p className="dark-text-muted mb-4">Add widgets from the left panel to get started</p>
                      <button
                        onClick={() => setShowWidgetPanel(true)}
                        className="btn-primary"
                      >
                        <Plus className="w-4 h-4" />
                        Add Your First Widget
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-4 h-full">
                    {report.widgets.map((widget) => (
                      <div
                        key={widget.id}
                        className={`col-span-${Math.min(widget.position.w, 12)} bg-white dark:bg-gray-800 border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedWidget === widget.id
                            ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedWidget(widget.id)}
                        style={{ minHeight: `${widget.position.h * 80}px` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium dark-text">{widget.title}</h4>
                          <div className="text-xs dark-text-muted capitalize">{widget.type}</div>
                        </div>

                        {widget.type === 'metric' && (
                          <div>
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">₹2,45,000</div>
                            <div className="text-sm dark-text-muted">Sample metric value</div>
                          </div>
                        )}

                        {widget.type === 'chart' && (
                          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                            <div className="text-center">
                              <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <div className="text-sm dark-text-muted">Chart Preview</div>
                            </div>
                          </div>
                        )}

                        {widget.type === 'table' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs font-medium dark-text-muted">
                              <div>Column 1</div>
                              <div>Column 2</div>
                              <div>Column 3</div>
                            </div>
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="grid grid-cols-3 gap-2 text-xs dark-text">
                                <div>Data {i}-1</div>
                                <div>Data {i}-2</div>
                                <div>Data {i}-3</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {widget.type === 'text' && (
                          <div className="text-sm dark-text-muted">
                            This is a text block widget. You can add custom content here.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="h-full bg-white dark:bg-gray-800 border dark-border rounded-lg p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold dark-text">{report.name}</h1>
                  {report.description && (
                    <p className="dark-text-muted mt-2">{report.description}</p>
                  )}
                </div>

                {report.widgets.length > 0 ? (
                  <div className="grid grid-cols-12 gap-4">
                    {report.widgets.map((widget) => (
                      <div
                        key={widget.id}
                        className={`col-span-${Math.min(widget.position.w, 12)} bg-gray-50 dark:bg-gray-700 border dark-border rounded-lg p-4`}
                        style={{ minHeight: `${widget.position.h * 80}px` }}
                      >
                        <h4 className="font-medium dark-text mb-3">{widget.title}</h4>
                        <div className="text-center text-gray-400">Preview content</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="dark-text-muted">No widgets to preview</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Widget Properties */}
          {selectedWidget && selectedWidgetData && (
            <div className="w-80 border-l dark-border p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium dark-text">Widget Settings</h3>
                <button
                  onClick={() => setSelectedWidget(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium dark-text mb-2">Title</label>
                  <input
                    type="text"
                    value={selectedWidgetData.title}
                    onChange={(e) => updateWidget(selectedWidget, { title: e.target.value })}
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium dark-text mb-2">Data Source</label>
                  <select
                    value={selectedWidgetData.dataSource}
                    onChange={(e) => updateWidget(selectedWidget, { dataSource: e.target.value })}
                    className="input-field w-full"
                  >
                    {dataSources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedWidgetData.type === 'chart' && (
                  <div>
                    <label className="block text-sm font-medium dark-text mb-2">Chart Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {chartTypes.map((chart) => {
                        const Icon = chart.icon;
                        return (
                          <button
                            key={chart.value}
                            onClick={() => updateWidget(selectedWidget, { chartType: chart.value })}
                            className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${
                              selectedWidgetData.chartType === chart.value
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs">{chart.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium dark-text mb-2">Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs dark-text-muted mb-1">Width</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={selectedWidgetData.position.w}
                        onChange={(e) => updateWidget(selectedWidget, {
                          position: { ...selectedWidgetData.position, w: parseInt(e.target.value) }
                        })}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs dark-text-muted mb-1">Height</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={selectedWidgetData.position.h}
                        onChange={(e) => updateWidget(selectedWidget, {
                          position: { ...selectedWidgetData.position, h: parseInt(e.target.value) }
                        })}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t dark-border">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" />
            Save Report
          </button>
        </div>
      </div>
    </div>
  );
}