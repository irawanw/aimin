'use client';

import { useEffect, useState, useCallback } from 'react';

interface Session {
  id: number;
  session_key: string;
  pelanggan_id: string;
  store_folder: string | null;
  store_type: string;
  customer_ref: string | null;
  channel: string;
  started_at: string;
  last_msg_at: string | null;
  booking_success: number;
  order_total: string;
  msg_count: number;
  status: string;
}

interface SessionsData {
  total: number;
  limit: number;
  offset: number;
  sessions: Session[];
}

interface StatsData {
  period: string;
  total_conversations: number;
  total_bookings: number;
  booking_rate: string;
  avg_messages: number;
  by_period: PeriodRow[];
  by_type: TypeRow[];
}

interface PeriodRow {
  date: string;
  conversations: number;
  bookings: number;
  booking_rate: number;
  avg_messages: number;
}

interface TypeRow {
  store_type: string;
  conversations: number;
  bookings: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sent_at: string;
}

interface DetailData {
  session: Session;
  messages: Message[];
}

const PERIODS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'annual', label: 'Tahunan' },
];

const STORE_TYPES = [
  { value: '', label: 'Semua Tipe' },
  { value: 'store', label: 'Store' },
  { value: 'manager', label: 'Manager' },
];

function formatDate(str: string | null) {
  if (!str) return '-';
  return new Date(str).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

function formatCurrency(val: string | number) {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!n) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[--surface-2] border border-[--border] rounded-xl p-4">
      <p className="text-xs font-medium text-[--text-muted] uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-semibold font-mono leading-tight mt-1.5 ${color || 'text-[--text-primary]'}`}>{value}</p>
      {sub && <p className="text-xs text-[--text-muted] mt-1">{sub}</p>}
    </div>
  );
}

const STORE_TYPE_COLORS: Record<string, string> = {
  store: 'bg-mint-500/20 text-mint-400',
  manager: 'bg-purple-500/20 text-purple-400',
};

