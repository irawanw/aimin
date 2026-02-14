'use client';

import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn, ScaleIn } from '@/components/ui/MotionDiv';
import { useI18n } from '@/lib/i18n-context';

const liteFeatures = [
  'WhatsApp AI auto reply',
  'Knowledge-based answers',
  'Upload 5 product images',
  'Smart FAQ detection',
  'Human handover',
  'Basic analytics',
  'Email support',
];

const proFeatures = [
  'Everything in Lite',
  'Order summary automation',
  'Upload 20 product images',
  'Free landing page',
  'Advanced analytics',
  'Promo automation',
  'API ready',
  'Priority AI processing',
  'Priority support',
];

export default function ProductPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="pt-32 pb-24 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h1 className="text-4xl sm:text-5xl font-bold text-white text-center">{t.pricing.title}</h1>
            <p className="mt-4 text-brand-200 text-center text-lg max-w-2xl mx-auto">Pilih paket yang sesuai dengan kebutuhan bisnis Anda</p>
          </FadeIn>

          <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <ScaleIn delay={0.1}>
              <div className="bg-white rounded-3xl p-8 shadow-xl h-full flex flex-col">
                <div className="text-sm font-semibold text-brand-600 uppercase tracking-wide">{t.pricing.lite}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">Rp 99rb</span>
                  <span className="text-gray-500">{t.pricing.monthly}</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {liteFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block text-center btn-primary">{t.pricing.cta}</Link>
              </div>
            </ScaleIn>

            <ScaleIn delay={0.2}>
              <div className="relative bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-8 shadow-xl h-full flex flex-col text-white ring-4 ring-brand-400/30">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full">{t.pricing.popular}</div>
                <div className="text-sm font-semibold text-brand-200 uppercase tracking-wide">{t.pricing.pro}</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">Rp 199rb</span>
                  <span className="text-brand-200">{t.pricing.monthly}</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-brand-100">
                      <svg className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block text-center bg-white text-brand-600 font-bold py-2.5 px-6 rounded-xl hover:bg-brand-50 transition-colors">{t.pricing.cta}</Link>
              </div>
            </ScaleIn>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Otomatisasi WhatsApp yang Cerdas</h2>
                <p className="mt-4 text-gray-500 leading-relaxed">AI kami memahami konteks bisnis Anda dan menjawab pertanyaan pelanggan secara otomatis.</p>
                <div className="mt-6 space-y-3">
                  {['Respon instan 24/7', 'Personalisasi jawaban', 'Deteksi intent pelanggan', 'Eskalasi ke manusia'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-gray-700">
                      <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl overflow-hidden shadow-xl">
                <Image src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800&q=80" alt="WhatsApp automation" width={800} height={500} className="object-cover w-full" loading="lazy" />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
