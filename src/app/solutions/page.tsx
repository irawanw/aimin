'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import {
  MessageSquare, Workflow, Wrench, BarChart3,
  CheckCircle, Zap, Shield, Clock, Users, ArrowRight,
  Sparkles, Package, Globe, Star,
} from 'lucide-react';

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const solutions = [
  {
    icon: MessageSquare,
    label: 'AI CHAT',
    title: 'AI Chat Assistant',
    description: 'Automasi WhatsApp cerdas yang memahami konteks dan memberikan respons akurat 24/7. Sempurna untuk menangani pertanyaan pelanggan, informasi produk, dan permintaan dukungan.',
    features: ['Respons instan 24/7', 'Percakapan context-aware', 'Dukungan Bahasa Indonesia', 'Tanpa waktu tunggu'],
    color: '#2EE6C9',
    href: '/register',
  },
  {
    icon: Workflow,
    label: 'AUTOMATION',
    title: 'Automation Engine',
    description: 'Sederhanakan alur kerja Anda dengan otomasi tugas bertenaga AI dan smart routing. Otomatiskan pemrosesan pesanan, penjadwalan, dan tugas berulang.',
    features: ['Smart task routing', 'Workflow automation', 'Custom triggers', 'Real-time sync'],
    color: '#a78bfa',
    href: '/register',
  },
  {
    icon: Wrench,
    label: 'CUSTOM AI',
    title: 'Custom AI Integration',
    description: 'Solusi AI yang disesuaikan khusus untuk kebutuhan bisnis Anda. Pelatihan kustom pada data produk, brand voice, dan kebutuhan industri Anda.',
    features: ['Disesuaikan kebutuhan', 'Domain-specific training', 'Custom integrations', 'Dedicated support'],
    color: '#f59e0b',
    href: '/contact',
  },
  {
    icon: BarChart3,
    label: 'ANALYTICS',
    title: 'Analytics & Insights',
    description: 'Dashboard real-time dan laporan komprehensif untuk mengambil keputusan terbaik. Lacak kepuasan pelanggan, waktu respons, dan metrik konversi.',
    features: ['Dashboard real-time', 'Conversion tracking', 'Customer insights', 'Performance reports'],
    color: '#34d399',
    href: '/register',
  },
];

