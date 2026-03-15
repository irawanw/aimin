'use client';

import { useEffect, useState, useCallback } from 'react';
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface Transaction {
  txn_id: string;
  pkt_name: string;
  txn_type: 'new' | 'extend' | 'upgrade';
  txn_amount: number;
  txn_status: 'pending' | 'paid' | 'failed' | 'expired';
  txn_payment_type: string | null;
  txn_created_at: string;
  txn_paid_at: string | null;
}

const STATUS_CLS: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
  expired: 'bg-[--surface-3] text-[--text-muted]',
};

function formatRp(n: number) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransactionsPage() {
  const { t } = useLanguage();

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    paid: { label: t('transactions.statusPaid'), cls: STATUS_CLS.paid },
    pending: { label: t('transactions.statusPending'), cls: STATUS_CLS.pending },
    failed: { label: t('transactions.statusFailed'), cls: STATUS_CLS.failed },
    expired: { label: t('transactions.statusExpired'), cls: STATUS_CLS.expired },
  };
  const TYPE_LABEL: Record<string, string> = {
    new: t('transactions.typeNew'),
    extend: t('transactions.typeExtend'),
    upgrade: t('transactions.typeUpgrade'),
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/user/transactions?page=${p}`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[--text-primary] flex items-center gap-2">
          <Receipt className="w-5 h-5 text-mint-400" />
          {t('transactions.title')}
        </h1>
        <p className="text-sm text-[--text-muted] mt-1">{t('transactions.subtitle')}</p>
      </div>

      <div className="bg-[--surface-2] border border-[--border] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-[--text-muted] text-sm">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {t('transactions.noTransactions')}
          </div>
        ) : (
          <div className="divide-y divide-[--border]">
            {transactions.map(txn => {
              const status = STATUS_LABEL[txn.txn_status] || STATUS_LABEL.expired;
              return (
                <div key={txn.txn_id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[--text-primary]">
                        {txn.pkt_name} — {TYPE_LABEL[txn.txn_type] || txn.txn_type}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-[--text-muted] mt-0.5">
                      {formatDate(txn.txn_created_at)}
                      {txn.txn_payment_type && ` · ${txn.txn_payment_type.toUpperCase()}`}
                    </p>
                    <p className="text-[10px] text-[--text-muted] font-mono mt-0.5 truncate">{txn.txn_id}</p>
                  </div>
                  <p className="text-sm font-bold text-[--text-primary] whitespace-nowrap">{formatRp(txn.txn_amount)}</p>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[--border] flex items-center justify-between">
            <p className="text-xs text-[--text-muted]">{t('transactions.count', { n: total })}</p>
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
