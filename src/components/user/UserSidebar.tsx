'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import {
  LayoutDashboard, PenLine, Globe, Images, Briefcase,
  Star, MessageSquare, BarChart2, ChevronLeft, LogOut,
  Sparkles, Package, QrCode, BookOpen, ClipboardList,
  CreditCard, Receipt, ChevronDown,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface Props {
  storeName: string;
  isSmart: boolean;
  storeType?: string;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function buildNavGroups(isSmart: boolean, storeType?: string, t?: (k: string) => string): NavGroup[] {
  const _ = t ?? ((k: string) => k);
  const isProductStore = storeType && !['Jasa', 'Layanan', 'Service', 'services', 'others'].includes(storeType);

  if (!isSmart) {
    return [
      {
        label: _('nav.store'),
        items: [
          { href: '/user', label: _('nav.dashboard'), icon: LayoutDashboard },
          { href: '/user/edit', label: _('nav.editStore'), icon: PenLine },
          { href: '/user/website', label: _('nav.website'), icon: Globe },
          { href: '/user/pairing', label: _('nav.waPairing'), icon: QrCode },
        ],
      },
      {
        label: _('nav.account'),
        items: [
          { href: '/user/subscription', label: _('nav.subscription'), icon: CreditCard },
          { href: '/user/transactions', label: _('nav.paymentHistory'), icon: Receipt },
        ],
      },
    ];
  }

  return [
    {
      label: _('nav.store'),
      items: [
        { href: '/user', label: _('nav.dashboard'), icon: LayoutDashboard },
        { href: '/user/edit', label: _('nav.editStore'), icon: PenLine },
        { href: '/user/pairing', label: _('nav.waPairing'), icon: QrCode },
      ],
    },
    {
      label: _('nav.websiteGroup'),
      items: [
        { href: '/user/website', label: _('nav.websiteSettings'), icon: Globe },
        { href: '/user/gallery', label: _('nav.gallery'), icon: Images },
        isProductStore
          ? { href: '/user/products', label: _('nav.productCatalog'), icon: Package }
          : { href: '/user/services', label: _('nav.services'), icon: Briefcase },
        { href: '/user/reviews', label: _('nav.reviews'), icon: Star },
      ],
    },
    {
      label: _('nav.aiBot'),
      items: [
        { href: '/user/knowledge-base', label: _('nav.knowledgeBase'), icon: BookOpen },
        { href: '/user/fulfillment', label: _('nav.fulfillment'), icon: ClipboardList },
        { href: '/user/conversations', label: _('nav.conversations'), icon: BarChart2 },
        { href: '/user/widget', label: _('nav.chatWidget'), icon: MessageSquare },
      ],
    },
    {
      label: _('nav.account'),
      items: [
        { href: '/user/subscription', label: _('nav.subscription'), icon: CreditCard },
        { href: '/user/transactions', label: _('nav.paymentHistory'), icon: Receipt },
      ],
    },
  ];
}

export default function UserSidebar({
  storeName, isSmart, storeType, onLogout, collapsed, onToggleCollapse, mobileOpen, onMobileClose,
}: Props) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const NAV_GROUPS = buildNavGroups(isSmart, storeType, (k) => t(k));

  // Track which groups are open. Default: group containing active path is open, rest closed.
  const getDefaultOpen = () => {
    const open: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => {
      const hasActive = g.items.some(item =>
        item.href === '/user' ? pathname === '/user' : pathname === item.href || pathname.startsWith(item.href + '/')
      );
      open[g.label] = hasActive;
    });
    // If nothing active, open first group
    if (!Object.values(open).some(Boolean)) open[NAV_GROUPS[0].label] = true;
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getDefaultOpen);

  // When pathname changes, ensure the active group is open
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      const hasActive = g.items.some(item =>
        item.href === '/user' ? pathname === '/user' : pathname === item.href || pathname.startsWith(item.href + '/')
      );
      if (hasActive) {
        setOpenGroups(prev => prev[g.label] ? prev : { ...prev, [g.label]: true });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  function renderNavItem(item: NavItem) {
    const { href, label, icon: Icon } = item;
    const active = href === '/user' ? pathname === '/user' : pathname === href || pathname.startsWith(href + '/');

    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
        title={collapsed ? label : undefined}
        className={`
          relative flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm font-medium
          transition-all duration-150 group
          ${active
            ? 'bg-[--accent-dim] text-mint-400'
            : 'text-[--text-secondary] hover:bg-[--surface-3] hover:text-[--text-primary]'
          }
        `}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-lg bg-[--accent-dim] border border-mint-500/20"
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        )}
        <Icon className={`relative w-4 h-4 flex-shrink-0 ${active ? 'text-mint-400' : 'text-[--text-muted] group-hover:text-[--text-secondary]'} transition-colors`} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="relative whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {active && !collapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative ml-auto w-1.5 h-1.5 rounded-full bg-mint-400 flex-shrink-0"
          />
        )}
      </Link>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-[--border] flex-shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-mint-500/30">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden"
              >
                AiMin
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex ml-auto w-6 h-6 items-center justify-center rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--surface-3] transition-colors flex-shrink-0"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overscroll-contain py-2 px-2 space-y-0.5">
        {NAV_GROUPS.map((group) => {
          const isOpen = collapsed || openGroups[group.label];
          const hasActive = group.items.some(item =>
            item.href === '/user' ? pathname === '/user' : pathname === item.href || pathname.startsWith(item.href + '/')
          );

          return (
            <div key={group.label}>
              {/* Group header — clickable when sidebar is expanded */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg mt-1 transition-colors group
                      ${hasActive ? 'text-[--text-secondary]' : 'text-[--text-muted] hover:text-[--text-secondary]'}
                      hover:bg-[--surface-3]`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest overflow-hidden">
                      {group.label}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </motion.div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Group items */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 py-0.5">
                      {group.items.map(renderNavItem)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Upgrade prompt for basic plan */}
      {!isSmart && !collapsed && (
        <div className="mx-2 mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-mint-500/10 border border-violet-500/20">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider mb-1">{t('nav.upgradePlan')}</p>
          <p className="text-xs text-[--text-muted] leading-snug">{t('nav.upgradeDesc')}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-2 pb-3 border-t border-[--border] pt-3 flex-shrink-0">
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-mint-400 to-brand-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-[--text-secondary] truncate overflow-hidden whitespace-nowrap flex-1 min-w-0"
              >
                {storeName}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onLogout}
          title={collapsed ? t('nav.logout') : undefined}
          className={`mt-0.5 w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-[--text-muted] hover:text-red-400 hover:bg-red-500/8 transition-all group ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {t('nav.logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 bg-[--surface-1] border-r border-[--border] overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar (slide-in drawer) */}
      <motion.aside
        initial={false}
        animate={{ x: mobileOpen ? 0 : -260 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="lg:hidden fixed left-0 top-0 h-full w-60 z-50 bg-[--surface-1] border-r border-[--border] flex flex-col"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