const plans = [
  {
    name: 'LITE',
    price: 'Rp 99rb',
    period: '/bulan',
    description: 'Mulai otomasi WhatsApp bisnis Anda',
    color: '#2EE6C9',
    popular: false,
    features: [
      'WhatsApp AI auto reply',
      'Knowledge-based answers',
      'Upload 5 foto produk',
      'Smart FAQ detection',
      'Human handover',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    name: 'SMART',
    price: 'Rp 199rb',
    period: '/bulan',
    description: 'Untuk bisnis yang ingin berkembang lebih cepat',
    color: '#2EE6C9',
    popular: true,
    features: [
      'Semua fitur LITE',
      'Order summary automation',
      'Upload 20 foto produk',
      'Free landing page',
      'Advanced analytics',
    ],
  },
  {
    name: 'PRO',
    price: 'Rp 299rb',
    period: '/bulan',
    description: 'Solusi lengkap untuk bisnis skala besar',
    color: '#a78bfa',
    popular: false,
    features: [
      'Semua fitur SMART',
      'Whitelabelling',
      'Upload katalog XLS',
      'Upload DOCX / PDF KB',
      'Promo automation',
      'API ready',
      'Priority AI processing',
      'Priority support',
    ],
  },
];

const featureHighlights = [
  { icon: Zap,      title: 'Respon Instan',    desc: 'Bot menjawab dalam <1 detik, tanpa pelanggan menunggu.' },
  { icon: Globe,    title: 'Website Gratis',   desc: 'Landing page otomatis terintegrasi dari data toko Anda.' },
  { icon: Package,  title: 'Katalog Produk',   desc: 'Upload ribuan produk, AI langsung tahu stok & harga.' },
  { icon: Shield,   title: 'Aman & Privat',   desc: 'Data Anda disimpan di server Indonesia, terenkripsi penuh.' },
  { icon: Users,    title: 'Multi-Agen',       desc: 'Handover ke tim manusia kapan saja dengan mudah.' },
  { icon: Star,     title: 'Rating Tinggi',    desc: '4.8★ dari ratusan pebisnis aktif di seluruh Indonesia.' },
];

export default function SolutionsPage() {
  return (
    <main className="min-h-screen bg-[#070b14]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 55% 30%, rgba(46,230,201,0.07) 0%, transparent 65%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <span className="h-px w-8 bg-white/20" />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Solusi AI</span>
              <span className="h-px w-8 bg-white/20" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-bold text-white leading-[1.08] mb-6"
              style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}
            >
              Solusi AI untuk{' '}
              <span style={{ color: '#2EE6C9' }}>Bisnis Anda</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-white/45 leading-relaxed mb-10"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}
            >
              Transformasi bisnis Anda dengan otomasi AI cerdas via WhatsApp. Tingkatkan layanan pelanggan, efisiensi, dan pertumbuhan.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Link
                href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: '#2EE6C9', color: '#070b14' }}
              >
                <Sparkles className="w-4 h-4" />
                Mulai Gratis
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm border transition-all hover:border-white/30 hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
              >
                Hubungi Sales
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SOLUTIONS GRID ── */}
      <section className="py-28 bg-[#0a0d15]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Produk</span>
              <span className="h-px w-8 bg-white/20" />
            </div>
            <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
              Solusi Lengkap
            </h2>
            <p className="text-white/40 max-w-xl mx-auto" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
              Perangkat AI komprehensif untuk mengotomasi dan meningkatkan bisnis Anda
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {solutions.map((sol, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div
                  className="group relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${sol.color}30`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  }}
                >
                  {/* top gradient line */}
                  <div
                    className="absolute top-0 left-8 right-8 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${sol.color}60, transparent)` }}
                  />

                  <div className="flex items-start gap-5 mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${sol.color}15`, border: `1px solid ${sol.color}25` }}
                    >
                      <sol.icon className="w-5 h-5" style={{ color: sol.color }} />
                    </div>
                    <div>
                      <span className="text-[10px] tracking-[0.18em] uppercase font-semibold mb-1 block" style={{ color: sol.color + 'aa' }}>
                        {sol.label}
                      </span>
                      <h3 className="font-bold text-white text-lg">{sol.title}</h3>
                    </div>
                  </div>

                  <p className="text-white/40 text-sm leading-relaxed mb-6">{sol.description}</p>

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {sol.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: sol.color }} />
                        <span className="text-xs text-white/50">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={sol.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{ color: sol.color }}
                  >
                    Pelajari lebih lanjut
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES HIGHLIGHT ── */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Keunggulan</span>
              <span className="h-px w-8 bg-white/20" />
            </div>
            <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
              Kenapa Aimin?
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureHighlights.map((feat, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div
                  className="group rounded-xl p-6 transition-all duration-200 hover:bg-white/[0.035]"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'rgba(46,230,201,0.12)', border: '1px solid rgba(46,230,201,0.2)' }}
                  >
                    <feat.icon className="w-4.5 h-4.5" style={{ color: '#2EE6C9', width: 18, height: 18 }} />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{feat.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{feat.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-28 bg-[#0a0d15]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px w-8 bg-white/20" />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Harga</span>
              <span className="h-px w-8 bg-white/20" />
            </div>
            <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>
              Pilih Paket Anda
            </h2>
            <p className="text-white/40 max-w-xl mx-auto" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
              Harga transparan untuk bisnis semua ukuran. Tidak ada biaya tersembunyi.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div
                  className="relative flex flex-col rounded-2xl p-8 h-full transition-all duration-300"
                  style={{
                    background: plan.popular
                      ? `linear-gradient(135deg, rgba(46,230,201,0.08) 0%, rgba(46,230,201,0.03) 100%)`
                      : 'rgba(255,255,255,0.03)',
                    border: plan.popular
                      ? '1px solid rgba(46,230,201,0.25)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                      style={{ background: '#2EE6C9', color: '#070b14' }}
                    >
                      Terpopuler
                    </div>
                  )}

                  <div className="mb-6">
                    <span
                      className="text-xs tracking-[0.18em] uppercase font-bold"
                      style={{ color: plan.color }}
                    >
                      {plan.name}
                    </span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display font-bold text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.2rem)' }}>
                        {plan.price}
                      </span>
                      <span className="text-white/35 text-sm">{plan.period}</span>
                    </div>
                    <p className="text-white/35 text-xs mt-2 leading-snug">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                        <span className="text-white/55 text-sm">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
                    className="block text-center py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                    style={
                      plan.popular
                        ? { background: '#2EE6C9', color: '#070b14' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    Pilih {plan.name}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(46,230,201,0.05) 0%, transparent 70%)' }} />

        <Reveal className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-8 bg-white/20" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Mulai Sekarang</span>
            <span className="h-px w-8 bg-white/20" />
          </div>
          <h2 className="font-display font-bold text-white mb-5" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
            Siap Mencoba?
          </h2>
          <p className="text-white/40 mb-10" style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)' }}>
            Mulai uji coba gratis hari ini. Tidak perlu kartu kredit.
          </p>
          <Link
            href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: '#2EE6C9', color: '#070b14' }}
          >
            <Sparkles className="w-4 h-4" />
            Mulai Trial Gratis
          </Link>
        </Reveal>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
