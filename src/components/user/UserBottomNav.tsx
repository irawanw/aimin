'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, BarChart2, Briefcase, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PenLine, Images, Star, MessageSquare,
} from 'lucide-react';

const MAIN_NAV = [
  { href: '/user', label: 'Home', icon: LayoutDashboard },
  { href: '/user/services', label: 'Layanan', icon: Briefcase },
  { href: '/user/conversations', label: 'Chat', icon: BarChart2 },
  { href: '/user/website', label: 'Website', icon: Globe },
];

const MORE_NAV = [
  { href: '/user/edit', label: 'Edit Toko', icon: PenLine },
  { href: '/user/gallery', label: 'Gallery', icon: Images },
  { href: '/user/reviews', label: 'Ulasan', icon: Star },
  { href: '/user/widget', label: 'Chat Widget', icon: MessageSquare },
];

export default function UserBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="fixed bottom-20 left-3 right-3 z-50 lg:hidden bg-[--surface-2] border border-[--border] rounded-2xl p-2 shadow-2xl"
            >
              <div className="grid grid-cols-2 gap-1">
                {MORE_NAV.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[--accent-dim] text-mint-400'
                          : 'text-[--text-secondary] hover:bg-[--surface-3]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[--surface-1]/90 backdrop-blur-xl border-t border-[--border] pb-safe">
        <div className="flex items-center h-16 px-2">
          {MAIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-1 h-full group">
                <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  active ? 'bg-[--accent-dim]' : 'group-active:scale-90'
                }`}>
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-xl bg-[--accent-dim]"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className={`relative w-4.5 h-4.5 transition-colors ${active ? 'text-mint-400' : 'text-[--text-muted]'}`} style={{ width: '18px', height: '18px' }} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-mint-400' : 'text-[--text-muted]'}`}>{label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full group"
          >
            <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              moreOpen ? 'bg-[--accent-dim]' : 'group-active:scale-90'
            }`}>
              <MoreHorizontal style={{ width: '18px', height: '18px' }} className={`transition-colors ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`} />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}>Lainnya</span>
          </button>
        </div>
      </nav>
    </>
  );
}
