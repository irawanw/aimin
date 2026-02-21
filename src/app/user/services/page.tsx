'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import UpgradeGate from '@/components/user/UpgradeGate';
import { motion, AnimatePresence } from 'framer-motion';

interface Service {
  id: number;
  title: string;
  description: string | null;
  price: string | null;
  image_keyword: string | null;
  image_url: string | null;
}

type ServiceForm = {
  title: string;
  description: string;
  price: string;
};

interface SearchImage {
  id: string;
  url: string;
  thumb: string;
  alt: string;
}

const emptyForm: ServiceForm = { title: '', description: '', price: '' };

function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
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

export default function ServicesPage() {
  return <UpgradeGate><ServicesContent /></UpgradeGate>;
}

function ServicesContent() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Image state for modal
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // base64 from file upload
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null); // URL from search
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchImage[]>([]);
  const [searching, setSearching] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/user/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch {
      setError('Gagal memuat layanan');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Clear error after 4s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function openAddModal() {
    setEditingService(null);
    setForm(emptyForm);
    setModalError('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedImageUrl(null);
    setExistingImageUrl(null);
    setRemoveImage(false);
    setSearchQuery('');
    setSearchResults([]);
    setModalOpen(true);
  }

  function openEditModal(svc: Service) {
    setEditingService(svc);
    setForm({
      title: svc.title,
      description: svc.description || '',
      price: svc.price || '',
    });
    setModalError('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedImageUrl(null);
    setExistingImageUrl(svc.image_url || null);
    setRemoveImage(false);
    setSearchQuery('');
    setSearchResults([]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
    setForm(emptyForm);
    setModalError('');
    setImageFile(null);
    setImagePreview(null);
    setSelectedImageUrl(null);
    setExistingImageUrl(null);
    setRemoveImage(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleImageSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/user/image-search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else {
        setModalError('Gagal mencari gambar');
      }
    } catch {
      setModalError('Gagal mencari gambar');
    }
    setSearching(false);
  }

  function handleSelectSearchImage(img: SearchImage) {
    setSelectedImageUrl(img.url);
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(false);
    setSearchResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    setSelectedImageUrl(null);
    setRemoveImage(false);
    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
    } catch {
      setModalError('Gagal memproses gambar');
    }
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setSelectedImageUrl(null);
    setExistingImageUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Determine current preview
  const currentPreviewSrc = imagePreview
    ? imagePreview
    : selectedImageUrl
      ? selectedImageUrl
      : existingImageUrl && !removeImage
        ? existingImageUrl
        : null;
  const hasImage = !!currentPreviewSrc;
  const isCustomUpload = !!imagePreview;
  const isSearchImage = !!selectedImageUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setModalError('');

    let image_base64: string | undefined;
    let image_url: string | undefined;

    if (imagePreview) {
      image_base64 = imagePreview;
    } else if (selectedImageUrl) {
      image_url = selectedImageUrl;
    }

    if (editingService) {
      // Optimistic update
      const prev = [...services];
      const updated: Service = {
        ...editingService,
        title: form.title,
        description: form.description || null,
        price: form.price || null,
        image_url: removeImage ? null : (imagePreview ? '...' : (selectedImageUrl || editingService.image_url)),
      };
      setServices((s) => s.map((x) => (x.id === editingService.id ? updated : x)));
      closeModal();

      try {
        const res = await fetch('/api/user/services', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingService.id,
            ...form,
            image_base64,
            image_url,
            remove_image: removeImage || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          fetchServices();
        } else {
          setServices(prev);
          setError(data.error || 'Gagal mengubah layanan');
        }
      } catch {
        setServices(prev);
        setError('Gagal menghubungi server');
      }
    } else {
      // Optimistic add with temp id
      const tempId = -Date.now();
      const newSvc: Service = {
        id: tempId,
        title: form.title,
        description: form.description || null,
        price: form.price || null,
        image_keyword: null,
        image_url: selectedImageUrl || null,
      };
      setServices((s) => [...s, newSvc]);
      closeModal();

      try {
        const res = await fetch('/api/user/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, image_base64, image_url }),
        });
        const data = await res.json();
        if (data.success) {
          setServices((s) => s.map((x) => (x.id === tempId ? { ...x, id: data.id, image_url: data.image_url } : x)));
        } else {
          setServices((s) => s.filter((x) => x.id !== tempId));
          setError(data.error || 'Gagal menambah layanan');
        }
      } catch {
        setServices((s) => s.filter((x) => x.id !== tempId));
        setError('Gagal menghubungi server');
      }
    }

    setSaving(false);
  }

  async function handleDelete(id: number) {
    setDeletingId(id);

    // Optimistic delete
    const prev = [...services];
    setServices((s) => s.filter((x) => x.id !== id));
    setConfirmDeleteId(null);

    try {
      const res = await fetch(`/api/user/services?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setServices(prev);
        setError(data.error || 'Gagal menghapus layanan');
      }
    } catch {
      setServices(prev);
      setError('Gagal menghubungi server');
    }

    setDeletingId(null);
  }

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) closeModal();
        if (confirmDeleteId !== null) setConfirmDeleteId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  function getCardImage(svc: Service): string {
    if (svc.image_url) {
      if (svc.image_url.startsWith('http')) return svc.image_url;
      return svc.image_url;
    }
    return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-mint-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 flex items-center justify-between"
          >
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 ml-3">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[--text-primary]">Layanan</h2>
          {services.length > 0 && (
            <span className="text-xs bg-mint-500/20 text-mint-400 px-2 py-0.5 rounded-full font-medium">
              {services.length}
            </span>
          )}
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary text-sm !py-2.5 !px-5 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Layanan
        </button>
      </div>

      {/* Services grid */}
      {services.length === 0 ? (
        <div className="glass-dark rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 text-[--text-muted] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-[--text-muted] font-medium mb-1">Belum ada layanan</h3>
          <p className="text-[--text-muted] text-sm mb-5">Tambahkan layanan pertama Anda untuk ditampilkan di website.</p>
          <button onClick={openAddModal} className="btn-primary text-sm !py-2.5 !px-5 inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Layanan
          </button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {services.map((svc) => (
              <motion.div
                key={svc.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="glass-dark rounded-2xl overflow-hidden flex flex-col"
              >
                {confirmDeleteId === svc.id ? (
                  // Delete confirmation overlay
                  <div className="flex-1 flex flex-col items-center justify-center py-4 px-5">
                    <p className="text-[--text-secondary] text-sm font-medium mb-1">Hapus layanan ini?</p>
                    <p className="text-[--text-muted] text-xs mb-4 text-center line-clamp-1">{svc.title}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-4 py-2 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleDelete(svc.id)}
                        disabled={deletingId === svc.id}
                        className="px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {deletingId === svc.id && (
                          <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full inline-block" />
                        )}
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal card content
                  <>
                    {/* Card image thumbnail */}
                    <div className="w-full h-32 bg-[--surface-3] overflow-hidden">
                      <img
                        src={getCardImage(svc)}
                        alt={svc.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0 p-5 pt-3">
                      <h4 className="text-[--text-primary] font-medium text-sm truncate">{svc.title}</h4>
                      {svc.description && (
                        <p className="text-[--text-muted] text-xs mt-1.5 line-clamp-2 leading-relaxed">{svc.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {svc.price && (
                          <span className="text-xs font-medium text-mint-400 bg-mint-500/10 px-2 py-0.5 rounded-full">
                            {svc.price}
                          </span>
                        )}
                        {svc.image_url && (
                          <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                            {svc.image_url.startsWith('http') ? 'Gambar Unsplash' : 'Gambar custom'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 px-5 pb-4 pt-0 border-t border-[--border] mt-auto">
                      <button
                        onClick={() => openEditModal(svc)}
                        className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-mint-400 px-3 py-1.5 rounded-lg hover:bg-mint-500/10 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(svc.id)}
                        className="flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-[--surface-1] border border-[--border] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-[--border]">
                <h3 className="text-lg font-semibold text-[--text-primary]">
                  {editingService ? 'Edit Layanan' : 'Tambah Layanan'}
                </h3>
                <button onClick={closeModal} className="text-[--text-muted] hover:text-[--text-secondary] text-xl leading-none">&times;</button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {modalError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 text-sm">
                    {modalError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Judul Layanan <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Cuci Sepatu Premium"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Deskripsi</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Deskripsi singkat layanan Anda"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Harga</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rp 100.000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>

                {/* Image Section */}
                <div>
                  <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Gambar Layanan</label>

                  {hasImage ? (
                    /* Selected image preview */
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden bg-[--surface-3] border border-[--border]">
                        <img src={currentPreviewSrc!} alt="Preview" className="w-full h-40 object-cover" />
                        <div className="absolute top-2 right-2">
                          <span className={`text-xs ${isCustomUpload ? 'bg-green-500/80' : isSearchImage ? 'bg-blue-500/80' : 'bg-green-500/80'} text-white px-2 py-0.5 rounded-full`}>
                            {isCustomUpload ? 'Upload' : isSearchImage ? 'Unsplash' : 'Gambar'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus gambar
                      </button>
                    </div>
                  ) : (
                    /* Search + Upload mode */
                    <div className="space-y-3">
                      {/* Image search */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="form-input flex-1"
                          placeholder="Cari gambar... (contoh: salon, food)"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImageSearch(); } }}
                        />
                        <button
                          type="button"
                          onClick={handleImageSearch}
                          disabled={searching || !searchQuery.trim()}
                          className="px-4 py-2.5 rounded-xl bg-mint-600 hover:bg-mint-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {searching ? (
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
                      {searchResults.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto rounded-xl border border-[--border] p-2 bg-[--surface-3]/50">
                          {searchResults.map((img) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => handleSelectSearchImage(img)}
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
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
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
                </div>

                {/* Modal footer */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 rounded-xl text-sm text-[--text-muted] hover:text-[--text-primary] bg-[--surface-3] hover:bg-[--surface-2] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.title.trim()}
                    className="btn-primary text-sm !py-2.5 !px-6 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    )}
                    {editingService ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
