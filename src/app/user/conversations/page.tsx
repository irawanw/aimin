'use client';

import { useEffect, useState, useCallback } from 'react';
import UpgradeGate from '@/components/user/UpgradeGate';
import { useLanguage } from '@/lib/LanguageContext';

interface StatsData {
  period: string;
  total_conversations: number;
  total_bookings: number;
  booking_rate: string;
  avg_messages: number;
  by_period: PeriodRow[];
}

interface PeriodRow {
  date: string;
  conversations: number;
  bookings: number;
  booking_rate: number;
  avg_messages: number;
}

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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sent_at: string;
}

interface DetailData {
  session: Session;
  messages: Message[];
}

function formatDate(str: string | null) {
  if (!str) return '-';
  const d = new Date(str);
  return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
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

export default function ConversationsPage() {
  return <UpgradeGate><ConversationsContent /></UpgradeGate>;
}

function ConversationsContent() {
  const { t } = useLanguage();

  const PERIODS = [
    { value: 'daily', label: t('conversations.daily') },
    { value: 'weekly', label: t('conversations.weekly') },
    { value: 'monthly', label: t('conversations.monthly') },
    { value: 'annual', label: t('conversations.yearly') },
  ];

  const [period, setPeriod] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [bookingFilter, setBookingFilter] = useState('');
  const LIMIT = 20;

  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/user/conversations/stats?${params}`);
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch {}
    setStatsLoading(false);
  }, [period, from, to]);

  const fetchSessions = useCallback(async (newOffset = 0) => {
    setSessionsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (bookingFilter !== '') params.set('booking_success', bookingFilter);
      const res = await fetch(`/api/user/conversations?${params}`);
      const data = await res.json();
      if (!data.error) {
        setSessions(data);
        setOffset(newOffset);
      }
    } catch {}
    setSessionsLoading(false);
  }, [from, to, bookingFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSessions(0);
  }, [fetchSessions]);

  const openDetail = async (sessionKey: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/user/conversations/${encodeURIComponent(sessionKey)}`);
      const data = await res.json();
      if (!data.error) setDetail(data);
    } catch {}
    setDetailLoading(false);
  };

  const maxBar = stats?.by_period?.length
    ? Math.max(...stats.by_period.map((r) => r.conversations), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">{t('conversations.title')}</h2>
          <p className="text-xs text-[--text-muted] mt-1">{t('conversations.description')}</p>
        </div>

        {/* Filters */}
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

      {/* Date range */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[--text-muted] whitespace-nowrap">{t('common.from')}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-2 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[--text-muted] whitespace-nowrap">{t('common.to')}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-[--surface-3] border border-[--border] rounded-xl px-3 py-2 text-xs text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => { setFrom(''); setTo(''); }}
            className="text-xs text-[--text-muted] hover:text-[--text-secondary] px-2.5 py-1 rounded-lg bg-[--surface-3] border border-[--border] transition-colors"
          >
            {t('common.reset')}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-dark rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t('conversations.totalConversations')} value={stats.total_conversations.toLocaleString()} />
          <StatCard label={t('conversations.totalBookings')} value={stats.total_bookings.toLocaleString()} color="text-green-400" />
          <StatCard label={t('conversations.bookingRate')} value={`${stats.booking_rate}%`} color="text-mint-400" />
          <StatCard label={t('conversations.avgMessages')} value={stats.avg_messages || '-'} sub={t('conversations.perConversation')} />
        </div>
      ) : null}

      {/* Chart */}
      {stats && stats.by_period.length > 0 && (
        <div className="page-card p-5">
          <p className="section-label mb-4">
            {t('conversations.chartTitle', { period: PERIODS.find((p) => p.value === period)?.label || period })}
          </p>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-40 min-w-max">
              {stats.by_period.slice().reverse().map((row) => {
                const height = Math.round((row.conversations / maxBar) * 100);
                const bHeight = Math.round((row.bookings / maxBar) * 100);
                return (
                  <div key={row.date} className="flex flex-col items-center gap-1 group" style={{ minWidth: '32px' }}>
                    <div className="relative flex items-end gap-0.5" style={{ height: '128px' }}>
                      <div
                        title={`${row.conversations} ${t('conversations.conversationsLegend').toLowerCase()}`}
                        className="bg-mint-600/70 hover:bg-mint-500 rounded-t transition-colors"
                        style={{ width: '14px', height: `${height}%`, minHeight: row.conversations > 0 ? '4px' : '0' }}
                      />
                      <div
                        title={`${row.bookings} ${t('conversations.bookingsLegend').toLowerCase()}`}
                        className="bg-green-500/80 hover:bg-green-400 rounded-t transition-colors"
                        style={{ width: '14px', height: `${bHeight}%`, minHeight: row.bookings > 0 ? '4px' : '0' }}
                      />
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
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-mint-600/70 inline-block" /> {t('conversations.conversationsLegend')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/80 inline-block" /> {t('conversations.bookingsLegend')}</span>
          </div>
        </div>
      )}

      {/* Sessions table */}
      <div className="page-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="section-label">{t('conversations.historyTitle')}</p>
          <div className="flex gap-2">
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="form-select !text-xs !py-1.5 !w-auto"
            >
              <option value="">{t('conversations.allFilter')}</option>
              <option value="1">{t('conversations.bookedFilter')}</option>
              <option value="0">{t('conversations.notBookedFilter')}</option>
            </select>
          </div>
        </div>

        {sessionsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-[--surface-3] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !sessions || sessions.sessions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-[--text-muted] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-[--text-muted]">{t('conversations.noData')}</p>
            <p className="text-[--text-muted] text-sm mt-1">{t('conversations.botInfo')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[--text-muted] border-b border-[--border]">
                    <th className="pb-3 pr-3">{t('conversations.colCustomer')}</th>
                    <th className="pb-3 pr-3">{t('conversations.colStart')}</th>
                    <th className="pb-3 pr-3 text-center">{t('conversations.colMessages')}</th>
                    <th className="pb-3 pr-3 text-center">{t('conversations.colBooking')}</th>
                    <th className="pb-3 pr-3">{t('conversations.colTotal')}</th>
                    <th className="pb-3 text-center">{t('conversations.colStatus')}</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border]/50">
                  {sessions.sessions.map((s) => (
                    <tr key={s.session_key} className="hover:bg-[--surface-3]/30 transition-colors">
                      <td className="py-3 pr-3">
                        <span className="text-[--text-primary] font-mono text-xs">{s.customer_ref || s.session_key.slice(0, 16) + '…'}</span>
                      </td>
                      <td className="py-3 pr-3 text-[--text-muted] text-xs whitespace-nowrap">{formatDate(s.started_at)}</td>
                      <td className="py-3 pr-3 text-center">
                        <span className="text-[--text-secondary]">{s.msg_count}</span>
                      </td>
                      <td className="py-3 pr-3 text-center">
                        {s.booking_success ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{t('conversations.bookingYes')}</span>
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
                        <button
                          onClick={() => openDetail(s.session_key)}
                          className="text-xs text-mint-400 hover:text-mint-300 transition-colors"
                        >
                          {t('common.detail')}
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
                {t('conversations.pagination', { start: offset + 1, end: Math.min(offset + LIMIT, sessions.total), total: sessions.total })}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => fetchSessions(offset - LIMIT)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[--surface-3] text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.previous')}
                </button>
                <button
                  disabled={offset + LIMIT >= sessions.total}
                  onClick={() => fetchSessions(offset + LIMIT)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[--surface-3] text-[--text-muted] hover:text-[--text-primary] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-[--surface-1] border border-[--border] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[--border]">
              <h4 className="text-white font-semibold text-sm">{t('conversations.detailTitle')}</h4>
              <button onClick={() => setDetail(null)} className="text-[--text-muted] hover:text-[--text-secondary] text-xl leading-none">&times;</button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <span className="animate-spin w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full" />
              </div>
            ) : detail ? (
              <>
                {/* Session Meta */}
                <div className="p-4 border-b border-[--border] text-xs text-[--text-muted] grid grid-cols-2 gap-2">
                  <span>Customer: <span className="text-[--text-primary]">{detail.session.customer_ref || '-'}</span></span>
                  <span>{t('conversations.colStatus')}: <span className="text-[--text-primary]">{detail.session.status}</span></span>
                  <span>{t('conversations.colStart')}: <span className="text-[--text-primary]">{formatDate(detail.session.started_at)}</span></span>
                  <span>{t('conversations.colBooking')}: <span className={detail.session.booking_success ? 'text-green-400' : 'text-[--text-muted]'}>{detail.session.booking_success ? t('conversations.bookingYes') : t('conversations.bookingNo')}</span></span>
                  {detail.session.order_total && parseFloat(detail.session.order_total) > 0 && (
                    <span className="col-span-2">{t('conversations.colTotal')}: <span className="text-[--text-primary]">{formatCurrency(detail.session.order_total)}</span></span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {detail.messages.length === 0 ? (
                    <p className="text-[--text-muted] text-sm text-center py-4">{t('conversations.noMessages')}</p>
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
