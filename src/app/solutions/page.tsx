'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn } from '@/components/ui/MotionDiv';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Workflow, Wrench, BarChart3, CheckCircle, Zap, Shield, Clock, Users } from 'lucide-react';

const solutions = [
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Intelligent WhatsApp automation that understands context and provides accurate responses 24/7. Perfect for handling customer inquiries, product questions, and support requests.',
    cta: 'Learn More',
    ctaLink: '/register',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop',
    features: [
      { icon: Zap, text: 'Instant 24/7 responses' },
      { icon: Shield, text: 'Context-aware conversations' },
      { icon: Users, text: 'Indonesian language support' },
      { icon: Clock, text: 'No wait time' },
    ],
  },
  {
    icon: Workflow,
    title: 'Automation Engine',
    description: 'Streamline your workflows with AI-powered task automation and smart routing. Automate order processing, appointment scheduling, and repetitive tasks.',
    cta: 'Learn More',
    ctaLink: '/register',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    features: [
      { icon: Zap, text: 'Smart task routing' },
      { icon: Shield, text: 'Workflow automation' },
      { icon: Users, text: 'Custom triggers' },
      { icon: Clock, text: 'Real-time sync' },
    ],
  },
  {
    icon: Wrench,
    title: 'Custom AI Integration',
    description: 'Tailored AI solutions built specifically for your business needs. Custom training on your product data, brand voice, and industry requirements.',
    cta: 'Contact Us',
    ctaLink: '/contact',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop',
    features: [
      { icon: Zap, text: 'Tailored to your needs' },
      { icon: Shield, text: 'Domain-specific training' },
      { icon: Users, text: 'Custom integrations' },
      { icon: Clock, text: 'Dedicated support' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Real-time dashboards and comprehensive reports to drive decisions. Track customer satisfaction, response times, conversation trends, and conversion metrics.',
    cta: 'View Demo',
    ctaLink: '/register',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    features: [
      { icon: Zap, text: 'Real-time dashboards' },
      { icon: Shield, text: 'Conversion tracking' },
      { icon: Users, text: 'Customer insights' },
      { icon: Clock, text: 'Performance reports' },
    ],
  },
];

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
];

const enterpriseFeatures = [
  'Everything in SMART',
  'Whitelabelling',
  'Upload XLS product catalogue',
  'Upload DOCX PDF knowledge base',
  'Promo automation',
  'API ready',
  'Priority AI processing',
  'Priority support',
];

export default function SolutionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Image */}
      <section className="py-24 bg-gradient-to-br from-mint-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                AI Solutions for Your Business
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed mb-8">
                Transform your business with intelligent AI-powered automation solutions designed for WhatsApp. Improve customer service, increase efficiency, and drive growth.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F">
                  <Button size="lg" variant="primary">
                    Get Started
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="secondary">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="relative">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000&auto=format&fit=crop"
                    alt="AI Technology"
                    width={600}
                    height={500}
                    className="w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-mint-900/30 to-transparent" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-mint-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">AI</div>
                      <div className="text-sm text-gray-500">Powered</div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Solutions Grid with Images */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-4">
              Our Solutions
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              Comprehensive AI tools designed to automate and elevate your business
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8">
            {solutions.map((solution, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={solution.image}
                      alt={solution.title}
                      width={800}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-mint-900/50 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="w-12 h-12 bg-mint-600 rounded-xl flex items-center justify-center shadow-lg">
                        <solution.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                      {solution.title}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed text-sm sm:text-base">
                      {solution.description}
                    </p>
                    <div className="mb-6 space-y-3">
                      {solution.features.slice(0, 2).map((feature, fi) => (
                        <div key={fi} className="flex items-center gap-3 text-xs sm:text-sm text-gray-700">
                          <feature.icon className="w-4 h-4 text-mint-600" />
                          <span>{feature.text}</span>
                        </div>
                      ))}
                    </div>
                    <Link href={solution.ctaLink}>
                      <Button variant="outline" size="sm" className="w-full">
                        {solution.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-4">Choose Your Plan</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              Simple, transparent pricing for businesses of all sizes
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FadeIn delay={0.1}>
              <div className="bg-white rounded-3xl p-8 shadow-xl h-full flex flex-col hover:shadow-2xl transition-shadow border border-gray-100">
                <div className="text-xs sm:text-sm font-semibold text-mint-600 uppercase tracking-wide">Lite</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">Rp 99rb</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {liteFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-mint-600 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F" className="mt-8 block text-center btn-primary">Choose Plan</Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="relative bg-gradient-to-br from-mint-600 to-mint-700 rounded-3xl p-8 shadow-xl h-full flex flex-col text-white ring-4 ring-mint-400/30">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full">Most Popular</div>
                <div className="text-xs sm:text-sm font-semibold text-mint-200 uppercase tracking-wide">SMART</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold">Rp 199rb</span>
                  <span className="text-mint-200 text-sm">/month</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {proFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-mint-100">
                      <CheckCircle className="w-5 h-5 text-yellow-300 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F" className="mt-8 block text-center bg-white text-mint-700 font-bold py-3 px-6 rounded-xl hover:bg-mint-50 transition-colors shadow-lg">Choose Plan</Link>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="bg-white rounded-3xl p-8 shadow-xl h-full flex flex-col hover:shadow-2xl transition-shadow border border-gray-200">
                <div className="text-xs sm:text-sm font-semibold text-purple-600 uppercase tracking-wide">PRO</div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">Rp 299rb</span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {enterpriseFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                      <CheckCircle className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F" className="mt-8 block text-center bg-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-purple-700 transition-colors shadow-lg">Choose Plan</Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section with Background Image */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?q=80&w=2000&auto=format&fit=crop"
            alt="Business success"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-mint-900/90 to-mint-700/90" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-mint-100 text-sm sm:text-base mb-8">
              Start your free trial today. No credit card required.
            </p>
            <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F" className="inline-block bg-white text-mint-700 font-bold py-4 px-8 rounded-xl hover:bg-mint-50 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              Start Free Trial
            </Link>
          </FadeIn>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
