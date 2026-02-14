'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';
import { useUser } from '@/lib/user-context';

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/product', label: t.nav.product },
    { href: '/contact', label: t.nav.contact },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
            Aimin Assistant
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-sm font-medium transition-colors hover:text-brand-600 ${scrolled ? 'text-gray-700' : 'text-white'}`}>
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${scrolled ? 'border-gray-300 text-gray-600 hover:bg-gray-100' : 'border-white/30 text-white hover:bg-white/10'}`}
            >
              {locale === 'id' ? 'EN' : 'ID'}
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary text-sm !py-1.5 !px-4">
                  {t.nav.dashboard}
                </Link>
                <button onClick={logout} className={`text-sm font-medium ${scrolled ? 'text-gray-600' : 'text-white/80'} hover:text-red-500`}>
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm !py-1.5 !px-4">
                {t.nav.login}
              </Link>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            <div className={`w-5 h-0.5 mb-1 transition-all ${scrolled ? 'bg-gray-700' : 'bg-white'} ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-5 h-0.5 mb-1 transition-all ${scrolled ? 'bg-gray-700' : 'bg-white'} ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 transition-all ${scrolled ? 'bg-gray-700' : 'bg-white'} ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block text-gray-700 font-medium" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <button onClick={() => setLocale(locale === 'id' ? 'en' : 'id')} className="text-sm font-semibold text-brand-600">
                {locale === 'id' ? 'English' : 'Bahasa Indonesia'}
              </button>
              {user ? (
                <>
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="block text-brand-600 font-semibold" onClick={() => setMenuOpen(false)}>
                    {t.nav.dashboard}
                  </Link>
                  <button onClick={logout} className="block text-red-500 font-medium">Logout</button>
                </>
              ) : (
                <Link href="/login" className="block text-brand-600 font-semibold" onClick={() => setMenuOpen(false)}>
                  {t.nav.login}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
