'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { login } from '@/lib/auth-client';
import { useUser } from '@/lib/user-context';
import { useI18n } from '@/lib/i18n-context';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useUser();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    await refresh();
    router.push(res.user.role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
      >
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
          Aimin Assistant
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">{t.nav.login}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? '...' : t.nav.login}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Belum punya akun?{' '}
          <Link href="/register" className="text-brand-600 font-semibold hover:underline">{t.nav.register}</Link>
        </p>

        <div className="mt-6 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
          <p className="font-semibold mb-1">Demo accounts:</p>
          <p>Admin: admin@aiminassist.com / admin123</p>
          <p>User: user@aiminassist.com / user123</p>
        </div>
      </motion.div>
    </main>
  );
}
