'use client';

import { useState } from 'react';

const initialFeatures = [
  { key: 'ai_auto_reply', label: 'AI Auto Reply', enabled: true },
  { key: 'human_handover', label: 'Human Handover', enabled: true },
  { key: 'order_automation', label: 'Order Automation', enabled: true },
  { key: 'promo_automation', label: 'Promo Automation', enabled: false },
  { key: 'api_access', label: 'API Access (Pro)', enabled: true },
  { key: 'landing_page', label: 'Free Landing Page', enabled: false },
  { key: 'advanced_analytics', label: 'Advanced Analytics', enabled: true },
];

export default function FeaturesPage() {
  const [features, setFeatures] = useState(initialFeatures);

  const toggle = (key: string) => {
    setFeatures((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white">Feature Toggles</h2>
      <div className="glass-dark rounded-2xl divide-y divide-gray-800">
        {features.map((f) => (
          <div key={f.key} className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-gray-200 font-medium">{f.label}</div>
              <div className="text-xs text-gray-500 font-mono">{f.key}</div>
            </div>
            <button
              onClick={() => toggle(f.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${f.enabled ? 'bg-green-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${f.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
