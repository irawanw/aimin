import id from './id.json';
import en from './en.json';
import type { Locale } from '@/types';

const dictionaries: Record<Locale, typeof id> = { id, en };

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.id;
}

export type Dictionary = typeof id;
