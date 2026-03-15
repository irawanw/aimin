'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { t as translate, tArr as translateArr, Lang } from './i18n';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArr: (key: string) => string[];
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate('en', key, params),
  tArr: (key) => translateArr('en', key),
});

export function LanguageProvider({ lang: initialLang, children }: { lang: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  // Sync when parent re-derives lang (e.g. after store data is re-fetched)
  useEffect(() => { setLang(initialLang); }, [initialLang]);

  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const tArr = (key: string) => translateArr(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tArr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
