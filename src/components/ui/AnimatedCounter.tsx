'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
  className?: string;
}

export function AnimatedCounter({ end, duration = 2, suffix = '', prefix = '', delay = 0, className }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setCount(0);
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    // Start after delay
    const timeoutId = setTimeout(() => {
      updateCount();
    }, delay * 1000);

    return () => clearTimeout(timeoutId);
  }, [isVisible, end, duration, delay]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={isVisible ? { opacity: 1, y: 0 } : {}}>
      <span className={className ?? 'text-4xl md:text-5xl font-bold text-gray-900'}>
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </span>
    </motion.div>
  );
}
