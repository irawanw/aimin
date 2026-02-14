'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Admin191Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/admin191/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push('/admin191');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent mb-8">Admin 191</h1>
        <form onSubmit={handleSubmit} className="glass-dark rounded-2xl p-6 space-y-4">
          {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
