'use client';

import { useEffect, useState, useRef } from 'react';
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

export default function WebsitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const heroFileInputRef = useRef<HTMLInputElement>(null);

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

  if (loading) return <div className="text-gray-400">Loading...</div>;

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
      <div className="glass-dark rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Pengaturan Website
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Subdomain */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Subdomain</label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                className="flex-1 px-4 py-2.5 rounded-l-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors"
                value={form.store_subdomain}
                onChange={(e) => setForm({ ...form, store_subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="nama-toko"
              />
              <span className="px-4 py-2.5 bg-gray-700 border border-l-0 border-gray-700 rounded-r-xl text-gray-400 text-sm whitespace-nowrap">.aiminassist.com</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Hanya huruf kecil, angka, dan strip (-)</p>
          </div>

          {/* Design Template */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Template Desain</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 outline-none transition-colors"
              value={form.store_design_type}
              onChange={(e) => setForm({ ...form, store_design_type: e.target.value })}
            >
              {DESIGN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-xs text-gray-600 mt-1">Pilih template tampilan website Anda</p>
          </div>

          {/* Theme Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Warna Utama</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
                  value={form.store_theme_primary}
                  onChange={(e) => setForm({ ...form, store_theme_primary: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors font-mono text-sm"
                  value={form.store_theme_primary}
                  onChange={(e) => setForm({ ...form, store_theme_primary: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Warna Background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5"
                  value={form.store_theme_background}
                  onChange={(e) => setForm({ ...form, store_theme_background: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors font-mono text-sm"
                  value={form.store_theme_background}
                  onChange={(e) => setForm({ ...form, store_theme_background: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Judul Hero</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors"
              value={form.store_hero_title}
              onChange={(e) => setForm({ ...form, store_hero_title: e.target.value })}
              placeholder="Selamat datang di toko kami"
            />
            <p className="text-xs text-gray-600 mt-1">Judul utama yang tampil di bagian atas website</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Subtitle Hero</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors"
              value={form.store_hero_subtitle}
              onChange={(e) => setForm({ ...form, store_hero_subtitle: e.target.value })}
              placeholder="Deskripsi singkat tentang toko Anda"
            />
            <p className="text-xs text-gray-600 mt-1">Teks pendukung di bawah judul hero</p>
          </div>

          {/* About Us */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tentang Kami</label>
            <textarea
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors resize-y"
              value={form.store_about_us}
              onChange={(e) => setForm({ ...form, store_about_us: e.target.value })}
              placeholder="Ceritakan sejarah, visi, dan nilai-nilai toko Anda..."
            />
            <p className="text-xs text-gray-600 mt-1">Ditampilkan di halaman About pada website Anda</p>
          </div>

          {/* Hero Image */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gambar Hero</label>

            {hasHeroImage ? (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
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
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-colors text-sm"
                    placeholder="Cari gambar hero... (contoh: salon, office)"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleHeroSearch(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleHeroSearch}
                    disabled={heroSearching || !heroSearchQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
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
                  <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto rounded-xl border border-gray-700 p-2 bg-gray-800/50">
                    {heroSearchResults.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => handleSelectHeroSearchImage(img)}
                        className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-500 transition-colors aspect-[4/3] group"
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
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload gambar sendiri
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-1">Gambar latar belakang di bagian hero website</p>
          </div>

          {/* Preview Link */}
          {previewUrl && (
            <div className="bg-gray-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block">Preview URL</span>
                <a
                  href={`https://${previewUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
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
      <div className="glass-dark rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <div>
            <span className="text-gray-200 text-sm font-medium">Layanan</span>
            <p className="text-gray-500 text-xs">Kelola layanan yang ditampilkan di website Anda</p>
          </div>
        </div>
        <a href="/user/services" className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors flex items-center gap-1">
          Kelola
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}
