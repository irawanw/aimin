'use client';

import { useUser } from '@/lib/user-context';

export default function SettingsPage() {
  const { user } = useUser();
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>
      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input defaultValue={user?.name} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input defaultValue={user?.email} className="input" disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Greeting Message</label>
          <textarea defaultValue="Halo! Ada yang bisa saya bantu?" rows={3} className="input resize-none" />
        </div>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}
