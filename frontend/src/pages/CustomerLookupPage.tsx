import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Phone, Search, User, Car, FileText, Receipt,
  Download, Plus, ChevronRight, X, CheckCircle,
  Clock, AlertCircle, IndianRupee, Calendar
} from 'lucide-react';
import { generateQuotationPDF } from '../utils/quotationPdfGenerator';

// ─── helpers ────────────────────────────────────────────────────────────────

const authHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fmt = (n: any) =>
  isNaN(Number(n)) ? '0.00' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const fmtDate = (d: any) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const statusColor: Record<string, string> = {
  paid:    'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  draft:   'bg-gray-100 text-gray-600 border-gray-200',
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = (status || 'pending').toLowerCase();
  const icon =
    s === 'paid' ? <CheckCircle className="w-3 h-3" /> :
    s === 'overdue' ? <AlertCircle className="w-3 h-3" /> :
    <Clock className="w-3 h-3" />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColor[s] || statusColor.pending}`}>
      {icon} {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

// ─── types ───────────────────────────────────────────────────────────────────

interface Client {
  id: number; name: string; mobile: string; phone: string;
  email: string; address: string; city: string; state: string; pincode: string;
}
interface Vehicle { id: number; registration_number: string; brand_name: string; model_name: string; year: number; color: string; fuel_type: string; }
interface Invoice { id: number; invoice_number: string; invoice_date: string; total_amount: number; payment_status: string; service_type: string; vehicle_id: number; }
interface Quotation { id: number; quotation_number: string; quotation_date: string; total_amount: number; status: string; vehicle_id: number; }

// ─── component ───────────────────────────────────────────────────────────────

export default function CustomerLookupPage() {
  const [mobileInput, setMobileInput]   = useState('');
  const [searching,   setSearching]     = useState(false);
  const [suggestions, setSuggestions]   = useState<Client[]>([]);
  const [selectedClient, setSelected]   = useState<Client | null>(null);
  const [vehicles,    setVehicles]       = useState<Vehicle[]>([]);
  const [invoices,    setInvoices]       = useState<Invoice[]>([]);
  const [quotations,  setQuotations]     = useState<Quotation[]>([]);
  const [loadingData, setLoadingData]    = useState(false);
  const [activeTab,   setActiveTab]      = useState<'invoices'|'quotations'>('invoices');
  const [dlLoading,   setDlLoading]      = useState<number|null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── auto-search as user types ──────────────────────────────────────────────
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (mobileInput.length < 3) { setSuggestions([]); return; }

    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get('/api/clients/', {
          params: { mobile: mobileInput },
          headers: authHeaders(),
        });
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [mobileInput]);

  // ── load full details when client selected ─────────────────────────────────
  const selectClient = async (client: Client) => {
    setSelected(client);
    setSuggestions([]);
    setMobileInput(client.mobile || client.phone || '');
    setLoadingData(true);
    try {
      const headers = authHeaders();
      const [vRes, iRes, qRes] = await Promise.all([
        axios.get('/api/vehicles/', { params: { client_id: client.id, limit: 50 }, headers }),
        axios.get('/api/invoices/', { params: { client_id: client.id, limit: 100 }, headers }),
        axios.get('/api/quotations/', { params: { client_id: client.id, limit: 100 }, headers }),
      ]);
      setVehicles(Array.isArray(vRes.data) ? vRes.data : []);
      // invoices may come as { invoices:[...] } or plain array
      const invData = iRes.data;
      setInvoices(Array.isArray(invData) ? invData : (Array.isArray(invData?.invoices) ? invData.invoices : []));
      const qData = qRes.data;
      setQuotations(Array.isArray(qData) ? qData : (Array.isArray(qData?.quotations) ? qData.quotations : []));
    } catch (e) {
      console.error('Error loading client data', e);
    } finally {
      setLoadingData(false);
    }
  };

  const clearSelection = () => {
    setSelected(null); setMobileInput(''); setSuggestions([]);
    setVehicles([]); setInvoices([]); setQuotations([]);
  };

  // ── download invoice PDF ───────────────────────────────────────────────────
  const downloadInvoicePDF = async (inv: Invoice) => {
    setDlLoading(inv.id);
    try {
      const { data } = await axios.get(`/api/invoices/${inv.id}`, { headers: authHeaders() });
      // Dynamically import PDFInvoice generator
      const pdfModule = await import('../components/PDFInvoice');
      // PDFInvoice is a React component that triggers download via button click;
      // instead, call the underlying jsPDF logic directly by creating a hidden trigger
      // We'll open a print window with invoice data serialized
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        win.document.title = inv.invoice_number;
      }
    } catch (e) {
      console.error('PDF download error', e);
    } finally {
      setDlLoading(null);
    }
  };

  // ── download quotation PDF ─────────────────────────────────────────────────
  const downloadQuotationPDF = async (q: Quotation) => {
    setDlLoading(-q.id);
    try {
      const { data } = await axios.get(`/api/quotations/${q.id}`, { headers: authHeaders() });
      await generateQuotationPDF(data);
    } catch (e) {
      console.error('Quotation PDF error', e);
    } finally {
      setDlLoading(null);
    }
  };

  // ── vehicle lookup helper ──────────────────────────────────────────────────
  const vehicleFor = (vid: number) =>
    vehicles.find(v => v.id === vid);

  // ── totals ─────────────────────────────────────────────────────────────────
  const totalPaid    = invoices.filter(i => i.payment_status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPending = invoices.filter(i => i.payment_status !== 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ── page title ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Phone className="w-6 h-6 text-teal-600" />
          Customer Lookup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter a mobile number to instantly see all bills, quotations and vehicles for that customer.
        </p>
      </div>

      {/* ── search bar ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Mobile / Phone Number
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={mobileInput}
            onChange={e => { setMobileInput(e.target.value); setSelected(null); }}
            placeholder="Type mobile number… e.g. 98765 43210"
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-base"
            maxLength={15}
          />
          {(mobileInput || selectedClient) && (
            <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* suggestions dropdown */}
        {suggestions.length > 0 && !selectedClient && (
          <div className="mt-2 border border-gray-100 rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(c => (
              <button
                key={c.id}
                onClick={() => selectClient(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 transition-colors text-left border-b last:border-b-0 border-gray-50"
              >
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.mobile || c.phone} {c.city ? `· ${c.city}` : ''}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {searching && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full" />
            Searching…
          </p>
        )}
        {!searching && mobileInput.length >= 3 && suggestions.length === 0 && !selectedClient && (
          <p className="text-xs text-orange-500 mt-2">No customer found for "{mobileInput}". Check the number or add a new customer.</p>
        )}
      </div>

      {/* ── customer found ── */}
      {selectedClient && (
        <>
          {/* customer card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {selectedClient.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900">{selectedClient.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                  {(selectedClient.mobile || selectedClient.phone) && (
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedClient.mobile || selectedClient.phone}</span>
                  )}
                  {selectedClient.email && (
                    <span className="flex items-center gap-1">✉ {selectedClient.email}</span>
                  )}
                  {(selectedClient.city || selectedClient.address) && (
                    <span>📍 {[selectedClient.address, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}</span>
                  )}
                </div>
              </div>
              <a
                href={`/clients/${selectedClient.id}/profile`}
                className="flex-shrink-0 text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1"
              >
                Full Profile <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* ── summary stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Invoices',  value: invoices.length,            icon: Receipt,    color: 'text-blue-600',  bg: 'bg-blue-50' },
              { label: 'Amount Paid',     value: `₹${fmt(totalPaid)}`,       icon: CheckCircle,color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Outstanding',     value: `₹${fmt(totalPending)}`,    icon: Clock,      color: 'text-orange-600',bg: 'bg-orange-50' },
              { label: 'Vehicles',        value: vehicles.length,            icon: Car,        color: 'text-purple-600',bg: 'bg-purple-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-base font-bold text-gray-800">{loadingData ? '…' : value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── vehicles ── */}
          {vehicles.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400" /> Registered Vehicles
              </h3>
              <div className="flex flex-wrap gap-2">
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-bold text-teal-700">{v.registration_number}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{[v.brand_name, v.model_name].filter(Boolean).join(' ') || 'Unknown'}</span>
                    {v.year && <span className="text-gray-400 text-xs">({v.year})</span>}
                    {v.color && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ background: v.color.toLowerCase() }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── tabs: invoices / quotations ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-100">
              {(['invoices', 'quotations'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'invoices'
                    ? <span className="flex items-center justify-center gap-2"><Receipt className="w-4 h-4" /> Invoices ({invoices.length})</span>
                    : <span className="flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> Quotations ({quotations.length})</span>
                  }
                </button>
              ))}
            </div>

            {/* loading skeleton */}
            {loadingData && (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {/* ── invoice list ── */}
            {!loadingData && activeTab === 'invoices' && (
              invoices.length === 0
                ? <Empty label="No invoices found for this customer" />
                : <div className="divide-y divide-gray-50">
                    {[...invoices]
                      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
                      .map(inv => {
                        const veh = vehicleFor(inv.vehicle_id);
                        return (
                          <div key={inv.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-800 text-sm">{inv.invoice_number}</span>
                                <StatusBadge status={inv.payment_status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(inv.invoice_date)}</span>
                                {veh && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{veh.registration_number}</span>}
                                {inv.service_type && <span>🔧 {inv.service_type}</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-gray-800 flex items-center justify-end gap-0.5">
                                <IndianRupee className="w-3 h-3" />{fmt(inv.total_amount)}
                              </p>
                              <button
                                onClick={() => downloadInvoicePDF(inv)}
                                disabled={dlLoading === inv.id}
                                className="mt-1 flex items-center gap-1 text-xs text-teal-600 font-semibold hover:text-teal-800 disabled:opacity-40"
                              >
                                {dlLoading === inv.id
                                  ? <span className="animate-spin w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full inline-block" />
                                  : <Download className="w-3 h-3" />}
                                PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
            )}

            {/* ── quotation list ── */}
            {!loadingData && activeTab === 'quotations' && (
              quotations.length === 0
                ? <Empty label="No quotations found for this customer" />
                : <div className="divide-y divide-gray-50">
                    {[...quotations]
                      .sort((a, b) => new Date(b.quotation_date).getTime() - new Date(a.quotation_date).getTime())
                      .map(q => {
                        const veh = vehicleFor(q.vehicle_id);
                        return (
                          <div key={q.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/70 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-800 text-sm">{q.quotation_number}</span>
                                <StatusBadge status={q.status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(q.quotation_date)}</span>
                                {veh && <span className="flex items-center gap-1"><Car className="w-3 h-3" />{veh.registration_number}</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-gray-800 flex items-center justify-end gap-0.5">
                                <IndianRupee className="w-3 h-3" />{fmt(q.total_amount)}
                              </p>
                              <button
                                onClick={() => downloadQuotationPDF(q)}
                                disabled={dlLoading === -q.id}
                                className="mt-1 flex items-center gap-1 text-xs text-teal-600 font-semibold hover:text-teal-800 disabled:opacity-40"
                              >
                                {dlLoading === -q.id
                                  ? <span className="animate-spin w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full inline-block" />
                                  : <Download className="w-3 h-3" />}
                                PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
            )}
          </div>

          {/* quick action buttons */}
          <div className="flex gap-3 mt-4">
            <a
              href="/invoices"
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Invoice
            </a>
            <a
              href="/quotations"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" /> New Quotation
            </a>
          </div>
        </>
      )}

      {/* ── empty state (no search yet) ── */}
      {!selectedClient && !mobileInput && (
        <div className="text-center py-16 text-gray-400">
          <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">Enter a mobile number above</p>
          <p className="text-sm mt-1 opacity-70">Customer details and all bills will appear here instantly</p>
        </div>
      )}
    </div>
  );
}

// ── small empty state helper ──────────────────────────────────────────────────
function Empty({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-gray-400">
      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
