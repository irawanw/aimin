'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatWidget from '@/components/chat/ChatWidget';
import { FadeIn, SlideIn } from '@/components/ui/MotionDiv';
import { Button } from '@/components/ui/Button';
import { Eye, Target, Users, TrendingUp, Award, Shield, CheckCircle, Code, Database, Cloud, Smartphone, Brain } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

const timeline = [
  { year: '2023', title: 'Founded', description: 'Aimin was born with a vision to revolutionize customer service.', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=400&auto=format&fit=crop' },
  { year: '2024 Q1', title: 'Beta Launch', description: 'Launched beta version with 50 initial business partners.', image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=400&auto=format&fit=crop' },
  { year: '2024 Q3', title: 'Official Launch', description: 'Full public launch with WhatsApp integration.', image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=400&auto=format&fit=crop' },
  { year: '2025', title: 'Growth Phase', description: 'Reached 500+ active businesses across Indonesia.', image: 'https://images.unsplash.com/photo-1504384308090-c54be3857092?q=80&w=400&auto=format&fit=crop' },
  { year: '2026', title: 'Expansion', description: 'Expanding to Southeast Asian markets.', image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=400&auto=format&fit=crop' },
];

const team = [
  { name: 'Andi Pratama', role: 'Founder & CEO', bio: 'AI enthusiast with 10+ years of experience in technology and business.' },
  { name: 'Sarah Wijaya', role: 'CTO', bio: 'Expert in machine learning and natural language processing.' },
  { name: 'Budi Santoso', role: 'Head of Product', bio: 'Passionate about building products that solve real problems.' },
  { name: 'Diana Putri', role: 'Head of Customer Success', bio: 'Dedicated to helping businesses succeed with Aimin.' },
];

const techStack = [
  { icon: Brain, name: 'OpenAI GPT' },
  { icon: Code, name: 'React' },
  { icon: Database, name: 'MySQL' },
  { icon: Cloud, name: 'AWS' },
  { icon: Smartphone, name: 'WhatsApp API' },
  { icon: Shield, name: 'Enterprise Security' },
];

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Image */}
      <section className="py-24 bg-gradient-to-br from-mint-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6">
                {t.about?.title || 'About Us'}
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed">
                {t.about?.subtitle || 'We are on a mission to transform how businesses connect with their customers through AI-powered automation.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/register?msg=Kak+aku+mau+cobain+trial+gimana+caranya+ya%3F">
                  <Button size="lg" variant="primary">
                    Get Started
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="secondary">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </FadeIn>
            <SlideIn direction="right" delay={0.2}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop"
                  alt="Our team working"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mint-900/20 to-transparent" />
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <FadeIn>
              <div className="bg-gradient-to-br from-mint-50 to-white p-8 rounded-3xl border border-mint-100 shadow-lg">
                <div className="w-16 h-16 bg-mint-100 rounded-2xl flex items-center justify-center mb-6">
                  <Eye className="w-8 h-8 text-mint-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.about?.vision || 'Our Vision'}</h2>
                <p className="text-gray-600 leading-relaxed">
                  To become the leading AI-powered customer service platform in Southeast Asia, helping businesses of all sizes deliver exceptional customer experiences at scale.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="bg-gradient-to-br from-mint-50 to-white p-8 rounded-3xl border border-mint-100 shadow-lg">
                <div className="w-16 h-16 bg-mint-100 rounded-2xl flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-mint-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.about?.mission || 'Our Mission'}</h2>
                <p className="text-gray-600 leading-relaxed">
                  To empower businesses with intelligent automation tools that reduce response times, improve customer satisfaction, and drive growth while maintaining the human touch when it matters most.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Why Aimin */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl font-bold text-center text-gray-900 mb-4">{t.about?.whyAimin || 'Why Aimin?'}</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              What makes us different from other chatbot solutions
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: 'Indonesian Context', desc: 'Our AI is trained to understand Indonesian language and culture, providing accurate and natural responses.' },
              { icon: TrendingUp, title: 'Proven Results', desc: 'Our clients see an average 40% increase in customer engagement and 60% reduction in response time.' },
              { icon: Shield, title: 'Enterprise Security', desc: 'Bank-grade security with end-to-end encryption, GDPR compliance, and regular security audits.' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-mint-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl font-bold text-center text-gray-900 mb-4">{t.about?.timeline || 'Our Journey'}</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              Key milestones in our growth story
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-5 gap-6">
            {timeline.map((item, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-shadow h-full flex flex-col">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.year}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-mint-600 text-white text-xs font-bold px-3 py-1 rounded-full">{item.year}</span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.title}</h3>
                    <p className="text-gray-600 text-xs line-clamp-3">{item.description}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-xl sm:text-3xl font-bold text-center text-gray-900 mb-4">{t.about?.team || 'Meet Our Team'}</h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16 text-sm sm:text-base">
              The passionate people behind Aimin
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow">
                  <div className="w-20 h-20 bg-gradient-to-br from-mint-400 to-mint-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{member.name}</h3>
                  <p className="text-mint-600 text-xs sm:text-sm font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{member.bio}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <SlideIn direction="left">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
                  alt="Our technology"
                  width={600}
                  height={500}
                  className="w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mint-900/20 to-transparent" />
              </div>
            </SlideIn>
            <FadeIn delay={0.2}>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6">{t.about?.tech || 'Built with the Best'}</h2>
              <p className="text-gray-600 text-sm sm:text-base mb-8 leading-relaxed">
                We leverage cutting-edge technologies to deliver a robust, scalable, and secure platform for your business.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {techStack.map((tech, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl text-center hover:bg-mint-50 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center shadow-sm">
                      <tech.icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-gray-700">{tech.name}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-gradient-to-br from-mint-600 to-mint-500 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop"
            alt="Business success"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-mint-900/80" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
          <FadeIn>
            <Award className="w-16 h-16 text-white mx-auto mb-6" />
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              {t.about?.trust || 'Trusted by Businesses'}
            </h2>
            <p className="text-mint-100 text-sm sm:text-base mb-8">
              Join hundreds of businesses that rely on Aimin for their customer service needs
            </p>
            <div className="grid grid-cols-3 gap-8 mb-12 max-w-3xl mx-auto">
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white">500+</div>
                <div className="text-mint-100 text-xs sm:text-sm">Active Businesses</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white">99.9%</div>
                <div className="text-mint-100 text-xs sm:text-sm">Uptime SLA</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-white">4.8★</div>
                <div className="text-mint-100 text-xs sm:text-sm">Customer Rating</div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 inline-flex items-center gap-4 text-white">
              <CheckCircle className="w-6 h-6" />
              <span className="text-sm">Built for business success</span>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
      <ChatWidget />
    </main>
  );
}
