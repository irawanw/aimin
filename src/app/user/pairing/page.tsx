'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, RefreshCw, CheckCircle, XCircle, Wifi } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

type PairingState = 'idle' | 'loading' | 'scanning' | 'success' | 'failed';

export default function PairingPage() {
  const { t, tArr } = useLanguage();
  const [state, setState]         = useState<PairingState>('idle');
  const [qrImage, setQrImage]     = useState<string | null>(null);
  const [, setPhone]               = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback((pairingPhone: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/trial/status/${pairingPhone}`);
        const data = await res.json();
        if (data.qrImage) setQrImage(data.qrImage);
        if (data.status === 'success') {
          stopPoll();
          // Save paired WA JID to DB and re-issue token
          const waJid = data.waJid || (pairingPhone.includes('@') ? pairingPhone : `${pairingPhone}@s.whatsapp.net`);
          fetch('/api/user/pairing', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ waJid }),
          }).catch(() => {});
          setState('success');
          setStatusMsg(data.message || t('pairing.connected'));
        } else if (data.status === 'failed') {
          stopPoll();
          setState('failed');
          setStatusMsg(data.message || t('pairing.failed'));
        }
      } catch { /* silent retry */ }
    }, 5000);
  }, [stopPoll, t]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const initiatePairing = async () => {
    setState('loading');
    setQrImage(null);
    setPhone(null);
    setStatusMsg('');
    stopPoll();

    try {
      const res  = await fetch('/api/user/pairing', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setState('failed'); setStatusMsg(data.error || t('common.errorServer')); return; }
      if ((data.isQR || data.isPairing) && data.qrImage && data.pairingPhone) {
        setQrImage(data.qrImage);
        setPhone(data.pairingPhone);
        setState('scanning');
        startPoll(data.pairingPhone);
      } else {
        setState('failed');
        setStatusMsg(data.replyText || data.error || t('common.errorServer'));
      }
    } catch {
      setState('failed');
      setStatusMsg(t('common.errorServer'));
    }
  };

  const steps = tArr('pairing.steps');

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[--text-primary] flex items-center gap-2">
          <Wifi className="w-5 h-5 text-mint-400" />
          {t('pairing.title')}
        </h1>
        <p className="text-sm text-[--text-muted] mt-1">
          {t('pairing.description')}
        </p>
      </div>

      {/* Main card */}
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 flex flex-col items-center gap-5">

        {/* QR area */}
        <div className="relative">
          {state === 'scanning' && qrImage ? (
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <img src={qrImage} alt="QR WhatsApp" width={220} height={220} className="block rounded" />
            </div>
          ) : state === 'success' ? (
            <div className="w-48 h-48 rounded-xl bg-mint-500/10 border border-mint-500/20 flex flex-col items-center justify-center gap-3">
              <CheckCircle className="w-12 h-12 text-mint-400" />
              <span className="text-sm font-medium text-mint-400">{t('pairing.connected')}</span>
            </div>
          ) : state === 'failed' ? (
            <div className="w-48 h-48 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center gap-3">
              <XCircle className="w-12 h-12 text-red-400" />
              <span className="text-sm font-medium text-red-400">{t('pairing.failed')}</span>
            </div>
          ) : state === 'loading' ? (
            <div className="w-48 h-48 rounded-xl bg-[--surface-3] border border-[--border] flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-mint-400 animate-spin" />
              <span className="text-sm text-[--text-muted]">{t('pairing.loadingQR')}</span>
            </div>
          ) : (
            <div className="w-48 h-48 rounded-xl bg-[--surface-3] border border-[--border] flex flex-col items-center justify-center gap-3">
              <QrCode className="w-12 h-12 text-[--text-muted]" />
              <span className="text-xs text-[--text-muted] text-center px-4">
                {t('pairing.tapToStart')}
              </span>
            </div>
          )}
        </div>

        {/* Status text */}
        {state === 'scanning' && (
          <div className="flex items-center gap-2 text-sm text-[--text-muted]">
            <span className="w-2 h-2 rounded-full bg-mint-500 animate-pulse" />
            {t('pairing.waitingQR')}
          </div>
        )}
        {state === 'success' && (
          <p className="text-sm text-mint-400 font-medium">{statusMsg}</p>
        )}
        {state === 'failed' && (
          <p className="text-sm text-red-400">{statusMsg}</p>
        )}

        {/* CTA */}
        {(state === 'idle' || state === 'failed') && (
          <button
            onClick={initiatePairing}
            className="w-full py-2.5 bg-mint-600 hover:bg-mint-500 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-mint-500/20"
          >
            {state === 'failed' ? t('pairing.retryBtn') : t('pairing.startBtn')}
          </button>
        )}
        {state === 'success' && (
          <button
            onClick={initiatePairing}
            className="w-full py-2.5 bg-[--surface-3] hover:bg-[--surface-1] border border-[--border] text-[--text-secondary] text-sm font-medium rounded-xl transition-all"
          >
            {t('pairing.repairBtn')}
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[--text-muted] mb-3">{t('pairing.howToTitle')}</p>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[--text-secondary]">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[--surface-3] border border-[--border] text-[10px] font-bold text-[--text-muted] flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
