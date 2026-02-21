'use client';

import { useEffect, useState } from 'react';

interface StepConfig {
  id: number;
  step_key: string;
  step_title: string;
  step_description: string;
  step_placeholder: string;
  step_order: number;
}

const STEP_KEY_LABELS: Record<string, string> = {
  store_name: 'Nama Toko',
  store_type: 'Jenis Toko',
  store_tagline: 'Tagline',
  store_feature: 'Produk / Fitur',
  store_knowledge_base: 'Knowledge Base',
  store_images: 'Upload Foto',
  store_address: 'Alamat',
  store_fulfillment: 'Fulfillment',
};

export default function OnboardingConfigPage() {
  const [steps, setSteps] = useState<StepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StepConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin191/onboarding-config')
      .then((r) => r.json())
      .then((data) => { setSteps(data.steps || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openEdit = (step: StepConfig) => {
    setEditing({ ...step });
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin191/onboarding-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_key: editing.step_key,
          step_title: editing.step_title,
          step_description: editing.step_description,
          step_placeholder: editing.step_placeholder,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSteps((prev) => prev.map((s) => s.step_key === editing.step_key ? { ...s, ...editing } : s));
        setSaved(true);
        setTimeout(() => { setEditing(null); setSaved(false); }, 1000);
      } else {
        setError(data.error || 'Gagal menyimpan');
      }
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-mint-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[--text-primary]">Onboarding Steps</h1>
        <p className="text-sm text-[--text-muted] mt-1">
          Kustomisasi judul dan penjelasan setiap langkah onboarding yang dilihat pelanggan baru.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.step_key}
            className="bg-[--surface-2] border border-[--border] rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-mint-500/15 text-mint-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-mint-400/70 font-mono">
                      {STEP_KEY_LABELS[step.step_key] || step.step_key}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[--text-primary] mt-1 truncate">{step.step_title}</p>
                  {step.step_description && (
                    <p className="text-xs text-[--text-muted] mt-1 line-clamp-2">{step.step_description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => openEdit(step)}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[--surface-3] hover:bg-[--border] text-[--text-secondary] transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-[--surface-1] border border-[--border] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-mint-400/70 font-mono">
                  {STEP_KEY_LABELS[editing.step_key] || editing.step_key}
                </p>
                <h2 className="text-base font-semibold text-[--text-primary] mt-0.5">Edit Langkah Onboarding</h2>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 rounded-lg text-[--text-muted] hover:bg-[--surface-3] hover:text-[--text-secondary] transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  Judul Langkah
                </label>
                <input
                  value={editing.step_title}
                  onChange={(e) => setEditing({ ...editing, step_title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
                  placeholder="Judul pertanyaan..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                  Penjelasan / Deskripsi
                  <span className="text-[--text-muted] font-normal ml-1">(ditampilkan di bawah judul)</span>
                </label>
                <textarea
                  value={editing.step_description}
                  onChange={(e) => setEditing({ ...editing, step_description: e.target.value })}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all resize-none"
                  placeholder="Penjelasan untuk pelanggan..."
                />
              </div>

              {editing.step_key !== 'store_type' && editing.step_key !== 'store_images' && editing.step_key !== 'store_fulfillment' && (
                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">
                    Placeholder Input
                  </label>
                  <input
                    value={editing.step_placeholder}
                    onChange={(e) => setEditing({ ...editing, step_placeholder: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
                    placeholder="Contoh teks di dalam input..."
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              {saved && (
                <p className="text-xs text-mint-400 bg-mint-500/10 border border-mint-500/20 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tersimpan!
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[--text-secondary] hover:bg-[--surface-3] border border-[--border] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-mint-600 hover:bg-mint-500 text-white transition-colors disabled:opacity-50 shadow-lg shadow-mint-500/20"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
