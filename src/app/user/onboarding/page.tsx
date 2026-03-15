'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── SVG Icon Components ──────────────────────────────────────────────────────
function IconPackage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

function IconBriefcase({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    </svg>
  );
}

function IconTruck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="1.5" strokeWidth={1.5} />
      <circle cx="18.5" cy="18.5" r="1.5" strokeWidth={1.5} />
    </svg>
  );
}

function IconStore({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 22V12h6v10" />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function IconCalendarCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 16l2 2 4-4" />
    </svg>
  );
}

function IconCalendarRange({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 15h8M8 18h5" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" strokeWidth={1.5} />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />
    </svg>
  );
}

function IconFileText({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" strokeWidth={1.5} />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M17.36 17.36l1.42 1.42M3 12H1M23 12h-2M4.22 19.78l1.42-1.42M17.36 6.64l1.42-1.42" />
      <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="4" strokeWidth={1.5} />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" strokeWidth={0} />
    </svg>
  );
}

// ─── Animation Variants ───────────────────────────────────────────────────────
const slideVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:   (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.97, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } }),
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
      className="w-full bg-transparent border-b-2 border-white/20 focus:border-mint-400 text-white text-xl sm:text-2xl placeholder:text-white/20 focus:outline-none pb-3 transition-colors duration-300 caret-mint-400 tracking-tight"
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
      className="w-full bg-white/[0.04] border border-white/10 focus:border-mint-400/50 rounded-xl text-white text-base placeholder:text-white/20 focus:outline-none p-4 resize-none transition-colors duration-300 caret-mint-400 leading-relaxed"
    />
  );
}

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage();
  const storeTypes = [
    { value: 'store',    label: t('onboarding.typeStore'),    desc: t('onboarding.typeStoreDesc'),    Icon: IconPackage },
    { value: 'services', label: t('onboarding.typeServices'), desc: t('onboarding.typeServicesDesc'), Icon: IconBriefcase },
    // { value: 'others',   label: t('onboarding.typeOthers'),   desc: t('onboarding.typeOthersDesc'),   Icon: IconGrid },
  ];
  return (
    <div className="space-y-2.5">
      {storeTypes.map((type) => {
        const active = value === type.value;
        return (
          <motion.button key={type.value} type="button" onClick={() => onChange(type.value)} whileTap={{ scale: 0.99 }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
              active
                ? 'border-mint-400/50 bg-mint-400/8 shadow-lg shadow-mint-400/5'
                : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              active ? 'bg-mint-400/15 border border-mint-400/30' : 'bg-white/5 border border-white/8'
            }`}>
              <type.Icon className={`w-5 h-5 ${active ? 'text-mint-400' : 'text-white/50'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${active ? 'text-white' : 'text-white/80'}`}>{type.label}</p>
              <p className="text-white/40 text-xs mt-0.5">{type.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
              active ? 'border-mint-400 bg-mint-400' : 'border-white/20 bg-transparent'
            }`}>
              {active && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function FulfillmentSelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useLanguage();
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const fulfillmentOptions = [
    { value: 'delivery',         label: t('onboarding.fulfillDelivery'), desc: t('onboarding.fulfillDeliveryDesc'), Icon: IconTruck },
    { value: 'pickup',           label: t('onboarding.fulfillPickup'),   desc: t('onboarding.fulfillPickupDesc'),   Icon: IconStore },
    { value: 'meeting_schedule', label: t('onboarding.fulfillMeeting'),  desc: t('onboarding.fulfillMeetingDesc'),  Icon: IconCalendar },
    { value: 'book_date',        label: t('onboarding.fulfillBookDate'), desc: t('onboarding.fulfillBookDateDesc'), Icon: IconCalendarCheck },
    { value: 'book_date_range',  label: t('onboarding.fulfillBookRange'),desc: t('onboarding.fulfillBookRangeDesc'),Icon: IconCalendarRange },
    { value: 'visit_location',   label: t('onboarding.fulfillVisit'),    desc: t('onboarding.fulfillVisitDesc'),    Icon: IconMapPin },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {fulfillmentOptions.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <motion.button key={opt.value} type="button" onClick={() => toggle(opt.value)} whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 ${
              active
                ? 'border-mint-400/50 bg-mint-400/8'
                : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              active ? 'bg-mint-400/15 border border-mint-400/30' : 'bg-white/5 border border-white/8'
            }`}>
              <opt.Icon className={`w-4 h-4 ${active ? 'text-mint-400' : 'text-white/40'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${active ? 'text-white' : 'text-white/70'}`}>{opt.label}</p>
              <p className="text-white/35 text-xs mt-0.5 truncate">{opt.desc}</p>
            </div>
            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
              active ? 'bg-mint-400 border-mint-400' : 'border-white/20 bg-transparent'
            }`}>
              {active && (
                <svg className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const POLL_INTERVAL = 2500;
const POLL_TIMEOUT  = 8000;

// ─── Image Uploader ───────────────────────────────────────────────────────────
function ImageUploader({ images, setImages }: {
  images: UploadedImage[];
  setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}) {
  const { t } = useLanguage();
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [products, setProducts]       = useState<Product[]>([]);
  const [polling, setPolling]         = useState(true);
  const [pollTimeout, setPollTimeout] = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const tagTimers  = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef   = useRef(Date.now());

  useEffect(() => {
    let firstCheck = true;
    const stop = (timedOut = false) => {
      setPolling(false);
      if (timedOut) setPollTimeout(true);
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
    const check = async () => {
      try {
        const r = await fetch('/api/user/images');
        const data = await r.json();
        if (data.products && data.products.length > 0) {
          setProducts(data.products);
          stop(false);
          return;
        }
        if (firstCheck && Array.isArray(data.products) && data.products.length === 0) {
          stop(true);
          return;
        }
      } catch {}
      firstCheck = false;
      if (Date.now() - startRef.current >= POLL_TIMEOUT) stop(true);
    };
    check();
    pollRef.current = setInterval(check, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setUploading(true); setError('');
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
          filename, url: '', tag: '', saving: false, saved: false, _base64: base64List[i],
        }));
        const listRes = await fetch('/api/user/images');
        const listData = await listRes.json();
        const urlMap: Record<string, string> = {};
        if (listData.images) { for (const img of listData.images) urlMap[img.filename] = img.url; }
        setImages((prev) => [...prev, ...newImgs.map((img) => ({ ...img, url: urlMap[img.filename] || '' }))]);
      } else {
        setError(result.error || t('onboarding.imgUploadFailed'));
      }
    } catch { setError(t('onboarding.imgUploadFailed')); }
    finally { setUploading(false); }
  }, [setImages, t]);

  const saveTag = useCallback(async (filename: string, tag: string) => {
    setImages((prev) => prev.map((img) => img.filename === filename ? { ...img, saving: true, saved: false } : img));
    try {
      await fetch(`/api/user/images?filename=${encodeURIComponent(filename)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
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
    if (tagTimers.current[filename]) clearTimeout(tagTimers.current[filename]);
    tagTimers.current[filename] = setTimeout(() => saveTag(filename, tag), 800);
  };

  const handleTagBlur = (filename: string, tag: string) => {
    if (tagTimers.current[filename]) { clearTimeout(tagTimers.current[filename]); delete tagTimers.current[filename]; }
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
      {polling && (
        <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-mint-400/15 bg-mint-400/5">
          <div className="w-4 h-4 border-2 border-mint-400/30 border-t-mint-400 rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-white/75 text-sm font-medium">{t('onboarding.imgAnalyzing')}</p>
            <p className="text-white/30 text-xs mt-0.5">{t('onboarding.imgWaiting')}</p>
          </div>
        </div>
      )}

      {pollTimeout && products.length === 0 && (
        <div className="px-4 py-3.5 rounded-xl border border-amber-400/20 bg-amber-400/5">
          <p className="text-amber-400 text-sm font-medium">{t('onboarding.imgNotReady')}</p>
          <p className="text-white/35 text-xs mt-0.5">{t('onboarding.imgNotReadyHint')}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.filename} className="group relative">
              <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {img.url
                  ? <img src={img.url} alt={img.filename} className="w-full h-full object-cover" /> // eslint-disable-line
                  : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconImage className="w-8 h-8 text-white/20" />
                    </div>
                  )
                }
                <button onClick={() => handleDelete(img.filename)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <IconX className="w-3 h-3" />
                </button>
              </div>
              <div className="mt-1.5 relative">
                <select
                  value={img.tag}
                  onChange={(e) => handleTagChange(img.filename, e.target.value)}
                  onBlur={(e) => handleTagBlur(img.filename, e.target.value)}
                  disabled={polling || products.length === 0}
                  className="w-full bg-white/5 border border-white/10 focus:border-mint-400/50 rounded-lg text-white text-xs focus:outline-none px-2.5 py-1.5 pr-6 transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {polling ? (
                    <option value="">{t('onboarding.imgWaitingProduct')}</option>
                  ) : products.length === 0 ? (
                    <option value="">{t('onboarding.imgNoProduct')}</option>
                  ) : (
                    <>
                      <option value="">{t('onboarding.imgSelectProduct')}</option>
                      {products.map((p) => (
                        <option key={p.folder} value={p.folder}>{p.name}</option>
                      ))}
                    </>
                  )}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  {img.saving && <div className="w-3 h-3 border border-white/30 border-t-mint-400 rounded-full animate-spin" />}
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

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-mint-400/60 bg-mint-400/6' : 'border-white/10 hover:border-white/20 bg-transparent'
        }`}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 text-sm">{t('onboarding.imgUploading')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <IconImage className="w-5 h-5 text-white/35" />
            </div>
            <p className="text-white/60 font-medium text-sm">
              {images.length > 0 ? t('onboarding.imgAddMore', { n: images.length }) : t('onboarding.imgDropHere')}
            </p>
            <p className="text-white/25 text-xs">{t('onboarding.imgTypes')}</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {images.length > 0 && products.length > 0 && (
        <p className="text-white/25 text-xs text-center">{t('onboarding.imgSelectHint')}</p>
      )}
    </div>
  );
}

// ─── Success Page ─────────────────────────────────────────────────────────────
function SuccessPage({ onDashboard, subdomain }: { onDashboard: () => void; whatsapp?: string; subdomain: string }) {
  const { t } = useLanguage();
  const websiteUrl = subdomain ? `https://${subdomain}.aiminassist.com` : null;
  const webchatUrl = subdomain ? `/widget/chat?store=${subdomain}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center px-6 max-w-md mx-auto"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-8 relative"
      >
        <div className="w-20 h-20 rounded-full border-2 border-mint-400/40 bg-mint-400/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-mint-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <motion.path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
            />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full bg-mint-400/10 blur-xl -z-10 scale-150" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-mint-400/60 font-mono block mb-3">
          {t('onboarding.successLabel')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          {t('onboarding.successTitle')}
        </h1>
        <p className="text-white/50 text-base leading-relaxed mb-8">
          {t('onboarding.successDesc')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="w-full flex flex-col gap-3 mb-2"
      >
        {websiteUrl && (
          <a
            href={websiteUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3.5 bg-white/6 hover:bg-white/10 border border-white/10 hover:border-mint-400/30 rounded-xl transition-all text-sm font-medium text-white/80 hover:text-white"
          >
            <svg className="w-4 h-4 text-mint-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
            <span className="flex-1 text-left">{t('onboarding.successViewWebsite')}</span>
            <svg className="w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {webchatUrl && (
          <a
            href={webchatUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-5 py-3.5 bg-white/6 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-xl transition-all text-sm font-medium text-white/80 hover:text-white"
          >
            <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="flex-1 text-left">{t('onboarding.successTryWebchat')}</span>
            <svg className="w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        <button
          onClick={onDashboard}
          className="flex items-center gap-3 px-5 py-3.5 bg-mint-500 hover:bg-mint-400 text-black font-semibold rounded-xl transition-all shadow-lg shadow-mint-500/20 text-sm active:scale-[0.98]"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="flex-1 text-left">{t('onboarding.successOpenDashboard')}</span>
          <IconArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Store Type Pre-Screen ────────────────────────────────────────────────────
function StoreTypePreScreen({ value, onChange, onNext }: {
  value: string; onChange: (v: string) => void; onNext: () => void;
}) {
  const { t } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl mx-auto space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-mint-400/60 font-mono">{t('onboarding.typeStepLabel')}</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight">{t('onboarding.typeTitle')}</h1>
        <p className="text-white/45 text-base leading-relaxed">{t('onboarding.typeDesc')}</p>
      </div>
      <TypeSelector value={value} onChange={onChange} />
      <div className="flex justify-end pt-2">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onNext} disabled={!value}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            value ? 'bg-mint-500 hover:bg-mint-400 text-black shadow-lg shadow-mint-500/20' : 'bg-white/6 text-white/20 cursor-not-allowed'
          }`}
        >
          {t('onboarding.next')}
          <IconArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Analyze Screen ───────────────────────────────────────────────────────────
type OnboardingPhase = 'type_select' | 'analyze' | 'steps';

interface ExtractedData {
  store_name?: string;
  store_tagline?: string;
  store_feature?: string;
  store_admin_number?: string;
  store_email?: string;
  store_subdomain?: string;
  store_hero_title?: string;
  store_hero_subtitle?: string;
  store_about_us?: string;
  reviews?: Array<{ reviewer_name: string; review_text: string; rating?: number }>;
  gallery_image_urls?: string[];
  store_address?: string;
  knowledge_base?: string;
  is_product_catalog?: boolean;
  services?: Array<{ name: string; price?: string; image_url?: string }>;
  product_image_paths?: string[];
  store_hero_image_keyword?: string;
  store_theme_primary?: string;
  store_design_type?: string;
}

function AnalyzeScreen({ storeType, onComplete, onSkip }: { storeType: string; onComplete: (data: ExtractedData) => void; onSkip: () => void }) {
  const { t } = useLanguage();
  const [phase, setPhase]                   = useState<'picker' | 'url' | 'file' | 'instagram' | 'loading'>('picker');
  const [urlInput, setUrlInput]             = useState('');
  const [igInput, setIgInput]               = useState('');
  const [error, setError]                   = useState('');
  const [dragOver, setDragOver]             = useState(false);
  const [progress, setProgress]             = useState(0);
  const [progressMsg, setProgressMsg]       = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal]   = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = (body: globalThis.FormData | Record<string, string>) => {
    setError(''); setPhase('loading'); setProgress(0); setProgressMsg(t('onboarding.analyzeDropFile'));
    setProgressCurrent(0); setProgressTotal(0);

    const isFile = body instanceof globalThis.FormData;
    let reqBody: globalThis.FormData | string;
    if (isFile) { (body as globalThis.FormData).set('store_type', storeType); reqBody = body; }
    else { reqBody = JSON.stringify({ ...(body as Record<string, string>), store_type: storeType }); }

    fetch('/api/user/onboarding/analyze', {
      method: 'POST',
      headers: isFile ? undefined : { 'Content-Type': 'application/json' },
      body: reqBody,
    }).then(res => {
      if (!res.ok || !res.body) {
        res.text().then(txt => setError(txt.includes('{') ? (JSON.parse(txt)?.error || 'Server error') : 'Server error')).catch(() => setError('Server error'));
        setPhase('picker'); return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      const processChunk = ({ done, value }: ReadableStreamReadResult<Uint8Array>): Promise<void> | void => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'progress') {
                setProgress(data.pct || 0); setProgressMsg(data.message || '');
                if (data.total) setProgressTotal(data.total);
                if (data.current) setProgressCurrent(data.current);
              } else if (currentEvent === 'done') {
                setProgress(100); onComplete(data.data);
              } else if (currentEvent === 'error') {
                setError(data.message || 'Analysis failed'); setPhase('picker');
              }
            } catch {}
          } else if (line.trim() === '') {
            currentEvent = '';
          }
        }
        return reader.read().then(processChunk);
      };
      reader.read().then(processChunk).catch((err: any) => { setError(err?.message || 'Connection lost'); setPhase('picker'); });
    }).catch((err: any) => { setError(err?.message || 'Cannot reach server'); setPhase('picker'); });
  };

  const handleUrl       = () => { if (!urlInput.trim()) return; analyze({ url: urlInput.trim() }); };
  const handleInstagram = () => { if (!igInput.trim()) return; analyze({ platform: 'instagram', username: igInput.trim().replace(/^@/, '') }); };
  const handleFile      = (file: File) => { const fd = new globalThis.FormData(); fd.append('file', file); analyze(fd); };
  const handleDrop      = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); };

  if (phase === 'loading') {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl mx-auto flex flex-col gap-6 py-20">
        <div className="text-center">
          <p className="text-white font-semibold text-lg tracking-tight">{t('onboarding.analyzeLoadingTitle')}</p>
          <p className="text-white/35 text-sm mt-1">{progressMsg || '...'}</p>
        </div>
        <div className="space-y-2">
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-mint-500 to-cyan-400 rounded-full"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/35">{progressMsg}</span>
            <span className="text-mint-400 font-mono tabular-nums">
              {progressTotal > 0 ? `${progressCurrent}/${progressTotal}` : `${progress}%`}
            </span>
          </div>
        </div>
        {progressTotal > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {Array.from({ length: progressTotal }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i < progressCurrent ? 'bg-mint-400' : i === progressCurrent ? 'bg-mint-400/60 animate-pulse' : 'bg-white/12'
              }`} />
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl mx-auto space-y-6">
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-mint-400/60 font-mono">{t('onboarding.analyzeLabel')}</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight">
          {t('onboarding.analyzeTitle')}
        </h1>
        <p className="text-white/45 text-base leading-relaxed">
          {t('onboarding.analyzeDesc')}
        </p>
      </div>

      {phase === 'picker' && (
        <div className="space-y-2.5">
          {[
            { key: 'url',       Icon: IconGlobe,     label: 'Website URL', desc: t('onboarding.analyzeWebsiteDesc') },
            { key: 'instagram', Icon: IconInstagram, label: 'Instagram',   desc: t('onboarding.analyzeInstagramDesc') },
            { key: 'file',      Icon: IconFileText,  label: 'Upload File', desc: t('onboarding.analyzeFileDesc') },
          ].map((item) => (
            <motion.button key={item.key} whileTap={{ scale: 0.99 }}
              onClick={() => setPhase(item.key as any)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-left transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                <item.Icon className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{item.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {phase === 'url' && (
        <div className="space-y-4">
          <input
            type="url" value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) handleUrl(); }}
            placeholder="https://your-business.com"
            autoFocus
            className="w-full bg-white/[0.04] border border-white/10 focus:border-mint-400/50 rounded-xl text-white text-base placeholder:text-white/20 focus:outline-none px-4 py-3.5 transition-colors caret-mint-400"
          />
          <div className="flex items-center gap-3">
            <button onClick={() => { setPhase('picker'); setError(''); }} className="text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1">
              <IconChevronLeft className="w-4 h-4" /> {t('onboarding.back')}
            </button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleUrl} disabled={!urlInput.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                urlInput.trim() ? 'bg-mint-500 hover:bg-mint-400 text-black shadow-lg shadow-mint-500/20' : 'bg-white/6 text-white/20 cursor-not-allowed'
              }`}
            >
              {t('onboarding.analyze')}
              <IconArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}

      {phase === 'instagram' && (
        <div className="space-y-4">
          <div className="px-4 py-3 rounded-xl border border-mint-400/15 bg-mint-400/5">
            <p className="text-mint-400/80 text-xs leading-relaxed">
              {t('onboarding.analyzeScraperHint')}
            </p>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-base font-mono select-none">@</span>
            <input
              type="text" value={igInput}
              onChange={(e) => setIgInput(e.target.value.replace(/^@/, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && igInput.trim()) handleInstagram(); }}
              placeholder="username_instagram"
              autoFocus
              className="w-full bg-white/[0.04] border border-white/10 focus:border-mint-400/50 rounded-xl text-white text-base placeholder:text-white/20 focus:outline-none pl-8 pr-4 py-3.5 transition-colors caret-mint-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setPhase('picker'); setError(''); }} className="text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1">
              <IconChevronLeft className="w-4 h-4" /> {t('onboarding.back')}
            </button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleInstagram} disabled={!igInput.trim()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                igInput.trim() ? 'bg-mint-500 hover:bg-mint-400 text-black shadow-lg shadow-mint-500/20' : 'bg-white/6 text-white/20 cursor-not-allowed'
              }`}
            >
              {t('onboarding.analyze')}
              <IconArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}

      {phase === 'file' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
              dragOver ? 'border-mint-400/60 bg-mint-400/6' : 'border-white/10 hover:border-white/20 bg-transparent'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                <IconUpload className="w-6 h-6 text-white/35" />
              </div>
              <p className="text-white/60 font-medium text-sm">{t('onboarding.analyzeDropFile')}</p>
              <p className="text-white/25 text-xs">{t('onboarding.analyzeFileTypes')}</p>
            </div>
          </div>
          <button onClick={() => { setPhase('picker'); setError(''); }}
            className="text-sm text-white/35 hover:text-white/60 transition-colors flex items-center gap-1">
            <IconChevronLeft className="w-4 h-4" /> {t('onboarding.back')}
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-400/20 bg-red-400/5">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button onClick={onSkip} className="text-sm text-white/25 hover:text-white/50 transition-colors">
          {t('onboarding.skipArrow')}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────
const STEP_FIELD_MAP: Record<string, string> = {
  store_name:           'store_name',
  store_type:           'store_type',
  store_tagline:        'store_tagline',
  store_feature:        'store_feature',
  store_knowledge_base: 'store_knowledge_base',
  store_address:        'store_address',
  store_fulfillment:    'store_fulfillment',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [steps, setSteps]               = useState<StepConfig[]>([]);
  const [currentStep, setCurrentStep]   = useState(0);
  const [direction, setDirection]       = useState(1);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showSuccess, setShowSuccess]   = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeSubdomain, setStoreSubdomain] = useState('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('type_select');
  const [aiFilled, setAiFilled]         = useState(false);
  const [aiIsProductCatalog, setAiIsProductCatalog] = useState(false);
  const [form, setForm] = useState<FormData>({
    store_name: '', store_type: '', store_tagline: '', store_feature: '',
    store_knowledge_base: '', store_address: '', store_fulfillment: [],
  });

  useEffect(() => {
    fetch('/api/user/onboarding')
      .then((r) => r.json())
      .then((data) => {
        setSteps(data.steps || []);
        if (data.onboarding_done) setOnboardingPhase('steps');
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data.store_whatsapp_jid)
          setWhatsappNumber(data.store_whatsapp_jid.replace('@s.whatsapp.net', ''));
        if (data.store_subdomain) setStoreSubdomain(data.store_subdomain);
        setForm((f) => ({
          ...f,
          store_name:           data.store_name && data.store_name !== 'Toko Baru' ? String(data.store_name) : '',
          store_type:           String(data.store_type || ''),
          store_tagline:        String(data.store_tagline || ''),
          store_feature:        String(data.store_feature || ''),
          store_knowledge_base: typeof data.store_knowledge_base === 'string' ? data.store_knowledge_base : '',
          store_address:        String(data.store_address || ''),
          store_fulfillment:    parseFulfillment(data.store_fulfillment),
        }));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleSteps  = steps.filter(s => s.step_key !== 'store_type' && s.step_key !== 'store_images');
  const totalSteps    = visibleSteps.length;
  const step          = visibleSteps[currentStep];
  const progress      = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const isImageStep   = step?.step_key === 'store_images';
  const isOptional    = isImageStep;

  const canProceed = () => {
    if (!step) return false;
    switch (step.step_key) {
      case 'store_name':           return String(form.store_name || '').trim().length > 0;
      case 'store_type':           return String(form.store_type || '').length > 0;
      case 'store_tagline':        return String(form.store_tagline || '').trim().length > 0;
      case 'store_feature':        return String(form.store_feature || '').trim().length > 0;
      case 'store_knowledge_base': return String(form.store_knowledge_base || '').trim().length > 0;
      case 'store_images':         return true;
      case 'store_address':        return String(form.store_address || '').trim().length > 0;
      case 'store_fulfillment':    return form.store_fulfillment.length > 0;
      default: return true;
    }
  };

  const saveCurrentStep = async () => {
    if (!step || step.step_key === 'store_images') return;
    const field = STEP_FIELD_MAP[step.step_key];
    if (!field) return;
    const value = step.step_key === 'store_fulfillment'
      ? JSON.stringify(form.store_fulfillment)
      : form[step.step_key as keyof FormData];
    try {
      await fetch('/api/user/store', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {}
  };

  const goNext = async () => {
    if (!canProceed()) return;
    setSaving(true);
    if (currentStep < totalSteps - 1) {
      await saveCurrentStep();
      setSaving(false); setDirection(1); setCurrentStep((s) => s + 1);
    } else {
      await saveCurrentStep();
      try {
        await fetch('/api/user/onboarding', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_type: form.store_type, is_product_catalog: aiIsProductCatalog }),
        });
      } catch {}
      setSaving(false);
      setShowSuccess(true);
      fetch('/api/user/store').then(r => r.json()).then(d => {
        if (d.store_subdomain) setStoreSubdomain(d.store_subdomain);
      }).catch(() => {});
    }
  };

  const goBack = () => {
    if (currentStep > 0) { setDirection(-1); setCurrentStep((s) => s - 1); }
  };

  const updateField = (key: keyof FormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleAnalyzeComplete = (data: ExtractedData) => {
    setForm((f) => ({
      ...f,
      store_name:           data.store_name           || '',
      store_tagline:        data.store_tagline         || '',
      store_feature:        data.store_feature         || '',
      store_address:        data.store_address         || '',
      store_knowledge_base: typeof data.knowledge_base === 'string'
        ? data.knowledge_base
        : (data.knowledge_base ? JSON.stringify(data.knowledge_base) : ''),
    }));
    if (data.store_subdomain) setStoreSubdomain(data.store_subdomain);
    setAiFilled(true); setAiIsProductCatalog(!!data.is_product_catalog);
    setOnboardingPhase('steps');

    const autofillPayload: Record<string, any> = {};
    if (data.store_admin_number) autofillPayload.store_admin_number = data.store_admin_number;
    if (data.store_email)        autofillPayload.store_email        = data.store_email;
    if (data.store_address)      autofillPayload.store_address      = data.store_address;
    if (data.store_subdomain)    autofillPayload.store_subdomain    = data.store_subdomain;
    if (data.store_hero_title)   autofillPayload.store_hero_title   = data.store_hero_title;
    if (data.store_hero_subtitle) autofillPayload.store_hero_subtitle = data.store_hero_subtitle;
    if (data.store_about_us)     autofillPayload.store_about_us     = data.store_about_us;
    if (data.reviews?.length)    autofillPayload.reviews            = data.reviews;
    if (data.gallery_image_urls?.length) autofillPayload.gallery_image_urls = data.gallery_image_urls;
    if (data.store_hero_image_keyword) autofillPayload.store_hero_image_keyword = data.store_hero_image_keyword;
    if (data.store_theme_primary)      autofillPayload.store_theme_primary      = data.store_theme_primary;
    if (data.store_design_type)        autofillPayload.store_design_type        = data.store_design_type;
    if (data.services?.length)          autofillPayload.services               = data.services;
    if (data.product_image_paths?.length) autofillPayload.product_image_paths  = data.product_image_paths;
    if (Object.keys(autofillPayload).length > 0) {
      fetch('/api/user/onboarding/autofill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autofillPayload),
      }).catch(() => {});
    }
  };

  const handleTypeSelectNext = async () => {
    try {
      await fetch('/api/user/store', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_type: form.store_type }),
      });
    } catch {}
    setOnboardingPhase('analyze');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0f0d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-mint-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/30 text-sm">{t('onboarding.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #080c0a 0%, #0d1a12 40%, #0a1019 100%)' }}>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #4ade8018 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #22d3ee12 0%, transparent 70%)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Progress bar */}
      {!showSuccess && onboardingPhase === 'steps' && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-[2px] bg-white/5">
            <motion.div className="h-full bg-gradient-to-r from-mint-500 to-cyan-400"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
          </div>
        </div>
      )}

      {/* Top bar */}
      {!showSuccess && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-md shadow-mint-500/20">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-white/50 text-sm font-medium tracking-tight">Aimin Setup</span>
          </div>
          {onboardingPhase === 'steps' && (
            <span className="text-white/25 text-xs font-mono tabular-nums">{currentStep + 1}&nbsp;/&nbsp;{totalSteps}</span>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 overflow-y-auto">
        {showSuccess ? (
          <SuccessPage onDashboard={() => router.push('/user')} whatsapp={whatsappNumber} subdomain={storeSubdomain} />
        ) : onboardingPhase === 'type_select' ? (
          <div className="w-full max-w-xl py-24">
            <StoreTypePreScreen value={form.store_type} onChange={(v) => setForm(f => ({ ...f, store_type: v }))} onNext={handleTypeSelectNext} />
          </div>
        ) : onboardingPhase === 'analyze' ? (
          <div className="w-full max-w-xl py-24">
            <AnalyzeScreen storeType={form.store_type} onComplete={handleAnalyzeComplete} onSkip={() => setOnboardingPhase('steps')} />
          </div>
        ) : (
          <div className="w-full max-w-xl py-20">
            {/* AI pre-filled banner */}
            {aiFilled && currentStep === 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl border border-mint-400/20 bg-mint-400/6 flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-mint-400/15 border border-mint-400/25 flex items-center justify-center flex-shrink-0">
                  <IconSparkle className="w-3.5 h-3.5 text-mint-400" />
                </div>
                <div>
                  <p className="text-mint-400 text-sm font-semibold">{t('onboarding.aiFilled')}</p>
                  <p className="text-white/35 text-xs mt-0.5">{t('onboarding.aiFilledHint')}</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait" custom={direction}>
              {step && (
                <motion.div key={step.step_key} custom={direction} variants={slideVariants}
                  initial="enter" animate="center" exit="exit" className="space-y-7"
                >
                  {/* Header */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-mint-400/55 font-mono">
                      {t('onboarding.stepLabel', { n: currentStep + 1 })}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug tracking-tight">
                      {t(`onboarding.step_${step.step_key}_title` as any) || step.step_title}
                    </h1>
                    {step.step_description && (
                      <p className="text-white/45 text-base leading-relaxed">
                        {t(`onboarding.step_${step.step_key}_desc` as any) || step.step_description}
                      </p>
                    )}
                  </div>

                  {/* Input */}
                  <div>
                    {step.step_key === 'store_name' && (
                      <TextInput value={form.store_name} onChange={(v) => updateField('store_name', v)}
                        placeholder={t(`onboarding.step_${step.step_key}_placeholder` as any) || step.step_placeholder || '...'} onEnter={goNext} autoFocus />
                    )}
                    {step.step_key === 'store_type' && (
                      <TypeSelector value={form.store_type} onChange={(v) => updateField('store_type', v)} />
                    )}
                    {step.step_key === 'store_tagline' && (
                      <TextInput value={form.store_tagline} onChange={(v) => updateField('store_tagline', v)}
                        placeholder={t(`onboarding.step_${step.step_key}_placeholder` as any) || step.step_placeholder || '...'} onEnter={goNext} autoFocus />
                    )}
                    {step.step_key === 'store_feature' && (
                      <TextareaInput value={form.store_feature} onChange={(v) => updateField('store_feature', v)}
                        placeholder={t(`onboarding.step_${step.step_key}_placeholder` as any) || step.step_placeholder || '...'} autoFocus />
                    )}
                    {step.step_key === 'store_knowledge_base' && (
                      <TextareaInput value={form.store_knowledge_base} onChange={(v) => updateField('store_knowledge_base', v)}
                        placeholder={t(`onboarding.step_${step.step_key}_placeholder` as any) || step.step_placeholder || '...'} autoFocus />
                    )}
                    {step.step_key === 'store_images' && (
                      <ImageUploader images={uploadedImages} setImages={setUploadedImages} />
                    )}
                    {step.step_key === 'store_address' && (
                      <TextareaInput value={form.store_address} onChange={(v) => updateField('store_address', v)}
                        placeholder={t(`onboarding.step_${step.step_key}_placeholder` as any) || step.step_placeholder || '...'} autoFocus />
                    )}
                    {step.step_key === 'store_fulfillment' && (
                      <FulfillmentSelector value={form.store_fulfillment} onChange={(v) => updateField('store_fulfillment', v)} />
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={goBack}
                      className={`flex items-center gap-1.5 text-sm text-white/35 hover:text-white/65 transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
                    >
                      <IconChevronLeft className="w-4 h-4" /> {t('onboarding.back')}
                    </button>

                    <div className="flex items-center gap-3">
                      {isOptional && (
                        <button onClick={goNext} className="text-sm text-white/30 hover:text-white/55 transition-colors">
                          {t('onboarding.skip')}
                        </button>
                      )}
                      <motion.button onClick={goNext}
                        disabled={(!canProceed() && !isOptional) || saving}
                        whileTap={{ scale: 0.97 }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                          canProceed() || isOptional
                            ? 'bg-mint-500 hover:bg-mint-400 text-black shadow-lg shadow-mint-500/20'
                            : 'bg-white/6 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            {t('onboarding.saving')}
                          </>
                        ) : (
                          <>
                            {currentStep === totalSteps - 1 ? t('onboarding.done') : t('onboarding.next')}
                            <IconArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Enter hint */}
                  {(step.step_key === 'store_name' || step.step_key === 'store_tagline') && canProceed() && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/18 text-xs text-center">
                      {t('onboarding.pressEnter')}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-10">
              {visibleSteps.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-5 h-1.5 bg-mint-400' : i < currentStep ? 'w-1.5 h-1.5 bg-mint-400/35' : 'w-1.5 h-1.5 bg-white/12'
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
