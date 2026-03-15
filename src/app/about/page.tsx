'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { useI18n } from '@/lib/i18n-context';
import {
  Eye, Target, Users, TrendingUp, Shield, ArrowRight,
  CheckCircle, Code, Database, Cloud, Smartphone, Brain, Award,
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

const timeline = [
  { year: '2023',    title: 'Founded',        description: 'Aimin lahir dengan visi merevolusi customer service bisnis Indonesia.' },
  { year: '2024 Q1', title: 'Beta Launch',    description: 'Diluncurkan dengan 50 mitra bisnis awal yang terpilih.' },
  { year: '2024 Q3', title: 'Official Launch', description: 'Peluncuran publik penuh dengan integrasi WhatsApp.' },
  { year: '2025',    title: 'Growth Phase',   description: 'Mencapai 500+ bisnis aktif di seluruh Indonesia.' },
  { year: '2026',    title: 'Expansion',      description: 'Ekspansi ke pasar Asia Tenggara.' },
];

const team = [
  { name: 'Andi Pratama',  role: 'Founder & CEO',             bio: 'AI enthusiast dengan 10+ tahun pengalaman di teknologi & bisnis.' },
  { name: 'Sarah Wijaya',  role: 'CTO',                        bio: 'Ahli machine learning & natural language processing.' },
  { name: 'Budi Santoso',  role: 'Head of Product',            bio: 'Passionate membangun produk yang menyelesaikan masalah nyata.' },
  { name: 'Diana Putri',   role: 'Head of Customer Success',   bio: 'Berdedikasi membantu bisnis sukses dengan Aimin.' },
];

const techStack = [
  { icon: Brain,      name: 'LLM AI' },
  { icon: Code,       name: 'Next.js' },
  { icon: Database,   name: 'MySQL' },
  { icon: Cloud,      name: 'Cloud Infra' },
  { icon: Smartphone, name: 'WhatsApp API' },
  { icon: Shield,     name: 'Enterprise Security' },
];

const stats = [
  { value: '500+',  label: 'Bisnis Aktif' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.8★',  label: 'Rating Pelanggan' },
];

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[#070b14]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-28 overflow-hidden">
        {/* ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 60% 40%, rgba(46,230,201,0.06) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="origin-left mb-7 flex items-center gap-3"
              >
                <span className="h-px w-10 block" style={{ background: '#2EE6C9' }} />
                <span className="text-xs font-semibold tracking-[0.22em] uppercase text-white/45">Tentang Kami</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 48 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-display font-bold text-white leading-[1.0] tracking-tight"
                style={{ fontSize: 'clamp(42px, 6vw, 64px)' }}
              >
                {t.about?.title || 'Membangun Masa'}<br />
                <span style={{ color: '#2EE6C9' }}>Depan</span> Customer<br />Service
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.35 }}
                className="mt-7 text-base text-white/50 font-light leading-relaxed max-w-lg"
              >
                {t.about?.subtitle || 'Kami hadir untuk mentransformasi cara bisnis terhubung dengan pelanggan melalui otomasi bertenaga AI yang cerdas dan natural.'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.55 }}
                className="mt-9 flex flex-wrap gap-4"
              >
                <Link
                  href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-[#070b14] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(46,230,201,0.35)]"
                  style={{ background: '#2EE6C9' }}
                >
                  Mulai Gratis <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/8 hover:text-white"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}
                >
                  Hubungi Kami
                </Link>
              </motion.div>
            </div>

            <Reveal delay={0.2}>
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.07]">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"
                  alt="Our team"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.55) 0%, transparent 60%)' }} />
                <div className="absolute bottom-5 left-5 px-4 py-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(7,11,20,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-2 h-2 rounded-full bg-[#2EE6C9] animate-pulse" />
                  <span className="text-xs text-white/60">Team of <span className="text-white font-semibold">passionate</span> builders</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── VISION & MISSION ── */}
      <section className="py-28" style={{ background: '#0a0d15', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Fondasi Kami</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
              {t.about?.vision || 'Visi & Misi'}
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: Eye, label: t.about?.vision || 'Visi',
                text: 'Menjadi platform AI customer service terdepan di Asia Tenggara, membantu bisnis dari semua ukuran memberikan pengalaman pelanggan yang luar biasa.',
              },
              {
                icon: Target, label: t.about?.mission || 'Misi',
                text: 'Memberdayakan bisnis dengan alat otomasi cerdas yang mengurangi waktu respons, meningkatkan kepuasan pelanggan, dan mendorong pertumbuhan.',
              },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.12}>
                <div className="group relative p-8 rounded-2xl border transition-colors duration-300 hover:border-[#2EE6C9]/20"
                  style={{ background: '#070b14', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: 'linear-gradient(90deg, transparent, #2EE6C9, transparent)' }} />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                    style={{ background: 'rgba(46,230,201,0.08)', border: '1px solid rgba(46,230,201,0.15)' }}>
                    <item.icon className="w-5 h-5 text-[#2EE6C9]" />
                  </div>
                  <h3 className="font-display font-semibold text-white text-xl mb-3">{item.label}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY AIMIN ── */}
      <section className="py-28 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Keunggulan</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
              {t.about?.whyAimin || 'Kenapa Aimin?'}
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
            {[
              { icon: Users,       title: 'Konteks Indonesia',      desc: 'AI kami dilatih memahami bahasa & budaya Indonesia, memberikan respons yang akurat dan natural.' },
              { icon: TrendingUp,  title: 'Hasil Terbukti',         desc: 'Klien kami rata-rata meningkat 40% engagement pelanggan & 60% pengurangan waktu respons.' },
              { icon: Shield,      title: 'Keamanan Enterprise',    desc: 'Enkripsi end-to-end tingkat bank, kepatuhan GDPR, dan audit keamanan reguler.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
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
                  <item.icon className="w-5 h-5 text-[#2EE6C9]" />
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── (commented out)
      <section className="py-28" style={{ background: '#0a0d15', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Perjalanan</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
              {t.about?.timeline || 'Milestone Kami'}
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group rounded-2xl overflow-hidden border transition-colors duration-300 hover:border-[#2EE6C9]/20 flex flex-col"
                style={{ background: '#070b14', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={`https://images.unsplash.com/photo-${['1522071820081-009f0129c71c', '1551434678-e076c223a692', '1531482615713-2afd69097998', '1504384308090-c54be3857092', '1559136555-9303baea8ebd'][i]}?q=80&w=400&auto=format&fit=crop`}
                    alt={item.year}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.7) 0%, transparent 60%)' }} />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full text-[#070b14]"
                      style={{ background: '#2EE6C9' }}>{item.year}</span>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <h3 className="font-semibold text-white text-sm mb-1.5">{item.title}</h3>
                  <p className="text-white/40 text-xs leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* ── TEAM ── (commented out)
      <section className="py-28 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
              <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">People</span>
            </div>
            <h2 className="font-display font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(30px, 3.5vw, 48px)' }}>
              {t.about?.team || 'Tim Kami'}
            </h2>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group p-6 rounded-2xl border text-center transition-colors duration-300 hover:border-[#2EE6C9]/20"
                style={{ background: '#0a0d15', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-lg font-bold text-[#070b14] shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #2EE6C9, #14b8a6)' }}>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="font-display font-semibold text-white text-sm mb-1">{member.name}</h3>
                <p className="text-[#2EE6C9] text-xs font-medium mb-3">{member.role}</p>
                <p className="text-white/40 text-xs leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* ── TECH STACK ── */}
      <section className="py-28" style={{ background: '#0a0d15', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.07]">
                <Image
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
                  alt="Technology"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.5) 0%, transparent 60%)' }} />
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
                <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Teknologi</span>
              </div>
              <h2 className="font-display font-bold text-white tracking-tight mb-5"
                style={{ fontSize: 'clamp(28px, 3vw, 44px)' }}>
                {t.about?.tech || 'Dibangun dengan Teknologi Terbaik'}
              </h2>
              <p className="text-white/45 text-sm leading-relaxed mb-8">
                Kami memanfaatkan teknologi mutakhir untuk menghadirkan platform yang robust, scalable, dan aman untuk bisnis Anda.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {techStack.map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="group p-4 rounded-xl text-center transition-colors duration-200"
                    style={{ background: 'rgba(46,230,201,0.04)', border: '1px solid rgba(46,230,201,0.10)' }}
                  >
                    <div className="w-9 h-9 rounded-lg mx-auto mb-2.5 flex items-center justify-center"
                      style={{ background: 'rgba(46,230,201,0.08)' }}>
                      <tech.icon className="w-4.5 h-4.5 text-[#2EE6C9]" style={{ width: 18, height: 18 }} />
                    </div>
                    <p className="text-xs font-medium text-white/60">{tech.name}</p>
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── STATS / CTA ── */}
      <section className="relative py-32 overflow-hidden bg-[#070b14]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(46,230,201,0.07) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #2EE6C9, transparent)' }} />
        <div className="absolute inset-0 opacity-[0.04]">
          <Image
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop"
            alt="" fill className="object-cover" unoptimized />
        </div>

        <Reveal className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
            <Award className="w-4 h-4 text-[#2EE6C9]" />
            <span className="h-px w-8 block" style={{ background: '#2EE6C9' }} />
          </div>
          <h2 className="font-display font-bold text-white tracking-tight mb-4"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', lineHeight: 1.05 }}>
            {t.about?.trust || 'Dipercaya Ratusan Bisnis'}
          </h2>
          <p className="text-white/40 text-sm font-light leading-relaxed mb-12 max-w-md mx-auto">
            Bergabunglah dengan ratusan bisnis yang mengandalkan Aimin untuk customer service mereka
          </p>

          <div className="grid grid-cols-3 gap-8 mb-12">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs tracking-[0.14em] uppercase text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          <Link
            href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F"
            className="group inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-bold text-[#070b14] transition-all duration-300 hover:scale-[1.04] hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #2EE6C9, #14b8a6)', boxShadow: '0 0 40px rgba(46,230,201,0.28)' }}
          >
            Mulai Sekarang
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
