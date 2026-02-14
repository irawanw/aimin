'use client';

import Image from 'next/image';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">89%</div>
          <div className="text-sm text-gray-500 mt-1">AI Resolution Rate</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">1.2s</div>
          <div className="text-sm text-gray-500 mt-1">Avg Response Time</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-brand-600">4.8/5</div>
          <div className="text-sm text-gray-500 mt-1">Customer Rating</div>
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Message Volume (Last 30 Days)</h3>
        <Image src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Analytics chart" width={800} height={300} className="w-full object-cover rounded-xl" loading="lazy" />
      </div>
    </div>
  );
}