export default function AdminConversationsPage() {
  const [period, setPeriod] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [storeTypeFilter, setStoreTypeFilter] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [bookingFilter, setBookingFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const LIMIT = 50;

  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const p = new URLSearchParams({ period });
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      if (storeTypeFilter) p.set('store_type', storeTypeFilter);
      const res = await fetch(`/api/admin191/conversations/stats?${p}`);
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch {}
    setStatsLoading(false);
  }, [period, from, to, storeTypeFilter]);

  const fetchSessions = useCallback(async (newOffset = 0) => {
    setSessionsLoading(true);
    try {
      const p = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      if (bookingFilter !== '') p.set('booking_success', bookingFilter);
      if (storeTypeFilter) p.set('store_type', storeTypeFilter);
      if (search) p.set('search', search);
      const res = await fetch(`/api/admin191/conversations?${p}`);
      const data = await res.json();
      if (!data.error) { setSessions(data); setOffset(newOffset); }
    } catch {}
    setSessionsLoading(false);
  }, [from, to, bookingFilter, storeTypeFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchSessions(0); }, [fetchSessions]);

  const openDetail = async (sessionKey: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin191/conversations/${encodeURIComponent(sessionKey)}`);
      const data = await res.json();
      if (!data.error) setDetail(data);
    } catch {}
    setDetailLoading(false);
  };

  const maxBar = stats?.by_period?.length ? Math.max(...stats.by_period.map((r) => r.conversations), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">Percakapan</h2>
          <p className="text-xs text-[--text-muted] mt-1">Semua sesi percakapan di seluruh store</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${period === p.value ? 'bg-mint-600 text-[--text-primary]' : 'bg-[--surface-3] text-[--text-muted] hover:text-[--text-primary]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[--text-muted] whitespace-nowrap">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-2 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[--text-muted] whitespace-nowrap">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-2 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all" />
        </div>
        <select value={storeTypeFilter} onChange={(e) => setStoreTypeFilter(e.target.value)}
          className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-2 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all">
          {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(from || to || storeTypeFilter) && (
          <button onClick={() => { setFrom(''); setTo(''); setStoreTypeFilter(''); }}
            className="text-xs text-[--text-muted] hover:text-[--text-secondary] px-2.5 py-1 rounded-lg bg-[--surface-3] border border-[--border] transition-colors">
            Reset
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-dark rounded-2xl p-5 animate-pulse h-24" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Percakapan" value={stats.total_conversations.toLocaleString()} />
          <StatCard label="Total Booking" value={stats.total_bookings.toLocaleString()} color="text-green-400" />
          <StatCard label="Booking Rate" value={`${stats.booking_rate}%`} color="text-mint-400" />
          <StatCard label="Rata-rata Pesan" value={stats.avg_messages || '-'} sub="per percakapan" />
        </div>
      ) : null}

      {/* By-type breakdown + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        {stats && stats.by_period.length > 0 && (
          <div className="page-card p-5 lg:col-span-2">
            <p className="section-label mb-4">
              Percakapan per {PERIODS.find((p) => p.value === period)?.label}
            </p>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1 h-40 min-w-max">
                {stats.by_period.slice().reverse().map((row) => {
                  const height = Math.round((row.conversations / maxBar) * 100);
                  const bHeight = Math.round((row.bookings / maxBar) * 100);
                  return (
                    <div key={row.date} className="flex flex-col items-center gap-1" style={{ minWidth: '32px' }}>
                      <div className="relative flex items-end gap-0.5" style={{ height: '128px' }}>
                        <div title={`${row.conversations} percakapan`}
                          className="bg-mint-600/70 hover:bg-mint-500 rounded-t transition-colors"
                          style={{ width: '14px', height: `${height}%`, minHeight: row.conversations > 0 ? '4px' : '0' }} />
                        <div title={`${row.bookings} booking`}
                          className="bg-green-500/80 hover:bg-green-400 rounded-t transition-colors"
                          style={{ width: '14px', height: `${bHeight}%`, minHeight: row.bookings > 0 ? '4px' : '0' }} />
                      </div>
                      <span className="text-[9px] text-[--text-muted] rotate-45 origin-left whitespace-nowrap translate-y-2">
                        {row.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4 mt-6 text-xs text-[--text-muted]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-mint-600/70 inline-block" /> Percakapan</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/80 inline-block" /> Booking</span>
            </div>
          </div>
        )}

        {/* By type */}
        {stats && stats.by_type.length > 0 && (
          <div className="page-card p-5">
            <p className="section-label mb-4">Per Tipe Store</p>
            <div className="space-y-3">
              {stats.by_type.map((t) => {
                const total = stats.total_conversations || 1;
                const pct = Math.round((t.conversations / total) * 100);
                return (
                  <div key={t.store_type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STORE_TYPE_COLORS[t.store_type] || 'bg-[--surface-3] text-[--text-muted]'}`}>
                        {t.store_type}
                      </span>
                      <span className="text-xs text-[--text-muted] font-mono">{t.conversations.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[--surface-3] rounded-full overflow-hidden">
                      <div className="h-full bg-mint-600/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sessions table */}
      <div className="page-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="section-label">Riwayat Percakapan</p>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-1">
              <input
                type="text"
                placeholder="Cari store / customer..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-1.5 text-xs text-[--text-primary] w-48 focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
              />
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-mint-600/80 text-[--text-primary] hover:bg-mint-500 transition-colors">Cari</button>
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-[--surface-3] border border-[--border] text-[--text-muted] hover:text-[--text-secondary] transition-colors">✕</button>
              )}
            </form>
            <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}
              className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-1.5 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 transition-all">
              <option value="">Semua</option>
              <option value="1">Booking Berhasil</option>
              <option value="0">Belum Booking</option>
            </select>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-[--surface-3] rounded-lg animate-pulse" />)}
          </div>
        ) : !sessions || sessions.sessions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-[--text-muted] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-[--text-muted]">Belum ada data percakapan</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[--text-muted] border-b border-[--border]">
                    <th className="pb-3 pr-3">Store</th>
                    <th className="pb-3 pr-3">Tipe</th>
                    <th className="pb-3 pr-3">Customer</th>
                    <th className="pb-3 pr-3">Mulai</th>
                    <th className="pb-3 pr-3 text-center">Pesan</th>
                    <th className="pb-3 pr-3 text-center">Booking</th>
                    <th className="pb-3 pr-3">Total</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]/50">
                  {sessions.sessions.map((s) => (
                    <tr key={s.session_key} className="hover:bg-[--surface-3]/30 transition-colors">
                      <td className="py-3 pr-3">
                        <span className="text-[--text-secondary] font-mono text-xs">{s.store_folder || s.pelanggan_id.replace('@s.whatsapp.net', '')}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STORE_TYPE_COLORS[s.store_type] || 'bg-[--surface-3] text-[--text-muted]'}`}>
                          {s.store_type}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="text-[--text-primary] font-mono text-xs">{s.customer_ref || s.session_key.slice(0, 14) + '…'}</span>
                      </td>
                      <td className="py-3 pr-3 text-[--text-muted] text-xs whitespace-nowrap">{formatDate(s.started_at)}</td>
                      <td className="py-3 pr-3 text-center text-[--text-secondary]">{s.msg_count}</td>
                      <td className="py-3 pr-3 text-center">
                        {s.booking_success ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ya</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[--surface-3] text-[--text-muted]">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-[--text-secondary] text-xs">{formatCurrency(s.order_total)}</td>
                      <td className="py-3 pr-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : s.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[--surface-3] text-[--text-muted]'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => openDetail(s.session_key)}
                          className="text-xs text-mint-400 hover:text-mint-300 transition-colors whitespace-nowrap">
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[--border]">
              <span className="text-xs text-[--text-muted]">
                {offset + 1}–{Math.min(offset + LIMIT, sessions.total)} dari {sessions.total.toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => fetchSessions(offset - LIMIT)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[--surface-3] text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Sebelumnya
                </button>
                <button disabled={offset + LIMIT >= sessions.total} onClick={() => fetchSessions(offset + LIMIT)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[--surface-3] text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-[--surface-1] border border-[--border] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[--border]">
              <h4 className="text-white font-semibold text-sm">Detail Percakapan</h4>
              <button onClick={() => setDetail(null)} className="text-[--text-muted] hover:text-[--text-secondary] text-xl leading-none">&times;</button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="animate-spin w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full" />
              </div>
            ) : detail ? (
              <>
                <div className="p-4 border-b border-[--border] text-xs text-[--text-muted] grid grid-cols-2 gap-2">
                  <span>Store: <span className="text-[--text-primary] font-mono">{detail.session.store_folder || detail.session.pelanggan_id}</span></span>
                  <span>Tipe: <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STORE_TYPE_COLORS[detail.session.store_type] || 'text-[--text-muted]'}`}>{detail.session.store_type}</span></span>
                  <span>Customer: <span className="text-[--text-primary]">{detail.session.customer_ref || '-'}</span></span>
                  <span>Status: <span className="text-[--text-primary]">{detail.session.status}</span></span>
                  <span>Mulai: <span className="text-[--text-primary]">{formatDate(detail.session.started_at)}</span></span>
                  <span>Booking: <span className={detail.session.booking_success ? 'text-green-400' : 'text-[--text-muted]'}>{detail.session.booking_success ? 'Ya' : 'Tidak'}</span></span>
                  {detail.session.order_total && parseFloat(detail.session.order_total) > 0 && (
                    <span className="col-span-2">Total: <span className="text-[--text-primary]">{formatCurrency(detail.session.order_total)}</span></span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {detail.messages.length === 0 ? (
                    <p className="text-[--text-muted] text-sm text-center py-4">Tidak ada pesan tersimpan</p>
                  ) : detail.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-mint-600/30 text-[--text-primary] rounded-tr-sm' : 'bg-[--surface-3] text-[--text-secondary] rounded-tl-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-mint-400/70 text-right' : 'text-[--text-muted]'}`}>
                          {formatDate(msg.sent_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
