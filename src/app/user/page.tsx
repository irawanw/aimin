'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PenLine, Globe, Briefcase, BarChart2,
  TrendingUp, MessageSquare, Images, ArrowRight,
  CheckCircle2, Clock, Zap,
} from 'lucide-react';

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
  store_subdomain?: string;
}

interface ImageInfo { filename: string; product: string | null; url: string; }
interface ImageData { folder: string; total_images: number; max_images: number; images: ImageInfo[]; }

const STORE_TYPE_LABELS: Record<string, string> = { store: 'Store', services: 'Services', others: 'Others' };
const FULFILLMENT_LABELS: Record<string, string> = {
  delivery: 'Dikirim', pickup: 'Diambil', meeting_schedule: 'Konsultasi',
  book_date: 'Book Tanggal', book_date_range: 'Book Rentang', visit_location: 'Kunjungan',
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function QuickAction({ href, icon: Icon, label, desc, color }: {
  href: string; icon: React.ElementType; label: string; desc: string; color: string;
}) {
  return (
    <motion.a
      href={href}
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className="group flex items-center gap-3 p-3.5 bg-[--surface-2] hover:bg-[--surface-3] border border-[--border] rounded-xl transition-all duration-200"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[--text-primary] truncate">{label}</p>
        <p className="text-xs text-[--text-muted] truncate">{desc}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-[--text-muted] group-hover:text-[--text-secondary] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </motion.a>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-[--surface-2] border border-[--border] rounded-xl p-4 flex items-start gap-3"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[--text-muted] font-medium">{label}</p>
        <p className="text-2xl font-semibold text-[--text-primary] font-mono leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-[--text-muted] mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function UserPageWrapper() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDashboard />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-24 bg-[--surface-2] rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[--surface-2] rounded-xl" />)}
      </div>
      <div className="h-48 bg-[--surface-2] rounded-xl" />
    </div>
  );
}

