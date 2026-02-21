'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import UserSidebar from '@/components/user/UserSidebar';
import UserTopbar from '@/components/user/UserTopbar';
import UserBottomNav from '@/components/user/UserBottomNav';

interface PelangganUser {
  jid: string;
  store_name: string;
  store_subdomain?: string;
  store_status?: string;
  plan_is_smart?: boolean;
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PelangganUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasLoginToken = searchParams.has('token');

  useEffect(() => {
    if (hasLoginToken) { setLoading(false); return; }
    fetch('/api/user/me')
      .then((r) => r.json())
      .then((data) => { if (data.jid) setUser(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasLoginToken]);

  // Also fetch subdomain + status for topbar
  useEffect(() => {
    if (!user) return;
    fetch('/api/user/store')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setUser((u) => u ? {
            ...u,
            store_subdomain: data.store_subdomain,
            store_status: data.store_status,
            plan_is_smart: (data.plan_max_images ?? 5) >= 20,
          } : u);
        }
      })
      .catch(() => {});
  }, [user?.jid]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="min-h-screen bg-[--surface-0] text-[--text-primary]">
      <UserSidebar
        storeName={user.store_name}
        isSmart={user.plan_is_smart ?? false}
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
        <UserBottomNav isSmart={user.plan_is_smart ?? false} />
      </div>
    </div>
  );
}

function PelangganLoginPage({ onSuccess }: { onSuccess: (u: PelangganUser) => void }) {
  const [jid, setJid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        setError(data.error || 'Login gagal');
      }
    } catch {
      setError('Gagal menghubungi server');
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
            <span className="text-lg font-semibold text-white">AiMin Dashboard</span>
          </div>

          <p className="text-center text-sm text-[--text-muted] mb-6">Masuk ke akun toko Anda</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Nomor WhatsApp</label>
              <input
                value={jid}
                onChange={(e) => setJid(e.target.value)}
                placeholder="628xxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-[--surface-3] border border-[--border] rounded-xl text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:outline-none focus:border-mint-500/60 focus:ring-1 focus:ring-mint-500/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[--text-secondary] mb-1.5">Password</label>
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
              {submitting ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-xs text-[--text-muted] mt-5">Atau gunakan link login dari WhatsApp</p>
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
