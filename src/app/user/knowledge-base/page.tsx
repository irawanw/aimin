'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Upload, Trash2, RefreshCw, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [storeType, setStoreType] = useState('store');
  const [planMaxKb, setPlanMaxKb] = useState(500);
  const [kbText, setKbText] = useState('');
  const [productCount, setProductCount] = useState<number | null>(null);

  // File upload state
  const [kbUploading, setKbUploading] = useState(false);
  const [kbMsg, setKbMsg] = useState('');
  const [kbErr, setKbErr] = useState('');
  const [kbProgress, setKbProgress] = useState(0);
  const [kbStep, setKbStep] = useState('');
  const kbFileInputRef = useRef<HTMLInputElement>(null);

  // Product sync state
  const [syncing, setSyncing] = useState(false);
  const [syncPct, setSyncPct] = useState(0);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncResult, setSyncResult] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    fetch('/api/user/store')
      .then((r) => {
        if (r.status === 401) { router.push('/user'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        setStoreType(data.store_type || 'store');
        setPlanMaxKb(data.plan_max_kb ?? 500);
        setKbText(data.store_knowledge_base || '');
        try {
          const prods = data.store_products ? JSON.parse(data.store_products) : [];
          setProductCount(prods.filter((p: any) => p.source === 'kb').length);
        } catch { setProductCount(0); }
        setLoading(false);
      })
      .catch(() => { setError(t('common.errorLoad')); setLoading(false); });
  }, [router, t]);

  useEffect(() => {
    if (success) { const timer = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(timer); }
  }, [success]);

  // ── Save KB text then trigger product sync ──────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setSyncResult(null);

    try {
      const res = await fetch('/api/user/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_knowledge_base: kbText }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || t('common.errorLoad')); setSaving(false); return; }
      setSuccess(t('kb.saveBtn'));
      setSaving(false);

      // Trigger background product sync with SSE progress
      if (kbText.trim()) {
        setSyncing(true);
        setSyncPct(0);
        setSyncMsg(t('kb.syncProgress'));

        const syncRes = await fetch('/api/user/store/sync-products', { method: 'POST' });
        if (!syncRes.body) { setSyncing(false); return; }

        const reader = syncRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            if (!part.trim() || part.startsWith(':')) continue;
            const lines = part.trim().split('\n');
            let event = 'message', payload = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) event = line.slice(7).trim();
              if (line.startsWith('data: ')) payload = line.slice(6);
            }
            if (!payload) continue;
            const parsed = JSON.parse(payload);
            if (event === 'progress') {
              setSyncPct(parsed.pct || 0);
              setSyncMsg(parsed.message || '');
            } else if (event === 'done') {
              setSyncPct(100);
              setSyncResult({ count: parsed.count, total: parsed.total });
              setProductCount(parsed.count);
              setSyncing(false);
            } else if (event === 'error') {
              setSyncMsg('');
              setSyncing(false);
            }
          }
        }
        setSyncing(false);
      }
    } catch (e: any) {
      setError(e.message || t('common.errorLoad'));
      setSaving(false);
      setSyncing(false);
    }
  }

  // ── KB file upload (PDF / DOCX) ─────────────────────────────────────────────
  const handleKbFileUpload = useCallback(async (file: File) => {
    setKbUploading(true);
    setKbErr('');
    setKbMsg('');
    setKbProgress(0);
    setKbStep('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/user/knowledge-base', { method: 'POST', body: formData });
      if (!res.body) { setKbErr(t('common.errorLoad')); setKbUploading(false); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.trim() || part.startsWith(':')) continue;
          const lines = part.trim().split('\n');
          let event = 'message', payload = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            if (line.startsWith('data: ')) payload = line.slice(6);
          }
          if (!payload) continue;
          const parsed = JSON.parse(payload);
          if (event === 'progress') { setKbProgress(parsed.pct || 0); setKbStep(parsed.message || ''); }
          else if (event === 'done') {
            setKbProgress(100);
            setKbText(parsed.text || '');
            const suffix = parsed.used_llm_formatter ? t('kb.aiFormatted') : '';
            setKbMsg(t('kb.successMsg', { chars: (parsed.characters || 0).toLocaleString(), suffix }));
            setKbUploading(false);
          } else if (event === 'error') {
            setKbErr(parsed.message || t('common.errorServer'));
            setKbUploading(false);
          }
        }
      }
    } catch (e: any) { setKbErr(e.message || t('common.errorServer')); setKbUploading(false); }
    finally { if (kbFileInputRef.current) kbFileInputRef.current.value = ''; }
  }, [t]);

  const handleKbClear = async () => {
    if (!confirm(t('kb.deleteConfirm'))) return;
    setKbUploading(true);
    setKbErr('');
    setKbMsg('');
    try {
      const res = await fetch('/api/user/knowledge-base', { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setKbErr(d.error || t('common.errorLoad')); return; }
      setKbText('');
      setKbMsg(t('kb.deleted'));
    } catch (e: any) { setKbErr(e.message); }
    finally { setKbUploading(false); }
  };

  const isServiceStore = ['services', 'others', 'Jasa', 'Layanan', 'Service'].includes(storeType);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-5 h-5 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[--accent-dim] flex items-center justify-center">
          <BookOpen className="w-4.5 h-4.5 text-mint-400" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[--text-primary]">{t('kb.title')}</h1>
          <p className="text-xs text-[--text-muted]">{t('kb.description')}</p>
        </div>
        {productCount !== null && productCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-mint-500/10 border border-mint-500/20 rounded-lg px-2.5 py-1">
            <Package className="w-3.5 h-3.5 text-mint-400" />
            <span className="text-xs font-medium text-mint-400">{productCount} produk</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* File upload section — shown for service stores */}
        {isServiceStore && (
          <div className="page-card p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[--text-primary]">{t('kb.uploadDoc')}</p>
              <p className="text-xs text-[--text-muted] mt-0.5">{t('kb.uploadHint')}</p>
            </div>

            {/* Upload progress */}
            {kbUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[--text-muted] truncate pr-2">{kbStep || t('kb.processing')}</span>
                  <span className="text-xs font-mono text-[--text-muted] flex-shrink-0">{kbProgress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[--surface-3] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${kbProgress}%`, background: 'linear-gradient(90deg, var(--mint-500, #10b981), var(--mint-400, #34d399))' }}
                  />
                </div>
              </div>
            )}

            {kbMsg && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">{kbMsg}</span>
                <button type="button" onClick={() => setKbMsg('')} className="text-green-500/50 hover:text-green-400">&times;</button>
              </div>
            )}
            {kbErr && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">{kbErr}</span>
                <button type="button" onClick={() => setKbErr('')} className="text-red-500/50 hover:text-red-400">&times;</button>
              </div>
            )}

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-[--border] rounded-xl p-6 text-center cursor-pointer hover:border-mint-500/40 hover:bg-mint-500/5 transition-all"
              onClick={() => !kbUploading && kbFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f && !kbUploading) handleKbFileUpload(f);
              }}
            >
              <input
                ref={kbFileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleKbFileUpload(f); }}
              />
              <Upload className="w-6 h-6 text-[--text-muted] mx-auto mb-2" />
              <p className="text-sm text-[--text-secondary]">{kbUploading ? t('kb.processing') : 'Drag & drop atau klik untuk pilih file'}</p>
              <p className="text-xs text-[--text-muted] mt-1">PDF, DOCX — maks 10MB</p>
            </div>
          </div>
        )}

        {/* KB textarea */}
        <div className="page-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[--text-primary]">{t('kb.fieldLabel')}</p>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${kbText.length > planMaxKb ? 'text-red-400' : 'text-[--text-muted]'}`}>
                {kbText.length.toLocaleString()}/{planMaxKb.toLocaleString()}
              </span>
              {kbText.length > 0 && !kbUploading && (
                <button
                  type="button"
                  onClick={handleKbClear}
                  className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>
          <textarea
            rows={12}
            className="form-textarea text-xs font-mono"
            placeholder={t('kb.fieldPlaceholder')}
            value={kbText}
            onChange={(e) => { if (e.target.value.length <= planMaxKb) setKbText(e.target.value); }}
          />
          <p className="text-xs text-[--text-muted]">{t('kb.fieldHint')}</p>
        </div>

        {/* Product sync progress */}
        {syncing && (
          <div className="page-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-mint-400 animate-spin" />
                <span className="text-xs font-medium text-[--text-secondary]">{t('kb.syncProgress')}</span>
              </div>
              <span className="text-xs font-mono text-[--text-muted]">{syncPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[--surface-3] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${syncPct}%`,
                  background: 'linear-gradient(90deg, var(--mint-500, #10b981), var(--mint-400, #34d399))',
                }}
              />
            </div>
            <p className="text-xs text-[--text-muted]">{syncMsg}</p>
          </div>
        )}

        {/* Sync result */}
        {syncResult && !syncing && (
          <div className="flex items-center gap-2.5 text-sm bg-mint-500/10 border border-mint-500/20 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-mint-400 flex-shrink-0" />
            <span className="text-[--text-secondary]">{t('kb.syncResult', { count: syncResult.count })}</span>
          </div>
        )}

        {/* Messages */}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || kbUploading || syncing}
            className="btn-primary text-sm !py-2.5 !px-6 disabled:opacity-60"
          >
            {saving ? t('common.saving') : t('kb.saveBtn')}
          </button>
          <Link href="/user/edit" className="btn-ghost">{t('common.cancel')}</Link>
        </div>
      </form>
    </div>
  );
}
