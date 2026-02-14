'use client';

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn } from '@/components/ui/MotionDiv';
import { useI18n } from '@/lib/i18n-context';

export default function ContactPage() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-24 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h1 className="text-4xl sm:text-5xl font-bold text-white text-center">{t.contact.title}</h1>
            <p className="mt-4 text-brand-200 text-center text-lg">Kami siap membantu Anda</p>
          </FadeIn>
          <FadeIn delay={0.2}>
            <form onSubmit={handleSubmit} className="mt-12 bg-white rounded-3xl p-8 shadow-xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.contact.name}</label>
                <input type="text" required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.contact.email}</label>
                <input type="email" required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.contact.message}</label>
                <textarea required rows={5} className="input resize-none" />
              </div>
              <button type="submit" className="btn-primary w-full">{t.contact.send}</button>
              {sent && <p className="text-green-600 text-center text-sm font-medium">{t.contact.success}</p>}
            </form>
          </FadeIn>
        </div>
      </section>
      <Footer />
      <ChatWidget />
    </main>
  );
}
