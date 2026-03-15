'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, CheckCircle, Clock, Zap, ChevronRight, X, RefreshCw, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useLanguage } from '@/lib/LanguageContext';
import { formatPrice, resolveCurrency, type CurrencyConfig } from '@/lib/currency';

interface PaketItem {
  pkt_id: number;
  pkt_name: string;
  pkt_length: number;
  prices: Record<string, number>; // { IDR: 60000, USD: 9, EUR: 9, ... }
}

interface SubInfo {
  store_id: number;
  store_paket: number;
  paket_name: string;
  store_expired_at: string | null;
  store_status: string;
  days_remaining: number;
  paket_list: PaketItem[];
  currencies: CurrencyConfig[];
}

function formatDate(s: string | null, currency: CurrencyConfig) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString(currency.locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SubscriptionPage() {
  const { t, tArr, lang } = useLanguage();
  const [info, setInfo] = useState<SubInfo | null>(null);
  // Resolve currency from the fetched currencies list; fallback while loading
  const currency = resolveCurrency(lang, info?.currencies ?? []);
  const [loading, setLoading] = useState(true);
  const [selectedPaket, setSelectedPaket] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'snap'>('qris');
  const [proRataAmount, setProRataAmount] = useState<number | null>(null);
  const [txnType, setTxnType] = useState<'new' | 'extend' | 'upgrade'>('extend');

  // Payment modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [, setQrString] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [, setSnapToken] = useState('');
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'failed' | 'expired'>('pending');
  const [countdown, setCountdown] = useState(900); // 15 min
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/user/subscription');
    const data = await res.json();
    setInfo(data);
    setSelectedPaket(data.store_paket || data.paket_list?.[0]?.pkt_id || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute pro-rata display amount (in active currency) when selection or language changes
  useEffect(() => {
    if (!info || !selectedPaket) return;
    const target = info.paket_list.find(p => p.pkt_id === selectedPaket);
    if (!target) return;

    const cur = resolveCurrency(lang, info.currencies);
    const targetPrice = target.prices[cur.code] ?? target.prices['IDR'] ?? 0;

    const now = new Date();
    const expiry = info.store_expired_at ? new Date(info.store_expired_at) : null;
    const isExpired = !expiry || expiry <= now;

    if (isExpired || !info.store_paket) {
      setTxnType('new');
      setProRataAmount(targetPrice);
      return;
    }
    if (selectedPaket > info.store_paket) {
      setTxnType('upgrade');
      const curPaket = info.paket_list.find(p => p.pkt_id === info.store_paket);
      if (!curPaket) { setProRataAmount(targetPrice); return; }
      const curPrice = curPaket.prices[cur.code] ?? curPaket.prices['IDR'] ?? 0;
      const dailyRateCurrent = curPrice / (curPaket.pkt_length || 30);
      const credit = Math.round(info.days_remaining * dailyRateCurrent);
      setProRataAmount(Math.max(0, targetPrice - credit));
    } else {
      setTxnType('extend');
      setProRataAmount(targetPrice);
    }
  }, [info, selectedPaket, lang]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const pollStatus = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/user/subscription/status?txn_id=${id}`);
      const data = await res.json();
      if (data.txn_status === 'paid') {
        stopPolling();
        setPayStatus('paid');
        load();
      } else if (data.txn_status === 'failed' || data.txn_status === 'expired') {
        stopPolling();
        setPayStatus(data.txn_status);
      }
    }, 5000);
  }, [stopPolling, load]);

  const startCountdown = useCallback(() => {
    setCountdown(900);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopPolling();
          setPayStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handlePay = async () => {
    if (!selectedPaket) return;
    setPaying(true);
    try {
      const res = await fetch('/api/user/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paket_id: selectedPaket, payment_method: paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || t('subscription.failedCreate')); setPaying(false); return; }

      setTxnId(data.txn_id);
      setPayStatus('pending');

      const openSnap = async (token: string, txnId: string) => {
        setSnapToken(token);
        setModalOpen(true);
        const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
        if (!(window as any).snap) {
          await new Promise<void>((resolve) => {
            const script = document.createElement('script');
            script.src = snapUrl;
            script.setAttribute('data-client-key', clientKey);
            script.onload = () => resolve();
            document.head.appendChild(script);
          });
        }
        (window as any).snap?.pay(token, {
          onSuccess: () => { setPayStatus('paid'); load(); },
          onPending: () => { setPayStatus('pending'); pollStatus(txnId); },
          onError: () => setPayStatus('failed'),
          onClose: () => {},
        });
      };

      if (data.qr_string) {
        // Core API QRIS — render QR image ourselves
        setQrString(data.qr_string);
        setQrCodeUrl(data.qr_code_url || '');
        const url = await QRCode.toDataURL(data.qr_string, { width: 260, margin: 1 });
        setQrDataUrl(url);
        setModalOpen(true);
        startCountdown();
        pollStatus(data.txn_id);
      } else if (data.snap_token) {
        // Snap popup (also used as QRIS fallback when Core API not enabled)
        await openSnap(data.snap_token, data.txn_id);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPaying(false);
    }
  };

  const closeModal = () => {
    stopPolling();
    setModalOpen(false);
    setQrDataUrl('');
    setQrString('');
    setQrCodeUrl('');
    setSnapToken('');
    setPayStatus('pending');
    setCountdown(900);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!info) return <div className="text-[--text-muted] text-sm">{t('subscription.failedLoad')}</div>;

  const selectedTarget = info.paket_list.find(p => p.pkt_id === selectedPaket);
  void (selectedPaket === info.store_paket); // reserved for future UI

  const countdownMin = Math.floor(countdown / 60);
  const countdownSec = countdown % 60;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[--text-primary]">{t('subscription.title')}</h1>
        <p className="text-sm text-[--text-muted] mt-1">{t('subscription.subtitle')}</p>
      </div>

      {/* Current plan card */}
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[--text-muted] mb-3">{t('subscription.activePlan')}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint-400/20 to-mint-600/20 border border-mint-500/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-mint-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-[--text-primary]">{info.paket_name || 'LITE'}</p>
              {info.store_expired_at && (
                <p className="text-xs text-[--text-muted]">{t('subscription.validUntil', { date: formatDate(info.store_expired_at, currency) })}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
              ${info.store_status === 'AKTIF' && info.days_remaining > 0
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${info.store_status === 'AKTIF' && info.days_remaining > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {info.store_status === 'AKTIF' && info.days_remaining > 0 ? t('subscription.statusActive') : t('subscription.statusInactive')}
            </span>
            {info.days_remaining > 0 && (
              <p className="text-xs text-[--text-muted] mt-1 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />{t('subscription.daysLeft', { n: info.days_remaining })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Paket selector */}
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[--text-muted]">{t('subscription.renewUpgrade')}</p>

        <div className="grid grid-cols-3 gap-2">
          {info.paket_list.map(p => (
            <button
              key={p.pkt_id}
              onClick={() => setSelectedPaket(p.pkt_id)}
              className={`relative p-3 rounded-xl border text-sm font-semibold transition-all
                ${selectedPaket === p.pkt_id
                  ? 'border-mint-500/60 bg-mint-500/10 text-mint-400'
                  : 'border-[--border] bg-[--surface-3] text-[--text-secondary] hover:border-[--border-hover]'}`}
            >
              {p.pkt_id === info.store_paket && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-mint-500 text-[10px] text-white font-bold px-1.5 py-0.5 rounded-full">
                  {t('subscription.currentPlan')}
                </span>
              )}
              {p.pkt_name}
            </button>
          ))}
        </div>

        {selectedTarget && (
          <div className="space-y-3">
            <div className="bg-[--surface-3] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[--text-primary]">{selectedTarget.pkt_name} Plan</p>
                <p className="text-mint-400 font-bold">{formatPrice(selectedTarget.prices[currency.code] ?? selectedTarget.prices['IDR'] ?? 0, currency)}<span className="text-[--text-muted] text-xs font-normal">{t('subscription.perMonth')}</span></p>
              </div>
              <ul className="space-y-1.5">
                {tArr(`subscription.features${selectedTarget.pkt_name}`).map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[--text-secondary]">
                    <CheckCircle className="w-3.5 h-3.5 text-mint-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[--border]">
              <div>
                <p className="text-sm text-[--text-secondary]">
                  {txnType === 'upgrade' ? t('subscription.txnUpgrade') : txnType === 'new' ? t('subscription.txnNew') : t('subscription.txnExtend')}
                </p>
                {txnType === 'upgrade' && selectedTarget && info.store_paket && (
                  <p className="text-xs text-[--text-muted]">
                    {info.paket_name} → {selectedTarget.pkt_name}
                  </p>
                )}
              </div>
              <p className="text-lg font-bold text-[--text-primary]">
                {proRataAmount !== null ? formatPrice(proRataAmount, currency) : '...'}
              </p>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[--text-muted]">{t('subscription.payWith')}</p>
              <div className="flex gap-2">
                {(['qris', 'snap'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                      ${paymentMethod === m
                        ? 'border-mint-500/60 bg-mint-500/10 text-mint-400'
                        : 'border-[--border] text-[--text-secondary] hover:border-[--border-hover]'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${paymentMethod === m ? 'border-mint-400' : 'border-[--text-muted]'}`}>
                      {paymentMethod === m && <span className="w-1.5 h-1.5 rounded-full bg-mint-400" />}
                    </span>
                    {m === 'qris' ? 'QRIS' : t('subscription.otherMethod')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-mint-500 to-mint-600 text-white font-semibold text-sm hover:from-mint-400 hover:to-mint-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paying ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('subscription.processing')}</>
              ) : (
                <><CreditCard className="w-4 h-4" />{t('subscription.payBtn', { amount: proRataAmount !== null ? formatPrice(proRataAmount, currency) : '' })}</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[--surface-2] border border-[--border] rounded-2xl w-full max-w-sm p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {payStatus === 'paid' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-[--text-primary] mb-1">{t('subscription.paySuccess')}</h3>
                <p className="text-sm text-[--text-muted]">{t('subscription.planActivated')}</p>
                <button
                  onClick={closeModal}
                  className="mt-4 w-full py-2.5 rounded-xl bg-mint-500/20 text-mint-400 font-semibold text-sm hover:bg-mint-500/30 transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            ) : payStatus === 'expired' ? (
              <div className="text-center py-6">
                <p className="text-[--text-muted] text-sm">{t('subscription.payExpired')}</p>
                <button onClick={closeModal} className="mt-3 text-mint-400 text-sm underline">{t('common.tryAgain')}</button>
              </div>
            ) : payStatus === 'failed' ? (
              <div className="text-center py-6">
                <p className="text-red-400 text-sm">{t('subscription.payFailed')}</p>
                <button onClick={closeModal} className="mt-3 text-mint-400 text-sm underline">{t('common.tryAgain')}</button>
              </div>
            ) : qrDataUrl ? (
              <>
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <QrCode className="w-4 h-4 text-mint-400" />
                    <h3 className="font-bold text-[--text-primary]">{t('subscription.scanQris')}</h3>
                  </div>
                  <p className="text-xs text-[--text-muted]">{t('subscription.scanQrisDesc')}</p>
                </div>

                <div className="bg-white rounded-2xl p-3 flex items-center justify-center mb-4">
                  <img src={qrDataUrl} alt="QRIS" className="w-56 h-56 object-contain" />
                </div>

                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-[--text-primary]">{proRataAmount !== null ? formatPrice(proRataAmount, currency) : ''}</p>
                  <p className="text-xs text-[--text-muted] mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t('subscription.expiresIn')} {countdownMin}:{String(countdownSec).padStart(2, '0')}
                  </p>
                </div>

                {qrCodeUrl && (
                  <div className="mb-3 px-3 py-2.5 bg-[--surface-3] rounded-xl border border-[--border]">
                    <p className="text-[10px] font-semibold text-[--text-muted] uppercase tracking-wider mb-1">QR Code URL (Sandbox Simulator)</p>
                    <p className="text-[10px] text-mint-400 font-mono break-all leading-relaxed select-all">{qrCodeUrl}</p>
                  </div>
                )}

                <button
                  onClick={() => pollStatus(txnId)}
                  className="w-full py-2.5 rounded-xl border border-[--border] text-[--text-secondary] text-sm font-medium hover:border-mint-500/40 hover:text-mint-400 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('subscription.checkStatus')}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[--text-muted] mt-2">{t('subscription.loadingPayment')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
