'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: 'Login dibatalkan. Silakan coba lagi.',
  no_email:         'Akun Google tidak memiliki email. Gunakan akun lain.',
  oauth_failed:     'Terjadi kesalahan saat login dengan Google. Coba lagi.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorKey     = searchParams.get('error') || '';
  const errorMsg     = ERROR_MESSAGES[errorKey] || '';

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1e] via-[#0d1a2e] to-[#091525] px-4">

      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">AiMin Dashboard</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Masuk ke Akun</h1>
          <p className="text-sm text-white/50 mb-8">
            Masuk atau daftar menggunakan akun Google Anda
          </p>

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Google Sign-in Button */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white text-gray-800 text-sm font-semibold shadow-lg hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
          >
            {/* Google SVG logo */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Lanjutkan dengan Google
          </a>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">atau</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="mt-5 text-center text-xs text-white/40">
            Sudah punya akun via WhatsApp?{' '}
            <Link href="/user" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Masuk di sini
            </Link>
          </p>

          <p className="mt-6 text-center text-[11px] text-white/25 leading-relaxed">
            Dengan masuk, Anda menyetujui{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white/40">Kebijakan Privasi</Link>
            {' '}kami.
          </p>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
