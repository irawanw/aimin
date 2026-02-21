'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n-context';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// EDIT CONTACT INFO HERE
// ─────────────────────────────────────────────────────────────
const CONTACT_INFO = {
  email: 'admin@aiminassist.com',
  address: 'Pekalongan, Indonesia',
  phone: '+62 8996699415',
};
// ─────────────────────────────────────────────────────────────

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-[#070b14] border-t border-white/[0.06] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-[#2EE6C9]/20">
                <Image
                  src="/logo.jpg"
                  alt="Aimin Logo"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <span className="text-base font-bold text-[#FFD84D] tracking-tight">Aimin Assistant</span>
            </div>
            <p className="text-white/40 text-sm mb-5 leading-relaxed max-w-xs">{t.footer.description}</p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 text-white/40 hover:text-[#2EE6C9] hover:border-[#2EE6C9]/30 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-sm">{t.footer.pages}</h4>
            <div className="space-y-2.5 text-sm">
              <Link href="/" className="block text-white/40 hover:text-[#2EE6C9] transition-colors">{t.nav.home}</Link>
              <Link href="/about" className="block text-white/40 hover:text-[#2EE6C9] transition-colors">{t.nav.about}</Link>
              <Link href="/solutions" className="block text-white/40 hover:text-[#2EE6C9] transition-colors">{t.nav.solutions}</Link>
              <Link href="/contact" className="block text-white/40 hover:text-[#2EE6C9] transition-colors">{t.nav.contact}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-sm">{t.footer.contactTitle}</h4>
            <div className="space-y-2.5 text-sm text-white/40">
              <p>{CONTACT_INFO.email}</p>
              <p>{CONTACT_INFO.address}</p>
              <p>{CONTACT_INFO.phone}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.06] pt-6 text-center text-sm text-white/25">
          &copy; {new Date().getFullYear()} Aimin Assistant. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
