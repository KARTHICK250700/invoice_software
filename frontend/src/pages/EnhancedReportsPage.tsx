import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, IndianRupee, Receipt, CheckCircle2,
  Clock, RefreshCw, Calendar, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, Wallet, BadgePercent, ChevronDown
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

// ── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);

const fmtCur = (n: number) =>
  '₹' + fmt(n);

const today = () => new Date().toISOString().split('T')[0];

const firstOfYear = () => `${new Date().getFullYear()}-01-01`;

function startOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().split('T')[0];
}

function endOfMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().split('T')[0];
}

// ── types ────────────────────────────────────────────────────────────────────
interface Summary {
  period: { from: string; to: string };
  revenue: { total: number; subtotal: number; growth: number };
  collected: { total: number; growth: number };
  gst: { total: number; growth: number };
  discount: { total: number };
  invoices: {
    total: number;
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    partial: { count: number; amount: number };
  };
  balance_due: number;
  collection_rate: number;
}

interface TrendPoint {
  label: string;
  revenue: number;
  collected: number;
  gst: number;
  profit: number;
  count: number;
}

interface TableRow {
  label: string;
  count: number;
  revenue: number;
  collected: number;
  pending: number;
  gst: number;
  discount: number;
  paid_count: number;
  pending_count: number;
  partial_count: number;
}

type GroupBy = 'day' | 'month' | 'year';
type QuickRange = 'this_month' | 'last_month' | 'this_year' | 'custom';

