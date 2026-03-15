'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PenLine, Globe, Briefcase, BarChart2,
  MessageSquare, Images, CheckCircle2, Zap,
  Clock, Star, Package, Sparkles, ArrowUpRight,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

interface StoreData {
  store_whatsapp_jid: string;
  store_name: string;
  store_tagline: string;
  store_status: string;
  store_expired_at?: string | null;
  store_type: string;
  store_bot_always_on: number;
  store_updated_at: string;
  plan_max_images?: number;
  store_onboarding_done?: boolean;
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

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
        <p className="text-xl font-semibold text-[--text-primary] font-mono leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-[--text-muted] mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

interface Shortcut {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
}

function ShortcutCard({ href, icon: Icon, label, desc, color }: Shortcut) {
  return (
    <motion.a
      href={href}
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className="group flex flex-col gap-3 p-4 bg-[--surface-2] hover:bg-[--surface-3] border border-[--border] hover:border-[--text-muted]/30 rounded-xl transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-[--text-muted]/40 group-hover:text-[--text-muted] transition-colors mt-0.5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[--text-primary]">{label}</p>
        <p className="text-xs text-[--text-muted] mt-0.5 leading-snug">{desc}</p>
      </div>
    </motion.a>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-[--surface-2] rounded-xl" />)}
      </div>
    </div>
  );
}

function UserDashboard() {
  const searchParams = useSearchParams();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t, lang } = useLanguage();

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
            fetch('/api/user/store')
              .then((r) => r.json())
              .then((storeData) => {
                if (!storeData.error && !storeData.store_onboarding_done && storeData.store_name === 'Toko Baru') {
                  window.location.href = '/user/onboarding';
                } else {
                  window.location.href = '/user';
                }
              })
              .catch(() => { window.location.href = '/user'; });
          } else {
            setError(data.error || 'Login gagal');
            setLoading(false);
          }
        })
        .catch(() => { setError('Gagal menghubungi server'); setLoading(false); });
      return;
    }

    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        if (!data.store_onboarding_done && data.store_name === 'Toko Baru') {
          window.location.href = '/user/onboarding';
          return;
        }
        setStore(data);
        setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data toko'); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const whatsappNumber = store.store_whatsapp_jid?.replace('@s.whatsapp.net', '') || '';
  const isActive = store.store_status === 'AKTIF';
  const isBotOn = !!store.store_bot_always_on;
  const isSmart = (store.plan_max_images ?? 5) >= 20;
  const isProductStore = store.store_type && !['Jasa', 'Layanan', 'Service'].includes(store.store_type);

  const expiredAt = store.store_expired_at ? new Date(store.store_expired_at) : null;
  const isExpired = expiredAt ? expiredAt < new Date() : false;
  const isExpiringSoon = !isExpired && expiredAt && expiredAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  const expiredLabel = expiredAt
    ? expiredAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const baseShortcuts: Shortcut[] = [
    { href: '/user/edit', icon: PenLine, label: t('nav.editStore'), desc: t('home.editStoreDesc'), color: 'bg-mint-500/15 text-mint-400' },
    { href: '/user/website', icon: Globe, label: t('nav.website'), desc: t('home.websiteDesc'), color: 'bg-cyan-500/15 text-cyan-400' },
  ];

  const smartShortcuts: Shortcut[] = [
    { href: '/user/gallery', icon: Images, label: t('nav.gallery'), desc: t('home.galleryDesc'), color: 'bg-blue-500/15 text-blue-400' },
    isProductStore
      ? { href: '/user/products', icon: Package, label: t('nav.productCatalog'), desc: t('home.productCatalogDesc'), color: 'bg-indigo-500/15 text-indigo-400' }
      : { href: '/user/services', icon: Briefcase, label: t('nav.services'), desc: t('home.servicesDesc'), color: 'bg-brand-500/15 text-brand-400' },
    { href: '/user/reviews', icon: Star, label: t('nav.reviews'), desc: t('home.reviewsDesc'), color: 'bg-amber-500/15 text-amber-400' },
    { href: '/user/conversations', icon: BarChart2, label: t('nav.conversations'), desc: t('home.conversationsDesc'), color: 'bg-violet-500/15 text-violet-400' },
    { href: '/user/widget', icon: MessageSquare, label: t('nav.chatWidget'), desc: t('home.widgetDesc'), color: 'bg-purple-500/15 text-purple-400' },
  ];

  const shortcuts = isSmart ? [...baseShortcuts, ...smartShortcuts] : baseShortcuts;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5 max-w-5xl">

      {/* Hero card */}
      <motion.div variants={fadeUp} className="relative overflow-hidden bg-gradient-to-br from-[--surface-2] to-[--surface-3] border border-[--border] rounded-2xl p-5">
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
              <p className="text-sm text-[--text-muted] mt-0.5">{store.store_tagline || '—'}</p>
              {expiredLabel && (
                <p className={`text-xs mt-1 font-medium ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-[--text-muted]'}`}>
                  {isExpired ? t('home.expiredSince') : isExpiringSoon ? t('home.expiringSoon') : t('home.until')}{expiredLabel}
                </p>
              )}
              <p className="text-xs text-[--text-muted] mt-1 font-mono">+{whatsappNumber}</p>
            </div>
          </div>
          <a
            href="/user/edit"
            className="self-start flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-mint-600 hover:bg-mint-500 text-white transition-colors shadow-lg shadow-mint-500/20 whitespace-nowrap"
          >
            <PenLine className="w-3.5 h-3.5" />
            {t('home.editStore')}
          </a>
        </div>
      </motion.div>

      {/* Stat row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t('home.storeStatus')}
          value={isExpired ? t('common.expired') : isActive ? t('common.active') : t('common.inactive')}
          sub={expiredLabel ? (isExpired ? `${t('common.expired')} ${expiredLabel}` : `${t('home.until')}${expiredLabel}`) : undefined}
          icon={CheckCircle2}
          accent={isExpired ? 'bg-red-500/15 text-red-400' : isActive ? 'bg-mint-500/15 text-mint-400' : 'bg-red-500/15 text-red-400'}
        />
        <StatCard
          label={t('home.botWhatsapp')}
          value={isBotOn ? t('common.on') : t('common.off')}
          sub={t('home.alwaysOn')}
          icon={Zap}
          accent={isBotOn ? 'bg-amber-500/15 text-amber-400' : 'bg-[--surface-3] text-[--text-muted]'}
        />
        <StatCard
          label={t('home.plan')}
          value={isSmart ? 'SMART' : 'BASIC'}
          sub={isSmart ? t('home.smartDesc') : t('home.basicDesc')}
          icon={Sparkles}
          accent={isSmart ? 'bg-violet-500/15 text-violet-400' : 'bg-[--surface-3] text-[--text-muted]'}
        />
        <StatCard
          label={t('home.lastUpdate')}
          value={store.store_updated_at
            ? new Date(store.store_updated_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' })
            : '-'}
          icon={Clock}
          accent="bg-blue-500/15 text-blue-400"
        />
      </motion.div>

      {/* Shortcut grid */}
      <motion.div variants={fadeUp} className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[--text-muted] px-0.5">{t('home.menu')}</p>
        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {shortcuts.map((s) => (
            <ShortcutCard key={s.href} {...s} />
          ))}
        </motion.div>
      </motion.div>

      {/* Upgrade prompt for basic plan */}
      {!isSmart && (
        <motion.div variants={fadeUp} className="rounded-xl bg-gradient-to-br from-violet-500/10 to-mint-500/10 border border-violet-500/20 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-300">{t('home.upgradeTitle')}</p>
            <p className="text-xs text-[--text-muted] mt-0.5">{t('home.upgradeDesc')}</p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-violet-400 flex-shrink-0" />
        </motion.div>
      )}

    </motion.div>
  );
}
