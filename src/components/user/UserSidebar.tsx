'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, PenLine, Globe, Images, Briefcase,
  Star, MessageSquare, BarChart2, ChevronLeft, LogOut,
  Sparkles, Package,
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

function buildNavGroups(isSmart: boolean, storeType?: string): NavGroup[] {
  const isProductStore = storeType && !['Jasa', 'Layanan', 'Service'].includes(storeType);

  if (!isSmart) {
    return [{
      label: 'Toko',
      items: [
        { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/user/edit', label: 'Edit Toko', icon: PenLine },
        { href: '/user/website', label: 'Website', icon: Globe },
      ],
    }];
  }

  return [
    {
      label: 'Toko',
      items: [
        { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/user/edit', label: 'Edit Toko', icon: PenLine },
      ],
    },
    {
      label: 'Website',
      items: [
        { href: '/user/website', label: 'Pengaturan', icon: Globe },
        { href: '/user/gallery', label: 'Gallery', icon: Images },
        isProductStore
          ? { href: '/user/products', label: 'Katalog Produk', icon: Package }
          : { href: '/user/services', label: 'Layanan', icon: Briefcase },
        { href: '/user/reviews', label: 'Ulasan', icon: Star },
      ],
    },
    {
      label: 'Bisnis',
      items: [
        { href: '/user/conversations', label: 'Percakapan', icon: BarChart2 },
        { href: '/user/widget', label: 'Chat Widget', icon: MessageSquare },
      ],
    },
  ];
}

export default function UserSidebar({
  storeName, isSmart, storeType, onLogout, collapsed, onToggleCollapse, mobileOpen, onMobileClose,
}: Props) {
  const pathname = usePathname();
  const NAV_GROUPS = buildNavGroups(isSmart, storeType);

  function renderNavItem(item: NavItem) {
    const { href, label, icon: Icon } = item;
    const active = pathname === href;

    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
        title={collapsed ? label : undefined}
        className={`
          relative flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium
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
      <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[10px] font-semibold uppercase tracking-widest text-[--text-muted] px-2 mb-1 overflow-hidden"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade prompt for basic plan */}
      {!isSmart && !collapsed && (
        <div className="mx-2 mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-br from-violet-500/10 to-mint-500/10 border border-violet-500/20">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider mb-1">Paket SMART</p>
          <p className="text-xs text-[--text-muted] leading-snug">Buka semua fitur: layanan, ulasan, percakapan & lebih</p>
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
          title={collapsed ? 'Logout' : undefined}
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
                Logout
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
