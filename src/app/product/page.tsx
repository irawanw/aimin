'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/solutions');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-mint-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
