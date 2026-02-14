'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-gray-950 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white text-lg font-bold mb-2">Aimin Assistant</h3>
            <p className="text-sm">{t.footer.description}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Links</h4>
            <div className="space-y-1 text-sm">
              <Link href="/" className="block hover:text-white transition-colors">{t.nav.home}</Link>
              <Link href="/product" className="block hover:text-white transition-colors">{t.nav.product}</Link>
              <Link href="/contact" className="block hover:text-white transition-colors">{t.nav.contact}</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Contact</h4>
            <p className="text-sm">info@aiminassist.com</p>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} Aimin Assistant. {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
