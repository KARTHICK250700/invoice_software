import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface PublicInvoiceData {
  id: number;
  invoice_number: string;
  client_name: string;
  vehicle_registration: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  gst_enabled: boolean;
  service_type: string | null;
  notes: string | null;
}

const PublicInvoiceView: React.FC = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8000/api/invoices/view/${accessCode}`);
        setInvoice(response.data);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setError('Invoice not found or access code is invalid');
      } finally {
        setLoading(false);
      }
    };

    if (accessCode) {
      fetchInvoice();
    }
  }, [accessCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600">{error || 'The invoice you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">OM MURUGAN AUTO WORKS</h1>
              <p className="text-sm">Manufacturing & Supply of Precision Auto Care Services</p>
              <p className="text-xs mt-1">
                No.8 4th Main Road, Manikandapuram, Thirumullaivoyal, Chennai-600 062
              </p>
              <p className="text-xs">Cell: 9894551560 | Email: ommurugan201205@gmail.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">TAX INVOICE</h2>
              <p className="text-sm">Invoice No: {invoice.invoice_number}</p>
              <p className="text-xs">GST: 33AABCO1234A1Z5</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Customer and Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Customer Detail</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">M/S:</span> {invoice.client_name}</p>
                <p><span className="font-semibold">Invoice Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
                {invoice.due_date && (
                  <p><span className="font-semibold">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Vehicle Details</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Reg No:</span> {invoice.vehicle_registration}</p>
                {invoice.service_type && (
                  <p><span className="font-semibold">Service Type:</span> {invoice.service_type}</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Items */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Service Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Sr. No.</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Name of Product / Service</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">HSN/SAC</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Qty</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Taxable Value</th>
                    {invoice.gst_enabled && (
                      <th className="border border-gray-300 px-4 py-2 text-right">IGST %</th>
                    )}
                    <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">1</td>
                    <td className="border border-gray-300 px-4 py-2">Car Service Package</td>
                    <td className="border border-gray-300 px-4 py-2">8302</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">1</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{invoice.subtotal.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">₹{invoice.subtotal.toFixed(2)}</td>
                    {invoice.gst_enabled && (
                      <td className="border border-gray-300 px-4 py-2 text-right">18.0</td>
                    )}
                    <td className="border border-gray-300 px-4 py-2 text-right font-bold">₹{invoice.total_amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Calculations */}
          <div className="flex justify-end">
            <div className="w-80 bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Taxable Amount:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.gst_enabled && invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>IGST @ 18%:</span>
                    <span>₹{invoice.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Status:</span>
                  <span className={`font-semibold ${
                    invoice.payment_status === 'paid' ? 'text-green-600' :
                    invoice.payment_status === 'pending' ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {invoice.payment_status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">Notes:</h3>
              <p className="text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-sm mb-2">Terms and Conditions</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Subject to Chennai Jurisdiction.</li>
                  <li>• Our Responsibility Ceases as soon as vehicle leaves our Premises.</li>
                  <li>• Goods once serviced will not be taken back.</li>
                </ul>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Authorised Signatory</p>
                <div className="border-b border-gray-400 w-32 ml-auto mt-8 mb-2"></div>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="font-bold text-teal-600">Thank you for choosing us!</p>
              <p className="text-xs text-gray-500 mt-2">
                This is a computer generated invoice. No signature required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;