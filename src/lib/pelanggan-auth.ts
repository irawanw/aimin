/**
 * Shared helpers for pelanggan auth & lookup.
 *
 * Auth key rules:
 *  - WA users:     JWT jid = store_whatsapp_jid  (e.g. "628xxx@s.whatsapp.net")
 *  - Google users: JWT jid = store_folder         (e.g. "toko-budi")
 *
 * getStoreByKey() handles both transparently.
 */

import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET   = process.env.JWT_SECRET   || 'dev-secret-change-me';
const COOKIE_NAME  = 'pelanggan_token';
const BOT_API      = process.env.BOT_CONFIG_API || 'http://127.0.0.1:3005';
const BOT_API_KEY  = process.env.BOT_API_KEY   || 'aimin_sk_7f8d9e2a1b4c6d8e0f2a4b6c8d0e2f4a';

/** Returns the auth key stored in pelanggan_token JWT (jid field). */
export function getPelangganAuthKey(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.jid || null;
  } catch {
    return null;
  }
}

/** Lookup pelanggan by either store_whatsapp_jid OR store_folder. */
export async function getStoreByKey(key: string): Promise<any | null> {
  const [rows] = await pool.execute(
    'SELECT * FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ? LIMIT 1',
    [key, key]
  );
  return (rows as any[])[0] ?? null;
}

/** Is this key a real WhatsApp JID (not a folder slug)? */
export function isWaJid(key: string): boolean {
  return key.includes('@s.whatsapp.net');
}

/**
 * Push config to bot for both identifiers.
 * Always pushes with store_folder (WebChat).
 * Also pushes with store_whatsapp_jid if it's a real WA JID (WA bot).
 */
export function pushBotConfig(store: Record<string, any>): void {
  const config = {
    store_name:           store.store_name,
    store_knowledge_base: store.store_knowledge_base,
    store_products:       store.store_products,
    store_fulfillment:    store.store_fulfillment,
    store_images:         store.store_images,
    store_type:           store.store_type,
    store_language:       store.store_language,
    store_bot_always_on:  store.store_bot_always_on,
    store_whatsapp_bot:   store.store_whatsapp_bot,
    store_tagline:        store.store_tagline,
    store_feature:        store.store_feature,
    store_special_prompts: store.store_special_prompts,
    store_address:        store.store_address,
    store_status:         store.store_status,
    store_paket:          store.store_paket,
    store_expired_at:     store.store_expired_at,
    store_folder:         store.store_folder,
    store_admin:           store.store_admin,
    store_admin_number:    store.store_admin_number,
    store_checkout_fields: store.store_checkout_fields,
    store_updatedAt:       store.store_updated_at,
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key':    BOT_API_KEY,
  };

  // Always push for WebChat (by folder)
  if (store.store_folder) {
    fetch(`${BOT_API}/config/update`, {
      method: 'POST', headers,
      body: JSON.stringify({ pelangganId: store.store_folder, config }),
    }).catch(() => {});
  }

  // Also push for WA bot (by JID) if real WA
  if (store.store_whatsapp_jid && isWaJid(store.store_whatsapp_jid)) {
    fetch(`${BOT_API}/config/update`, {
      method: 'POST', headers,
      body: JSON.stringify({ pelangganId: store.store_whatsapp_jid, config }),
    }).catch(() => {});
  }
}

/** Generate a URL-safe slug from a name, guaranteed unique in DB. */
export async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'toko';

  let slug = base;
  let attempt = 0;
  while (true) {
    const [rows] = await pool.execute(
      'SELECT 1 FROM pelanggan WHERE store_folder = ? LIMIT 1',
      [slug]
    );
    if ((rows as any[]).length === 0) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}
