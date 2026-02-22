'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, BarChart2, MoreHorizontal, Package } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PenLine, Images, Star, MessageSquare, Briefcase,
} from 'lucide-react';

const MAIN_NAV_BASIC = [
  { href: '/user', label: 'Home', icon: LayoutDashboard },
  { href: '/user/edit', label: 'Edit Toko', icon: PenLine },
  { href: '/user/website', label: 'Website', icon: Globe },
];

const WEBSITE_PATHS = ['/user/website', '/user/gallery', '/user/services', '/user/products', '/user/reviews'];

export default function UserBottomNav({ isSmart, storeType }: { isSmart: boolean; storeType?: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const isProductStore = storeType && !['Jasa', 'Layanan', 'Service'].includes(storeType);

  const MAIN_NAV = isSmart
    ? [
        { href: '/user', label: 'Home', icon: LayoutDashboard },
        { href: '/user/conversations', label: 'Chat', icon: BarChart2 },
      ]
    : MAIN_NAV_BASIC;

  const WEBSITE_NAV = isSmart
    ? [
        { href: '/user/website', label: 'Pengaturan', icon: Globe },
        { href: '/user/gallery', label: 'Gallery', icon: Images },
        isProductStore
          ? { href: '/user/products', label: 'Katalog Produk', icon: Package }
          : { href: '/user/services', label: 'Layanan', icon: Briefcase },
        { href: '/user/reviews', label: 'Ulasan', icon: Star },
      ]
    : [];

  const MORE_NAV = isSmart
    ? [
        { href: '/user/edit', label: 'Edit Toko', icon: PenLine },
        { href: '/user/widget', label: 'Chat Widget', icon: MessageSquare },
      ]
    : [];

  const isWebsiteActive = WEBSITE_PATHS.some(p => pathname.startsWith(p));

  function closeAll() {
    setMoreOpen(false);
    setWebsiteOpen(false);
  }

  return (
    <>
      {/* Website sub-menu drawer */}
      <AnimatePresence>
        {websiteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setWebsiteOpen(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="fixed bottom-20 left-3 right-3 z-50 lg:hidden bg-[--surface-2] border border-[--border] rounded-2xl p-2 shadow-2xl"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[--text-muted] px-2 pt-1 pb-1.5">Website</p>
              <div className="grid grid-cols-2 gap-1">
                {WEBSITE_NAV.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeAll}
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
                      onClick={closeAll}
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
                  <Icon className={`relative transition-colors ${active ? 'text-mint-400' : 'text-[--text-muted]'}`} style={{ width: '18px', height: '18px' }} />
                </div>
                <span className={`text-[10px] font-medium transition-colors ${active ? 'text-mint-400' : 'text-[--text-muted]'}`}>{label}</span>
              </Link>
            );
          })}

          {/* Website button — smart plan only */}
          {isSmart && (
            <button
              onClick={() => { setWebsiteOpen(!websiteOpen); setMoreOpen(false); }}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full group"
            >
              <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                isWebsiteActive || websiteOpen ? 'bg-[--accent-dim]' : 'group-active:scale-90'
              }`}>
                {isWebsiteActive && !websiteOpen && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-xl bg-[--accent-dim]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Globe
                  style={{ width: '18px', height: '18px' }}
                  className={`relative transition-colors ${isWebsiteActive || websiteOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}
                />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isWebsiteActive || websiteOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}>Website</span>
            </button>
          )}

          {/* More button — smart plan only */}
          {isSmart && (
            <button
              onClick={() => { setMoreOpen(!moreOpen); setWebsiteOpen(false); }}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full group"
            >
              <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                moreOpen ? 'bg-[--accent-dim]' : 'group-active:scale-90'
              }`}>
                <MoreHorizontal style={{ width: '18px', height: '18px' }} className={`transition-colors ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}>Lainnya</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
