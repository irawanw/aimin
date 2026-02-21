'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin191/AdminSidebar';

interface Admin {
  adm_id: number;
  adm_username: string;
  adm_name: string;
}

export default function Admin191Layout({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === '/admin191/login';

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return; }
    fetch('/admin191/api/auth/me').then(r => r.json()).then(data => {
      if (data.admin) setAdmin(data.admin);
      else router.push('/admin191/login');
    }).catch(() => router.push('/admin191/login')).finally(() => setLoading(false));
  }, [isLoginPage, router]);

  const handleLogout = useCallback(async () => {
    await fetch('/admin191/api/auth/logout', { method: 'POST' });
    setAdmin(null);
    router.push('/admin191/login');
  }, [router]);

  if (isLoginPage) return <>{children}</>;

  if (loading) return (
    <div className="min-h-screen bg-[--surface-0] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 animate-pulse" />
        <div className="w-1.5 h-1.5 rounded-full bg-mint-500 animate-bounce" />
      </div>
    </div>
  );
  if (!admin) return null;

  return (
    <div className="min-h-screen bg-[--surface-0] flex text-[--text-primary]">
      <AdminSidebar
        adminName={admin.adm_name}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="lg:ml-64 flex-1 min-w-0">
        <header className="bg-[--surface-1] border-b border-[--border] px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[--text-muted] hover:text-[--text-secondary] p-1"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-base font-semibold text-[--text-primary]">Admin Panel</h1>
          </div>
          <span className="text-xs bg-red-500/15 text-red-400 px-2.5 py-1 rounded-full font-mono font-semibold tracking-wide">ADMIN</span>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
