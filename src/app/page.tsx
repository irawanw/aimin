'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn, SlideIn } from '@/components/ui/MotionDiv';
import ThreeHeroBackground from '@/components/home/ThreeHeroBackground';
import { FeatureCard } from '@/components/home/FeatureCard';
import { TestimonialCard } from '@/components/home/TestimonialCard';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { AnimatedProgress } from '@/components/ui/AnimatedProgress';
import { Button } from '@/components/ui/Button';
import { Brain, MessageSquare, BarChart, Zap, Shield, Database, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Auto Reply',
    description: 'Automatically reply to customer messages with AI that understands your business context and Indonesian language nuances.',
  },
  {
    icon: MessageSquare,
    title: '24/7 WhatsApp Integration',
    description: 'Seamless WhatsApp Business API integration ensuring never miss a customer message, even outside business hours.',
  },
  {
    icon: BarChart,
    title: 'Smart Analytics Dashboard',
    description: 'Monitor chat performance, track sales conversions, and gain insights with real-time analytics and comprehensive reports.',
  },
  {
    icon: Zap,
    title: 'Instant Human Handover',
    description: 'Seamlessly transfer complex conversations to your team when AI assistance is needed, maintaining customer satisfaction.',
  },
  {
    icon: Shield,
    title: 'Custom Knowledge Base',
    description: 'Upload your product catalogs, FAQs, and business information for accurate, contextual responses tailored to your brand.',
  },
  {
    icon: Database,
    title: 'Customer Data Management',
    description: 'Store and manage customer interactions, track conversation history, and build a valuable customer database.',
  },
];

const testimonials = [
  {
    name: 'Sarah Wijaya',
    role: 'Owner, Toko Modern',
    quote: 'Aimin completely transformed our customer service. Response times dropped from hours to seconds, and our sales increased by 40%!',
  },
  {
    name: 'Budi Santoso',
    role: 'CEO, E-Market',
    quote: 'Best WhatsApp chatbot solution we have tried. The AI understands Indonesian context perfectly and saves us hours every day.',
  },
  {
    name: 'Anita Putri',
    role: 'Manager, Fashion Brand',
    quote: 'The analytics dashboard gives us incredible insights. We can now track every conversation conversion and optimize our responses.',
  },
];

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with 3D Background */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-mint-50 to-white overflow-hidden">
        <ThreeHeroBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              AI-Powered WhatsApp Automation for Your Business
            </h1>
            <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-lg leading-relaxed">
              Transform your customer service with intelligent AI chat assistants, automation engines, and real-time analytics. Respond instantly, 24/7.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F">
                <Button size="lg" variant="primary">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/solutions">
                <Button size="lg" variant="secondary">
                  View Solutions
                </Button>
              </Link>
            </div>
          </FadeIn>

          {/* Right side - AI chat illustration image */}
          <SlideIn direction="right" delay={0.2} className="relative">
            <div className="relative">
              {/* Main image - AI/Chatbot illustration */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1200&auto=format&fit=crop"
                  alt="AI Chatbot Interface"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mint-900/40 to-transparent" />
              </div>

              {/* Floating stat card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-mint-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">98%</div>
                    <div className="text-sm text-gray-500">Response Rate</div>
                  </div>
                </div>
              </div>

              {/* Floating user count */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-mint-600 to-mint-500 rounded-2xl shadow-xl p-4">
                <div className="text-white">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-xs text-mint-100">Businesses</div>
                </div>
              </div>
            </div>
          </SlideIn>
        </div>
      </section>

      {/* Animated Counter Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <AnimatedCounter end={500} suffix="+" />
              <p className="mt-2 text-gray-600 text-sm sm:text-base">Active Businesses</p>
              <div className="mt-3">
                <AnimatedProgress progress={75} color="#0d9488" />
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={47688} suffix="M+" delay={0.2} />
              <p className="mt-2 text-gray-600 text-sm sm:text-base">Messages/Month</p>
              <div className="mt-3">
                <AnimatedProgress progress={90} color="#0d9488" />
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={99} suffix="%" delay={0.4} />
              <p className="mt-2 text-gray-600 text-sm sm:text-base">Uptime</p>
              <div className="mt-3">
                <AnimatedProgress progress={99} color="#10b981" />
              </div>
            </div>
            <div className="text-center">
              <AnimatedCounter end={24} suffix="/7" delay={0.6} />
              <p className="mt-2 text-gray-600 text-sm sm:text-base">24/7 Support</p>
              <div className="mt-3">
                <AnimatedProgress progress={100} color="#14b8a6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-4">
              Powerful Features for Your Business
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              Everything you need to automate your WhatsApp customer service and boost sales
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delay={i * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section with Image */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <SlideIn direction="left">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop"
                  alt="Business analytics dashboard"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-mint-900/10" />
              </div>
            </SlideIn>
            <FadeIn delay={0.2}>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                See Your Business Grow with Data-Driven Insights
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6 leading-relaxed">
                Our comprehensive analytics dashboard gives you real-time visibility into your customer interactions, conversion rates, and team performance.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Track response times and customer satisfaction',
                  'Monitor sales conversions from WhatsApp interactions',
                  'Analyze peak hours and optimize staffing',
                  'Generate detailed reports for business decisions',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle className="w-5 h-5 text-mint-600 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F">
                <Button size="lg" variant="primary">
                  Start Tracking Now
                </Button>
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-4">
              What Our Clients Say
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              Trusted by hundreds of businesses across Indonesia
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <TestimonialCard
                key={i}
                name={t.name}
                role={t.role}
                quote={t.quote}
                delay={i * 0.15}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-r from-mint-600 to-mint-500 relative overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop"
            alt="Team collaboration"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="mt-4 text-mint-100 text-sm sm:text-base mb-8">
              Start your free trial today. No credit card required. Cancel anytime.
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
