import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';
import { getPelangganAuthKey, getStoreByKey, pushBotConfig } from '@/lib/pelanggan-auth';
import fs from 'fs';
import path from 'path';

const ALLOWED_EXTENSIONS = ['jpg', 'png', 'gif', 'webp'];

// ─── Extract product list from KB text via LLM parser API ────────────────────
// Calls the KB parser at KB_FORMATTER_URL/parse-products which uses an LLM
// to extract structured product data from any KB format.
// Falls back to regex-based extraction if the API is unavailable.
// Products are tagged source:'kb' so they can be refreshed independently of
// manually-created product entries.
async function extractProductsFromKB(kbText: string): Promise<{ folder: string; name: string; source: 'kb'; [key: string]: unknown }[]> {
  const kbFormatterUrl = process.env.KB_FORMATTER_URL;

  if (kbFormatterUrl) {
    try {
      const res = await fetch(`${kbFormatterUrl}/parse-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: kbText }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json();
        const apiProducts = data.products;
        if (Array.isArray(apiProducts) && apiProducts.length > 0) {
          // Store API response as-is, just inject source:'kb'
          return apiProducts.map((p: Record<string, unknown>) => ({ ...p, source: 'kb' as const })) as { folder: string; name: string; source: 'kb'; [key: string]: unknown }[];
        }
      }
    } catch {
      // Fall through to regex fallback
    }
  }

  // ── Regex fallback: handles newline-separated AND comma-separated products ──
  // e.g. "Burger - Rp 25.000, Pizza - Rp 30.000" on one line
  const PRODUCT_RE = /(?:\d+[\.\)]\s*)?(?:[*•-]\s*)?(.+?)\s*[-–]\s*Rp\s*[\d.,]+/gi;
  const products: { folder: string; name: string; source: 'kb' }[] = [];
  const seen = new Set<string>();

  for (const line of kbText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('==') || trimmed.startsWith('#')) continue;

    // Split by ", " to handle comma-separated product lists on one line
    const segments = trimmed.split(/,\s*/);
    for (const seg of segments) {
      const match = seg.match(PRODUCT_RE);
      if (!match) continue;
      const inner = seg.match(/(?:\d+[\.\)]\s*)?(?:[*•-]\s*)?(.+?)\s*[-–]\s*Rp\s*[\d.,]+/i);
      if (!inner) continue;
      const name = inner[1].replace(/^\d+[\.\)]\s*/, '').replace(/^[*•-]\s*/, '').trim();
      if (name.length < 2 || name.length > 80 || name.split(/\s+/).length > 7) continue;
      const folder = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
      if (folder && !seen.has(folder)) {
        seen.add(folder);
        products.push({ folder, name, source: 'kb' });
      }
    }
  }
  return products;
}

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

function detectExtension(base64: string): { extension: string; data: string } {
  const match = base64.match(/^data:(\w+)\/(\w+);base64,/);
  let extension = 'jpg';
  let data = base64;
  if (match) {
    extension = match[2].toLowerCase();
    data = base64.substring(base64.indexOf(',') + 1);
  }
  if (extension === 'jpeg') extension = 'jpg';
  return { extension, data };
}

export async function GET() {
  const jid = getPelangganAuthKey();
  if (!jid) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Ensure optional columns exist
    try {
      await pool.execute(
        `ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS store_onboarding_done TINYINT(1) DEFAULT 0`
      );
    } catch {}
    try {
      await pool.execute(
        `ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS store_language VARCHAR(10) DEFAULT 'id'`
      );
    } catch {}
    try {
      await pool.execute(
        `ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS dashboard_language VARCHAR(10) DEFAULT 'en'`
      );
    } catch {}
    try {
      await pool.execute(
        `ALTER TABLE paket ADD COLUMN IF NOT EXISTS pkt_product_num INT DEFAULT 5`
      );
    } catch {}

    const [rows] = await pool.execute(
      `SELECT p.store_whatsapp_jid, p.store_name, p.store_admin, p.store_address,
              p.store_tagline, p.store_feature, p.store_knowledge_base, p.store_images,
              p.store_status, p.store_type, p.store_fulfillment, p.store_checkout_fields, p.store_folder, p.store_paket, p.store_expired_at,
              p.store_products, p.store_admin_number, p.store_bot_always_on, p.store_email, p.store_whatsapp_bot, p.store_updated_at,
              p.store_id, p.store_subdomain, p.store_design_type, p.store_site_type,
              p.store_theme_primary, p.store_theme_background, p.store_hero_title, p.store_hero_subtitle,
              p.store_hero_image, p.store_hero_image_keyword, p.store_about_us,
              p.store_latitude, p.store_longitude, p.store_website_others,
              IFNULL(p.store_onboarding_done, 0) AS store_onboarding_done,
              IFNULL(p.store_language, 'id') AS store_language,
              IFNULL(p.dashboard_language, 'en') AS dashboard_language,
              COALESCE(pk.pkt_pict_num, 5) AS plan_max_images,
              COALESCE(pk.pkt_kb_length, 500) AS plan_max_kb,
              COALESCE(pk.pkt_product_num, 5) AS plan_max_products
       FROM pelanggan p
       LEFT JOIN paket pk ON p.store_paket = pk.pkt_id
       WHERE p.store_whatsapp_jid = ? OR p.store_folder = ?
       LIMIT 1`,
      [jid, jid]
    );

    const data = rows as any[];
    if (data.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const jid = getPelangganAuthKey();
  if (!jid) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Only allow updating these fields
    const allowedFields = [
      'store_name', 'store_admin', 'store_address', 'store_tagline',
      'store_feature', 'store_knowledge_base', 'store_type', 'store_fulfillment',
      'store_admin_number', 'store_bot_always_on', 'store_email', 'store_whatsapp_bot',
      'store_subdomain', 'store_design_type', 'store_site_type',
      'store_theme_primary', 'store_theme_background', 'store_hero_title', 'store_hero_subtitle',
      'store_hero_image_keyword', 'store_hero_image', 'store_about_us',
      'store_latitude', 'store_longitude', 'store_website_others',
      'store_language', 'dashboard_language', 'store_checkout_fields',
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-geocode when store_address is updated and no manual lat/lng provided
    if ('store_address' in body && body.store_address && !('store_latitude' in body)) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(body.store_address)}&format=json&limit=1&countrycodes=id`,
          { headers: { 'User-Agent': 'AiMinAssist/1.0 (aiminassist.com)' } }
        );
        const geoData = await geoRes.json();
        if (Array.isArray(geoData) && geoData[0]) {
          updates.push('store_latitude = ?', 'store_longitude = ?');
          values.push(parseFloat(geoData[0].lat), parseFloat(geoData[0].lon));
        }
      } catch {
        // Geocoding failed silently — save address without coordinates
      }
    }

    // Handle hero image upload
    if (body.hero_image_base64) {
      const storeData = await getStoreByKey(jid);
      const folder = storeData?.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
      const uploadsDir = getUploadsDir();
      const folderDir = path.join(uploadsDir, folder);
      fs.mkdirSync(folderDir, { recursive: true });

      const { extension, data } = detectExtension(body.hero_image_base64);
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json({ error: `Invalid file type: ${extension}` }, { status: 400 });
      }
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length === 0) {
        return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 });
      }
      const hex = buffer.subarray(0, 4).toString('hex');
      const validMagic =
        hex.startsWith('ffd8ff') || hex.startsWith('89504e47') ||
        hex.startsWith('47494638') || hex.startsWith('52494646');
      if (!validMagic) {
        return NextResponse.json({ error: 'Invalid file type detected' }, { status: 400 });
      }

      // Remove old hero images
      for (const ext of ALLOWED_EXTENSIONS) {
        const old = path.join(folderDir, `hero.${ext}`);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }

      const filename = `hero.${extension}`;
      fs.writeFileSync(path.join(folderDir, filename), buffer);

      const heroImageUrl = `/uploads/${folder}/${filename}`;
      updates.push('store_hero_image = ?');
      values.push(heroImageUrl);
    } else if (body.remove_hero_image) {
      // Remove hero image
      const storeData = await getStoreByKey(jid);
      const folder = storeData?.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
      const uploadsDir = getUploadsDir();
      const folderDir = path.join(uploadsDir, folder);
      for (const ext of ALLOWED_EXTENSIONS) {
        const old = path.join(folderDir, `hero.${ext}`);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      updates.push('store_hero_image = ?');
      values.push(null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('store_updated_at = NOW()');
    values.push(jid, jid);

    await pool.execute(
      `UPDATE pelanggan SET ${updates.join(', ')} WHERE store_whatsapp_jid = ? OR store_folder = ?`,
      values
    );

    // Fetch full store record for cache invalidation + bot config push
    const store = await getStoreByKey(jid);
    if (store) {
      revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });
      pushBotConfig(store); // fire-and-forget: push to folder (WebChat) + WA JID (if paired)
    }

    // Fire-and-forget: rebuild RAG index if knowledge base was updated
    if ('store_knowledge_base' in body && store?.store_folder) {
      const ragUrl = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';
      const kbText = body.store_knowledge_base || '';
      if (kbText.trim()) {
        fetch(`${ragUrl}/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: store.store_folder, text: kbText }),
        }).catch(() => {}); // intentionally fire-and-forget
      } else {
        fetch(`${ragUrl}/index`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: store.store_folder }),
        }).catch(() => {}); // intentionally fire-and-forget
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
