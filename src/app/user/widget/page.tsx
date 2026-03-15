'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UpgradeGate from '@/components/user/UpgradeGate';
import { useLanguage } from '@/lib/LanguageContext';

export default function WidgetPage() {
  return <UpgradeGate><WidgetContent /></UpgradeGate>;
}

function WidgetContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [subdomain, setSubdomain] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/user/widget')
      .then((r) => {
        if (r.status === 401) { router.push('/user'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        setEnabled(data.enabled ?? false);
        setDomains(data.domains ?? []);
        setSubdomain(data.subdomain ?? '');
        setLoading(false);
      })
      .catch(() => { setError(t('widget.errorLoad')); setLoading(false); });
  }, [router, t]);

  useEffect(() => {
    if (success) { const timer = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(timer); }
  }, [success]);

  function handleAddDomain() {
    const d = newDomain.trim();
    if (!d) return;
    const pattern = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*(:\d+)?$/;
    if (!pattern.test(d)) {
      setError(t('widget.invalidDomain'));
      return;
    }
    if (domains.includes(d)) {
      setError(t('widget.duplicateDomain'));
      return;
    }
    if (domains.length >= 20) {
      setError(t('widget.maxDomains'));
      return;
    }
    setDomains([...domains, d]);
    setNewDomain('');
    setError('');
  }

  function handleRemoveDomain(d: string) {
    setDomains(domains.filter((x) => x !== d));
  }

  async function handleSave() {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/user/widget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, domains }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('widget.success'));
      } else {
        setError(data.error || t('common.errorLoad'));
      }
    } catch {
      setError(t('common.errorServer'));
    }
    setSaving(false);
  }

  async function handleCopy() {
    const code = `<script src="https://aiminassist.com/widget.js" data-store="${subdomain}"></script>`;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('common.errorServer'));
    }
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 h-32" />
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 h-48" />
    </div>
  );

  const embedCode = `<script src="https://aiminassist.com/widget.js" data-store="${subdomain}"></script>`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {success && (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">&times;</button>
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="page-card p-6">
        <p className="section-label mb-5">{t('widget.title')}</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[--text-primary] text-sm font-medium">{t('widget.enableLabel')}</p>
            <p className="text-[--text-muted] text-xs mt-0.5">{t('widget.enableDesc')}</p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-mint-600' : 'bg-[--surface-3]'}`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Allowed Domains */}
      <div className="page-card p-6">
        <p className="section-label mb-0.5">{t('widget.domainsTitle')}</p>
        <p className="text-xs text-[--text-muted] mb-4 mt-1">{t('widget.domainsHint')}</p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="form-input flex-1"
            placeholder={t('widget.domainPlaceholder')}
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain(); } }}
          />
          <button
            type="button"
            onClick={handleAddDomain}
            className="px-4 py-2.5 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            {t('widget.addBtn')}
          </button>
        </div>

        {domains.length === 0 ? (
          <p className="text-[--text-muted] text-sm text-center py-4">{t('widget.noDomains')}</p>
        ) : (
          <ul className="space-y-2">
            {domains.map((d) => (
              <li key={d} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border]">
                <span className="text-[--text-primary] text-sm font-mono">{d}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(d)}
                  className="text-[--text-muted] hover:text-red-400 transition-colors ml-3"
                  aria-label="Remove domain"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Embed Code */}
      {subdomain && (
        <div className="page-card p-6">
          <p className="section-label mb-0.5">{t('widget.embedTitle')}</p>
          <p className="text-xs text-[--text-muted] mb-4 mt-1">{t('widget.embedHint')}</p>

          <div className="relative">
            <pre className="px-4 py-3 rounded-xl bg-[--surface-1] border border-[--border] text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {embedCode}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-[--surface-3] hover:bg-gray-600 text-[--text-secondary] text-xs transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('common.copied')}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t('common.copy')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm !py-2.5 !px-6"
        >
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
