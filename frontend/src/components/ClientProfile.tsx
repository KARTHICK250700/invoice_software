import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API_CONFIG from '../config/api';
import {
  User, Phone, Mail, MapPin, Car, Wrench, FileText,
  DollarSign, Calendar, Clock, AlertCircle, CheckCircle,
  MessageCircle, Plus, Edit, TrendingUp
} from 'lucide-react';

interface ClientProfileData {
  client: {
    id: number;
    name: string;
    phone: string;
    mobile: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  vehicles: Array<{
    id: number;
    registration_number: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    last_service_date: string | null;
    mileage: number;
  }>;
  invoices: Array<{
    id: number;
    invoice_number: string;
    service_type: string;
    total_amount: number;
    payment_status: string;
    invoice_date: string;
    due_date: string | null;
  }>;
  statistics: {
    total_vehicles: number;
    this_year_invoices: number;
    this_year_services: number;
    total_revenue: number;
    pending_amount: number;
    average_invoice: number;
    current_year: number;
  };
}

const ClientProfile: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [profileData, setProfileData] = useState<ClientProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientProfile();
  }, [clientId]);

  const fetchClientProfile = async () => {
    try {
      setLoading(true);

      // Fetch comprehensive client profile data from single endpoint
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/clients/${clientId}/profile`);
      if (!response.ok) {
        throw new Error('Failed to fetch client profile');
      }

      const data = await response.json();
      setProfileData(data);

    } catch (error) {
      console.error('Error fetching client profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center text-red-500">Client not found</div>;
  }

  const { client, vehicles, invoices, statistics } = profileData;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Client Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <User size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{client.name}</h1>
              <p className="text-blue-100">க्लायन्ट विवरण</p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center space-x-2">
              <Phone size={16} />
              <span>{client.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail size={16} />
              <span className="text-sm">{client.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin size={16} />
              <span className="text-sm">{client.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Car className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">{statistics.total_vehicles}</p>
              <p className="text-green-600">வாகனங்கள்</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Wrench className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-800">{statistics.this_year_services}</p>
              <p className="text-blue-600">இந்த ஆண்டு சேவைகள்</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FileText className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-800">{statistics.this_year_invoices}</p>
              <p className="text-purple-600">இந்த ஆண்டு பில்கள்</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-800">₹{statistics.total_revenue.toLocaleString()}</p>
              <p className="text-yellow-600">மொத்த வருமானம்</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue and Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">💰 இந்த ஆண்டு வருமானம்</h3>
          <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Revenue {currentYear}</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">⏳ நிலுவைத் தொகை</h3>
          <p className="text-3xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Pending Payments</p>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">📊 சராசரி பில்</h3>
          <p className="text-3xl font-bold text-blue-600">₹{thisYearInvoices.length > 0 ? Math.round(totalRevenue / thisYearInvoices.length).toLocaleString() : 0}</p>
          <p className="text-sm text-gray-500">Average Invoice Amount</p>
        </div>
      </div>

      {/* Client's Vehicles */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Car className="text-blue-600" />
          <span>🚗 வாகன பட்டியல் (Client's Vehicles)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Car className="text-gray-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{vehicle.brand} {vehicle.model}</h3>
                  <p className="text-blue-600 font-mono">{vehicle.registration_number}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Year:</span>
                  <span>{vehicle.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Color:</span>
                  <span>{vehicle.color}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">கடைசி சேவை:</span>
                  <span className="text-green-600">Mar 10, 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">அடுத்த சேவை:</span>
                  <span className="text-orange-600">Jun 10, 2026</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <FileText className="text-purple-600" />
          <span>💰 சமீபத்திய பில்கள் (Recent Invoices)</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Invoice No</th>
                <th className="text-left py-2">Vehicle</th>
                <th className="text-left py-2">Service Type</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {thisYearInvoices.slice(0, 10).map((invoice) => (
                <tr key={invoice.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-mono text-blue-600">{invoice.invoice_number}</td>
                  <td className="py-3">{invoice.vehicle_registration || 'N/A'}</td>
                  <td className="py-3">{invoice.service_type || 'General Service'}</td>
                  <td className="py-3 font-semibold">₹{(Number(invoice.total_amount) || 0).toLocaleString()}</td>
                  <td className="py-3">
                    {invoice.payment_status === 'paid' ? (
                      <span className="inline-flex items-center space-x-1 text-green-600">
                        <CheckCircle size={16} />
                        <span>Paid ✅</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-orange-600">
                        <Clock size={16} />
                        <span>Pending ⏳</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Timeline */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Calendar className="text-green-600" />
          <span>📅 சேவை வரலாறு (Service Timeline - {currentYear})</span>
        </h2>
        <div className="space-y-4">
          {thisYearServices.map((service) => (
            <div key={service.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Wrench className="text-green-600" size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{service.service_type}</h3>
                  <span className="text-lg font-bold text-green-600">₹{service.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>📅 {new Date(service.date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                  <span>🚗 {service.vehicle}</span>
                  <span className="inline-flex items-center space-x-1 text-green-600">
                    <CheckCircle size={14} />
                    <span>Completed</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center space-x-2 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition-colors">
            <Phone size={20} />
            <span>Call Client</span>
          </button>

          <button className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors">
            <MessageCircle size={20} />
            <span>WhatsApp</span>
          </button>

          <button className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-3 rounded-lg hover:bg-purple-600 transition-colors">
            <Plus size={20} />
            <span>New Invoice</span>
          </button>

          <button className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors">
            <Edit size={20} />
            <span>Edit Client</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;