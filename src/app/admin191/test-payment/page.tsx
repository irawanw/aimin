'use client';

import { useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { CheckCircle, Clock, RefreshCw, X, Zap } from 'lucide-react';

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function TestPaymentPage() {
  const [amount, setAmount] = useState('1000');
  const [label, setLabel] = useState('Test Payment');
  const [method, setMethod] = useState<'qris' | 'snap'>('qris');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QR state
  const [txnId, setTxnId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'failed'>('pending');
  const [countdown, setCountdown] = useState(900);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const pollStatus = useCallback((id: string) => {
    stopAll();
    pollRef.current = setInterval(async () => {
      try {
        const IS_PRODUCTION = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
        const base = IS_PRODUCTION ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
        // We just poll Midtrans status directly via our own check endpoint
        const res = await fetch(`/api/admin191/test-payment/status?txn_id=${id}`);
        const data = await res.json();
        if (data.status === 'settlement' || data.status === 'capture') {
          stopAll();
          setPayStatus('paid');
        } else if (data.status === 'deny' || data.status === 'failure' || data.status === 'expire' || data.status === 'cancel') {
          stopAll();
          setPayStatus('failed');
        }
      } catch {}
    }, 4000);
  }, [stopAll]);

  const startCountdown = useCallback(() => {
    setCountdown(900);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { stopAll(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopAll]);

  const handleCharge = async () => {
    setError('');
    const amt = parseInt(amount.replace(/\D/g, ''));
    if (!amt || amt < 1000) { setError('Minimum Rp 1.000'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/admin191/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, payment_method: method, label }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal'); setLoading(false); return; }

      setTxnId(data.txn_id);
      setPayStatus('pending');

      if (data.qr_string) {
        const url = await QRCode.toDataURL(data.qr_string, { width: 280, margin: 1 });
        setQrDataUrl(url);
        setQrCodeUrl(data.qr_code_url || '');
        setModalOpen(true);
        startCountdown();
        pollStatus(data.txn_id);
      } else if (data.snap_token) {
        setModalOpen(true);
        const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        if (!(window as any).snap) {
          await new Promise<void>(resolve => {
            const s = document.createElement('script');
            s.src = snapUrl;
            s.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
            s.onload = () => resolve();
            document.head.appendChild(s);
          });
        }
        (window as any).snap?.pay(data.snap_token, {
          onSuccess: () => { setPayStatus('paid'); stopAll(); },
          onPending: () => { pollStatus(data.txn_id); },
          onError: () => { setPayStatus('failed'); stopAll(); },
          onClose: () => {},
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    stopAll();
    setModalOpen(false);
    setQrDataUrl('');
    setQrCodeUrl('');
    setTxnId('');
    setPayStatus('pending');
    setCountdown(900);
  };

  const min = Math.floor(countdown / 60);
  const sec = countdown % 60;

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-amber-400" style={{width:18,height:18}} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[--text-primary]">Test Payment</h1>
          <p className="text-sm text-[--text-muted]">
            Mode: <span className={`font-semibold ${process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true' ? 'Production' : 'Sandbox'}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-5 space-y-4">

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[--text-muted]">Nominal</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[--text-muted] font-medium">Rp</span>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="1000"
              className="w-full pl-10 pr-4 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 font-mono"
            />
          </div>
          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[1000, 5000, 10000, 50000].map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  amount === String(a)
                    ? 'border-mint-500/60 bg-mint-500/10 text-mint-400'
                    : 'border-[--border] text-[--text-muted] hover:border-[--border-hover]'
                }`}
              >
                {formatRp(a)}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[--text-muted]">Keterangan</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Test Payment"
            className="w-full px-3 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60"
          />
        </div>

        {/* Method */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[--text-muted]">Metode Bayar</label>
          <div className="flex gap-2">
            {(['qris', 'snap'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                  method === m
                    ? 'border-mint-500/60 bg-mint-500/10 text-mint-400'
                    : 'border-[--border] text-[--text-secondary] hover:border-[--border-hover]'
                }`}
              >
                {m === 'qris' ? 'QRIS' : 'Snap (card/VA)'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <button
          onClick={handleCharge}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-mint-500 to-mint-600 text-white font-semibold text-sm hover:from-mint-400 hover:to-mint-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</>
            : `Bayar ${amount ? formatRp(parseInt(amount) || 0) : ''}`
          }
        </button>
      </div>

      {/* QR Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[--surface-2] border border-[--border] rounded-2xl w-full max-w-sm p-6 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary]">
              <X className="w-5 h-5" />
            </button>

            {payStatus === 'paid' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-[--text-primary] mb-1">Pembayaran Berhasil!</h3>
                <p className="text-sm text-[--text-muted] font-mono">{txnId}</p>
                <button onClick={closeModal} className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-semibold text-sm">
                  Tutup
                </button>
              </div>
            ) : payStatus === 'failed' ? (
              <div className="text-center py-6">
                <p className="text-red-400 font-semibold mb-2">Pembayaran Gagal</p>
                <p className="text-xs text-[--text-muted] font-mono">{txnId}</p>
                <button onClick={closeModal} className="mt-4 text-mint-400 text-sm underline">Tutup</button>
              </div>
            ) : qrDataUrl ? (
              <>
                <div className="text-center mb-3">
                  <p className="font-bold text-[--text-primary]">Scan QRIS</p>
                  <p className="text-xs text-[--text-muted]">GoPay · OVO · Dana · ShopeePay · m-Banking</p>
                </div>
                <div className="bg-white rounded-2xl p-3 flex items-center justify-center mb-3">
                  <img src={qrDataUrl} alt="QRIS" className="w-60 h-60 object-contain" />
                </div>
                <div className="text-center mb-3">
                  <p className="text-xl font-bold text-[--text-primary]">{formatRp(parseInt(amount) || 0)}</p>
                  <p className="text-xs text-[--text-muted] mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />{min}:{String(sec).padStart(2, '0')}
                  </p>
                  <p className="text-[10px] text-[--text-muted] font-mono mt-1">{txnId}</p>
                </div>
                {qrCodeUrl && (
                  <div className="mb-3 px-3 py-2 bg-[--surface-3] rounded-xl border border-[--border]">
                    <p className="text-[10px] font-semibold text-[--text-muted] uppercase tracking-wider mb-1">QR Code URL</p>
                    <p className="text-[10px] text-mint-400 font-mono break-all select-all">{qrCodeUrl}</p>
                  </div>
                )}
                <button
                  onClick={() => pollStatus(txnId)}
                  className="w-full py-2.5 rounded-xl border border-[--border] text-[--text-secondary] text-sm font-medium hover:border-mint-500/40 hover:text-mint-400 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />Cek Status
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-mint-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-[--text-muted] mt-2">Memuat...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