function UserDashboard() {
  const searchParams = useSearchParams();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageData, setImageData] = useState<ImageData>({ folder: '', total_images: 0, max_images: 20, images: [] });
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
      if (res.ok && !data.error) setImageData(data);
    } catch {}
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      fetch('/api/user/token-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) window.location.href = '/user';
          else { setError(data.error || 'Login gagal'); setLoading(false); }
        })
        .catch(() => { setError('Gagal menghubungi server'); setLoading(false); });
      return;
    }
    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(data.error); else setStore(data); setLoading(false); })
      .catch(() => { setError('Gagal memuat data toko'); setLoading(false); });
    fetchImages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (uploadMsg) { const t = setTimeout(() => setUploadMsg(''), 4000); return () => clearTimeout(t); } }, [uploadMsg]);
  useEffect(() => { if (uploadErr) { const t = setTimeout(() => setUploadErr(''), 6000); return () => clearTimeout(t); } }, [uploadErr]);

  const handleFileSelect = (files: File[]) => {
    const remaining = imageData.max_images - imageData.total_images;
    const limited = files.slice(0, remaining);
    setSelectedFiles(limited);
    const newPreviews: string[] = [];
    limited.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => { newPreviews.push(ev.target?.result as string); if (newPreviews.length === limited.length) setPreviews([...newPreviews]); };
      reader.readAsDataURL(file);
    });
    if (limited.length === 0) setPreviews([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true); setUploadErr('');
    try {
      const base64Images = await Promise.all(selectedFiles.map((file) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file);
      })));
      const res = await fetch('/api/user/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: base64Images }) });
      const result = await res.json();
      if (result.success) { setUploadMsg(`${result.uploaded} gambar berhasil diupload`); setSelectedFiles([]); setPreviews([]); if (fileInputRef.current) fileInputRef.current.value = ''; await fetchImages(); }
      else setUploadErr(result.error || 'Upload gagal');
    } catch (err: any) { setUploadErr(err.message); } finally { setUploading(false); }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus gambar ${filename}?`)) return;
    setDeletingFile(filename); setUploadErr('');
    try {
      const res = await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) { setUploadMsg(`Gambar ${filename} dihapus`); await fetchImages(); }
      else setUploadErr(result.error || 'Gagal menghapus');
    } catch (err: any) { setUploadErr(err.message); } finally { setDeletingFile(null); }
  };

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="bg-[--surface-2] border border-[--border] rounded-xl p-8 max-w-md mx-auto text-center">
        <p className="text-red-400 text-sm mb-1">{error}</p>
        <p className="text-[--text-muted] text-xs">Silakan minta link login baru melalui WhatsApp.</p>
      </div>
    );
  }
  if (!store) return null;

  const whatsappNumber = store.store_whatsapp_jid.replace('@s.whatsapp.net', '');
  const isActive = store.store_status === 'AKTIF';
  const isBotOn = !!store.store_bot_always_on;
  const canUpload = imageData.total_images < imageData.max_images;
  const fulfillmentList = parseFulfillment(store.store_fulfillment);
  const storeTypeLabel = STORE_TYPE_LABELS[store.store_type] || store.store_type || 'store';

  const STORE_INFO_ROWS = [
    { label: 'Tipe Toko', value: storeTypeLabel },
    { label: store.store_type === 'services' ? 'Metode Layanan' : 'Pengiriman', value: fulfillmentList.map(f => FULFILLMENT_LABELS[f] || f).join(', ') || '-' },
    { label: 'Admin AI', value: store.store_admin || '-' },
    { label: 'Nomor Admin', value: store.store_admin_number || '-' },
    { label: 'Alamat', value: store.store_address || '-' },
    { label: 'Update', value: store.store_updated_at ? new Date(store.store_updated_at).toLocaleDateString('id-ID') : '-' },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 max-w-5xl">

      {/* Hero card */}
      <motion.div variants={fadeUp} className="relative overflow-hidden bg-gradient-to-br from-[--surface-2] to-[--surface-3] border border-[--border] rounded-2xl p-5">
        {/* Glow */}
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-mint-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-mint-400 to-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-mint-500/20 flex-shrink-0">
              {store.store_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[--text-primary]">{store.store_name}</h2>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-mint-500/15 text-mint-400' : 'bg-red-500/15 text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-mint-400 animate-pulse' : 'bg-red-400'}`} />
                  {store.store_status}
                </span>
              </div>
              <p className="text-sm text-[--text-muted] mt-0.5">{store.store_tagline || 'Belum ada tagline'}</p>
              <p className="text-xs text-[--text-muted] mt-1 font-mono">+{whatsappNumber}</p>
            </div>
          </div>
          <a href="/user/edit" className="self-start flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-mint-600 hover:bg-mint-500 text-white transition-colors shadow-lg shadow-mint-500/20 whitespace-nowrap">
            <PenLine className="w-3.5 h-3.5" />
            Edit Toko
          </a>
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Status Toko"
          value={isActive ? 'Aktif' : 'Nonaktif'}
          icon={CheckCircle2}
          accent={isActive ? 'bg-mint-500/15 text-mint-400' : 'bg-red-500/15 text-red-400'}
        />
        <StatCard
          label="Bot WhatsApp"
          value={isBotOn ? 'ON' : 'OFF'}
          sub="always on"
          icon={Zap}
          accent={isBotOn ? 'bg-amber-500/15 text-amber-400' : 'bg-[--surface-3] text-[--text-muted]'}
        />
        <StatCard
          label="Foto Produk"
          value={`${imageData.total_images}/${imageData.max_images}`}
          sub="diunggah"
          icon={Images}
          accent="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label="Terakhir Update"
          value={store.store_updated_at ? new Date(store.store_updated_at).toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : '-'}
          icon={Clock}
          accent="bg-violet-500/15 text-violet-400"
        />
      </motion.div>

      {/* Quick actions + store info */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Quick actions */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[--text-muted] px-0.5">Aksi Cepat</p>
          <div className="space-y-1.5">
            <QuickAction href="/user/services" icon={Briefcase} label="Kelola Layanan" desc="Tambah atau edit layanan" color="bg-brand-500/15 text-brand-400" />
            <QuickAction href="/user/website" icon={Globe} label="Atur Website" desc="Template & warna" color="bg-cyan-500/15 text-cyan-400" />
            <QuickAction href="/user/conversations" icon={BarChart2} label="Percakapan" desc="Statistik chat bot" color="bg-mint-500/15 text-mint-400" />
            <QuickAction href="/user/reviews" icon={TrendingUp} label="Ulasan" desc="Rating & testimoni" color="bg-amber-500/15 text-amber-400" />
            <QuickAction href="/user/widget" icon={MessageSquare} label="Chat Widget" desc="Pasang di website" color="bg-violet-500/15 text-violet-400" />
          </div>
        </motion.div>

        {/* Store info */}
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-[--surface-2] border border-[--border] rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[--text-muted] mb-3">Informasi Toko</p>
          <table className="w-full text-sm table-fixed">
            <tbody>
              {STORE_INFO_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-[--border-subtle] last:border-0">
                  <td className="py-2.5 text-[--text-muted] text-xs w-1/3 align-top pr-2">{row.label}</td>
                  <td className="py-2.5 text-[--text-secondary] text-xs break-words" style={{ wordBreak: 'break-word' }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Knowledge Base */}
      {store.store_knowledge_base && (
        <motion.div variants={fadeUp} className="bg-[--surface-2] border border-[--border] rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[--text-muted] mb-3">Knowledge Base</p>
          <p className="text-sm text-[--text-secondary] break-words leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{store.store_knowledge_base}</p>
        </motion.div>
      )}

      {/* Foto Produk */}
      <motion.div variants={fadeUp} className="bg-[--surface-2] border border-[--border] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[--text-muted]">Foto Produk</p>
          </div>
          <span className="text-xs font-mono text-[--text-muted] bg-[--surface-3] px-2.5 py-1 rounded-lg border border-[--border]">
            {imageData.total_images}/{imageData.max_images}
          </span>
        </div>

        {uploadMsg && (
          <div className="mb-3 text-xs text-mint-400 bg-mint-500/10 border border-mint-500/20 px-3 py-2 rounded-lg flex items-center justify-between">
            {uploadMsg}
            <button onClick={() => setUploadMsg('')} className="text-mint-500/50 hover:text-mint-400 ml-2 text-base leading-none">&times;</button>
          </div>
        )}
        {uploadErr && (
          <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg flex items-center justify-between">
            {uploadErr}
            <button onClick={() => setUploadErr('')} className="text-red-500/50 hover:text-red-400 ml-2 text-base leading-none">&times;</button>
          </div>
        )}

        {imageData.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
            {imageData.images.map((img) => (
              <div key={img.filename} className="relative group aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} className="w-full h-full object-cover rounded-lg border border-[--border]" alt="Product" loading="lazy" />
                <button
                  onClick={() => handleDelete(img.filename)}
                  disabled={deletingFile === img.filename}
                  className="absolute inset-0 bg-black/0 hover:bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {deletingFile === img.filename ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {canUpload && (
          <div>
            <div
              className={`border border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${dragOver ? 'border-mint-500/60 bg-mint-500/5' : 'border-[--border] hover:border-[--text-muted]/40'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) handleFileSelect(files); }}
              onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ''; fileInputRef.current?.click(); }}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(e) => handleFileSelect(Array.from(e.target.files || []))} onClick={(e) => e.stopPropagation()} className="hidden" />
              <Images className="w-7 h-7 mx-auto text-[--text-muted] mb-2" />
              <p className="text-xs text-[--text-secondary]">Klik atau seret gambar ke sini</p>
              <p className="text-xs text-[--text-muted] mt-1">JPG, PNG, GIF, WebP · Maks {imageData.max_images - imageData.total_images} lagi</p>
            </div>

            {previews.length > 0 && (
              <div className="mt-3">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative aspect-square group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Preview ${i+1}`} className="w-full h-full object-cover rounded-lg border border-[--border]" />
                      <button
                        onClick={(e) => { e.stopPropagation(); const nf = [...selectedFiles]; nf.splice(i,1); setSelectedFiles(nf); const np=[...previews]; np.splice(i,1); setPreviews(np); }}
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[--surface-3] border border-[--border] rounded-full text-[--text-muted] text-xs flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                        style={{width:'18px',height:'18px'}}
                      >&times;</button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-3 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-mint-600 hover:bg-mint-500 text-white transition-colors disabled:opacity-50 shadow-lg shadow-mint-500/20"
                >
                  {uploading ? <><span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Mengupload...</> : <>Upload {selectedFiles.length} Gambar</>}
                </button>
              </div>
            )}
          </div>
        )}

        {!canUpload && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            Kapasitas penuh ({imageData.max_images} gambar). Hapus gambar untuk mengupload yang baru.
          </p>
        )}
      </motion.div>

    </motion.div>
  );
}

function parseFulfillment(raw: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
