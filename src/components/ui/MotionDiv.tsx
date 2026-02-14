'use client';
import { motion, HTMLMotionProps } from 'framer-motion';

export function FadeIn({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SlideIn({ children, direction = 'left', delay = 0, ...props }: HTMLMotionProps<'div'> & { direction?: 'left' | 'right'; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'left' ? -60 : 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
