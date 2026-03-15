'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import ThreeHeroBackground from '@/components/home/ThreeHeroBackground';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useI18n } from '@/lib/i18n-context';
import { Brain, MessageSquare, BarChart3, Zap, Shield, Database, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react';

// ── Animated section reveal ──────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
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

export default function HomePage() {
  const { t } = useI18n();
  const p = t.homePage;

  const features = [
    { icon: Brain,         title: p.feature1Title, description: p.feature1Desc },
    { icon: MessageSquare, title: p.feature2Title, description: p.feature2Desc },
    { icon: BarChart3,     title: p.feature3Title, description: p.feature3Desc },
    { icon: Zap,           title: p.feature4Title, description: p.feature4Desc },
    { icon: Shield,        title: p.feature5Title, description: p.feature5Desc },
    { icon: Database,      title: p.feature6Title, description: p.feature6Desc },
  ];

  const stats = [
    { end: 500,  suffix: '+',  label: p.statBusinesses },
    { end: 47,   suffix: 'M+', label: p.statMessages },
    { end: 99,   suffix: '%',  label: p.statUptime },
    { end: 3,    suffix: 's',  label: p.statResponse },
  ];

  const testimonials = [
    { name: 'Sarah Wijaya', role: 'Owner, Toko Modern',  quote: p.testimonial1Quote },
    { name: 'Budi Santoso', role: 'CEO, E-Market',       quote: p.testimonial2Quote },
    { name: 'Anita Putri',  role: 'Manager, Fashion Brand', quote: p.testimonial3Quote },
  ];

  const analyticsItems = [
    p.analyticsItem1,
    p.analyticsItem2,
    p.analyticsItem3,
    p.analyticsItem4,
  ];

  return (
    <main className="min-h-screen bg-[#070b14]">
      <Navbar />

      {/* ══════════════════════════════════════════
          HERO — Full-screen canvas, left-anchored copy
      ══════════════════════════════════════════ */}
      <section className="relative h-screen min-h-[640px] flex items-center overflow-hidden">
        <ThreeHeroBackground />

        {/* Radial gradient to punch through right side where sphere lives */}
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(7,11,20,0.72) 0%, rgba(7,11,20,0.18) 55%, transparent 100%)' }} />

        {/* Content */}
        <div className="relative z-[2] w-full max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">

            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="origin-left mb-8 flex items-center gap-3"
            >
              <span className="h-px w-10" style={{ background: '#2EE6C9', display: 'block' }} />
              <span className="text-xs font-semibold tracking-[0.22em] uppercase text-white/45">
                {p.eyebrow}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 56 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-bold text-white leading-[1.0] tracking-tight"
              style={{ fontSize: 'clamp(48px, 7vw, 70px)', textShadow: '0 2px 40px rgba(0,0,0,0.4)' }}
            >
              {p.hero1}
              <br />
              <span style={{ color: '#2EE6C9' }}>{p.hero2}</span>
              <br />
              {p.hero3}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.35 }}
              className="mt-7 text-base sm:text-lg text-white/55 font-light leading-relaxed max-w-lg"
            >
              {p.heroDesc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-[#070b14] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(46,230,201,0.35)]"
                style={{ background: '#2EE6C9' }}
              >
                {p.startTrial}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/solutions"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/8 hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {p.viewSolutions}
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2 text-white/30"
        >
          <span className="text-[10px] tracking-[0.22em] uppercase">{p.scroll}</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════ */}
      <section
        className="py-16"
        style={{
          background: '#0a0d15',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.05]">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.1} className="text-center px-6 py-4">
                <AnimatedCounter
                  end={s.end}
                  suffix={s.suffix}
                  delay={i * 0.15}
                  className="font-display text-4xl md:text-5xl font-bold text-white"
                />
                <p className="mt-1.5 text-xs tracking-[0.14em] uppercase text-white/35">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section className="py-28 lg:py-36 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Section header */}
          <Reveal className="mb-16 lg:mb-20">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">{p.capabilitiesLabel}</span>
            </div>
            <h2 className="font-display font-bold text-white leading-none tracking-tight max-w-2xl"
              style={{ fontSize: 'clamp(36px, 4.5vw, 58px)' }}>
              {p.capabilitiesTitle}
            </h2>
          </Reveal>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="group relative p-8 bg-[#070b14] hover:bg-[#0a0d15] transition-colors duration-300"
              >
                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(90deg, transparent, #2EE6C9, transparent)' }} />

                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: 'rgba(46,230,201,0.08)', border: '1px solid rgba(46,230,201,0.15)' }}>
                  <f.icon className="w-5 h-5 text-[#2EE6C9]" />
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          PRODUCT SHOWCASE — image + bullets
      ══════════════════════════════════════════ */}
      <section className="py-28 lg:py-36" style={{ background: '#0a0d15' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Image */}
            <Reveal>
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.07]">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"
                  alt="Analytics Dashboard"
                  width={680}
                  height={520}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.5) 0%, transparent 60%)' }} />

                {/* Floating metric */}
                <div
                  className="absolute bottom-5 left-5 px-4 py-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(7,11,20,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#2EE6C9] animate-pulse" />
                  <span className="text-xs text-white/60">Live — <span className="text-white font-semibold">1,247</span> {p.liveMessages}</span>
                </div>
              </div>
            </Reveal>

            {/* Copy */}
            <Reveal delay={0.15}>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
                <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">{p.analyticsLabel}</span>
              </div>
              <h2 className="font-display font-bold text-white leading-tight tracking-tight mb-5"
                style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
                {p.analyticsTitle}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-8">
                {p.analyticsDesc}
              </p>
              <ul className="space-y-3.5 mb-9">
                {analyticsItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/60 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#2EE6C9] mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-[#070b14] transition-all duration-300 hover:scale-[1.03]"
                style={{ background: '#2EE6C9' }}
              >
                {p.seeItLive}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════ */}
      <section className="py-28 lg:py-36 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          <Reveal className="mb-16 lg:mb-20">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">{p.testimonialsLabel}</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
              {p.testimonialsTitle}
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative p-7 rounded-2xl bg-[#0a0d15] border border-white/[0.05] overflow-hidden group hover:border-[#2EE6C9]/15 transition-colors duration-300"
              >
                {/* Corner glow */}
                <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at top right, rgba(46,230,201,0.07), transparent 70%)' }} />

                {/* Big quote mark */}
                <div className="text-5xl font-serif leading-none mb-4 select-none"
                  style={{ color: 'rgba(46,230,201,0.12)' }}>"</div>

                <p className="text-white/55 text-sm leading-relaxed mb-6 italic">
                  {t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.05]">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-[#070b14] flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2EE6C9, #14b8a6)' }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-none">{t.name}</p>
                    <p className="text-white/35 text-xs mt-1">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA
      ══════════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden" style={{ background: '#0a0d15' }}>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(46,230,201,0.07) 0%, transparent 70%)' }} />

        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #2EE6C9, transparent)' }} />

        {/* Background image — faint */}
        <div className="absolute inset-0 opacity-[0.05]">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop"
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <Reveal className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
            <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">{p.ctaLabel}</span>
            <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
          </div>

          <h2 className="font-display font-bold text-white tracking-tight mb-5"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.05 }}>
            {p.ctaTitle}
          </h2>
          <p className="text-white/45 text-base font-light leading-relaxed mb-10 max-w-md mx-auto">
            {p.ctaDesc}
          </p>
          <Link
            href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-bold text-[#070b14] transition-all duration-300 hover:scale-[1.04] hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #2EE6C9, #14b8a6)',
              boxShadow: '0 0 40px rgba(46,230,201,0.28)',
            }}
          >
            {p.ctaButton}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
