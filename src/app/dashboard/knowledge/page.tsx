'use client';

import { useState } from 'react';

const sampleKB = [
  { id: 1, title: 'Product FAQ', entries: 15, updated: '2024-01-15' },
  { id: 2, title: 'Shipping Policy', entries: 8, updated: '2024-01-10' },
  { id: 3, title: 'Return Policy', entries: 5, updated: '2024-01-08' },
];

export default function KnowledgePage() {
  const [items] = useState(sampleKB);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Knowledge Base</h2>
        <button className="btn-primary text-sm">+ Add Entry</button>
      </div>
      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="card flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.entries} entries &middot; Updated {item.updated}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-sm text-brand-600 hover:underline">Edit</button>
              <button className="text-sm text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
