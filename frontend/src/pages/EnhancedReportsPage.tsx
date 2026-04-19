import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IndianRupee, RefreshCw, Calendar, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Wallet, BadgePercent, Clock
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';

// ── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n ?? 0);
const fmtCur = (n: number) => '₹' + fmt(n ?? 0);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toDate(s: string) { return new Date(s); }

function startOfMonth(offset = 0) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  return d.toISOString().split('T')[0];
}
function endOfMonth(offset = 0) {
  const d = new Date(); d.setMonth(d.getMonth() + offset + 1); d.setDate(0);
  return d.toISOString().split('T')[0];
}
function today() { return new Date().toISOString().split('T')[0]; }
function firstOfYear() { return `${new Date().getFullYear()}-01-01`; }

type GroupBy = 'day' | 'month' | 'year';
type QuickRange = 'this_month' | 'last_month' | 'this_year' | 'custom';

// ── compute analytics from raw invoices ──────────────────────────────────────
function computeAnalytics(invoices: any[], dateFrom: string, dateTo: string, groupBy: GroupBy) {
  const from = new Date(dateFrom + 'T00:00:00');
  const to   = new Date(dateTo   + 'T23:59:59');

  const inRange = invoices.filter(inv => {
    const d = new Date(inv.invoice_date || inv.created_at);
    return d >= from && d <= to;
  });

  // Previous period same length
  const periodMs = to.getTime() - from.getTime();
  const prevTo   = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodMs);
  const inPrev   = invoices.filter(inv => {
    const d = new Date(inv.invoice_date || inv.created_at);
    return d >= prevFrom && d <= prevTo;
  });

  function stats(list: any[]) {
    let total = 0, collected = 0, gst = 0, discount = 0;
    let paid = 0, pending = 0, partial = 0;
    let paidAmt = 0, pendingAmt = 0, partialAmt = 0;
    list.forEach(inv => {
      const t = inv.total_amount || 0;
      const p = inv.paid_amount || 0;
      const g = inv.tax_amount  || 0;
      const d = inv.discount_amount || 0;
      total     += t;
      collected += p;
      gst       += g;
      discount  += d;
      const st = (inv.payment_status || '').toLowerCase();
      if (st === 'paid')    { paid++;    paidAmt    += t; }
      else if (st === 'partial') { partial++;  partialAmt += t; }
      else                  { pending++; pendingAmt += t; }
    });
    return { total, collected, gst, discount, paid, pending, partial, paidAmt, pendingAmt, partialAmt, count: list.length };
  }

  const curr = stats(inRange);
  const prev = stats(inPrev);

  function growth(a: number, b: number) {
    if (!b) return 0;
    return Math.round(((a - b) / b) * 100 * 10) / 10;
  }

  // ── Trend ─────────────────────────────────────────────────────────────────
  const trendMap: Record<string, { revenue: number; collected: number; gst: number; count: number }> = {};

  inRange.forEach(inv => {
    const d = new Date(inv.invoice_date || inv.created_at);
    let key = '';
    if (groupBy === 'day')   key = d.toISOString().split('T')[0];
    else if (groupBy === 'year') key = String(d.getFullYear());
    else key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    if (!trendMap[key]) trendMap[key] = { revenue: 0, collected: 0, gst: 0, count: 0 };
    trendMap[key].revenue   += inv.total_amount || 0;
    trendMap[key].collected += inv.paid_amount  || 0;
    trendMap[key].gst       += inv.tax_amount   || 0;
    trendMap[key].count     += 1;
  });

  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label,
      revenue:   Math.round(v.revenue   * 100) / 100,
      collected: Math.round(v.collected * 100) / 100,
      gst:       Math.round(v.gst       * 100) / 100,
      profit:    Math.round((v.revenue - v.gst) * 100) / 100,
      count:     v.count,
    }));

  // ── Table rows (month grouping) ───────────────────────────────────────────
  const tableMap: Record<string, any> = {};
  inRange.forEach(inv => {
    const d = new Date(inv.invoice_date || inv.created_at);
    const key = `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2,'0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!tableMap[key]) tableMap[key] = { label, count:0, revenue:0, collected:0, gst:0, discount:0, paid_count:0, pending_count:0, partial_count:0 };
    const r = tableMap[key];
    r.count++;
    r.revenue   += inv.total_amount    || 0;
    r.collected += inv.paid_amount     || 0;
    r.gst       += inv.tax_amount      || 0;
    r.discount  += inv.discount_amount || 0;
    const st = (inv.payment_status || '').toLowerCase();
    if (st === 'paid') r.paid_count++;
    else if (st === 'partial') r.partial_count++;
    else r.pending_count++;
  });

  const tableRows = Object.entries(tableMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      ...v,
      pending: Math.round((v.revenue - v.collected) * 100) / 100,
      revenue:   Math.round(v.revenue   * 100) / 100,
      collected: Math.round(v.collected * 100) / 100,
      gst:       Math.round(v.gst       * 100) / 100,
      discount:  Math.round(v.discount  * 100) / 100,
    }));

  const tableTotals = tableRows.length ? tableRows.reduce((acc, r) => ({
    label: 'TOTAL',
    count:         acc.count + r.count,
    revenue:       Math.round((acc.revenue   + r.revenue)   * 100) / 100,
    collected:     Math.round((acc.collected + r.collected) * 100) / 100,
    pending:       Math.round((acc.pending   + r.pending)   * 100) / 100,
    gst:           Math.round((acc.gst       + r.gst)       * 100) / 100,
    discount:      Math.round((acc.discount  + r.discount)  * 100) / 100,
    paid_count:    acc.paid_count    + r.paid_count,
    pending_count: acc.pending_count + r.pending_count,
    partial_count: acc.partial_count + r.partial_count,
  })) : null;

  return {
    summary: {
      revenue:    { total: Math.round(curr.total*100)/100, subtotal: Math.round((curr.total-curr.gst)*100)/100, growth: growth(curr.total, prev.total) },
      collected:  { total: Math.round(curr.collected*100)/100, growth: growth(curr.collected, prev.collected) },
      gst:        { total: Math.round(curr.gst*100)/100, growth: growth(curr.gst, prev.gst) },
      discount:   { total: Math.round(curr.discount*100)/100 },
      invoices: {
        total: curr.count,
        paid:    { count: curr.paid,    amount: Math.round(curr.paidAmt*100)/100 },
        pending: { count: curr.pending, amount: Math.round(curr.pendingAmt*100)/100 },
        partial: { count: curr.partial, amount: Math.round(curr.partialAmt*100)/100 },
      },
      balance_due:      Math.round((curr.total - curr.collected)*100)/100,
      collection_rate:  curr.total > 0 ? Math.round((curr.collected/curr.total)*100*10)/10 : 0,
    },
    trendData,
    tableRows,
    tableTotals,
  };
}

// ── GrowthBadge ──────────────────────────────────────────────────────────────
function GrowthBadge({ value }: { value: number }) {
  if (!value) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus className="w-3 h-3"/>0%</span>;
  if (value > 0) return <span className="text-xs text-emerald-600 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3"/>+{value}%</span>;
  return <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3"/>{value}%</span>;
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, growth, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4"/>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {growth !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <GrowthBadge value={growth}/><span>vs prev period</span>
        </div>
      )}
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">₹{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EnhancedReportsPage() {
  const [quickRange, setQuickRange] = useState<QuickRange>('this_month');
  const [dateFrom,   setDateFrom]   = useState(startOfMonth(0));
  const [dateTo,     setDateTo]     = useState(today());
  const [groupBy,    setGroupBy]    = useState<GroupBy>('day');
  const [chartType,  setChartType]  = useState<'bar' | 'area'>('bar');
  const [tableGroup, setTableGroup] = useState<'month' | 'year'>('month');

  const applyQuick = (r: QuickRange) => {
    setQuickRange(r);
    if (r === 'this_month')  { setDateFrom(startOfMonth(0));  setDateTo(today());          setGroupBy('day'); }
    if (r === 'last_month')  { setDateFrom(startOfMonth(-1)); setDateTo(endOfMonth(-1));    setGroupBy('day'); }
    if (r === 'this_year')   { setDateFrom(firstOfYear());    setDateTo(today());          setGroupBy('month'); }
  };

  // Fetch ALL invoices — axios interceptor in dynamicApi.ts already adds auth token + baseURL
  const { data: invoices = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ['all-invoices-for-reports'],
    queryFn: async () => {
      const res = await axios.get('/api/invoices/', { params: { limit: 10000 } });
      return Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || []);
    },
    staleTime: 60_000,
  });

  const { summary: s, trendData, tableRows, tableTotals } = useMemo(
    () => computeAnalytics(invoices, dateFrom, dateTo, groupBy),
    [invoices, dateFrom, dateTo, groupBy]
  );

  const tableData = useMemo(
    () => computeAnalytics(invoices, dateFrom, dateTo, tableGroup === 'year' ? 'year' : 'month'),
    [invoices, dateFrom, dateTo, tableGroup]
  );

  const pieData = [
    { name: 'Paid',    value: s.invoices.paid.count,    color: '#10b981' },
    { name: 'Pending', value: s.invoices.pending.count, color: '#f59e0b' },
    { name: 'Partial', value: s.invoices.partial.count, color: '#6366f1' },
  ].filter(d => d.value > 0);

  const QUICK_RANGES: { key: QuickRange; label: string }[] = [
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_year',  label: 'This Year'  },
    { key: 'custom',     label: 'Custom'     },
  ];

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"/>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Live from your invoices · {invoices.length} total records
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isRefetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`}/>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {QUICK_RANGES.map(r => (
              <button key={r.key} onClick={() => applyQuick(r.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  quickRange === r.key ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-gray-400"/>
            <input type="date" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setQuickRange('custom'); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
            <span className="text-gray-400">→</span>
            <input type="date" value={dateTo}
              onChange={e => { setDateTo(e.target.value); setQuickRange('custom'); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue"  value={fmtCur(s.revenue.total)}    sub={`Subtotal: ${fmtCur(s.revenue.subtotal)}`} growth={s.revenue.growth}   icon={IndianRupee} color="bg-indigo-100 text-indigo-600"/>
        <StatCard label="Collected"      value={fmtCur(s.collected.total)}  sub={`Rate: ${s.collection_rate}%`}             growth={s.collected.growth} icon={Wallet}      color="bg-emerald-100 text-emerald-600"/>
        <StatCard label="Balance Due"    value={fmtCur(s.balance_due)}      sub={`${s.invoices.pending.count} pending · ${s.invoices.partial.count} partial`} icon={Clock} color="bg-amber-100 text-amber-600"/>
        <StatCard label="GST Collected"  value={fmtCur(s.gst.total)}        sub={`Discount: ${fmtCur(s.discount.total)}`}   growth={s.gst.growth}       icon={BadgePercent} color="bg-purple-100 text-purple-600"/>
      </div>

      {/* Invoice Status Mini Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Paid Invoices',    count: s.invoices.paid.count,    amount: s.invoices.paid.amount,    color: 'border-l-emerald-500 bg-emerald-50', txt: 'text-emerald-700' },
          { label: 'Pending Invoices', count: s.invoices.pending.count, amount: s.invoices.pending.amount, color: 'border-l-amber-500 bg-amber-50',     txt: 'text-amber-700'   },
          { label: 'Partial Invoices', count: s.invoices.partial.count, amount: s.invoices.partial.amount, color: 'border-l-indigo-500 bg-indigo-50',   txt: 'text-indigo-700'  },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border-l-4 ${item.color} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${item.txt}`}>{item.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{item.count}</p>
            <p className="text-sm text-gray-500 mt-0.5">{fmtCur(item.amount)}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
              {(['day','month','year'] as GroupBy[]).map(g => (
                <button key={g} onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${groupBy === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {g}
                </button>
              ))}
            </div>
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
              {(['bar','area'] as const).map(t => (
                <button key={t} onClick={() => setChartType(t)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${chartType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {trendData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <BarChart3 className="w-10 h-10 mb-2 opacity-30"/>
            <p className="text-sm">No invoices in this period</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={trendData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? '₹'+(Math.round(v/1000))+'k' : '₹'+v}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }}/>
                  <Bar dataKey="revenue"   name="Revenue"   fill="#6366f1" radius={[4,4,0,0]}/>
                  <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4,4,0,0]}/>
                  <Bar dataKey="gst"       name="GST"       fill="#a78bfa" radius={[4,4,0,0]}/>
                </BarChart>
              ) : (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? '₹'+(Math.round(v/1000))+'k' : '₹'+v}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }}/>
                  <Area type="monotone" dataKey="revenue"   name="Revenue"   stroke="#6366f1" strokeWidth={2} fill="url(#rg)"/>
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#cg)"/>
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pie + Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice Status</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v + ' invoices', '']}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: d.color }}/>
                      <span className="text-sm text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Total Invoices</p>
                  <p className="text-xl font-bold text-gray-900">{s.invoices.total}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collection Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Collection Summary</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-500">Collection Rate</span>
                <span className="font-bold text-gray-900">{s.collection_rate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${s.collection_rate}%`,
                    background: s.collection_rate >= 80 ? '#10b981' : s.collection_rate >= 50 ? '#f59e0b' : '#ef4444'
                  }}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { label: 'Total Billed', value: fmtCur(s.revenue.total),    color: 'text-indigo-600' },
                { label: 'Collected',    value: fmtCur(s.collected.total),  color: 'text-emerald-600' },
                { label: 'Balance Due',  value: fmtCur(s.balance_due),      color: 'text-amber-600' },
                { label: 'GST Amount',   value: fmtCur(s.gst.total),        color: 'text-purple-600' },
                { label: 'Discount',     value: fmtCur(s.discount.total),   color: 'text-red-500' },
                { label: 'Subtotal',     value: fmtCur(s.revenue.subtotal), color: 'text-gray-700' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Period Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Period Breakdown</h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
            {(['month','year'] as const).map(g => (
              <button key={g} onClick={() => setTableGroup(g)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${tableGroup === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                By {g}
              </button>
            ))}
          </div>
        </div>

        {tableData.tableRows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No invoices in this period</div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 rounded-lg">
                  {['Period','Invoices','Revenue','Collected','Balance Due','GST','Discount','Paid','Pending','Partial'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 whitespace-nowrap first:rounded-l-lg last:rounded-r-lg">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableData.tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{row.label}</td>
                    <td className="px-3 py-3 text-gray-700">{row.count}</td>
                    <td className="px-3 py-3 font-medium text-indigo-600">{fmtCur(row.revenue)}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600">{fmtCur(row.collected)}</td>
                    <td className="px-3 py-3 font-medium text-amber-600">{fmtCur(row.pending)}</td>
                    <td className="px-3 py-3 text-purple-600">{fmtCur(row.gst)}</td>
                    <td className="px-3 py-3 text-red-500">{fmtCur(row.discount)}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">{row.paid_count}</span></td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{row.pending_count}</span></td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">{row.partial_count}</span></td>
                  </tr>
                ))}
                {tableData.tableTotals && (
                  <tr className="bg-gray-900">
                    <td className="px-3 py-3 text-xs font-bold text-white rounded-bl-lg">TOTAL</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableData.tableTotals.count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-indigo-300">{fmtCur(tableData.tableTotals.revenue)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-emerald-300">{fmtCur(tableData.tableTotals.collected)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-amber-300">{fmtCur(tableData.tableTotals.pending)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-purple-300">{fmtCur(tableData.tableTotals.gst)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-red-300">{fmtCur(tableData.tableTotals.discount)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableData.tableTotals.paid_count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableData.tableTotals.pending_count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white rounded-br-lg">{tableData.tableTotals.partial_count}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
