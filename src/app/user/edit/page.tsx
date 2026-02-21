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

type FileType = 'image' | 'video' | 'document';

interface FileInfo {
  filename: string;
  type: FileType;
  product: string | null;
  url: string;
}

interface ProductSummary {
  folder: string;
  name: string;
}

interface FileData {
  folder: string;
  total_images: number;
  max_images: number;
  files: FileInfo[];
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
    store_language: 'id',
    store_tagline: '',
    store_address: '',
    store_feature: '',
    store_knowledge_base: '',
  });

  // File management state
  const [planMaxKb, setPlanMaxKb] = useState(500);
  const [fileData, setFileData] = useState<FileData>({ folder: '', total_images: 0, max_images: 20, files: [], products: [] });
  const [fileLoaded, setFileLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imgMsg, setImgMsg] = useState('');
  const [imgErr, setImgErr] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [savingTag, setSavingTag] = useState<string | null>(null);
  const [tagValues, setTagValues] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Knowledge base file upload state
  const [kbUploading, setKbUploading] = useState(false);
  const [kbMsg, setKbMsg] = useState('');
  const [kbErr, setKbErr] = useState('');
  const [kbProgress, setKbProgress] = useState(0);
  const [kbStep, setKbStep] = useState('');
  const kbFileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/user/images');
      const data = await res.json();
      if (res.ok && !data.error) {
        // Support both old (images[]) and new (files[]) API shape
        const files = data.files || data.images?.map((img: any) => ({ ...img, type: img.type || 'image' })) || [];
        setFileData({ ...data, files });
        // Seed tagValues from DB
        const tv: Record<string, string> = {};
        for (const f of files) tv[f.filename] = f.product || '';
        setTagValues(tv);
      }
    } catch {}
    setFileLoaded(true);
  }, []);

  const handleKbFileUpload = async (file: File) => {
    setKbUploading(true);
    setKbErr('');
    setKbMsg('');
    setKbProgress(0);
    setKbStep('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/user/knowledge-base', { method: 'POST', body: formData });

      if (!res.body) {
        setKbErr('Upload gagal — tidak ada respons dari server');
        setKbUploading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim() || part.startsWith(':')) continue; // skip heartbeat comments
          const lines = part.trim().split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            if (line.startsWith('data: ')) data = line.slice(6);
          }
          if (!data) continue;
          const parsed = JSON.parse(data);

          if (event === 'progress') {
            setKbProgress(parsed.pct || 0);
            setKbStep(parsed.message || '');
          } else if (event === 'done') {
            setKbProgress(100);
            setKbStep('');
            setForm((prev) => ({ ...prev, store_knowledge_base: parsed.text || '' }));
            setKbMsg(`Berhasil — ${(parsed.characters || 0).toLocaleString()} karakter${parsed.used_llm_formatter ? ' (diformat AI)' : ''}`);
            setKbUploading(false);
          } else if (event === 'error') {
            setKbErr(parsed.message || 'Terjadi kesalahan');
            setKbUploading(false);
            setKbProgress(0);
            setKbStep('');
          }
        }
      }
    } catch (e: any) {
      setKbErr(e.message || 'Terjadi kesalahan');
      setKbUploading(false);
      setKbProgress(0);
      setKbStep('');
    } finally {
      if (kbFileInputRef.current) kbFileInputRef.current.value = '';
    }
  };

  const handleKbClear = async () => {
    if (!confirm('Hapus seluruh knowledge base?')) return;
    setKbUploading(true);
    setKbErr('');
    setKbMsg('');
    try {
      const res = await fetch('/api/user/knowledge-base', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setKbErr(data.error || 'Gagal menghapus');
        return;
      }
      setForm((prev) => ({ ...prev, store_knowledge_base: '' }));
      setKbMsg('Knowledge base dihapus');
    } catch (e: any) {
      setKbErr(e.message);
    } finally {
      setKbUploading(false);
    }
  };

  useEffect(() => {
    fetch('/api/user/store')
      .then((r) => {
        if (r.status === 401) { router.push('/user'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data || data.error) return;
        setPlanMaxKb(data.plan_max_kb ?? 500);
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
          store_language: data.store_language || 'id',
          store_tagline: data.store_tagline || '',
          store_address: data.store_address || '',
          store_feature: data.store_feature || '',
          store_knowledge_base: data.store_knowledge_base || '',
        });
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data'); setLoading(false); });

    fetchFiles();
  }, [router, fetchFiles]);

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

  // ── File management handlers ──────────────────────────────────────────────

  const ACCEPTED_FILE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm,.avi,.pdf,.docx,.doc';

  const handleFileSelect = (files: File[]) => {
    const remaining = fileData.max_images - fileData.total_images;
    setSelectedFiles(files.slice(0, remaining));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(Array.from(e.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFileSelect(Array.from(e.dataTransfer.files));
  };

  const removePreview = (index: number) => {
    const updated = [...selectedFiles];
    updated.splice(index, 1);
    setSelectedFiles(updated);
  };

  const compressImage = (file: File, maxSize = 1200, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compress failed')), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setImgErr('');
    let uploaded = 0;
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      try {
        const file = selectedFiles[i];
        const fd = new FormData();

        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file);
          fd.append('file', compressed, file.name.replace(/\.\w+$/, '.jpg'));
        } else {
          fd.append('file', file);
        }

        const res = await fetch('/api/user/images', { method: 'POST', body: fd });
        const result = await res.json();
        if (result.success) {
          uploaded++;
          // Seed empty tag for new file
          if (result.filenames?.[0]) {
            setTagValues((prev) => ({ ...prev, [result.filenames[0]]: '' }));
          }
        } else {
          errors.push(`File ${i + 1}: ${result.error || 'Gagal'}`);
        }
      } catch {
        errors.push(`File ${i + 1}: Upload gagal`);
      }
    }

    if (uploaded > 0) {
      setImgMsg(`${uploaded} file berhasil diupload`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchFiles();
    }
    if (errors.length > 0) setImgErr(errors.join(' · '));
    setUploading(false);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus file ${filename}?`)) return;
    setDeletingFile(filename);
    try {
      const res = await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setImgMsg(`File ${filename} dihapus`);
        await fetchFiles();
      } else {
        setImgErr(result.error || 'Gagal menghapus');
      }
    } catch (err: any) {
      setImgErr(err.message);
    } finally {
      setDeletingFile(null);
    }
  };

  const handleTagSave = async (filename: string) => {
    setSavingTag(filename);
    try {
      const tag = tagValues[filename] ?? '';
      const res = await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: tag }),
      });
      const result = await res.json();
      if (!result.success) setImgErr(result.error || 'Gagal menyimpan tag');
    } catch (err: any) {
      setImgErr(err.message);
    } finally {
      setSavingTag(null);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 h-96" />
      <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-6 h-48" />
    </div>
  );

  const canUpload = fileData.total_images < fileData.max_images;
  const remaining = fileData.max_images - fileData.total_images;

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
      <div className="page-card p-6">
        <p className="section-label mb-5">Informasi Toko</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Nomor WhatsApp</label>
            <input type="text" className="form-input opacity-50 cursor-not-allowed" value={whatsappNumber} disabled />
            <p className="form-hint">Nomor WhatsApp tidak dapat diubah</p>
          </div>

          <div>
            <label className="form-label">Nama Toko <span className="text-red-400">*</span></label>
            <input type="text" required className="form-input" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </div>

          <div>
            <label className="form-label">Tipe Toko</label>
            <select className="form-select" value={form.store_type} onChange={(e) => setForm({ ...form, store_type: e.target.value, store_fulfillment: [] })}>
              {STORE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="form-hint">Pilih jenis usaha Anda</p>
          </div>

          {/* Fulfillment Options */}
          {(form.store_type === 'store' || form.store_type === 'services') && (
            <div>
              <label className="form-label">
                {form.store_type === 'store' ? 'Metode Pengiriman' : 'Metode Layanan'}
              </label>
              <div className="space-y-2.5 mt-0.5">
                {FULFILLMENT_OPTIONS[form.store_type as keyof typeof FULFILLMENT_OPTIONS].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${form.store_fulfillment.includes(opt.value) ? 'bg-mint-600 border-mint-600' : 'bg-[--surface-3] border-[--border] group-hover:border-mint-500/50'}`} style={{width:'18px',height:'18px'}}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.store_fulfillment.includes(opt.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, store_fulfillment: [...form.store_fulfillment, opt.value] });
                          } else {
                            setForm({ ...form, store_fulfillment: form.store_fulfillment.filter(v => v !== opt.value) });
                          }
                        }}
                      />
                      {form.store_fulfillment.includes(opt.value) && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="2 6 5 9 10 3" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-[--text-secondary]">{opt.label}</span>
                  </label>
                ))}
              </div>
              <p className="form-hint">
                {form.store_type === 'store'
                  ? 'Pilih metode pengiriman yang tersedia di toko Anda'
                  : 'Pilih metode layanan yang tersedia untuk jasa Anda'}
              </p>
            </div>
          )}

          <div>
            <label className="form-label">Nama Admin AI</label>
            <input type="text" className="form-input" value={form.store_admin} onChange={(e) => setForm({ ...form, store_admin: e.target.value })} />
            <p className="form-hint">Nama yang akan digunakan AI saat membalas chat</p>
          </div>

          <div>
            <label className="form-label">Nomor Admin</label>
            <input type="text" className="form-input" value={form.store_admin_number} onChange={(e) => setForm({ ...form, store_admin_number: e.target.value })} placeholder="628123456789" />
            <p className="form-hint">Nomor telepon admin untuk notifikasi</p>
          </div>

          <div>
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={form.store_email} onChange={(e) => setForm({ ...form, store_email: e.target.value })} placeholder="email@example.com" />
            <p className="form-hint">Alamat email untuk keperluan bisnis</p>
          </div>

          {/* Toggles */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[--surface-3] border border-[--border]">
              <div>
                <p className="text-xs font-medium text-[--text-secondary]">Bot Always On</p>
                <p className="text-xs text-[--text-muted] mt-0.5">Selalu respon pesan masuk</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, store_bot_always_on: form.store_bot_always_on ? 0 : 1 })}
                className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors flex-shrink-0 ${form.store_bot_always_on ? 'bg-mint-600' : 'bg-[--border]'}`}
                style={{width:'40px',height:'22px'}}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.store_bot_always_on ? 'translate-x-5' : 'translate-x-1'}`} style={{width:'16px',height:'16px'}} />
              </button>
            </div>
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[--surface-3] border border-[--border]">
              <div>
                <p className="text-xs font-medium text-[--text-secondary]">WhatsApp Bot</p>
                <p className="text-xs text-[--text-muted] mt-0.5">Proses pesan WhatsApp</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, store_whatsapp_bot: form.store_whatsapp_bot ? 0 : 1 })}
                className={`relative inline-flex items-center rounded-full transition-colors flex-shrink-0 ${form.store_whatsapp_bot ? 'bg-mint-600' : 'bg-[--border]'}`}
                style={{width:'40px',height:'22px'}}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.store_whatsapp_bot ? 'translate-x-5' : 'translate-x-1'}`} style={{width:'16px',height:'16px'}} />
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Bahasa Bot</label>
            <select
              className="form-select"
              value={form.store_language}
              onChange={(e) => setForm({ ...form, store_language: e.target.value })}
            >
              <option value="id">Indonesia</option>
              <option value="en">English</option>
            </select>
            <p className="form-hint">Bahasa yang digunakan AI saat membalas pesan pelanggan</p>
          </div>

          <div>
            <label className="form-label">Tagline</label>
            <input type="text" className="form-input" value={form.store_tagline} onChange={(e) => setForm({ ...form, store_tagline: e.target.value })} placeholder="Slogan singkat toko Anda" />
            <p className="form-hint">Slogan atau tagline toko Anda</p>
          </div>

          <div>
            <label className="form-label">Alamat Toko</label>
            <textarea rows={3} className="form-textarea" value={form.store_address} onChange={(e) => setForm({ ...form, store_address: e.target.value })} />
            <p className="form-hint">Alamat lengkap toko atau lokasi pengiriman Anda</p>
          </div>

          <div>
            <label className="form-label">Fitur Produk</label>
            <textarea rows={4} className="form-textarea" value={form.store_feature} onChange={(e) => setForm({ ...form, store_feature: e.target.value })} />
            <p className="form-hint">Jelaskan fitur-fitur unggulan produk Anda</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label !mb-0">Knowledge Base</label>
              <span className={`text-xs font-mono ${form.store_knowledge_base.length > planMaxKb ? 'text-red-400' : 'text-[--text-muted]'}`}>
                {form.store_knowledge_base.length}/{planMaxKb}
              </span>
            </div>
            <textarea
              rows={6}
              className="form-textarea"
              value={form.store_knowledge_base}
              onChange={(e) => {
                if (e.target.value.length <= planMaxKb) setForm({ ...form, store_knowledge_base: e.target.value });
              }}
            />
            <p className="form-hint">Informasi produk, harga, cara order, dll — digunakan AI untuk menjawab pertanyaan pelanggan</p>
            {/* File Upload for KB */}
            <div className="mt-3 rounded-xl border border-dashed border-[--border] bg-[--surface-3]/50 p-4 space-y-3">
              <p className="text-xs text-[--text-muted]">
                <span className="font-medium text-[--text-secondary]">Unggah dokumen PDF / DOCX</span>
                {' '}— teks akan diekstrak otomatis ke Knowledge Base
              </p>

              {/* Progress bar — shown while uploading */}
              {kbUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[--text-muted] truncate pr-2">{kbStep || 'Memproses...'}</span>
                    <span className="text-xs font-mono text-[--text-muted] flex-shrink-0">{kbProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[--surface-3] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${kbProgress}%`,
                        background: 'linear-gradient(90deg, var(--mint-500, #10b981), var(--mint-400, #34d399))',
                      }}
                    />
                  </div>
                </div>
              )}

              {kbMsg && (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                  {kbMsg}
                  <button onClick={() => setKbMsg('')} className="ml-2 text-green-500/50 hover:text-green-400">&times;</button>
                </div>
              )}
              {kbErr && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                  {kbErr}
                  <button onClick={() => setKbErr('')} className="ml-2 text-red-500/50 hover:text-red-400">&times;</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={kbFileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleKbFileUpload(f);
                  }}
                />
                <button
                  type="button"
                  disabled={kbUploading}
                  onClick={() => kbFileInputRef.current?.click()}
                  className="btn-ghost text-xs !py-1.5 !px-3 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {kbUploading ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                  {kbUploading ? 'Memproses...' : 'Pilih File'}
                </button>
                {form.store_knowledge_base.length > 0 && !kbUploading && (
                  <button
                    type="button"
                    onClick={handleKbClear}
                    className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Hapus KB
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm !py-2.5 !px-6">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <Link href="/user" className="btn-ghost">Batal</Link>
          </div>
        </form>
      </div>

      {/* File Media & Dokumen */}
      <div className="page-card p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="section-label">File Media &amp; Dokumen</p>
          <span className="text-xs font-mono text-[--text-muted] bg-[--surface-3] px-2.5 py-1 rounded-lg border border-[--border]">
            {fileData.total_images}/{fileData.max_images}
          </span>
        </div>

        {/* Alerts */}
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

        {/* Product datalist for tag suggestions */}
        <datalist id="tag-suggestions">
          {fileData.products.map((p) => (
            <option key={p.folder} value={p.name} />
          ))}
        </datalist>

        {/* File Grid */}
        {fileData.files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
            {fileData.files.map((f) => (
              <div key={f.filename} className="group space-y-1.5">
                {/* Thumbnail / preview */}
                <div className="relative">
                  {f.type === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.url}
                      className="w-full h-28 object-cover rounded-xl border border-[--border]"
                      alt={f.filename}
                      loading="lazy"
                    />
                  ) : f.type === 'video' ? (
                    <div className="w-full h-28 rounded-xl border border-[--border] bg-[--surface-3] flex flex-col items-center justify-center gap-1">
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.277A1 1 0 0121 8.677v6.646a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                      </svg>
                      <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wide">Video</span>
                    </div>
                  ) : (
                    <div className="w-full h-28 rounded-xl border border-[--border] bg-[--surface-3] flex flex-col items-center justify-center gap-1">
                      <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-[10px] text-orange-400 font-medium uppercase tracking-wide">
                        {f.filename.split('.').pop()?.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(f.filename)}
                    disabled={deletingFile === f.filename}
                    className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg w-7 h-7 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Hapus"
                  >
                    {deletingFile === f.filename ? (
                      <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Filename */}
                <p className="text-[11px] text-[--text-muted] truncate text-center">{f.filename}</p>

                {/* Tag input — free text + datalist suggestions */}
                <div className="relative">
                  <input
                    type="text"
                    list="tag-suggestions"
                    placeholder="Tulis tag atau pilih..."
                    value={tagValues[f.filename] ?? (f.product || '')}
                    onChange={(e) => setTagValues((prev) => ({ ...prev, [f.filename]: e.target.value }))}
                    onBlur={() => handleTagSave(f.filename)}
                    disabled={savingTag === f.filename}
                    className="form-input !text-xs !py-1.5 !pr-6 w-full disabled:opacity-50"
                  />
                  {savingTag === f.filename && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin w-3 h-3 border-2 border-mint-500 border-t-transparent rounded-full inline-block" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {fileLoaded && fileData.files.length === 0 && (
          <p className="text-[--text-muted] text-sm mb-4">Belum ada file yang diupload</p>
        )}

        {/* Upload Section */}
        {canUpload ? (
          <div>
            <hr className="border-[--border] mb-4" />
            <p className="section-label mb-3">Upload File Baru</p>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver ? 'border-mint-400 bg-mint-500/10' : 'border-[--border] hover:border-gray-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ''; fileInputRef.current?.click(); }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                multiple
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
              />
              <svg className="w-9 h-9 mx-auto text-[--text-muted] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-[--text-muted]">Klik atau drag & drop file di sini</p>
              <p className="text-xs text-[--text-muted] mt-1">
                Gambar · Video (MP4/MOV) · Dokumen (PDF/DOCX) · Sisa {remaining} slot
              </p>
            </div>

            {/* Pending files preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="relative group">
                      {file.type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-20 object-cover rounded-lg border border-[--border]"
                        />
                      ) : file.type.startsWith('video/') ? (
                        <div className="w-full h-20 rounded-lg border border-[--border] bg-[--surface-3] flex flex-col items-center justify-center gap-1">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.277A1 1 0 0121 8.677v6.646a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                          <span className="text-[9px] text-[--text-muted] truncate w-full text-center px-1">{file.name}</span>
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-lg border border-[--border] bg-[--surface-3] flex flex-col items-center justify-center gap-1">
                          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-[9px] text-[--text-muted] truncate w-full text-center px-1">{file.name}</span>
                        </div>
                      )}
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
                  className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2 disabled:opacity-50"
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
                      Upload {selectedFiles.length} File
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
            Batas maksimal {fileData.max_images} file tercapai. Hapus beberapa file untuk upload yang baru.
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
