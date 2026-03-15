'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  txn_id: string;
  store_name: string;
  store_subdomain: string;
  store_folder: string;
  pkt_name: string;
  txn_type: 'new' | 'extend' | 'upgrade';
  txn_amount: number;
  txn_status: 'pending' | 'paid' | 'failed' | 'expired';
  txn_payment_type: string | null;
  txn_created_at: string;
  txn_paid_at: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'Lunas',      cls: 'bg-emerald-500/15 text-emerald-400' },
  pending: { label: 'Menunggu',   cls: 'bg-amber-500/15 text-amber-400' },
  failed:  { label: 'Gagal',      cls: 'bg-red-500/15 text-red-400' },
  expired: { label: 'Kadaluarsa', cls: 'bg-[--surface-3] text-[--text-muted]' },
};

const TYPE_LABEL: Record<string, string> = {
  new: 'Aktivasi', extend: 'Perpanjang', upgrade: 'Upgrade',
};

function formatRp(n: number) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [settling, setSettling] = useState<string | null>(null);
  const isSandbox = true; // shown when MIDTRANS_IS_PRODUCTION=false — hardcoded safe
  const limit = 30;

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin191/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(page, statusFilter); }, [load, page, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  const handleSettle = async (txn_id: string) => {
    if (!confirm(`Simulate settlement for:\n${txn_id}?`)) return;
    setSettling(txn_id);
    const res = await fetch('/api/admin191/transactions/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txn_id }),
    });
    const data = await res.json();
    setSettling(null);
    if (!res.ok) { alert(data.error || 'Failed'); return; }
    alert(data.message);
    load(page, statusFilter);
  };

  // Totals summary
  const paidTotal = transactions.filter(t => t.txn_status === 'paid').reduce((s, t) => s + Number(t.txn_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[--text-primary]">Transaksi</h1>
            {isSandbox && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 uppercase tracking-wider">Sandbox</span>}
          </div>
          <p className="text-sm text-[--text-muted] mt-0.5">{total} transaksi ditemukan</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[--surface-2] border border-[--border] rounded-xl text-sm text-[--text-secondary] focus:outline-none focus:border-mint-500/40"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="paid">Lunas</option>
            <option value="failed">Gagal</option>
            <option value="expired">Kadaluarsa</option>
          </select>
        </div>
      </div>

      {/* Summary card */}
      {!statusFilter && paidTotal > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
          Total terbayar (halaman ini): <span className="font-bold">{formatRp(paidTotal)}</span>
        </div>
      )}

      <div className="bg-[--surface-1] border border-[--border] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_100px_100px_100px_130px] gap-4 px-5 py-3 border-b border-[--border] text-[10px] font-semibold uppercase tracking-widest text-[--text-muted]">
          <span>Order ID</span>
          <span>Toko</span>
          <span>Paket</span>
          <span>Tipe</span>
          <span>Nominal</span>
          <span>Status / Tanggal</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-[--text-muted] text-sm">Tidak ada transaksi</div>
        ) : (
          <div className="divide-y divide-[--border]">
            {transactions.map(t => {
              const status = STATUS_LABEL[t.txn_status] || STATUS_LABEL.expired;
              return (
                <div key={t.txn_id} className="px-5 py-4 grid md:grid-cols-[1fr_1fr_100px_100px_100px_130px] gap-2 md:gap-4 items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[--text-muted] truncate">{t.txn_id}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[--text-primary] truncate">{t.store_name || t.store_folder}</p>
                    <p className="text-xs text-[--text-muted]">{t.store_subdomain || t.store_folder}</p>
                  </div>
                  <p className="text-sm text-[--text-secondary]">{t.pkt_name}</p>
                  <p className="text-xs text-[--text-muted]">{TYPE_LABEL[t.txn_type] || t.txn_type}</p>
                  <p className="text-sm font-semibold text-[--text-primary]">{formatRp(t.txn_amount)}</p>
                  <div>
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                      {status.label}
                    </span>
                    <p className="text-[10px] text-[--text-muted] mt-1">{formatDate(t.txn_created_at)}</p>
                    {t.txn_payment_type && (
                      <p className="text-[10px] text-[--text-muted]">{t.txn_payment_type.toUpperCase()}</p>
                    )}
                    {isSandbox && t.txn_status === 'pending' && (
                      <button
                        onClick={() => handleSettle(t.txn_id)}
                        disabled={settling === t.txn_id}
                        className="mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mint-500/15 text-mint-400 hover:bg-mint-500/25 transition-colors disabled:opacity-50"
                      >
                        {settling === t.txn_id ? '...' : '⚡ Settle'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[--border] flex items-center justify-between">
            <p className="text-xs text-[--text-muted]">{total} total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[--border] text-[--text-muted] hover:border-mint-500/40 hover:text-mint-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[--text-secondary]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[--border] text-[--text-muted] hover:border-mint-500/40 hover:text-mint-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
