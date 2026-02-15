'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WidgetPage() {
  const router = useRouter();
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
      .catch(() => { setError('Gagal memuat data'); setLoading(false); });
  }, [router]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  function handleAddDomain() {
    const d = newDomain.trim();
    if (!d) return;
    const pattern = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*(:\d+)?$/;
    if (!pattern.test(d)) {
      setError('Format domain tidak valid. Gunakan format: https://example.com');
      return;
    }
    if (domains.includes(d)) {
      setError('Domain sudah ada dalam daftar');
      return;
    }
    if (domains.length >= 20) {
      setError('Maksimal 20 domain diperbolehkan');
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
        setSuccess('Pengaturan widget berhasil disimpan!');
      } else {
        setError(data.error || 'Gagal menyimpan');
      }
    } catch {
      setError('Gagal menghubungi server');
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
      setError('Gagal menyalin kode');
    }
  }

  if (loading) return <div className="text-gray-400">Loading...</div>;

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
      <div className="glass-dark rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat Widget
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-200 text-sm font-medium">Aktifkan Widget Chat</p>
            <p className="text-gray-500 text-xs mt-0.5">Izinkan embed widget chat di website eksternal</p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-brand-600' : 'bg-gray-700'}`}
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
      <div className="glass-dark rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Domain yang Diizinkan
        </h3>
        <p className="text-gray-500 text-xs mb-4">Widget hanya akan muncul di domain-domain ini</p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors text-sm"
            placeholder="https://example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDomain(); } }}
          />
          <button
            type="button"
            onClick={handleAddDomain}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            Tambah
          </button>
        </div>

        {domains.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Belum ada domain yang ditambahkan</p>
        ) : (
          <ul className="space-y-2">
            {domains.map((d) => (
              <li key={d} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700">
                <span className="text-gray-200 text-sm font-mono">{d}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDomain(d)}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-3"
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
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Kode Embed
          </h3>
          <p className="text-gray-500 text-xs mb-4">Tempel kode ini di website eksternal Anda sebelum tag &lt;/body&gt;</p>

          <div className="relative">
            <pre className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {embedCode}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tersalin!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Salin
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
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
    </div>
  );
}
