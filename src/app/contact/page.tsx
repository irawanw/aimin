'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { Mail, Phone, MapPin, Send, CheckCircle, ArrowRight, MessageSquare } from 'lucide-react';

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

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'admin@aiminassist.com',
    note: 'Kami membalas dalam 24 jam',
  },
  {
    icon: Phone,
    title: 'WhatsApp',
    value: '+62 8996699415',
    note: 'Senin–Jumat, 09.00–18.00 WIB',
    href: 'https://wa.me/628996699415',
  },
  {
    icon: MapPin,
    title: 'Kantor',
    value: 'Pekalongan, Indonesia',
    note: 'Pekalongan, Jawa Tengah',
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[#070b14]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(46,230,201,0.06) 0%, transparent 65%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-3 mb-7"
          >
            <span className="h-px w-8 bg-white/20" />
            <span className="text-xs tracking-[0.2em] uppercase text-white/35 font-medium">Hubungi Kami</span>
            <span className="h-px w-8 bg-white/20" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-bold text-white leading-[1.08] mb-5"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}
          >
            Ada Pertanyaan?{' '}
            <span style={{ color: '#2EE6C9' }}>Kami Siap</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-white/45 max-w-2xl mx-auto"
            style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}
          >
            Kirimkan pesan kepada kami dan tim kami akan segera merespons.
          </motion.p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="pb-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Contact Form */}
            <Reveal delay={0.1}>
              <div
                className="rounded-2xl p-8"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <h2 className="font-bold text-white text-xl mb-1">Kirim Pesan</h2>
                <p className="text-white/35 text-sm mb-8">Isi formulir di bawah dan kami akan merespons sesegera mungkin.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Nama</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama Anda"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(46,230,201,0.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        placeholder="email@anda.com"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.09)',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(46,230,201,0.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Subjek</label>
                    <input
                      type="text"
                      required
                      placeholder="Bagaimana kami bisa membantu?"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(46,230,201,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Pesan</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Ceritakan lebih lanjut tentang pertanyaan Anda..."
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors resize-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.09)',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(46,230,201,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
                    />
                  </div>

                  {sent ? (
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(46,230,201,0.08)', border: '1px solid rgba(46,230,201,0.2)' }}
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#2EE6C9' }} />
                      <span className="text-sm font-medium" style={{ color: '#2EE6C9' }}>Pesan berhasil dikirim!</span>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#2EE6C9', color: '#070b14' }}
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-[#070b14]/40 border-t-[#070b14] rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {loading ? 'Mengirim...' : 'Kirim Pesan'}
                    </button>
                  )}
                </form>
              </div>
            </Reveal>

            {/* Contact Info + Image */}
            <div className="space-y-6">
              <Reveal delay={0.2}>
                <h2 className="font-bold text-white text-xl mb-6">Kontak Langsung</h2>
                <div className="space-y-4">
                  {contactInfo.map((info, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-5 rounded-xl transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(46,230,201,0.1)', border: '1px solid rgba(46,230,201,0.18)' }}
                      >
                        <info.icon className="w-4.5 h-4.5" style={{ color: '#2EE6C9', width: 18, height: 18 }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm mb-0.5">{info.title}</h3>
                        {info.href ? (
                          <a href={info.href} target="_blank" rel="noopener noreferrer"
                            className="text-sm transition-colors hover:opacity-80" style={{ color: '#2EE6C9' }}>
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-white/60 text-sm">{info.value}</p>
                        )}
                        <p className="text-white/30 text-xs mt-0.5">{info.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="relative rounded-2xl overflow-hidden" style={{ height: 220 }}>
                  <Image
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
                    alt="Kantor kami"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.7) 0%, transparent 60%)' }} />
                  <div className="absolute bottom-4 left-5">
                    <p className="text-white font-semibold text-sm">Pekalongan, Jawa Tengah</p>
                    <p className="text-white/50 text-xs">Indonesia</p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.4}>
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" style={{ color: '#2EE6C9' }} />
                    <h3 className="font-semibold text-white text-sm">Butuh bantuan cepat?</h3>
                  </div>
                  <p className="text-white/35 text-xs leading-relaxed mb-4">
                    Gunakan AI chatbot kami atau chat langsung via WhatsApp untuk bantuan instan.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/solutions"
                      className="flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/[0.08]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      FAQ
                    </Link>
                    <a
                      href="https://wa.me/628996699415"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{ background: '#2EE6C9', color: '#070b14' }}
                    >
                      <ArrowRight className="w-3 h-3" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
