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
      className="relative bg-[#0f1012] rounded-2xl p-7 border border-white/[0.06] hover:border-[#2EE6C9]/20 transition-all duration-300 overflow-hidden"
    >
      {/* Subtle corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top right, rgba(46,230,201,0.06) 0%, transparent 70%)' }} />

      {/* Quote mark */}
      <div className="text-4xl font-serif text-[#2EE6C9]/20 leading-none mb-4 select-none">"</div>

      <p className="text-white/60 text-sm leading-relaxed mb-6 italic">{quote}"</p>

      <div className="flex items-center gap-3">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-10 h-10 rounded-full object-cover border border-[#2EE6C9]/20"
          />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[#070b14]"
            style={{ background: 'linear-gradient(135deg, #2EE6C9, #14b8a6)' }}>
            {name.charAt(0)}
          </div>
        )}
        <div>
          <h4 className="font-semibold text-white text-sm">{name}</h4>
          <p className="text-[#2EE6C9]/70 text-xs">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
