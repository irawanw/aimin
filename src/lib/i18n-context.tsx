'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Locale } from '@/types';
import type { Dictionary } from '@/i18n';
import idDict from '@/i18n/id.json';
import enDict from '@/i18n/en.json';

const dicts: Record<Locale, Dictionary> = { id: idDict, en: enDict };

interface I18nContextType {
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'id',
  t: idDict,
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');
  const t = dicts[locale];
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('aimin_lang', l);
  }, []);
  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
