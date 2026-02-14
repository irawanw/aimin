'use client';

import { motion } from 'framer-motion';

interface TestimonialCardProps {
  name: string;
  role: string;
  quote: string;
  avatar?: string;
  delay?: number;
}

export function TestimonialCard({ name, role, quote, avatar, delay = 0 }: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-14 h-14 rounded-full object-cover border-2 border-mint-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center text-white font-bold text-xl">
            {name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="mb-4">
            <p className="text-gray-700 italic text-sm sm:text-base leading-relaxed">"{quote}"</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">{name}</h4>
            <p className="text-mint-600 text-xs font-medium">{role}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
