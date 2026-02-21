'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="group"
    >
      <div className="relative h-full bg-[#0f1012] rounded-2xl p-8 border border-white/[0.06] hover:border-[#2EE6C9]/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(46,230,201,0.07) 0%, transparent 70%)' }} />

        <div className="relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'linear-gradient(135deg, rgba(46,230,201,0.15) 0%, rgba(46,230,201,0.05) 100%)', border: '1px solid rgba(46,230,201,0.2)' }}>
            <Icon className="w-6 h-6 text-[#2EE6C9]" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3">{title}</h3>
          <p className="text-white/50 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
