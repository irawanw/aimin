'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface StoreData {
  store_whatsapp_jid: string;
  store_name: string;
  store_admin: string;
  store_address: string;
  store_tagline: string;
  store_feature: string;
  store_knowledge_base: string;
  store_images: string | any[];
  store_status: string;
  store_type: string;
  store_fulfillment: string | string[] | null;
  store_folder: string;
  store_admin_number: string;
  store_bot_always_on: number;
  store_updated_at: string;
}

interface ImageInfo {
  filename: string;
  product: string | null;
  url: string;
}

interface ImageData {
  folder: string;
  total_images: number;
  max_images: number;
  images: ImageInfo[];
}

const STORE_TYPE_LABELS: Record<string, string> = {
  store: 'store',
  services: 'services',
  others: 'others',
};

const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: 'Barang dikirim',
  pickup: 'Barang diambil',
  meeting_schedule: 'Ketemu dulu/konsultasi',
  book_date: 'Book tanggal tertentu (misal salon kecantikan, klinik kecantikan)',
  book_date_range: 'Book rentang tanggal (misal rental mobil)',
  visit_location: 'Datang ke tempat customer (misal service AC)',
};

export default function UserPageWrapper() {
  return (
    <Suspense
      fallback={<div className="text-gray-400">Loading...</div>}
    >
      <UserDashboard />
    </Suspense>
  );
}

function UserDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Image upload state
  const [imageData, setImageData] = useState<ImageData>({ folder: '', total_images: 0, max_images: 20, images: [] });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
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
    const token = searchParams.get('token');
    if (token) {
      fetch('/api/user/token-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            window.location.href = '/user';
          } else {
            setError(data.error || 'Login gagal');
            setLoading(false);
          }
        })
        .catch(() => {
          setError('Gagal menghubungi server');
          setLoading(false);
        });
      return;
    }

    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStore(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Gagal memuat data toko');
        setLoading(false);
      });

    fetchImages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear messages
  useEffect(() => {
    if (uploadMsg) {
      const t = setTimeout(() => setUploadMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [uploadMsg]);

  useEffect(() => {
    if (uploadErr) {
      const t = setTimeout(() => setUploadErr(''), 6000);
      return () => clearTimeout(t);
    }
  }, [uploadErr]);

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

    if (limited.length === 0) {
      setPreviews([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(Array.from(e.target.files || []));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadErr('');

    try {
      const base64Images = await Promise.all(
        selectedFiles.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );

      const res = await fetch('/api/user/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      });

      const result = await res.json();

      if (result.success) {
        setUploadMsg(`${result.uploaded} gambar berhasil diupload`);
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchImages();
      } else {
        setUploadErr(result.error || 'Upload gagal');
      }
    } catch (err: any) {
      setUploadErr(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus gambar ${filename}?`)) return;
    setDeletingFile(filename);
    setUploadErr('');

    try {
      const res = await fetch(
        `/api/user/images?filename=${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
      );
      const result = await res.json();

      if (result.success) {
        setUploadMsg(`Gambar ${filename} dihapus`);
        await fetchImages();
      } else {
        setUploadErr(result.error || 'Gagal menghapus');
      }
    } catch (err: any) {
      setUploadErr(err.message);
    } finally {
      setDeletingFile(null);
    }
  };

  if (loading) return <div className="text-gray-400">Loading...</div>;

  if (error) {
    return (
      <div className="glass-dark rounded-2xl p-8 max-w-md mx-auto text-center">
        <p className="text-red-400 mb-2">{error}</p>
        <p className="text-gray-500 text-sm">Silakan minta link login baru melalui WhatsApp.</p>
      </div>
    );
  }

  if (!store) return null;

  const whatsappNumber = store.store_whatsapp_jid.replace('@s.whatsapp.net', '');
  const folderName = store.store_folder || store.store_whatsapp_jid.replace(/[^a-zA-Z0-9]/g, '').replace('swhatsappnet', '');

  const storeTypeLabel = STORE_TYPE_LABELS[store.store_type] || store.store_type || 'store';
  const fulfillmentList = parseFulfillment(store.store_fulfillment);
  const fulfillmentDisplay = fulfillmentList.length > 0
    ? fulfillmentList.map(f => FULFILLMENT_LABELS[f] || f).join(', ')
    : '-';

  const infoRows = [
    { label: 'Nama Toko', value: store.store_name || '-' },
    { label: 'Tipe Toko', value: storeTypeLabel, badge: true },
    { label: store.store_type === 'services' ? 'Metode Layanan' : 'Metode Pengiriman', value: fulfillmentDisplay },
    { label: 'Admin AI', value: store.store_admin || '-' },
    { label: 'Nomor Admin', value: store.store_admin_number || '-' },
    { label: 'Bot Always On', value: store.store_bot_always_on ? 'ON' : 'OFF', statusBadge: true, active: !!store.store_bot_always_on },
    { label: 'Tagline', value: store.store_tagline || '-' },
    { label: 'Alamat Toko', value: store.store_address || '-', pre: true },
    { label: 'Status', value: store.store_status, statusBadge: true, active: store.store_status === 'AKTIF' },
    { label: 'Terakhir Update', value: store.store_updated_at || '-' },
  ];

  const canUpload = imageData.total_images < imageData.max_images;
  const remaining = imageData.max_images - imageData.total_images;

  return (
    <div className="space-y-6">
      {/* Store Header Card */}
      <div className="glass-dark rounded-2xl p-6 bg-gradient-to-r from-brand-600/20 to-cyan-600/20 border-brand-500/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{store.store_name || 'Toko Saya'}</h2>
            <p className="text-gray-400 mt-1">{store.store_tagline || '-'}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${store.store_status === 'AKTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {store.store_status}
              </span>
              <span className="text-gray-500 text-sm">
                <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /></svg>
                {whatsappNumber}
              </span>
            </div>
          </div>
          <a href="/user/edit" className="btn-primary text-sm !py-2 !px-5 self-start">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Toko
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="glass-dark rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Informasi Toko</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-800">
              {infoRows.map((row) => (
                <tr key={row.label}>
                  <td className="py-3 text-gray-500 w-2/5">{row.label}</td>
                  <td className="py-3 text-gray-200" style={row.pre ? { whiteSpace: 'pre-wrap' } : undefined}>
                    {row.statusBadge ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${row.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {row.value}
                      </span>
                    ) : row.badge ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400">{row.value}</span>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Features */}
        <div className="glass-dark rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Fitur Produk</h3>
          <p className="text-gray-300 text-sm" style={{ whiteSpace: 'pre-wrap' }}>{store.store_feature || '-'}</p>
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="glass-dark rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">Knowledge Base</h3>
        <p className="text-gray-300 text-sm" style={{ whiteSpace: 'pre-wrap' }}>{store.store_knowledge_base || '-'}</p>
      </div>

      {/* Foto Produk - Upload & Gallery */}
      <div className="glass-dark rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto Produk
          </h3>
          <span className="text-xs font-medium text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            {imageData.total_images} / {imageData.max_images}
          </span>
        </div>

        {/* Alerts */}
        {uploadMsg && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between mb-4">
            {uploadMsg}
            <button onClick={() => setUploadMsg('')} className="text-green-500/50 hover:text-green-400 ml-2">&times;</button>
          </div>
        )}
        {uploadErr && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between mb-4">
            {uploadErr}
            <button onClick={() => setUploadErr('')} className="text-red-500/50 hover:text-red-400 ml-2">&times;</button>
          </div>
        )}

        {/* Image Grid */}
        {imageData.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
            {imageData.images.map((img) => (
              <div key={img.filename} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  className="w-full h-32 object-cover rounded-xl border border-gray-700"
                  alt="Product"
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
                <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                  {img.filename}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {imageLoaded && imageData.images.length === 0 && (
          <div className="text-center py-8 mb-4">
            <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">Belum ada foto produk</p>
            <p className="text-sm text-gray-600 mt-1">Upload foto di bawah untuk memulai</p>
          </div>
        )}

        {/* Upload Section */}
        {canUpload ? (
          <div>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-brand-400 bg-brand-500/10'
                  : 'border-gray-700 hover:border-gray-500'
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
              <svg className="w-10 h-10 mx-auto text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="text-sm text-gray-400">Klik atau drag & drop gambar di sini</p>
              <p className="text-xs text-gray-600 mt-1">JPG, PNG, GIF, WebP. Maks {remaining} gambar lagi.</p>
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
                        className="w-full h-20 object-cover rounded-lg border border-gray-700"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePreview(i); }}
                        className="absolute -top-1.5 -right-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                      Upload {selectedFiles.length} Gambar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Maksimal {imageData.max_images} gambar tercapai. Hapus gambar untuk mengupload yang baru.
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
