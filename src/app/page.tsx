'use client';

import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn, SlideIn, ScaleIn } from '@/components/ui/MotionDiv';
import { useI18n } from '@/lib/i18n-context';

const features = [
  { key: 'ai' as const, icon: '🤖' },
  { key: 'knowledge' as const, icon: '📚' },
  { key: 'analytics' as const, icon: '📊' },
  { key: 'handover' as const, icon: '🤝' },
];

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        {/* Parallax bg elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              {t.hero.title}
            </h1>
            <p className="mt-6 text-lg text-brand-200 max-w-lg">
              {t.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="btn-primary text-base !py-3 !px-8">
                {t.hero.cta}
              </Link>
              <Link href="/product" className="btn-secondary text-base !py-3 !px-8">
                {t.hero.cta2}
              </Link>
            </div>
          </FadeIn>

          <SlideIn direction="right" delay={0.2}>
            <div className="relative">
              <div className="glass rounded-3xl p-2 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800&q=80"
                  alt="AI chatbot dashboard interface"
                  width={800}
                  height={500}
                  className="rounded-2xl object-cover w-full"
                  priority
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 max-w-[200px]">
                <div className="text-white text-sm font-semibold">+240%</div>
                <div className="text-white/60 text-xs">Response Rate</div>
              </div>
            </div>
          </SlideIn>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900">{t.features.title}</h2>
          </FadeIn>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <ScaleIn key={f.key} delay={i * 0.1}>
                <div className="card text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-bold text-lg text-gray-900">{t.features[f.key]}</h3>
                  <p className="mt-2 text-sm text-gray-500">{t.features[`${f.key}Desc` as keyof typeof t.features]}</p>
                </div>
              </ScaleIn>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative rounded-3xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80"
                  alt="Business analytics dashboard"
                  width={800}
                  height={500}
                  className="rounded-3xl object-cover w-full"
                  loading="lazy"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Tingkatkan Bisnis Anda dengan AI</h2>
                <p className="mt-4 text-gray-500 leading-relaxed">
                  Aimin Assist membantu ribuan UMKM di Indonesia untuk mengotomatisasi layanan pelanggan WhatsApp mereka. Dengan teknologi AI terdepan, setiap pesan pelanggan dijawab dengan cepat dan akurat.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-2xl font-bold text-brand-600">500+</div>
                    <div className="text-sm text-gray-500">Bisnis Aktif</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-600">1M+</div>
                    <div className="text-sm text-gray-500">Pesan/Bulan</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-600">99%</div>
                    <div className="text-sm text-gray-500">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-brand-600 to-brand-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Siap Memulai?</h2>
            <p className="mt-4 text-brand-100 text-lg">Mulai dari Rp 99.000/bulan. Tanpa kontrak, batalkan kapan saja.</p>
            <Link href="/register" className="inline-block mt-8 bg-white text-brand-600 font-bold py-3 px-8 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
              {t.hero.cta}
            </Link>
          </FadeIn>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
