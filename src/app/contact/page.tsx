'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn } from '@/components/ui/MotionDiv';
import { Button } from '@/components/ui/Button';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
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
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Image */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-mint-600 to-mint-500 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=2000&auto=format&fit=crop"
            alt="Customer support"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-mint-900/80 to-mint-700/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t.contact?.title || 'Contact Us'}
            </h1>
            <p className="text-mint-100 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
              {t.contact?.subtitle || 'Have questions? We are here to help. Send us a message and we will get back to you shortly.'}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">Send us a message</h2>
                <p className="text-gray-600 text-xs sm:text-sm mb-8">Fill out the form below and we will get back to you as soon as possible.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t.contact?.name || 'Name'}</label>
                      <input type="text" required className="input" placeholder="Your name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t.contact?.email || 'Email'}</label>
                      <input type="email" required className="input" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" required className="input" placeholder="How can we help?" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.contact?.message || 'Message'}</label>
                    <textarea required rows={5} className="input resize-none" placeholder="Tell us more about your inquiry..." />
                  </div>
                  <Button size="lg" variant="primary" className="w-full">
                    <Send className="w-5 h-5 mr-2" />
                    {t.contact?.send || 'Send Message'}
                  </Button>
                  {sent && (
                    <FadeIn>
                      <div className="bg-mint-50 border border-mint-200 text-mint-700 px-4 py-3 rounded-xl text-center text-xs font-medium">
                        {t.contact?.success || 'Message sent successfully!'}
                      </div>
                    </FadeIn>
                  )}
                </form>
              </div>
            </FadeIn>

            {/* Contact Info */}
            <FadeIn delay={0.2} className="space-y-8">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-mint-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Email</h3>
                      <p className="text-gray-600 text-sm">info@aiminassist.com</p>
                      <p className="text-gray-500 text-xs mt-1">We reply within 24 hours</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-mint-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Phone</h3>
                      <p className="text-gray-600 text-sm">+62 21 1234 5678</p>
                      <p className="text-gray-500 text-xs mt-1">Mon-Fri, 9AM-6PM WIB</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-mint-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Office</h3>
                      <p className="text-gray-600 text-sm">Jakarta, Indonesia</p>
                      <p className="text-gray-500 text-xs mt-1">Jakarta Selatan, DKI Jakarta</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden shadow-xl">
                <Image
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
                  alt="Our office"
                  width={600}
                  height={400}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mint-900/30 to-transparent" />
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Quick Support</h3>
                <p className="text-gray-600 text-xs mb-4">For immediate assistance, try our AI chatbot or browse our documentation.</p>
                <div className="flex gap-3">
                  <Link href="/solutions" className="flex-1 text-center btn-secondary-white">
                    FAQ
                  </Link>
                  <Link href="#" className="flex-1 text-center btn-secondary-white">
                    Docs
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
