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

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;
  if (!admin) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex text-gray-100">
      <AdminSidebar
        adminName={admin.adm_name}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="lg:ml-64 flex-1">
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-200 p-1"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-100">Admin Panel</h1>
          </div>
          <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-mono font-semibold">ADMIN</span>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
