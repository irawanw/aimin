'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, BarChart2, MoreHorizontal, Package, QrCode, BookOpen, ClipboardList, CreditCard, Receipt } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PenLine, Images, Star, MessageSquare, Briefcase } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function UserBottomNav({ isSmart, storeType }: { isSmart: boolean; storeType?: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useLanguage();
  const isProductStore = storeType && !['Jasa', 'Layanan', 'Service', 'services', 'others'].includes(storeType);

  // Smart plan: 5 tabs — Home | Edit | Website | Conversations | More
  // Basic plan: 3 tabs — Home | Edit | Website
  const MAIN_TABS = isSmart
    ? [
        { href: '/user', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/user/edit', label: t('nav.editStore'), icon: PenLine },
        { href: '/user/website', label: t('nav.website'), icon: Globe },
        { href: '/user/conversations', label: t('nav.conversations'), icon: BarChart2 },
      ]
    : [
        { href: '/user', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/user/edit', label: t('nav.editStore'), icon: PenLine },
        { href: '/user/website', label: t('nav.website'), icon: Globe },
      ];

  const MORE_ITEMS = isSmart
    ? [
        { href: '/user/knowledge-base', label: t('nav.knowledgeBase'), icon: BookOpen },
        { href: '/user/fulfillment', label: t('nav.fulfillment'), icon: ClipboardList },
        { href: '/user/gallery', label: t('nav.gallery'), icon: Images },
        isProductStore
          ? { href: '/user/products', label: t('nav.productCatalog'), icon: Package }
          : { href: '/user/services', label: t('nav.services'), icon: Briefcase },
        { href: '/user/reviews', label: t('nav.reviews'), icon: Star },
        { href: '/user/widget', label: t('nav.chatWidget'), icon: MessageSquare },
        { href: '/user/pairing', label: t('nav.waPairing'), icon: QrCode },
        { href: '/user/subscription', label: t('nav.subscription'), icon: CreditCard },
        { href: '/user/transactions', label: t('nav.paymentHistory'), icon: Receipt },
      ]
    : [
        { href: '/user/pairing', label: t('nav.waPairing'), icon: QrCode },
        { href: '/user/subscription', label: t('nav.subscription'), icon: CreditCard },
        { href: '/user/transactions', label: t('nav.paymentHistory'), icon: Receipt },
      ];

  return (
    <>
      {/* "Lainnya" drawer */}
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
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className="fixed bottom-20 left-3 right-3 z-50 lg:hidden bg-[--surface-2] border border-[--border] rounded-2xl p-2 shadow-2xl"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[--text-muted] px-2 pt-1 pb-2">{t('nav.more')}</p>
              <div className="grid grid-cols-2 gap-1">
                {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[--accent-dim] text-mint-400'
                          : 'text-[--text-secondary] hover:bg-[--surface-3]'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
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
        <div className="flex items-center h-16 px-1">

          {MAIN_TABS.map(({ href, label, icon: Icon }) => {
            const active = href === '/user' ? pathname === '/user' : pathname === href || pathname.startsWith(href + '/');
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
                  <Icon
                    className={`relative transition-colors ${active ? 'text-mint-400' : 'text-[--text-muted]'}`}
                    style={{ width: '18px', height: '18px' }}
                  />
                </div>
                <span className={`text-[10px] font-medium transition-colors leading-none ${active ? 'text-mint-400' : 'text-[--text-muted]'}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Lainnya button */}
          {MORE_ITEMS.length > 0 && (
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full group"
            >
              <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                moreOpen ? 'bg-[--accent-dim]' : 'group-active:scale-90'
              }`}>
                <MoreHorizontal
                  style={{ width: '18px', height: '18px' }}
                  className={`transition-colors ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}
                />
              </div>
              <span className={`text-[10px] font-medium transition-colors leading-none ${moreOpen ? 'text-mint-400' : 'text-[--text-muted]'}`}>
                {t('nav.more')}
              </span>
            </button>
          )}

        </div>
      </nav>
    </>
  );
}
