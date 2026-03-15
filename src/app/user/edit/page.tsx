'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const [form, setForm] = useState({
    store_name: '',
    store_type: 'store',
    store_admin: '',
    store_admin_number: '',
    store_email: '',
    store_bot_always_on: 0,
    store_whatsapp_bot: 1,
    store_language: 'id',
    dashboard_language: 'en',
    store_tagline: '',
    store_address: '',
    store_feature: '',
  });

  // File management state
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

  const STORE_TYPES = [
    { label: t('edit.typeStore'), value: 'store' },
    { label: t('edit.typeService'), value: 'services' },
    { label: t('edit.typeOther'), value: 'others' },
  ];

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
          store_admin: data.store_admin || '',
          store_admin_number: data.store_admin_number || '',
          store_email: data.store_email || '',
          store_bot_always_on: data.store_bot_always_on ? 1 : 0,
          store_whatsapp_bot: data.store_whatsapp_bot !== undefined ? (data.store_whatsapp_bot ? 1 : 0) : 1,
          store_language: data.store_language || 'id',
          dashboard_language: data.dashboard_language || 'en',
          store_tagline: data.store_tagline || '',
          store_address: data.store_address || '',
          store_feature: data.store_feature || '',
        });
        setLoading(false);
      })
      .catch(() => { setError(t('common.errorLoad')); setLoading(false); });

    fetchFiles();
  }, [router, fetchFiles, t]);

  // Clear messages
  useEffect(() => {
    if (imgMsg) { const timer = setTimeout(() => setImgMsg(''), 4000); return () => clearTimeout(timer); }
  }, [imgMsg]);
  useEffect(() => {
    if (imgErr) { const timer = setTimeout(() => setImgErr(''), 6000); return () => clearTimeout(timer); }
  }, [imgErr]);
  useEffect(() => {
    if (success) { const timer = setTimeout(() => setSuccess(''), 4000); return () => clearTimeout(timer); }
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
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(t('edit.success'));
      } else {
        setError(data.error || t('common.errorLoad'));
      }
    } catch {
      setError(t('common.errorServer'));
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
          errors.push(`File ${i + 1}: ${result.error || t('common.errorLoad')}`);
        }
      } catch {
        errors.push(`File ${i + 1}: ${t('common.errorServer')}`);
      }
    }

    if (uploaded > 0) {
      setImgMsg(t('edit.filesUploaded', { count: uploaded }));
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchFiles();
    }
    if (errors.length > 0) setImgErr(errors.join(' · '));
    setUploading(false);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(t('edit.deleteFileConfirm', { filename }))) return;
    setDeletingFile(filename);
    try {
      const res = await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setImgMsg(t('edit.fileDeleted', { filename }));
        await fetchFiles();
      } else {
        setImgErr(result.error || t('common.errorLoad'));
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
      if (!result.success) setImgErr(result.error || t('common.errorLoad'));
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
        <p className="section-label mb-5">{t('edit.title')}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">{t('edit.whatsappLabel')}</label>
            <input type="text" className="form-input opacity-50 cursor-not-allowed" value={whatsappNumber} disabled />
            <p className="form-hint">{t('edit.whatsappHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.storeNameLabel')} <span className="text-red-400">*</span></label>
            <input type="text" required className="form-input" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
          </div>

          <div>
            <label className="form-label">{t('edit.storeTypeLabel')}</label>
            <select className="form-select" value={form.store_type} onChange={(e) => setForm({ ...form, store_type: e.target.value })}>
              {STORE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
            </select>
            <p className="form-hint">{t('edit.storeTypeHint')}</p>
          </div>


          <div>
            <label className="form-label">{t('edit.aiAdminLabel')}</label>
            <input type="text" className="form-input" value={form.store_admin} onChange={(e) => setForm({ ...form, store_admin: e.target.value })} />
            <p className="form-hint">{t('edit.aiAdminHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.adminNumberLabel')}</label>
            <input type="text" className="form-input" value={form.store_admin_number} onChange={(e) => setForm({ ...form, store_admin_number: e.target.value })} placeholder={t('edit.adminNumberPlaceholder')} />
            <p className="form-hint">{t('edit.adminNumberHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.emailLabel')}</label>
            <input type="email" className="form-input" value={form.store_email} onChange={(e) => setForm({ ...form, store_email: e.target.value })} placeholder={t('edit.emailPlaceholder')} />
            <p className="form-hint">{t('edit.emailHint')}</p>
          </div>

          {/* Toggles */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-[--surface-3] border border-[--border]">
              <div>
                <p className="text-xs font-medium text-[--text-secondary]">{t('edit.botAlwaysOnLabel')}</p>
                <p className="text-xs text-[--text-muted] mt-0.5">{t('edit.botAlwaysOnDesc')}</p>
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
                <p className="text-xs font-medium text-[--text-secondary]">{t('edit.waBotLabel')}</p>
                <p className="text-xs text-[--text-muted] mt-0.5">{t('edit.waBotDesc')}</p>
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
            <label className="form-label">{t('edit.languageLabel')}</label>
            <select
              className="form-select"
              value={form.store_language}
              onChange={(e) => setForm({ ...form, store_language: e.target.value })}
            >
              <option value="id">{t('edit.langId')}</option>
              <option value="en">{t('edit.langEn')}</option>
              <option value="fr">{t('edit.langFr')}</option>
            </select>
            <p className="form-hint">{t('edit.languageHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.dashboardLanguageLabel')}</label>
            <select
              className="form-select"
              value={form.dashboard_language}
              onChange={(e) => setForm({ ...form, dashboard_language: e.target.value })}
            >
              <option value="en">{t('edit.langEn')}</option>
              <option value="id">{t('edit.langId')}</option>
              <option value="fr">{t('edit.langFr')}</option>
            </select>
            <p className="form-hint">{t('edit.dashboardLanguageHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.taglineLabel')}</label>
            <input type="text" className="form-input" value={form.store_tagline} onChange={(e) => setForm({ ...form, store_tagline: e.target.value })} placeholder={t('edit.taglinePlaceholder')} />
            <p className="form-hint">{t('edit.taglineHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.addressLabel')}</label>
            <textarea rows={3} className="form-textarea" value={form.store_address} onChange={(e) => setForm({ ...form, store_address: e.target.value })} />
            <p className="form-hint">{t('edit.addressHint')}</p>
          </div>

          <div>
            <label className="form-label">{t('edit.featuresLabel')}</label>
            <textarea rows={4} className="form-textarea" value={form.store_feature} onChange={(e) => setForm({ ...form, store_feature: e.target.value })} />
            <p className="form-hint">{t('edit.featuresHint')}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm !py-2.5 !px-6">
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <Link href="/user" className="btn-ghost">{t('common.cancel')}</Link>
          </div>
        </form>
      </div>

      {/* File Media & Dokumen */}
      <div className="page-card p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="section-label">{t('edit.mediaTitle')}</p>
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
                    title={t('common.delete')}
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
          <p className="text-[--text-muted] text-sm mb-4">{t('edit.noFiles')}</p>
        )}

        {/* Upload Section */}
        {canUpload ? (
          <div>
            <hr className="border-[--border] mb-4" />
            <p className="section-label mb-3">{t('edit.uploadTitle')}</p>

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
              <p className="text-sm text-[--text-muted]">{t('edit.dropHint')}</p>
              <p className="text-xs text-[--text-muted] mt-1">
                {t('edit.dropTypes', { remaining })}
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
                      {t('common.uploading')}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {t('edit.uploadBtn', { count: selectedFiles.length })}
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
            {t('edit.maxReached', { max: fileData.max_images })}
          </div>
        )}
      </div>
    </div>
  );
}
