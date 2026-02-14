'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { register } from '@/lib/auth-client';
import { useUser } from '@/lib/user-context';
import { useI18n } from '@/lib/i18n-context';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await register(email, name, password);
    setLoading(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    await refresh();
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
      >
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
          Aimin Assist
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">{t.nav.register}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '...' : t.nav.register}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">{t.nav.login}</Link>
        </p>
      </motion.div>
    </main>
  );
}
