/**
 * Currency utilities.
 *
 * Currency definitions live in the `currencies` DB table.
 * Plan prices per currency live in the `paket_pricing` DB table.
 *
 * To add a new currency — NO code changes needed, only DB:
 *   INSERT INTO currencies (code, symbol, locale, name, lang_default)
 *     VALUES ('MYR', 'RM', 'ms-MY', 'Malaysian Ringgit', null);
 *   INSERT INTO paket_pricing (pkt_id, currency_code, price) VALUES (1,'MYR',15), ...;
 */

export interface CurrencyConfig {
  code: string;         // ISO 4217 — 'USD', 'IDR', etc.
  symbol: string;       // '$', 'Rp', '€'
  locale: string;       // BCP 47 locale for Intl — 'en-US', 'id-ID', 'fr-FR'
  name: string;         // 'US Dollar'
  lang_default: string | null; // dashboard_language that defaults to this currency, or null
}

/**
 * Format an amount using the given currency config.
 * IDR has 0 decimal places; all other currencies use 2.
 */
export function formatPrice(amount: number, currency: CurrencyConfig): string {
  const decimals = currency.code === 'IDR' ? 0 : 2;
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Pick the right currency for a given dashboard language.
 * Falls back to IDR if no currency maps to that language.
 */
export function resolveCurrency(lang: string, currencies: CurrencyConfig[]): CurrencyConfig {
  return (
    currencies.find(c => c.lang_default === lang) ??
    currencies.find(c => c.code === 'IDR') ??
    { code: 'IDR', symbol: 'Rp', locale: 'id-ID', name: 'Indonesian Rupiah', lang_default: 'id' }
  );
}
