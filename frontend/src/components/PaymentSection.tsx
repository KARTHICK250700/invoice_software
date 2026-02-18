import React from 'react';

interface FormData {
  [key: string]: any;
}
import {
  CreditCard, DollarSign, Clock, AlertCircle, Smartphone,
  Mail, MessageCircle, Calendar, Receipt, Percent
} from 'lucide-react';

interface PaymentSectionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function PaymentSection({ formData, setFormData }: PaymentSectionProps) {
  // Payment method options
  const PAYMENT_METHODS = [
    { value: 'Cash', label: 'Cash Payment', icon: DollarSign },
    { value: 'Card', label: 'Card (Debit/Credit)', icon: CreditCard },
    { value: 'UPI', label: 'UPI Payment', icon: Smartphone },
    { value: 'Bank Transfer', label: 'Bank Transfer/NEFT', icon: Receipt },
    { value: 'Cheque', label: 'Cheque Payment', icon: Receipt },
    { value: 'Net Banking', label: 'Net Banking', icon: CreditCard },
    { value: 'Digital Wallet', label: 'Digital Wallet', icon: Smartphone },
  ];

  // Payment status options
  const PAYMENT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'paid', label: 'Fully Paid', color: 'bg-green-100 text-green-800' },
    { value: 'partially_paid', label: 'Partially Paid', color: 'bg-blue-100 text-blue-800' },
    { value: 'advance', label: 'Advance Received', color: 'bg-purple-100 text-purple-800' },
    { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  ];

  // Payment type options
  const PAYMENT_TYPES = [
    { value: 'Full', label: 'Full Payment' },
    { value: 'Partial', label: 'Partial Payment' },
    { value: 'Advance', label: 'Advance Payment' },
    { value: 'Credit', label: 'Credit Payment' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <CreditCard className="w-5 h-5 mr-2" />
        Payment Information & Settings
      </h3>

      {/* Payment Status and Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status *</label>
          <select
            value={formData.payment_status || 'pending'}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PAYMENT_STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <select
            value={formData.payment_method || 'Cash'}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_method: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PAYMENT_METHODS.map(method => (
              <option key={method.value} value={method.value}>{method.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment Type and Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
          <select
            value={formData.payment_type || 'Full'}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PAYMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
          <input
            type="text"
            value={formData.payment_reference || ''}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_reference: e.target.value }))}
            placeholder="Transaction ID, Cheque No, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Payment Amounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paid Amount (₹)</label>
          <input
            type="number"
            value={formData.paid_amount || 0}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Advance Amount (₹)</label>
          <input
            type="number"
            value={formData.advance_amount || 0}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, advance_amount: parseFloat(e.target.value) || 0 }))}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Balance Due (₹)</label>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-semibold text-red-600">
            ₹{((formData.total_amount || 0) - (formData.paid_amount || 0) - (formData.advance_amount || 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Payment Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Payment Date
          </label>
          <input
            type="date"
            value={formData.payment_date || ''}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Advance Payment Date
          </label>
          <input
            type="date"
            value={formData.advance_date || ''}
            onChange={(e) => setFormData((prev: FormData) => ({ ...prev, advance_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Credit and Late Fee Settings */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="text-md font-semibold text-gray-800 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Credit & Fee Settings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Due (Days)</label>
            <input
              type="number"
              value={formData.payment_due_days || 30}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_due_days: parseInt(e.target.value) || 30 }))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
            <input
              type="number"
              value={formData.credit_days || 0}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, credit_days: parseInt(e.target.value) || 0 }))}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit (₹)</label>
            <input
              type="number"
              value={formData.credit_limit || 0}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, credit_limit: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="1000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={formData.late_fee_applicable || false}
                onChange={(e) => setFormData((prev: FormData) => ({ ...prev, late_fee_applicable: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm font-medium text-gray-700">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Late Fee Applicable
              </label>
            </div>
            {formData.late_fee_applicable && (
              <input
                type="number"
                value={formData.late_fee_amount || 0}
                onChange={(e) => setFormData((prev: FormData) => ({ ...prev, late_fee_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Late fee amount"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Percent className="w-4 h-4 inline mr-1" />
              Early Payment Discount (₹)
            </label>
            <input
              type="number"
              value={formData.early_payment_discount || 0}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, early_payment_discount: parseFloat(e.target.value) || 0 }))}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Communication Settings */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
        <h4 className="text-md font-semibold text-gray-800 flex items-center">
          <MessageCircle className="w-4 h-4 mr-2" />
          Communication & Notifications
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Alt Mobile</label>
            <input
              type="tel"
              value={formData.customer_mobile_alt || ''}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, customer_mobile_alt: e.target.value }))}
              placeholder="Alternative mobile number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Alt Email</label>
            <input
              type="email"
              value={formData.customer_email_alt || ''}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, customer_email_alt: e.target.value }))}
              placeholder="Alternative email address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.mobile_invoice_sent || false}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, mobile_invoice_sent: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 flex items-center">
              <Smartphone className="w-4 h-4 mr-1" />
              SMS Sent
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.email_invoice_sent || false}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, email_invoice_sent: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 flex items-center">
              <Mail className="w-4 h-4 mr-1" />
              Email Sent
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.whatsapp_sent || false}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, whatsapp_sent: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" />
              WhatsApp Sent
            </span>
          </label>
        </div>
      </div>

      {/* Payment Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Notes</label>
        <textarea
          value={formData.payment_notes || ''}
          onChange={(e) => setFormData((prev: FormData) => ({ ...prev, payment_notes: e.target.value }))}
          rows={3}
          placeholder="Payment-related notes, terms, conditions..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Unique Invoice ID Display */}
      <div className="bg-yellow-50 rounded-lg p-4">
        <h4 className="text-md font-semibold text-gray-800 mb-2">Invoice Identification</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Unique ID</label>
            <input
              type="text"
              value={formData.invoice_unique_id || ''}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, invoice_unique_id: e.target.value }))}
              placeholder="Will be auto-generated if empty"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Payment Method</label>
            <select
              value={formData.preferred_payment_method || ''}
              onChange={(e) => setFormData((prev: FormData) => ({ ...prev, preferred_payment_method: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select preferred method</option>
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}