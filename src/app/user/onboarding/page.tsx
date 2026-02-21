'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StepConfig {
  id: number;
  step_key: string;
  step_title: string;
  step_description: string;
  step_placeholder: string;
  step_order: number;
}

interface UploadedImage {
  filename: string;
  url: string;
  tag: string;
  saving: boolean;
  saved: boolean;
}

interface FormData {
  store_name: string;
  store_type: string;
  store_tagline: string;
  store_feature: string;
  store_knowledge_base: string;
  store_address: string;
  store_fulfillment: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STORE_TYPES = [
  { value: 'store', label: 'Toko / Produk', desc: 'Jual barang fisik atau digital', icon: '🛍️' },
  { value: 'services', label: 'Jasa / Layanan', desc: 'Tawarkan keahlian atau layanan', icon: '⚡' },
  { value: 'others', label: 'Lainnya', desc: 'Kombinasi atau jenis usaha lain', icon: '✨' },
];

const FULFILLMENT_OPTIONS = [
  { value: 'delivery', label: 'Dikirim', desc: 'Pengiriman ke alamat pelanggan', icon: '🚚' },
  { value: 'pickup', label: 'Ambil Sendiri', desc: 'Pelanggan datang ke toko', icon: '🏪' },
  { value: 'meeting_schedule', label: 'Konsultasi', desc: 'Pertemuan atau konsultasi', icon: '📅' },
  { value: 'book_date', label: 'Book Tanggal', desc: 'Reservasi tanggal tertentu', icon: '📆' },
  { value: 'book_date_range', label: 'Book Rentang', desc: 'Sewa atau rental per periode', icon: '🗓️' },
  { value: 'visit_location', label: 'Kunjungan', desc: 'Tim datang ke lokasi pelanggan', icon: '📍' },
];

// Map step_key → allowed store field
const STEP_FIELD_MAP: Record<string, string> = {
  store_name: 'store_name',
  store_type: 'store_type',
  store_tagline: 'store_tagline',
  store_feature: 'store_feature',
  store_knowledge_base: 'store_knowledge_base',
  store_address: 'store_address',
  store_fulfillment: 'store_fulfillment',
};

// ─── Animation Variants ───────────────────────────────────────────────────────
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

// ─── Input Components ─────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, onEnter, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string; onEnter: () => void; autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onEnter(); }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full bg-transparent border-b-2 border-white/20 focus:border-mint-400 text-white text-xl sm:text-2xl placeholder:text-white/25 focus:outline-none pb-3 transition-colors duration-300 caret-mint-400"
    />
  );
}

