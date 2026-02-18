import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, FileText, Calendar, User, Car, CreditCard } from 'lucide-react';
import axios from 'axios';

interface VerifiedInvoice {
  id: number;
  invoice_number: string;
  client_id: number;
  vehicle_id: number;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  taxable_amount: number;
  gst_enabled: boolean;
  tax_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  discount_amount: number;
  round_off: number;
  service_type?: string;
  place_of_supply?: string;
  insurance_claim: boolean;
  warranty_applicable: boolean;
  items: InvoiceItem[];
  client?: {
    name: string;
    phone?: string;
    mobile?: string;
    address?: string;
    gst_number?: string;
  };
  vehicle?: {
    registration_number: string;
    brand_name: string;
    model_name: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceItem {
  id: string | number;
  item_type: 'service' | 'part';
  name: string;
  hsn_sac: string;
  quantity: number;
  rate: number;
  total: number;
}

const VerifyInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<VerifiedInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyInvoice = async () => {
      if (!invoiceId) {
        setError('Invoice ID is required');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Verifying invoice ID:', invoiceId);

        // Call backend API to verify and fetch invoice
        const response = await axios.get(`http://localhost:8000/api/invoices/${invoiceId}/verify`);

        if (response.data) {
          setInvoice(response.data);
          setIsValid(true);
          console.log('✅ Invoice verified successfully:', response.data);
        } else {
          setIsValid(false);
          setError('Invoice not found or invalid');
        }
      } catch (err: any) {
        console.error('❌ Error verifying invoice:', err);
        setIsValid(false);
        if (err.response?.status === 404) {
          setError('Invoice not found');
        } else if (err.response?.status === 400) {
          setError('Invalid invoice ID');
        } else {
          setError('Failed to verify invoice. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    verifyInvoice();
  }, [invoiceId]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Invoice Verification</h1>
          </div>

          {/* Verification Status */}
          <div className={`inline-flex items-center px-4 py-2 rounded-lg ${
            isValid === true
              ? 'bg-green-100 text-green-800 border border-green-200'
              : isValid === false
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {isValid === true ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">✅ Verified Authentic Invoice</span>
              </>
            ) : isValid === false ? (
              <>
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">❌ Invalid or Not Found</span>
              </>
            ) : (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-yellow-600 rounded-full border-t-transparent" />
                <span className="font-medium">Verifying...</span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {invoice && isValid && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Company Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">OM MURUGAN AUTO WORKS</h2>
                  <p className="text-teal-100">Complete Multibrand Auto Care Services</p>
                  <p className="text-sm text-teal-100">No.45, Anna Salai, Chennai - 600002, Tamil Nadu</p>
                </div>
                <div className="text-right text-sm">
                  <p>Tel: +91 98765 43210</p>
                  <p>Email: contact@ommunruganworks.com</p>
                </div>
              </div>
            </div>

            {/* Invoice Details Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Invoice Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
                    </div>
                    {invoice.due_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium">{formatDate(invoice.due_date)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Place of Supply:</span>
                      <span className="font-medium">{invoice.place_of_supply || 'Tamil Nadu'}</span>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <User className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{invoice.client?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{invoice.client?.mobile || invoice.client?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium text-right max-w-xs">{invoice.client?.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GSTIN:</span>
                      <span className="font-medium">{invoice.client?.gst_number || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Car className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Vehicle Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration Number:</span>
                      <span className="font-medium">{invoice.vehicle?.registration_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Make/Model:</span>
                      <span className="font-medium">{invoice.vehicle?.brand_name || 'N/A'} {invoice.vehicle?.model_name || ''}</span>
                    </div>
                    {invoice.service_type && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Type:</span>
                        <span className="font-medium">{invoice.service_type}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <CreditCard className="h-5 w-5 text-gray-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Amount Details</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxable Amount:</span>
                      <span className="font-medium">{formatCurrency(invoice.taxable_amount)}</span>
                    </div>
                    {invoice.gst_enabled && (
                      <>
                        {invoice.cgst_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">CGST:</span>
                            <span className="font-medium">{formatCurrency(invoice.cgst_amount)}</span>
                          </div>
                        )}
                        {invoice.sgst_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">SGST:</span>
                            <span className="font-medium">{formatCurrency(invoice.sgst_amount)}</span>
                          </div>
                        )}
                        {invoice.igst_amount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">IGST:</span>
                            <span className="font-medium">{formatCurrency(invoice.igst_amount)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-gray-900 font-semibold">Total Amount:</span>
                      <span className="font-bold text-lg text-green-600">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Services and Parts */}
              {invoice.items && invoice.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Parts</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            HSN/SAC
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.items.map((item, index) => (
                          <tr key={item.id || index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.item_type === 'service'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {item.item_type === 'service' ? '🔧 Service' : '🔩 Part'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hsn_sac}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.rate)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
                </div>
              )}

              {/* Verification Footer */}
              <div className="border-t pt-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  <span className="text-green-700 font-semibold">This invoice has been verified as authentic</span>
                </div>
                <p className="text-sm text-gray-500">
                  Verified on {new Date().toLocaleDateString('en-IN')} •
                  Last updated: {formatDate(invoice.updated_at)}
                </p>

                {/* Badges */}
                <div className="flex justify-center space-x-4 mt-4">
                  {invoice.insurance_claim && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Insurance Claim
                    </span>
                  )}
                  {invoice.warranty_applicable && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Warranty Applicable
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>© {new Date().getFullYear()} OM MURUGAN AUTO WORKS - Invoice Verification System</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyInvoicePage;