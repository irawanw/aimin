'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-mint-200 transition-all duration-300 hover:-translate-y-1">
        <div className="w-14 h-14 bg-gradient-to-br from-mint-500 to-mint-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-mint-500/25">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