// ── GrowthBadge ──────────────────────────────────────────────────────────────
function GrowthBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0%</span>;
  if (value > 0) return <span className="text-xs text-emerald-600 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" /> {value}%</span>;
  return <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowDownRight className="w-3 h-3" /> {Math.abs(value)}%</span>;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, growth, icon: Icon, color,
}: {
  label: string; value: string; sub?: string; growth?: number;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {growth !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <GrowthBadge value={growth} />
          <span>vs prev period</span>
        </div>
      )}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">₹{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EnhancedReportsPage() {
  const [quickRange, setQuickRange] = useState<QuickRange>('this_month');
  const [dateFrom, setDateFrom] = useState(startOfMonth(0));
  const [dateTo, setDateTo] = useState(today());
  const [groupBy, setGroupBy] = useState<GroupBy>('month');
  const [tableGroupBy, setTableGroupBy] = useState<'month' | 'year'>('month');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Apply quick range
  const applyQuickRange = (r: QuickRange) => {
    setQuickRange(r);
    if (r === 'this_month') {
      setDateFrom(startOfMonth(0));
      setDateTo(today());
      setGroupBy('day');
      setTableGroupBy('month');
    } else if (r === 'last_month') {
      setDateFrom(startOfMonth(-1));
      setDateTo(endOfMonth(-1));
      setGroupBy('day');
      setTableGroupBy('month');
    } else if (r === 'this_year') {
      setDateFrom(firstOfYear());
      setDateTo(today());
      setGroupBy('month');
      setTableGroupBy('month');
    }
    // custom: do nothing, user sets dates
  };

  // ── Queries ──────────────────────────────────────────────────────────────
  const summaryQ = useQuery<Summary>({
    queryKey: ['analytics-summary', dateFrom, dateTo],
    queryFn: () =>
      axios
        .get(`${API}/api/v1/analytics/summary`, { params: { date_from: dateFrom, date_to: dateTo } })
        .then(r => r.data),
    staleTime: 30_000,
  });

  const trendQ = useQuery<{ group_by: string; data: TrendPoint[] }>({
    queryKey: ['analytics-trend', groupBy, dateFrom, dateTo],
    queryFn: () =>
      axios
        .get(`${API}/api/v1/analytics/trend`, {
          params: { group_by: groupBy, date_from: dateFrom, date_to: dateTo },
        })
        .then(r => r.data),
    staleTime: 30_000,
  });

  const tableQ = useQuery<{ rows: TableRow[]; totals: TableRow | null }>({
    queryKey: ['analytics-table', tableGroupBy, dateFrom, dateTo],
    queryFn: () =>
      axios
        .get(`${API}/api/v1/analytics/invoices-table`, {
          params: { group_by: tableGroupBy, date_from: dateFrom, date_to: dateTo },
        })
        .then(r => r.data),
    staleTime: 30_000,
  });

  const s = summaryQ.data;
  const trendData = trendQ.data?.data || [];
  const tableRows = tableQ.data?.rows || [];
  const tableTotals = tableQ.data?.totals;

  const isLoading = summaryQ.isLoading || trendQ.isLoading;

  // Pie chart data
  const pieData = s
    ? [
        { name: 'Paid', value: s.invoices.paid.count, color: '#10b981' },
        { name: 'Pending', value: s.invoices.pending.count, color: '#f59e0b' },
        { name: 'Partial', value: s.invoices.partial.count, color: '#6366f1' },
      ].filter(d => d.value > 0)
    : [];

  const refetchAll = () => {
    summaryQ.refetch();
    trendQ.refetch();
    tableQ.refetch();
  };

  const QUICK_RANGES: { key: QuickRange; label: string }[] = [
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_year', label: 'This Year' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real data from your invoices — live from the database
          </p>
        </div>
        <button
          onClick={refetchAll}
          disabled={summaryQ.isRefetching || trendQ.isRefetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${summaryQ.isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick range pills */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {QUICK_RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => applyQuickRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  quickRange === r.key
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Date pickers (shown always, editable in custom mode) */}
          <div className="flex items-center gap-2 ml-auto">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setQuickRange('custom'); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setQuickRange('custom'); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-32 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={fmtCur(s?.revenue.total || 0)}
            sub={`Subtotal: ${fmtCur(s?.revenue.subtotal || 0)}`}
            growth={s?.revenue.growth}
            icon={IndianRupee}
            color="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            label="Collected"
            value={fmtCur(s?.collected.total || 0)}
            sub={`Rate: ${s?.collection_rate || 0}%`}
            growth={s?.collected.growth}
            icon={Wallet}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            label="Balance Due"
            value={fmtCur(s?.balance_due || 0)}
            sub={`${s?.invoices.pending.count || 0} pending · ${s?.invoices.partial.count || 0} partial`}
            icon={Clock}
            color="bg-amber-100 text-amber-600"
          />
          <StatCard
            label="GST Collected"
            value={fmtCur(s?.gst.total || 0)}
            sub={`Discount given: ${fmtCur(s?.discount.total || 0)}`}
            growth={s?.gst.growth}
            icon={BadgePercent}
            color="bg-purple-100 text-purple-600"
          />
        </div>
      )}

      {/* ── Invoice status mini cards ───────────────────────────────────── */}
      {s && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Paid Invoices', count: s.invoices.paid.count, amount: s.invoices.paid.amount, color: 'border-l-emerald-500 bg-emerald-50', txt: 'text-emerald-700' },
            { label: 'Pending Invoices', count: s.invoices.pending.count, amount: s.invoices.pending.amount, color: 'border-l-amber-500 bg-amber-50', txt: 'text-amber-700' },
            { label: 'Partial Invoices', count: s.invoices.partial.count, amount: s.invoices.partial.amount, color: 'border-l-indigo-500 bg-indigo-50', txt: 'text-indigo-700' },
          ].map(item => (
            <div key={item.label} className={`rounded-xl border-l-4 ${item.color} p-4`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${item.txt}`}>{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{item.count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{fmtCur(item.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Trend Chart ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Chart header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
          <div className="flex items-center gap-2">
            {/* Group by */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
              {(['day', 'month', 'year'] as GroupBy[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                    groupBy === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            {/* Chart type */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
              >
                Area
              </button>
            </div>
          </div>
        </div>

        {trendQ.isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No data for this period</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={trendData} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gst" name="GST" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => '₹' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#colGrad)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Pie + Collection Rate ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut Pie */}
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
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v + ' invoices', '']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 flex-1">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-sm text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{d.value}</span>
                  </div>
                ))}
                {s && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">Total Invoices</p>
                    <p className="text-xl font-bold text-gray-900">{s.invoices.total}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Collection Rate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Collection Summary</h2>
          {s ? (
            <div className="space-y-4">
              {/* Collection rate bar */}
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Collection Rate</span>
                  <span className="font-bold text-gray-900">{s.collection_rate}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.collection_rate}%`,
                      background: s.collection_rate >= 80 ? '#10b981' : s.collection_rate >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { label: 'Total Billed', value: fmtCur(s.revenue.total), color: 'text-indigo-600' },
                  { label: 'Collected', value: fmtCur(s.collected.total), color: 'text-emerald-600' },
                  { label: 'Balance Due', value: fmtCur(s.balance_due), color: 'text-amber-600' },
                  { label: 'GST Amount', value: fmtCur(s.gst.total), color: 'text-purple-600' },
                  { label: 'Discount', value: fmtCur(s.discount.total), color: 'text-red-500' },
                  { label: 'Subtotal', value: fmtCur(s.revenue.subtotal), color: 'text-gray-700' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          )}
        </div>
      </div>

      {/* ── Period Breakdown Table ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">Period Breakdown</h2>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5 text-xs">
            {(['month', 'year'] as const).map(g => (
              <button
                key={g}
                onClick={() => setTableGroupBy(g)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  tableGroupBy === g ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                By {g}
              </button>
            ))}
          </div>
        </div>

        {tableQ.isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : tableRows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 rounded-lg">
                  {[
                    'Period', 'Invoices', 'Revenue', 'Collected', 'Balance Due',
                    'GST', 'Discount', 'Paid', 'Pending', 'Partial'
                  ].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 first:rounded-l-lg last:rounded-r-lg whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{row.label}</td>
                    <td className="px-3 py-3 text-gray-700">{row.count}</td>
                    <td className="px-3 py-3 font-medium text-indigo-600">{fmtCur(row.revenue)}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600">{fmtCur(row.collected)}</td>
                    <td className="px-3 py-3 font-medium text-amber-600">{fmtCur(row.pending)}</td>
                    <td className="px-3 py-3 text-purple-600">{fmtCur(row.gst)}</td>
                    <td className="px-3 py-3 text-red-500">{fmtCur(row.discount)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                        {row.paid_count}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                        {row.pending_count}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {row.partial_count}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Totals row */}
                {tableTotals && (
                  <tr className="bg-gray-900 rounded-b-lg">
                    <td className="px-3 py-3 text-xs font-bold text-white rounded-bl-lg">TOTAL</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableTotals.count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-indigo-300">{fmtCur(tableTotals.revenue)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-emerald-300">{fmtCur(tableTotals.collected)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-amber-300">{fmtCur(tableTotals.pending)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-purple-300">{fmtCur(tableTotals.gst)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-red-300">{fmtCur(tableTotals.discount)}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableTotals.paid_count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white">{tableTotals.pending_count}</td>
                    <td className="px-3 py-3 text-xs font-bold text-white rounded-br-lg">{tableTotals.partial_count}</td>
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
