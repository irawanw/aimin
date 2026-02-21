'use client';

import { useEffect, useState } from 'react';

export default function UpgradeGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'smart' | 'basic'>('loading');

  useEffect(() => {
    fetch('/api/user/store')
      .then((r) => r.json())
      .then((d) => setState((d.plan_max_images ?? 5) >= 20 ? 'smart' : 'basic'))
      .catch(() => setState('smart')); // fail open
  }, []);

  if (state === 'loading') return null;

  if (state === 'basic') return (
    <div className="max-w-lg mx-auto mt-16 text-center px-4">
      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-mint-500/20 border border-violet-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Fitur Terkunci</h3>
      <p className="text-[--text-muted] text-sm leading-relaxed">
        Layanan ini bisa didapatkan dengan berlangganan paket{' '}
        <span className="text-violet-300 font-semibold">SMART</span>
      </p>
      <p className="text-[--text-muted] text-xs mt-2">Hubungi admin untuk upgrade paket Anda.</p>
    </div>
  );

  return <>{children}</>;
}
