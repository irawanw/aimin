'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { useUser } from '@/lib/user-context';

export default function Navbar() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/about', label: t.nav.about },
    { href: '/solutions', label: t.nav.solutions },
    { href: '/contact', label: t.nav.contact },
  ];

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
        style={scrolled ? {
          background: 'rgba(7,11,20,0.88)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
        } : {
          background: 'transparent',
          borderBottom: '1px solid transparent',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-[#2EE6C9]/20">
              <Image src="/logo.jpg" alt="Aimin" fill className="object-cover" sizes="32px" />
            </div>
            <span className="font-display font-bold text-[#FFD84D] tracking-tight text-sm">
              Aimin Assistant
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-medium tracking-[0.12em] uppercase text-white/55 hover:text-white transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/12 text-white/40 hover:text-white hover:border-white/22 transition-colors"
            >
              {locale === 'id' ? 'ID' : 'EN'}
            </button>
            {user ? (
              <>
                <Link
                  href={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-white transition-all duration-300"
                  style={scrolled
                    ? { background: '#2EE6C9', color: '#070b14' }
                    : { border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }
                  }
                >
                  {t.nav.dashboard}
                </Link>
                <button onClick={logout} className="text-xs text-white/35 hover:text-red-400 transition-colors">
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300"
                style={scrolled
                  ? { background: '#2EE6C9', color: '#070b14' }
                  : { border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'white' }
                }
              >
                {t.nav.login}
              </Link>
            )}
          </div>

          {/* Hamburger — thin hairlines, image-heavy style */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden relative w-9 h-9 flex flex-col items-center justify-center gap-[5px]"
            aria-label="Toggle menu"
          >
            <span
              className="block h-px w-5 bg-white transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(45deg) translateY(6px)' : 'none', opacity: open ? 1 : 0.75 }}
            />
            <span
              className="block h-px w-5 bg-white transition-all duration-200"
              style={{ opacity: open ? 0 : 0.75, transform: open ? 'scaleX(0)' : 'none' }}
            />
            <span
              className="block h-px w-5 bg-white transition-all duration-300 origin-center"
              style={{ transform: open ? 'rotate(-45deg) translateY(-6px)' : 'none', opacity: open ? 1 : 0.75 }}
            />
          </button>
        </div>
      </nav>

      {/* Full-screen mobile menu — image-heavy style */}
      <div
        className="fixed inset-0 z-40 md:hidden transition-all duration-400"
        style={{
          background: 'rgba(5,7,15,0.78)',
          backdropFilter: 'blur(28px) saturate(150%)',
          WebkitBackdropFilter: 'blur(28px) saturate(150%)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0)' : 'translateY(-10px)',
        }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-9">
          {navLinks.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="font-display text-3xl font-bold text-white/75 hover:text-white transition-colors duration-200"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(14px)',
                transition: `opacity 0.4s ${i * 65}ms, transform 0.4s ${i * 65}ms, color 0.2s`,
              }}
            >
              {label}
            </Link>
          ))}

          {/* Auth CTA */}
          <div
            className="mt-4 flex flex-col items-center gap-3"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(14px)',
              transition: `opacity 0.4s ${navLinks.length * 65 + 60}ms, transform 0.4s ${navLinks.length * 65 + 60}ms`,
            }}
          >
            {user ? (
              <>
                <Link
                  href={user.role === 'admin' ? '/admin' : '/dashboard'}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold text-[#070b14]"
                  style={{ background: '#2EE6C9' }}
                >
                  {t.nav.dashboard}
                </Link>
                <button onClick={() => { logout(); setOpen(false); }} className="text-sm text-red-400/80">
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center px-8 py-3 rounded-full text-sm font-semibold text-[#070b14]"
                style={{ background: '#2EE6C9' }}
              >
                {t.nav.login}
              </Link>
            )}
          </div>
        </div>

        {/* Watermark at bottom */}
        <p className="absolute bottom-10 w-full text-center text-[10px] tracking-[0.3em] uppercase text-white/15 font-display">
          Aimin Assistant
        </p>
      </div>
    </>
  );
}
