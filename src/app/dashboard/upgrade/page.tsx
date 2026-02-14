'use client';

import { useUser } from '@/lib/user-context';

export default function UpgradePage() {
  const { user } = useUser();

  if (user?.plan === 'pro') {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-4xl mb-4">&#127881;</div>
        <h2 className="text-2xl font-bold text-gray-900">You are on Pro!</h2>
        <p className="mt-2 text-gray-500">You have access to all features.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-2xl font-bold text-gray-900 text-center">Upgrade to Pro</h2>
      <p className="mt-2 text-gray-500 text-center">Unlock all features for your business</p>
      <div className="mt-8 card border-2 border-brand-500">
        <div className="text-center">
          <div className="text-sm font-semibold text-brand-600 uppercase">Pro Plan</div>
          <div className="mt-2 text-4xl font-extrabold text-gray-900">Rp 199rb<span className="text-lg text-gray-500 font-normal">/bulan</span></div>
        </div>
        <ul className="mt-6 space-y-2">
          {['Order summary automation', 'Upload 20 images', 'Free landing page', 'Advanced analytics', 'Promo automation', 'API ready', 'Priority support'].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {f}
            </li>
          ))}
        </ul>
        <button className="mt-6 btn-primary w-full">Upgrade Now</button>
        <p className="mt-3 text-xs text-gray-400 text-center">Payment gateway integration coming soon</p>
      </div>
    </div>
  );
}