function TextareaInput({ value, onChange, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={5}
      className="w-full bg-white/5 border border-white/15 focus:border-mint-400/60 rounded-2xl text-white text-base placeholder:text-white/25 focus:outline-none p-4 resize-none transition-colors duration-300 caret-mint-400 leading-relaxed"
    />
  );
}

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      {STORE_TYPES.map((type) => (
        <motion.button key={type.value} type="button" onClick={() => onChange(type.value)} whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
            value === type.value ? 'border-mint-400/70 bg-mint-400/10 shadow-lg shadow-mint-400/10' : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
          }`}
        >
          <span className="text-2xl flex-shrink-0">{type.icon}</span>
          <div>
            <p className="text-white font-semibold text-base">{type.label}</p>
            <p className="text-white/50 text-sm mt-0.5">{type.desc}</p>
          </div>
          {value === type.value && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="ml-auto w-6 h-6 rounded-full bg-mint-400 flex items-center justify-center flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function FulfillmentSelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FULFILLMENT_OPTIONS.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <motion.button key={opt.value} type="button" onClick={() => toggle(opt.value)} whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 ${
              active ? 'border-mint-400/70 bg-mint-400/10 shadow-md shadow-mint-400/10' : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
            }`}
          >
            <span className="text-xl flex-shrink-0">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">{opt.label}</p>
              <p className="text-white/40 text-xs mt-0.5 truncate">{opt.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${active ? 'bg-mint-400 border-mint-400' : 'border-white/20 bg-white/5'}`}>
              {active && (
                <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

interface Product { folder: string; name: string; }

const POLL_INTERVAL = 2500;  // ms between polls
const POLL_TIMEOUT  = 60000; // 60s max wait

// ─── Image Uploader with Per-Image Tagging ────────────────────────────────────
function ImageUploader({ images, setImages }: {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [polling, setPolling] = useState(true);   // true while waiting for products
  const [pollTimeout, setPollTimeout] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tagTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(Date.now());

  // Poll /api/user/images until products appear or timeout
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/user/images');
        const data = await r.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          setPolling(false);
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
      } catch {}
      if (Date.now() - startRef.current >= POLL_TIMEOUT) {
        setPolling(false);
        setPollTimeout(true);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    check(); // immediate first check
    pollRef.current = setInterval(check, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setUploading(true);
    setError('');
    try {
      const base64List = await Promise.all(
        imgs.map((f) => new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(f);
        }))
      );
      const response = await fetch('/api/user/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64List }),
      });
      const result = await response.json();
      if (result.success && result.filenames) {
        const newImgs: UploadedImage[] = result.filenames.map((filename: string, i: number) => ({
          filename,
          url: '',
          tag: '',
          saving: false,
          saved: false,
          _base64: base64List[i],
        }));
        // Fetch fresh image list to get URLs
        const listRes = await fetch('/api/user/images');
        const listData = await listRes.json();
        const urlMap: Record<string, string> = {};
        if (listData.images) {
          for (const img of listData.images) urlMap[img.filename] = img.url;
        }
        setImages((prev) => [
          ...prev,
          ...newImgs.map((img) => ({ ...img, url: urlMap[img.filename] || '' })),
        ]);
      } else {
        setError(result.error || 'Upload gagal');
      }
    } catch {
      setError('Gagal mengupload gambar');
    } finally {
      setUploading(false);
    }
  }, [setImages]);

  const saveTag = useCallback(async (filename: string, tag: string) => {
    setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, saving: true, saved: false } : img));
    try {
      await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: tag }),
      });
      setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, saving: false, saved: true } : img));
      setTimeout(() => {
        setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, saved: false } : img));
      }, 2000);
    } catch {
      setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, saving: false } : img));
    }
  }, [setImages]);

  const handleTagChange = (filename: string, tag: string) => {
    setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, tag, saved: false } : img));
    // Debounce save
    if (tagTimers.current[filename]) clearTimeout(tagTimers.current[filename]);
    tagTimers.current[filename] = setTimeout(() => saveTag(filename, tag), 800);
  };

  const handleTagBlur = (filename: string, tag: string) => {
    if (tagTimers.current[filename]) {
      clearTimeout(tagTimers.current[filename]);
      delete tagTimers.current[filename];
    }
    saveTag(filename, tag);
  };

  const handleDelete = async (filename: string) => {
    try {
      await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.filename !== filename));
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Polling state — AI parsing KB */}
      {polling && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-mint-400/20 bg-mint-400/5">
          <div className="w-5 h-5 border-2 border-mint-400/40 border-t-mint-400 rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-white/80 text-sm font-medium">AI sedang menganalisis knowledge base kamu...</p>
            <p className="text-white/35 text-xs mt-0.5">Menunggu daftar produk siap. Ini hanya butuh beberapa detik.</p>
          </div>
        </div>
      )}

      {/* Timeout — products still empty after 60s */}
      {pollTimeout && products.length === 0 && (
        <div className="px-4 py-3.5 rounded-2xl border border-amber-400/20 bg-amber-400/5">
          <p className="text-amber-400 text-sm font-medium">Produk belum siap</p>
          <p className="text-white/40 text-xs mt-0.5">AI belum selesai menganalisis. Kamu bisa lewati langkah ini dan tambahkan tag nanti di dashboard.</p>
        </div>
      )}

      {/* Uploaded images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.filename} className="group relative">
              {/* Image */}
              <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                )}
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(img.filename)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Tag — always a dropdown from store_products */}
              <div className="mt-1.5 relative">
                <select
                  value={img.tag}
                  onChange={(e) => handleTagChange(img.filename, e.target.value)}
                  onBlur={(e) => handleTagBlur(img.filename, e.target.value)}
                  disabled={polling || products.length === 0}
                  className="w-full bg-[#0d1a12] border border-white/10 focus:border-mint-400/50 rounded-lg text-white text-xs focus:outline-none px-2.5 py-1.5 pr-6 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {polling ? (
                    <option value="">Menunggu daftar produk...</option>
                  ) : products.length === 0 ? (
                    <option value="">Belum ada produk</option>
                  ) : (
                    <>
                      <option value="">-- Pilih Produk --</option>
                      {products.map((p) => (
                        <option key={p.folder} value={p.folder}>{p.name}</option>
                      ))}
                    </>
                  )}
                </select>
                {/* Status indicator */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  {img.saving && (
                    <div className="w-3 h-3 border border-white/30 border-t-mint-400 rounded-full animate-spin" />
                  )}
                  {img.saved && !img.saving && (
                    <svg className="w-3 h-3 text-mint-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-mint-400/70 bg-mint-400/8' : 'border-white/15 hover:border-white/25 bg-white/3'
        }`}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Mengupload...</p>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-1.5">📸</div>
            <p className="text-white/70 font-medium text-sm">
              {images.length > 0 ? `${images.length} foto · Tambah lagi` : 'Klik atau seret foto ke sini'}
            </p>
            <p className="text-white/30 text-xs mt-1">JPG, PNG, WebP</p>
          </>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {images.length > 0 && products.length > 0 && (
        <p className="text-white/30 text-xs text-center">
          Pilih produk untuk setiap foto dari dropdown di bawahnya
        </p>
      )}
    </div>
  );
}

