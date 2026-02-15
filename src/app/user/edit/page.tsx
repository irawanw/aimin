'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STORE_TYPES = [
  { label: 'toko', value: 'store' },
  { label: 'jasa', value: 'services' },
  { label: 'lainnya', value: 'others' },
];

const FULFILLMENT_OPTIONS = {
  store: [
    { label: 'Barang dikirim', value: 'pickup' },
    { label: 'Barang diambil', value: 'delivery' },
  ],
  services: [
    { label: 'konsultasi awal', value: 'meeting_schedule' },
    { label: 'reservasi tanggal tertentu', value: 'book_date' },
    { label: 'reservasi rentang tanggal', value: 'book_date_range' },
    { label: 'kunjungan ke lokasi customer', value: 'visit_location' },
    { label: 'customer datang ke lokasi usaha', value: 'customer_visit' },
  ],
  others: [],
};

interface ImageInfo {
  filename: string;
  product: string | null;
  url: string;
}

interface ProductSummary {
  folder: string;
  name: string;
  image_count: number;
}

interface ImageData {
  folder: string;
  total_images: number;
  max_images: number;
  images: ImageInfo[];
  products: ProductSummary[];
}

export default function UserEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [form, setForm] = useState({
    store_name: '',
    store_type: 'store',
    store_fulfillment: [] as string[],
    store_admin: '',
    store_admin_number: '',
    store_email: '',
    store_bot_always_on: 0,
    store_whatsapp_bot: 1,
    store_tagline: '',
    store_address: '',
    store_feature: '',
    store_knowledge_base: '',
  });

  // Image management state
  const [imageData, setImageData] = useState<ImageData>({ folder: '', total_images: 0, max_images: 20, images: [], products: [] });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imgMsg, setImgMsg] = useState('');
  const [imgErr, setImgErr] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [taggingFile, setTaggingFile] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/user/images');
      const data = await res.json();
      if (res.ok && !data.error) {
        setImageData(data);
      }
    } catch {}
    setImageLoaded(true);
  }, []);

  useEffect(() => {
    fetch('/api/user/store')
      .then((r) => {
        if (r.status === 401) { router.push('/user'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        setWhatsappNumber(data.store_whatsapp_jid?.replace('@s.whatsapp.net', '') || '');
        setForm({
          store_name: data.store_name || '',
          store_type: data.store_type || 'store',
          store_fulfillment: parseFulfillment(data.store_fulfillment),
          store_admin: data.store_admin || '',
          store_admin_number: data.store_admin_number || '',
          store_email: data.store_email || '',
          store_bot_always_on: data.store_bot_always_on ? 1 : 0,
          store_whatsapp_bot: data.store_whatsapp_bot !== undefined ? (data.store_whatsapp_bot ? 1 : 0) : 1,
          store_tagline: data.store_tagline || '',
          store_address: data.store_address || '',
          store_feature: data.store_feature || '',
          store_knowledge_base: data.store_knowledge_base || '',
        });
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data'); setLoading(false); });

    fetchImages();
  }, [router, fetchImages]);

  // Clear messages
  useEffect(() => {
    if (imgMsg) { const t = setTimeout(() => setImgMsg(''), 4000); return () => clearTimeout(t); }
  }, [imgMsg]);
  useEffect(() => {
    if (imgErr) { const t = setTimeout(() => setImgErr(''), 6000); return () => clearTimeout(t); }
  }, [imgErr]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(t); }
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await fetch('/api/user/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          store_fulfillment: JSON.stringify(form.store_fulfillment),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Data toko berhasil diperbarui!');
      } else {
        setError(data.error || 'Gagal menyimpan');
      }
    } catch {
      setError('Gagal menghubungi server');
    }
    setSaving(false);
  }

  // Image handlers
  const handleFileSelect = (files: File[]) => {
    const remaining = imageData.max_images - imageData.total_images;
    const limited = files.slice(0, remaining);
    setSelectedFiles(limited);

    const newPreviews: string[] = [];
    limited.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        if (newPreviews.length === limited.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    if (limited.length === 0) setPreviews([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(Array.from(e.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) handleFileSelect(files);
  };

  const removePreview = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      newFiles.forEach((f) => dt.items.add(f));
      fileInputRef.current.files = dt.files;
    }
  };

  const compressImage = (file: File, maxSize = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setImgErr('');

    try {
      let uploaded = 0;
      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        try {
          const base64 = await compressImage(selectedFiles[i]);

          const res = await fetch('/api/user/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [base64] }),
          });

          if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
            errors.push(`Gambar ${i + 1}: Server error (${res.status})`);
            continue;
          }

          const result = await res.json();
          if (result.success) {
            uploaded += result.uploaded;
          } else {
            errors.push(`Gambar ${i + 1}: ${result.error || 'Gagal'}`);
          }
        } catch {
          errors.push(`Gambar ${i + 1}: Upload gagal`);
        }
      }

      if (uploaded > 0) {
        setImgMsg(`${uploaded} gambar berhasil diupload`);
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchImages();
      }
      if (errors.length > 0) {
        setImgErr(errors.join(', '));
      }
    } catch (err: any) {
      setImgErr(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus gambar ${filename}?`)) return;
    setDeletingFile(filename);
    setImgErr('');

    try {
      const res = await fetch(
        `/api/user/images?filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      const result = await res.json();
      if (result.success) {
        setImgMsg(`Gambar ${filename} dihapus`);
        await fetchImages();
      } else {
        setImgErr(result.error || 'Gagal menghapus');
      }
    } catch (err: any) {
      setImgErr(err.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleTagChange = async (filename: string, product: string) => {
    setTaggingFile(filename);

    try {
      const res = await fetch(
        `/api/user/images?filename=${encodeURIComponent(filename)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product }),
        }
      );
      const result = await res.json();

      if (result.success) {
        // Update local state
        setImageData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.filename === filename
                ? { ...img, product: product === '' ? null : product }
                : img
            ),
          };
        });
      } else {
        setImgErr(result.error || 'Gagal menyimpan tag');
      }
    } catch (err: any) {
      setImgErr(err.message);
    } finally {
      setTaggingFile(null);
    }
  };

  if (loading) return <div className="text-[--text-muted]">Loading...</div>;

  const canUpload = imageData.total_images < imageData.max_images;
  const remaining = imageData.max_images - imageData.total_images;

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

      {/* Edit Form */}
      <div className="glass-dark rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-5">Edit Informasi Toko</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Nomor WhatsApp</label>
            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-muted] cursor-not-allowed" value={whatsappNumber} disabled />
            <p className="text-xs text-[--text-muted] mt-1">Nomor WhatsApp tidak dapat diubah</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Nama Toko *</label>
            <input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Tipe Toko</label>
            <select className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 outline-none transition-colors" value={form.store_type} onChange={(e) => setForm({ ...form, store_type: e.target.value, store_fulfillment: [] })}>
              {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-xs text-[--text-muted] mt-1">Pilih jenis usaha Anda</p>
          </div>

          {/* Fulfillment Options */}
          {(form.store_type === 'store' || form.store_type === 'services') && (
            <div>
              <label className="block text-sm text-[--text-muted] mb-2">
                {form.store_type === 'store' ? 'Metode Pengiriman' : 'Metode Layanan'}
              </label>
              <div className="space-y-2">
                {FULFILLMENT_OPTIONS[form.store_type as keyof typeof FULFILLMENT_OPTIONS].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-600 bg-[--surface-3] text-mint-500 focus:ring-mint-500/20 focus:ring-2"
                      checked={form.store_fulfillment.includes(opt.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, store_fulfillment: [...form.store_fulfillment, opt.value] });
                        } else {
                          setForm({ ...form, store_fulfillment: form.store_fulfillment.filter(v => v !== opt.value) });
                        }
                      }}
                    />
                    <span className="text-[--text-secondary] text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[--text-muted] mt-2">
                {form.store_type === 'store'
                  ? 'Pilih metode pengiriman yang tersedia di toko Anda'
                  : 'Pilih metode layanan yang tersedia untuk jasa Anda'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Nama Admin AI</label>
            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors" value={form.store_admin} onChange={(e) => setForm({ ...form, store_admin: e.target.value })} />
            <p className="text-xs text-[--text-muted] mt-1">Nama yang akan digunakan AI saat membalas chat</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Nomor Admin</label>
            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors" value={form.store_admin_number} onChange={(e) => setForm({ ...form, store_admin_number: e.target.value })} placeholder="e.g. 628123456789" />
            <p className="text-xs text-[--text-muted] mt-1">Nomor telepon admin untuk notifikasi</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Email</label>
            <input type="email" className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors" value={form.store_email} onChange={(e) => setForm({ ...form, store_email: e.target.value })} placeholder="email@example.com" />
            <p className="text-xs text-[--text-muted] mt-1">Alamat email untuk keperluan bisnis</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Bot Always On</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!form.store_bot_always_on} onChange={(e) => setForm({ ...form, store_bot_always_on: e.target.checked ? 1 : 0 })} />
              <div className="w-11 h-6 bg-[--surface-3] peer-focus:ring-2 peer-focus:ring-mint-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-600"></div>
              <span className="ml-3 text-sm text-[--text-muted]">Aktifkan bot untuk selalu merespon</span>
            </label>
            <p className="text-xs text-[--text-muted] mt-1">Jika diaktifkan, bot akan selalu merespon pesan masuk</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">WhatsApp Bot</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!form.store_whatsapp_bot} onChange={(e) => setForm({ ...form, store_whatsapp_bot: e.target.checked ? 1 : 0 })} />
              <div className="w-11 h-6 bg-[--surface-3] peer-focus:ring-2 peer-focus:ring-mint-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mint-600"></div>
              <span className="ml-3 text-sm text-[--text-muted]">Aktifkan WhatsApp bot</span>
            </label>
            <p className="text-xs text-[--text-muted] mt-1">Jika dinonaktifkan, bot tidak akan memproses pesan WhatsApp</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Tagline</label>
            <input type="text" className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors" value={form.store_tagline} onChange={(e) => setForm({ ...form, store_tagline: e.target.value })} />
            <p className="text-xs text-[--text-muted] mt-1">Slogan atau tagline toko Anda</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Alamat Toko</label>
            <textarea rows={3} className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors resize-y" value={form.store_address} onChange={(e) => setForm({ ...form, store_address: e.target.value })} />
            <p className="text-xs text-[--text-muted] mt-1">Alamat lengkap toko atau lokasi pengiriman Anda</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Fitur Produk</label>
            <textarea rows={4} className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors resize-y" value={form.store_feature} onChange={(e) => setForm({ ...form, store_feature: e.target.value })} />
            <p className="text-xs text-[--text-muted] mt-1">Jelaskan fitur-fitur unggulan produk Anda</p>
          </div>

          <div>
            <label className="block text-sm text-[--text-muted] mb-1">Knowledge Base</label>
            <textarea rows={6} className="w-full px-4 py-2.5 rounded-xl bg-[--surface-3] border border-[--border] text-[--text-primary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none transition-colors resize-y" value={form.store_knowledge_base} onChange={(e) => setForm({ ...form, store_knowledge_base: e.target.value })} />
            <p className="text-xs text-[--text-muted] mt-1">Informasi lengkap tentang produk, harga, cara order, dll yang akan digunakan AI untuk menjawab pertanyaan pelanggan</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm !py-2.5 !px-6">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link href="/user" className="btn-secondary text-sm !py-2.5 !px-6">Batal</Link>
          </div>
        </form>
      </div>

      {/* Images Management */}
      <div className="glass-dark rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-[--text-muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto Produk
          </h3>
          <span className="text-xs font-medium text-[--text-muted] bg-[--surface-3] px-3 py-1 rounded-full">
            {imageData.total_images} / {imageData.max_images}
          </span>
        </div>

        {/* Image Alerts */}
        {imgMsg && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between mb-4">
            {imgMsg}
            <button onClick={() => setImgMsg('')} className="text-green-500/50 hover:text-green-400 ml-2">&times;</button>
          </div>
        )}
        {imgErr && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between mb-4">
            {imgErr}
            <button onClick={() => setImgErr('')} className="text-red-500/50 hover:text-red-400 ml-2">&times;</button>
          </div>
        )}

        {/* Current Images Grid */}
        {imageData.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
            {imageData.images.map((img) => (
              <div key={img.filename} className="group">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    className="w-full h-28 object-cover rounded-xl border border-[--border]"
                    alt={img.filename}
                    loading="lazy"
                  />
                  <button
                    onClick={() => handleDelete(img.filename)}
                    disabled={deletingFile === img.filename}
                    className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Hapus"
                  >
                    {deletingFile === img.filename ? (
                      <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="text-center text-[11px] text-[--text-muted] mt-1 truncate">{img.filename}</div>

                {/* Product Tag Dropdown */}
                {imageData.products.length > 0 && (
                  <select
                    value={img.product || ''}
                    onChange={(e) => handleTagChange(img.filename, e.target.value)}
                    disabled={taggingFile === img.filename}
                    className="mt-1 w-full text-xs px-2 py-1.5 rounded-lg bg-[--surface-3] border border-[--border] text-[--text-secondary] focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 outline-none disabled:opacity-50 transition-colors"
                  >
                    <option value="">-- Pilih Produk --</option>
                    {imageData.products.map((p) => (
                      <option key={p.folder} value={p.folder}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {imageLoaded && imageData.images.length === 0 && (
          <p className="text-[--text-muted] text-sm mb-4">Belum ada foto produk</p>
        )}

        {/* Upload Section */}
        {canUpload ? (
          <div>
            <hr className="border-[--border] mb-4" />
            <h4 className="text-[--text-secondary] text-sm font-medium mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-[--text-muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Foto Baru
            </h4>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-mint-400 bg-mint-500/10'
                  : 'border-[--border] hover:border-gray-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = '';
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
              <svg className="w-10 h-10 mx-auto text-[--text-muted] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-[--text-muted]">Klik atau drag & drop gambar di sini</p>
              <p className="text-xs text-[--text-muted] mt-1">JPG, PNG, GIF, WebP. Maksimal {remaining} foto lagi.</p>
            </div>

            {/* Preview Area */}
            {previews.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-[--border]"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                        className="absolute -top-1.5 -right-1.5 bg-[--surface-3] hover:bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                      Mengupload...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload {selectedFiles.length} Foto
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mt-4">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Batas maksimal {imageData.max_images} foto tercapai. Hapus beberapa foto untuk upload yang baru.
          </div>
        )}
      </div>
    </div>
  );
}

function parseFulfillment(raw: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
