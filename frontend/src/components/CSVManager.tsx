import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, History, Check, AlertCircle } from 'lucide-react';

interface CSVManagerProps {
  type: 'clients' | 'vehicles';
  data: any[];
  onImport: (data: any[]) => void;
  onExport?: () => void;
  className?: string;
}

interface ImportResult {
  success: number;
  errors: string[];
  warnings: string[];
}

export default function CSVManager({ type, data, onImport, onExport, className = "" }: CSVManagerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // CSV Headers for different types
  const csvHeaders = {
    clients: [
      'id', 'name', 'email', 'phone', 'address', 'gst_number', 'pan_number',
      'created_date', 'last_updated', 'total_services', 'last_service_date', 'notes'
    ],
    vehicles: [
      'id', 'client_id', 'client_name', 'vehicle_number', 'make', 'model', 'year',
      'engine_number', 'chassis_number', 'color', 'fuel_type', 'insurance_expiry',
      'created_date', 'last_updated', 'last_service_date', 'total_services', 'odometer_reading', 'notes'
    ]
  };

  const generateCSV = () => {
    const headers = csvHeaders[type];
    const csvContent = [
      headers.join(','),
      ...data.map(item =>
        headers.map(header => {
          const value = item[header] || '';
          // Escape commas and quotes in CSV
          return typeof value === 'string' && value.includes(',')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = () => {
    try {
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Save to localStorage for history
      const history = JSON.parse(localStorage.getItem(`${type}_export_history`) || '[]');
      history.unshift({
        date: new Date().toISOString(),
        recordCount: data.length,
        filename: `${type}_${new Date().toISOString().split('T')[0]}.csv`
      });
      localStorage.setItem(`${type}_export_history`, JSON.stringify(history.slice(0, 10))); // Keep last 10 exports

      if (onExport) onExport();
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Error generating CSV file');
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const expectedHeaders = csvHeaders[type];

    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;

      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });

      // Add metadata
      record.import_date = new Date().toISOString();
      record.source = 'csv_import';

      records.push(record);
    }

    return records;
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportResult({
        success: 0,
        errors: ['Please select a CSV file'],
        warnings: []
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      // Validate data
      const errors: string[] = [];
      const warnings: string[] = [];
      const validRecords: any[] = [];

      records.forEach((record, index) => {
        const rowNum = index + 2; // +2 because of header row and 0-based index

        // Basic validation based on type
        if (type === 'clients') {
          if (!record.name || record.name.trim() === '') {
            errors.push(`Row ${rowNum}: Client name is required`);
            return;
          }
          if (record.email && !record.email.includes('@')) {
            warnings.push(`Row ${rowNum}: Invalid email format`);
          }
          if (record.phone && record.phone.length < 10) {
            warnings.push(`Row ${rowNum}: Phone number seems too short`);
          }
        } else if (type === 'vehicles') {
          if (!record.vehicle_number || record.vehicle_number.trim() === '') {
            errors.push(`Row ${rowNum}: Vehicle number is required`);
            return;
          }
          if (!record.client_id && !record.client_name) {
            errors.push(`Row ${rowNum}: Client ID or Client Name is required`);
            return;
          }
        }

        validRecords.push(record);
      });

      const result: ImportResult = {
        success: validRecords.length,
        errors,
        warnings
      };

      setImportResult(result);

      if (validRecords.length > 0 && errors.length === 0) {
        // Save import history
        const history = JSON.parse(localStorage.getItem(`${type}_import_history`) || '[]');
        history.unshift({
          date: new Date().toISOString(),
          recordCount: validRecords.length,
          filename: file.name,
          warnings: warnings.length
        });
        localStorage.setItem(`${type}_import_history`, JSON.stringify(history.slice(0, 10)));

        onImport(validRecords);
      }
    } catch (error) {
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse CSV file'],
        warnings: []
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getExportHistory = () => {
    return JSON.parse(localStorage.getItem(`${type}_export_history`) || '[]');
  };

  const getImportHistory = () => {
    return JSON.parse(localStorage.getItem(`${type}_import_history`) || '[]');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={downloadCSV}
          className="btn-primary"
          disabled={data.length === 0}
        >
          <Download className="w-4 h-4" />
          Export to CSV ({data.length} records)
        </button>

        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id={`csv-upload-${type}`}
          />
          <label
            htmlFor={`csv-upload-${type}`}
            className="btn-secondary cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import from CSV
          </label>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
        }`}
      >
        <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          Drag and drop your CSV file here, or click the Import button above
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Supported format: CSV with headers
        </p>
      </div>

      {/* Import Progress */}
      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 dark:text-blue-300">Processing CSV file...</span>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="space-y-3">
          {importResult.success > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-700">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Successfully imported {importResult.success} records
                </span>
              </div>
            </div>
          )}

          {importResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                    Warnings ({importResult.warnings.length}):
                  </span>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {importResult.warnings.slice(0, 5).map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                    {importResult.warnings.length > 5 && (
                      <li>• ... and {importResult.warnings.length - 5} more warnings</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    Errors ({importResult.errors.length}):
                  </span>
                  <ul className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>• ... and {importResult.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          Recent Activity
        </h4>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {[...getExportHistory(), ...getImportHistory()]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((activity, index) => (
              <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                <div>
                  <span className={activity.filename ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}>
                    {activity.filename ? 'Imported' : 'Exported'}
                  </span>
                  {' '}{activity.recordCount} records
                  {activity.filename && ` from ${activity.filename}`}
                  {activity.warnings > 0 && ` (${activity.warnings} warnings)`}
                </div>
                <span className="text-xs">
                  {new Date(activity.date).toLocaleDateString()}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* CSV Format Help */}
      <details className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <summary className="cursor-pointer font-medium text-gray-900 dark:text-gray-100 mb-2">
          CSV Format Requirements
        </summary>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>Your CSV file must include the following headers:</p>
          <div className="bg-white dark:bg-gray-900 rounded p-2 font-mono text-xs overflow-x-auto">
            {csvHeaders[type].join(', ')}
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>First row must contain headers exactly as shown above</li>
            <li>Required fields: {type === 'clients' ? 'name' : 'vehicle_number, client_id/client_name'}</li>
            <li>Dates should be in YYYY-MM-DD format</li>
            <li>Use comma as delimiter, quote values containing commas</li>
          </ul>
        </div>
      </details>
    </div>
  );
}