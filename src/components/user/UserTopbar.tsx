'use client';

import { Menu, ExternalLink, Sparkles } from 'lucide-react';

interface Props {
  storeName: string;
  storeSubdomain?: string;
  storeStatus?: string;
  onMenuOpen: () => void;
  sidebarCollapsed: boolean;
}

export default function UserTopbar({ storeName, storeSubdomain, storeStatus, onMenuOpen, sidebarCollapsed }: Props) {
  const isActive = storeStatus === 'AKTIF';

  return (
    <header
      className="fixed top-0 right-0 z-20 h-14 bg-[--surface-1]/80 backdrop-blur-md border-b border-[--border] flex items-center px-4 gap-3 transition-all duration-300"
      style={{ left: 'var(--sidebar-width, 0px)' }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[--text-secondary] hover:bg-[--surface-3] hover:text-[--text-primary] transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">AiMin</span>
      </div>

      {/* Store name — desktop */}
      <div className="hidden lg:flex items-center gap-2.5">
        <span className="text-sm font-medium text-[--text-primary]">{storeName}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isActive
            ? 'bg-mint-500/15 text-mint-400'
            : 'bg-red-500/15 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-mint-400 animate-pulse' : 'bg-red-400'}`} />
          {storeStatus || 'AKTIF'}
        </span>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {storeSubdomain && (
          <a
            href={`https://${storeSubdomain}.aiminassist.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-[--text-muted] hover:text-mint-400 px-2.5 py-1.5 rounded-lg hover:bg-[--accent-dim] transition-all group"
          >
            <span className="font-mono">{storeSubdomain}.aiminassist.com</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-mint-400 to-brand-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-mint-500/20">
          {storeName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