// ─── Success Page ─────────────────────────────────────────────────────────────
function SuccessPage({ onDashboard, whatsapp }: { onDashboard: () => void; whatsapp: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-8xl mb-6"
      >🎉</motion.div>

      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-3xl sm:text-4xl font-bold text-white mb-2"
      >Hore! 🥳</motion.h1>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <p className="text-xl sm:text-2xl font-semibold text-mint-400 mb-4">
          WhatsApp Assistant Kamu<br />telah Aktif!
        </p>
        <p className="text-white/60 text-base leading-relaxed mb-2">
          Kakak bisa coba untuk mengirimkan pesan ke WhatsApp yang tadi didaftarkan ya 👇
        </p>
        {whatsapp && (
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 rounded-xl transition-all mt-1 mb-6"
          >
            <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            +{whatsapp}
          </a>
        )}
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        onClick={onDashboard}
        className="flex items-center gap-2 px-8 py-3.5 bg-mint-500 hover:bg-mint-400 text-black font-bold rounded-2xl transition-all shadow-xl shadow-mint-500/30 text-base active:scale-[0.98]"
      >
        Ke Dashboard
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </motion.button>

      {[...Array(6)].map((_, i) => (
        <motion.div key={i} className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{ background: ['#4ade80','#22d3ee','#a78bfa','#fb923c','#f472b6','#facc15'][i], left: `${15 + i * 12}%`, top: '20%' }}
          animate={{ y: [0, -40, 0], x: [0, (i % 2 === 0 ? 10 : -10), 0], opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 2, delay: 0.5 + i * 0.15, repeat: Infinity, repeatDelay: 1 }}
        />
      ))}
    </motion.div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<StepConfig[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [form, setForm] = useState<FormData>({
    store_name: '',
    store_type: '',
    store_tagline: '',
    store_feature: '',
    store_knowledge_base: '',
    store_address: '',
    store_fulfillment: [],
  });

  useEffect(() => {
    fetch('/api/user/onboarding')
      .then((r) => r.json())
      .then((data) => { setSteps(data.steps || []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data.store_whatsapp_jid) {
          setWhatsappNumber(data.store_whatsapp_jid.replace('@s.whatsapp.net', ''));
        }
        setForm((f) => ({
          ...f,
          store_name: data.store_name && data.store_name !== 'Toko Baru' ? data.store_name : '',
          store_type: data.store_type || '',
          store_tagline: data.store_tagline || '',
          store_feature: data.store_feature || '',
          store_knowledge_base: data.store_knowledge_base || '',
          store_address: data.store_address || '',
          store_fulfillment: parseFulfillment(data.store_fulfillment),
        }));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSteps = steps.length;
  const step = steps[currentStep];
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const isImageStep = step?.step_key === 'store_images';
  const isOptional = isImageStep;

  const canProceed = () => {
    if (!step) return false;
    switch (step.step_key) {
      case 'store_name': return form.store_name.trim().length > 0;
      case 'store_type': return form.store_type.length > 0;
      case 'store_tagline': return form.store_tagline.trim().length > 0;
      case 'store_feature': return form.store_feature.trim().length > 0;
      case 'store_knowledge_base': return form.store_knowledge_base.trim().length > 0;
      case 'store_images': return true;
      case 'store_address': return form.store_address.trim().length > 0;
      case 'store_fulfillment': return form.store_fulfillment.length > 0;
      default: return true;
    }
  };

  // Save current step's data to /api/user/store immediately
  const saveCurrentStep = async () => {
    if (!step || step.step_key === 'store_images') return;
    const field = STEP_FIELD_MAP[step.step_key];
    if (!field) return;

    let value: any;
    if (step.step_key === 'store_fulfillment') {
      value = JSON.stringify(form.store_fulfillment);
    } else {
      value = form[step.step_key as keyof FormData];
    }

    try {
      await fetch('/api/user/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // Save silently — don't block navigation
    }
  };

  const goNext = async () => {
    if (!canProceed()) return;
    setSaving(true);

    if (currentStep < totalSteps - 1) {
      await saveCurrentStep();
      setSaving(false);
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } else {
      // Final step — save last field + mark onboarding done
      await saveCurrentStep();
      try {
        await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Just mark done; fields already saved step-by-step
        });
      } catch {}
      setSaving(false);
      setShowSuccess(true);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const updateField = (key: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f0d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: 'linear-gradient(135deg, #080c0a 0%, #0d1a12 40%, #0a1019 100%)' }}>
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4ade8020 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #22d3ee15 0%, transparent 70%)' }} />
      </div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Progress bar */}
      {!showSuccess && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-1 bg-white/5">
            <motion.div className="h-full bg-gradient-to-r from-mint-500 to-cyan-400"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
          </div>
        </div>
      )}

      {/* Top bar */}
      {!showSuccess && (
        <div className="absolute top-3 left-0 right-0 z-10 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-lg shadow-mint-500/30">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white/60 text-sm font-medium">AiMin Setup</span>
          </div>
          <div className="text-white/35 text-xs font-mono tabular-nums">{currentStep + 1} / {totalSteps}</div>
        </div>
      )}

      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 overflow-y-auto">
        {showSuccess ? (
          <SuccessPage onDashboard={() => router.push('/user')} whatsapp={whatsappNumber} />
        ) : (
          <div className="w-full max-w-xl py-20">
            <AnimatePresence mode="wait" custom={direction}>
              {step && (
                <motion.div key={step.step_key} custom={direction} variants={slideVariants}
                  initial="enter" animate="center" exit="exit" className="space-y-7"
                >
                  {/* Header */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-mint-400/70 font-mono">
                      Langkah {currentStep + 1}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
                      {step.step_title}
                    </h1>
                    {step.step_description && (
                      <p className="text-white/50 text-base leading-relaxed">{step.step_description}</p>
                    )}
                  </div>

                  {/* Input */}
                  <div>
                    {step.step_key === 'store_name' && (
                      <TextInput value={form.store_name} onChange={(v) => updateField('store_name', v)}
                        placeholder={step.step_placeholder || 'Nama toko kamu...'} onEnter={goNext} autoFocus />
                    )}
                    {step.step_key === 'store_type' && (
                      <TypeSelector value={form.store_type} onChange={(v) => updateField('store_type', v)} />
                    )}
                    {step.step_key === 'store_tagline' && (
                      <TextInput value={form.store_tagline} onChange={(v) => updateField('store_tagline', v)}
                        placeholder={step.step_placeholder || 'Tagline kamu...'} onEnter={goNext} autoFocus />
                    )}
                    {step.step_key === 'store_feature' && (
                      <TextareaInput value={form.store_feature} onChange={(v) => updateField('store_feature', v)}
                        placeholder={step.step_placeholder || 'Ceritakan produk unggulan kamu...'} autoFocus />
                    )}
                    {step.step_key === 'store_knowledge_base' && (
                      <TextareaInput value={form.store_knowledge_base} onChange={(v) => updateField('store_knowledge_base', v)}
                        placeholder={step.step_placeholder || 'Info penting untuk AI kamu...'} autoFocus />
                    )}
                    {step.step_key === 'store_images' && (
                      <ImageUploader images={uploadedImages} setImages={setUploadedImages} />
                    )}
                    {step.step_key === 'store_address' && (
                      <TextareaInput value={form.store_address} onChange={(v) => updateField('store_address', v)}
                        placeholder={step.step_placeholder || 'Alamat lengkap toko kamu...'} autoFocus />
                    )}
                    {step.step_key === 'store_fulfillment' && (
                      <FulfillmentSelector value={form.store_fulfillment} onChange={(v) => updateField('store_fulfillment', v)} />
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={goBack}
                      className={`flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Kembali
                    </button>

                    <div className="flex items-center gap-3">
                      {isOptional && (
                        <button onClick={goNext} className="text-sm text-white/35 hover:text-white/60 transition-colors">
                          Lewati
                        </button>
                      )}
                      <motion.button onClick={goNext}
                        disabled={(!canProceed() && !isOptional) || saving}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 ${
                          canProceed() || isOptional
                            ? 'bg-mint-500 hover:bg-mint-400 text-black shadow-xl shadow-mint-500/25'
                            : 'bg-white/8 text-white/25 cursor-not-allowed'
                        }`}
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            {currentStep === totalSteps - 1 ? 'Selesai' : 'Lanjut'}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Keyboard hint */}
                  {(step.step_key === 'store_name' || step.step_key === 'store_tagline') && canProceed() && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/20 text-xs text-center">
                      Tekan <kbd className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/30">Enter</kbd> untuk lanjut
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-10">
              {steps.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 h-1.5 bg-mint-400' : i < currentStep ? 'w-1.5 h-1.5 bg-mint-400/40' : 'w-1.5 h-1.5 bg-white/15'
                }`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function parseFulfillment(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}
