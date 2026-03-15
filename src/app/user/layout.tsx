'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import UserSidebar from '@/components/user/UserSidebar';
import UserTopbar from '@/components/user/UserTopbar';
import UserBottomNav from '@/components/user/UserBottomNav';
import { LanguageProvider, useLanguage } from '@/lib/LanguageContext';
import type { Lang } from '@/lib/i18n';

interface PelangganUser {
  jid: string;
  store_name: string;
  store_subdomain?: string;
  store_status?: string;
  plan_is_smart?: boolean;
  store_type?: string;
  store_language?: string;
  dashboard_language?: string;
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PelangganUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasLoginToken = searchParams.has('token');

  useEffect(() => {
    if (hasLoginToken) { setLoading(false); return; }
    fetch('/api/user/me')
      .then((r) => r.json())
      .then((data) => { if (data.jid) setUser(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasLoginToken]);

  // Re-fetch store config on navigation so dashboard_language stays in sync after saving
  const fetchStore = useCallback(() => {
    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setUser((u) => u ? {
            ...u,
            store_subdomain: data.store_subdomain,
            store_status: data.store_status,
            store_type: data.store_type,
            store_language: data.store_language,
            dashboard_language: data.dashboard_language,
            plan_is_smart: (data.plan_max_images ?? 5) >= 20,
          } : u);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchStore();
  }, [user?.jid, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    setUser(null);
    router.push('/user');
  }, [router]);

  if (hasLoginToken) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-[--surface-0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-bounce" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <PelangganLoginPage onSuccess={(u) => setUser(u)} />;
  }

  const sidebarWidth = collapsed ? 56 : 240;
  const lang = (['en', 'fr', 'id'].includes(user.dashboard_language ?? '') ? user.dashboard_language : 'en') as Lang;

  return (
    <LanguageProvider lang={lang}>
    <div className="min-h-screen bg-[--surface-0] text-[--text-primary]">
      <UserSidebar
        storeName={user.store_name}
        isSmart={user.plan_is_smart ?? false}
        storeType={user.store_type}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area — shifts right on desktop based on sidebar width */}
      <motion.div
        animate={{ paddingLeft: sidebarWidth }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="hidden lg:block"
        style={{ paddingLeft: sidebarWidth }}
      >
        <UserTopbar
          storeName={user.store_name}
          storeSubdomain={user.store_subdomain}
          storeStatus={user.store_status}
          onMenuOpen={() => setMobileOpen(true)}
          sidebarCollapsed={collapsed}
        />
        <main className="pt-14 min-h-screen">
          <div className="p-5 lg:p-6">
            {children}
          </div>
        </main>
      </motion.div>

      {/* Mobile layout */}
      <div className="lg:hidden">
        <UserTopbar
          storeName={user.store_name}
          storeSubdomain={user.store_subdomain}
          storeStatus={user.store_status}
          onMenuOpen={() => setMobileOpen(true)}
          sidebarCollapsed={false}
        />
        <main className="pt-14 pb-20 min-h-screen">
          <div className="p-4">
            {children}
          </div>
        </main>
        <UserBottomNav isSmart={user.plan_is_smart ?? false} storeType={user.store_type} />
      </div>
    </div>
    </LanguageProvider>
  );
}

function PelangganLoginPage({ onSuccess }: { onSuccess: (u: PelangganUser) => void }) {
  const [jid, setJid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Login page defaults to English since we don't know user's language yet
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jid, password }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess({ jid: data.jid, store_name: data.store_name });
      } else {
        setError(data.error || t('auth.loginFailed'));
      }
    } catch {
      setError(t('auth.serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[--surface-0] flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-mint-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-[--surface-2] border border-[--border] rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-7">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-lg shadow-mint-500/30">
              <svg className="w-4.5 h-4.5 text-white" style={{width:'18px',height:'18px'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">{t('auth.title')}</span>
          </div>

          <p className="text-center text-sm text-[--text-muted] mb-6">{t('auth.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">{t('auth.whatsappLabel')}</label>
              <input
                value={jid}
                onChange={(e) => setJid(e.target.value)}
                placeholder={t('auth.whatsappPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">{t('auth.passwordLabel')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
                required
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-mint-600 hover:bg-mint-500 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-mint-500/25 mt-1"
            >
              {submitting ? t('auth.loggingIn') : t('auth.loginBtn')}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[--border]" />
            <span className="text-[11px] text-[--text-muted]">{t('common.or')}</span>
            <div className="flex-1 h-px bg-[--border]" />
          </div>

          {/* Google Sign-in */}
          <a
            href="/api/auth/google"
            className="mt-4 flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-md"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t('auth.googleLogin')}
          </a>

          <p className="text-center text-xs text-[--text-muted] mt-4">{t('auth.whatsappLogin')}</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[--surface-0] flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 animate-pulse" />
        </div>
      }
    >
      <UserLayoutInner>{children}</UserLayoutInner>
    </Suspense>
  );
}
