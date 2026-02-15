'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import UserSidebar from '@/components/user/UserSidebar';
import { Suspense } from 'react';

interface PelangganUser {
  jid: string;
  store_name: string;
}

function UserLayoutInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PelangganUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasLoginToken = searchParams.has('token');

  useEffect(() => {
    // If there's a login token in URL, let the page handle it first
    if (hasLoginToken) {
      setLoading(false);
      return;
    }

    fetch('/api/user/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.jid) {
          setUser(data);
        }
        // Don't redirect - let the page show the error
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasLoginToken]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/user/logout', { method: 'POST' });
    setUser(null);
    router.push('/user');
  }, [router]);

  // When token login is in progress, just render children (the page handles it)
  if (hasLoginToken) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated - show login form
  if (!user) {
    return <PelangganLoginPage onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex text-gray-100">
      <UserSidebar
        storeName={user.store_name}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="lg:ml-64 flex-1 min-w-0 overflow-x-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-200 p-1"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-100">{user.store_name}</h1>
          </div>
          <span className="text-xs bg-brand-500/20 text-brand-400 px-2.5 py-1 rounded-full font-mono font-semibold">USER</span>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
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

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="glass-dark rounded-2xl p-8 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-2 text-center">AiMin Dashboard</h3>
        <p className="text-gray-500 text-sm text-center mb-6">Login dengan nomor WhatsApp dan password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nomor WhatsApp / JID</label>
            <input
              value={jid}
              onChange={e => setJid(e.target.value)}
              placeholder="628xxx"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className={inputCls}
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center mt-4">Atau gunakan link login dari WhatsApp</p>
      </div>
    </div>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <UserLayoutInner>{children}</UserLayoutInner>
    </Suspense>
  );
}
