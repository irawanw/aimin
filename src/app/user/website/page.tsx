'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DESIGN_TYPES = [
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'elegant', label: 'Elegant' },
  { value: 'bold', label: 'Bold' },
  { value: 'compact', label: 'Compact' },
  { value: 'image-heavy', label: 'Image Heavy' },
];

interface SearchImage {
  id: string;
  url: string;
  thumb: string;
  alt: string;
}

function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ColorPicker({ label, value, onChange, presets }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl bg-[--surface-3] border border-[--border] p-3 space-y-2.5">
      <span className="text-xs text-[--text-muted]">{label}</span>
      {/* Swatch + hex input row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-10 h-10 rounded-lg border-2 border-white/10 shadow-lg flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: value }}
          title="Klik untuk pilih warna"
        />
        <input ref={inputRef} type="color" className="sr-only" value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="flex-1 min-w-0 flex rounded-lg overflow-hidden border border-gray-600">
          <span className="px-2 py-2 bg-[--surface-3] text-[--text-muted] text-xs select-none">#</span>
          <input
            type="text"
            maxLength={7}
            className="flex-1 min-w-0 px-2 py-2 bg-[--surface-1] text-[--text-primary] font-mono text-sm outline-none"
            value={value.replace('#', '')}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9a-fA-F]/g, '');
              if (v.length <= 6) onChange('#' + v);
            }}
            onBlur={(e) => {
              const v = e.target.value.replace(/[^0-9a-fA-F]/g, '');
              if (v.length === 3 || v.length === 6) onChange('#' + v);
            }}
          />
        </div>
      </div>
      {/* Preview bar */}
      <div className="h-6 rounded-lg w-full border border-white/5" style={{ backgroundColor: value }} />
      {/* Preset swatches */}
      <div className="flex gap-1.5 flex-wrap">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${value.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

export default function WebsitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSmart, setIsSmart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [videoDeleting, setVideoDeleting] = useState(false);

  const [form, setForm] = useState({
    store_subdomain: '',
    store_design_type: 'modern',
    store_site_type: '',
    store_theme_primary: '#6366f1',
    store_theme_background: '#0f172a',
    store_hero_title: '',
    store_hero_subtitle: '',
    store_about_us: '',
  });

  // Hero image state
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null); // existing from DB
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null); // local file preview (base64)
  const [heroSelectedUrl, setHeroSelectedUrl] = useState<string | null>(null); // URL from search
  const [removeHeroImage, setRemoveHeroImage] = useState(false);

  // Hero image search state
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [heroSearchResults, setHeroSearchResults] = useState<SearchImage[]>([]);
  const [heroSearching, setHeroSearching] = useState(false);

  useEffect(() => {
    fetch('/api/user/store')
      .then((r) => {
        if (r.status === 401) { router.push('/user'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        setIsSmart((data.plan_max_images ?? 5) >= 20);
        setForm({
          store_subdomain: data.store_subdomain || '',
          store_design_type: data.store_design_type || 'modern',
          store_site_type: data.store_site_type || '',
          store_theme_primary: data.store_theme_primary || '#6366f1',
          store_theme_background: data.store_theme_background || '#0f172a',
          store_hero_title: data.store_hero_title || '',
          store_hero_subtitle: data.store_hero_subtitle || '',
          store_about_us: data.store_about_us || '',
        });
        setHeroImageUrl(data.store_hero_image || null);
        try {
          const others = JSON.parse(data.store_website_others || '{}');
          setVideoUrl(others.hero_video_url || null);
        } catch {}
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data'); setLoading(false); });
  }, [router]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  async function handleHeroSearch() {
    if (!heroSearchQuery.trim()) return;
    setHeroSearching(true);
    try {
      const res = await fetch(`/api/user/image-search?q=${encodeURIComponent(heroSearchQuery.trim())}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setHeroSearchResults(data);
      } else {
        setError('Gagal mencari gambar');
      }
    } catch {
      setError('Gagal mencari gambar');
    }
    setHeroSearching(false);
  }

  function handleSelectHeroSearchImage(img: SearchImage) {
    setHeroSelectedUrl(img.url);
    setHeroImagePreview(null);
    setRemoveHeroImage(false);
    setHeroSearchResults([]);
    if (heroFileInputRef.current) heroFileInputRef.current.value = '';
  }

  async function handleHeroFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return;
    setRemoveHeroImage(false);
    setHeroSelectedUrl(null);
    try {
      const compressed = await compressImage(file);
      setHeroImagePreview(compressed);
    } catch {
      setError('Gagal memproses gambar');
    }
  }

  function handleRemoveHeroImage() {
    setHeroImagePreview(null);
    setHeroSelectedUrl(null);
    setHeroImageUrl(null);
    setRemoveHeroImage(true);
    if (heroFileInputRef.current) heroFileInputRef.current.value = '';
  }

  // Determine hero preview
  const heroCurrentSrc = heroImagePreview
    ? heroImagePreview
    : heroSelectedUrl
      ? heroSelectedUrl
      : heroImageUrl && !removeHeroImage
        ? heroImageUrl
        : null;
  const hasHeroImage = !!heroCurrentSrc;
  const isHeroUpload = !!heroImagePreview;
  const isHeroSearch = !!heroSelectedUrl;

  async function handleVideoUpload(file: File) {
    if (!file.type.includes('mp4') && file.type !== 'video/mp4') {
      setVideoError('Hanya file MP4 yang didukung');
      return;
    }
    setVideoUploading(true);
    setVideoUploadProgress(0);
    setVideoError('');

    return new Promise<void>((resolve) => {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setVideoUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      xhr.addEventListener('load', () => {
        setVideoUploading(false);
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              setVideoUrl(data.url);
              setVideoUploadProgress(100);
            } else {
              setVideoError(data.error || 'Upload gagal');
            }
          } catch {
            setVideoError('Upload gagal');
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            setVideoError(data.error || `Upload gagal (${xhr.status})`);
          } catch {
            setVideoError(`Upload gagal (${xhr.status})`);
          }
        }
        resolve();
      });
      xhr.addEventListener('error', () => {
        setVideoUploading(false);
        setVideoError('Upload gagal, periksa koneksi Anda');
        resolve();
      });
      xhr.open('POST', '/api/user/video');
      xhr.send(formData);
    });
  }

  async function handleVideoDelete() {
    if (!confirm('Hapus video hero?')) return;
    setVideoDeleting(true);
    setVideoError('');
    try {
      const res = await fetch('/api/user/video', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVideoUrl(null);
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      } else {
        setVideoError(data.error || 'Gagal menghapus video');
      }
    } catch {
      setVideoError('Gagal menghubungi server');
    }
    setVideoDeleting(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const payload: any = { ...form };
      if (heroImagePreview) {
        payload.hero_image_base64 = heroImagePreview;
      } else if (heroSelectedUrl) {
        payload.store_hero_image = heroSelectedUrl;
      } else if (removeHeroImage) {
        payload.remove_hero_image = true;
      }

      const res = await fetch('/api/user/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Pengaturan website berhasil disimpan!');
        // Re-fetch to get updated hero image URL
        const refetch = await fetch('/api/user/store');
        const refetchData = await refetch.json();
        if (refetchData && !refetchData.error) {
          setHeroImageUrl(refetchData.store_hero_image || null);
        }
        setHeroImagePreview(null);
        setHeroSelectedUrl(null);
        setRemoveHeroImage(false);
      } else {
        setError(data.error || 'Gagal menyimpan');
      }
    } catch {
      setError('Gagal menghubungi server');
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 h-[600px]" />
    </div>
  );

  if (!isSmart) return (
    <div className="max-w-lg mx-auto mt-16 text-center px-4">
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-mint-500/20 border border-violet-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Fitur Terkunci</h3>
      <p className="text-[--text-muted] text-sm leading-relaxed">
        Layanan ini bisa didapatkan dengan berlangganan paket <span className="text-violet-300 font-semibold">SMART</span>
      </p>
      <p className="text-[--text-muted] text-xs mt-2">Hubungi admin untuk upgrade paket Anda.</p>
    </div>
  );

  const previewUrl = form.store_subdomain ? `${form.store_subdomain}.aiminassist.com` : null;

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

      {/* Website Settings Form */}
      <div className="page-card p-6">
        <p className="section-label mb-5">Pengaturan Website</p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Subdomain */}
          <div>
            <label className="form-label">Subdomain</label>
            <div className="flex rounded-xl overflow-hidden border border-[--border] focus-within:border-mint-500/60 focus-within:ring-1 focus-within:ring-mint-500/20 transition-all">
              <input
                type="text"
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-[--surface-3] text-sm text-[--text-primary] placeholder:text-[--text-muted] outline-none"
                value={form.store_subdomain}
                onChange={(e) => setForm({ ...form, store_subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="nama-toko"
              />
              <span className="px-3 py-2.5 bg-[--surface-3]/80 text-[--text-muted] text-xs whitespace-nowrap flex items-center border-l border-[--border] select-none">.aiminassist.com</span>
            </div>
            <p className="form-hint">Hanya huruf kecil, angka, dan strip (-)</p>
          </div>

          {/* Design Template */}
          <div>
            <label className="form-label">Template Desain</label>
            <select
              className="form-select"
              value={form.store_design_type}
              onChange={(e) => setForm({ ...form, store_design_type: e.target.value })}
            >
              {DESIGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="form-hint">Pilih template tampilan website Anda</p>
          </div>

          {/* Theme Colors */}
          <div>
            <label className="form-label mb-3">Warna Tema</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ColorPicker
                label="Warna Utama"
                value={form.store_theme_primary}
                onChange={(v) => setForm({ ...form, store_theme_primary: v })}
                presets={['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#0ea5e9','#3b82f6']}
              />
              <ColorPicker
                label="Warna Background"
                value={form.store_theme_background}
                onChange={(v) => setForm({ ...form, store_theme_background: v })}
                presets={['#0f172a','#1e1b4b','#0c0a09','#111827','#1a1a2e','#0d1117','#ffffff','#f8fafc','#f1f5f9','#e2e8f0']}
              />
            </div>
          </div>

          {/* Hero Section */}
          <div>
            <label className="form-label">Judul Hero</label>
            <input
              type="text"
              className="form-input"
              value={form.store_hero_title}
              onChange={(e) => setForm({ ...form, store_hero_title: e.target.value })}
              placeholder="Selamat datang di toko kami"
            />
            <p className="form-hint">Judul utama yang tampil di bagian atas website</p>
          </div>

          <div>
            <label className="form-label">Subtitle Hero</label>
            <input
              type="text"
              className="form-input"
              value={form.store_hero_subtitle}
              onChange={(e) => setForm({ ...form, store_hero_subtitle: e.target.value })}
              placeholder="Deskripsi singkat tentang toko Anda"
            />
            <p className="form-hint">Teks pendukung di bawah judul hero</p>
          </div>

          {/* About Us */}
          <div>
            <label className="form-label">Tentang Kami</label>
            <textarea
              rows={5}
              className="form-textarea"
              value={form.store_about_us}
              onChange={(e) => setForm({ ...form, store_about_us: e.target.value })}
              placeholder="Ceritakan sejarah, visi, dan nilai-nilai toko Anda..."
            />
            <p className="form-hint">Ditampilkan di halaman About pada website Anda</p>
          </div>

          {/* Hero Image */}
          <div>
            <label className="form-label">Gambar Hero</label>

            {hasHeroImage ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-[--surface-3] border border-[--border]">
                  <img src={heroCurrentSrc!} alt="Hero preview" className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs ${isHeroUpload ? 'bg-green-500/80' : isHeroSearch ? 'bg-blue-500/80' : 'bg-green-500/80'} text-white px-2 py-0.5 rounded-full`}>
                      {isHeroUpload ? 'Upload' : isHeroSearch ? 'Unsplash' : 'Gambar'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveHeroImage}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus gambar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Image search */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input flex-1"
                    placeholder="Cari gambar hero... (contoh: salon, office)"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleHeroSearch(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleHeroSearch}
                    disabled={heroSearching || !heroSearchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {heroSearching ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                    Cari
                  </button>
                </div>

                {/* Search results grid */}
                {heroSearchResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto rounded-xl border border-[--border] p-2 bg-[--surface-3]/50">
                    {heroSearchResults.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => handleSelectHeroSearchImage(img)}
                        className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-mint-500 transition-colors aspect-[4/3] group"
                      >
                        <img src={img.thumb} alt={img.alt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <div>
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleHeroFileSelect(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => heroFileInputRef.current?.click()}
                    className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mint-500/10 hover:bg-mint-500/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload gambar sendiri
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-[--text-muted] mt-1">Gambar latar belakang di bagian hero website</p>
          </div>

          {/* Hero Video (Elegant template) */}
          <div>
            <label className="form-label">
              Video Hero
              <span className="ml-2 font-normal text-[10px] bg-[--surface-3] border border-[--border] text-[--text-muted] px-1.5 py-0.5 rounded-md">Elegant</span>
            </label>

            {videoError && (
              <div className="mb-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 text-xs flex items-center justify-between">
                <span>{videoError}</span>
                <button onClick={() => setVideoError('')} className="ml-2 text-red-400 hover:text-red-300">&times;</button>
              </div>
            )}

            {videoUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-[--surface-3] border border-[--border]">
                  <video
                    src={videoUrl}
                    className="w-full h-40 object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="text-xs bg-blue-500/80 text-white px-2 py-0.5 rounded-full">Video MP4</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mint-500/10 hover:bg-mint-500/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Ganti video
                  </button>
                  <button
                    type="button"
                    onClick={handleVideoDelete}
                    disabled={videoDeleting}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {videoDeleting ? 'Menghapus...' : 'Hapus video'}
                  </button>
                </div>
              </div>
            ) : videoUploading ? (
              <div className="rounded-xl bg-[--surface-3] border border-[--border] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[--text-muted]">
                  <span>Mengupload video...</span>
                  <span>{videoUploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-[--surface-1] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mint-500 rounded-full transition-all duration-200"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => videoFileInputRef.current?.click()}
                  className="text-xs text-mint-400 hover:text-mint-300 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mint-500/10 hover:bg-mint-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                  Upload video MP4
                </button>
              </div>
            )}

            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleVideoUpload(f);
              }}
            />
            <p className="form-hint">Video sinematik untuk latar belakang hero pada template Elegant. Maks 500 MB.</p>
          </div>

          {/* Preview Link */}
          {previewUrl && (
            <div className="bg-[--surface-3]/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-[--text-muted] block">Preview URL</span>
                <a
                  href={`https://${previewUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mint-400 hover:text-mint-300 text-sm font-medium transition-colors"
                >
                  {previewUrl}
                  <svg className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm !py-2.5 !px-6">
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>

      {/* Link to Services page */}
      <div className="page-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-[--text-muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <div>
            <span className="text-[--text-primary] text-sm font-medium">Layanan</span>
            <p className="text-[--text-muted] text-xs">Kelola layanan yang ditampilkan di website Anda</p>
          </div>
        </div>
        <a href="/user/services" className="text-mint-400 hover:text-mint-300 text-sm font-medium transition-colors flex items-center gap-1">
          Kelola
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}
