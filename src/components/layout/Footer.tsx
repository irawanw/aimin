'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n-context';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src="/logo.jpg"
                  alt="Aimin Logo"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <span className="text-xl font-bold text-yellow-400">Aimin Assistant</span>
            </div>
            <p className="text-sm mb-4">{t.footer.description}</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-mint-400 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-mint-400 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-mint-400 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-mint-400 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm sm:text-base">Pages</h4>
            <div className="space-y-2 text-sm">
              <Link href="/" className="block hover:text-mint-400 transition-colors">{t.nav.home}</Link>
              <Link href="/about" className="block hover:text-mint-400 transition-colors">{t.nav.about}</Link>
              <Link href="/solutions" className="block hover:text-mint-400 transition-colors">{t.nav.solutions}</Link>
              <Link href="/contact" className="block hover:text-mint-400 transition-colors">{t.nav.contact}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm sm:text-base">Contact</h4>
            <div className="space-y-2 text-sm">
              <p>info@aiminassist.com</p>
              <p>Jakarta, Indonesia</p>
              <p>+62 21 1234 5678</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} Aimin Assistant. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
