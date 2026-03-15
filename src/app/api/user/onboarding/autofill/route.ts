import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const UPLOADS_DIR = process.env.UPLOADS_DIR || '../aiminv1/uploads';

async function getStore() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const jid = payload.jid;
    const [rows] = await pool.execute(
      `SELECT store_id, store_folder, store_subdomain,
              store_admin_number, store_email, store_hero_title,
              store_hero_subtitle, store_about_us, store_subdomain
       FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ?`,
      [jid, jid]
    ) as any[];
    return rows[0] || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const store = await getStore();
  if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    store_admin_number,
    store_email,
    store_address,
    store_hero_title,
    store_hero_subtitle,
    store_about_us,
    store_subdomain,
    reviews,
    gallery_image_urls,
    services,
    product_image_paths,
    store_hero_image_keyword,
    store_theme_primary,
    store_design_type,
  }: {
    store_admin_number?: string;
    store_email?: string;
    store_address?: string;
    store_hero_title?: string;
    store_hero_subtitle?: string;
    store_about_us?: string;
    store_subdomain?: string;
    reviews?: Array<{ reviewer_name: string; review_text: string; rating?: number }>;
    gallery_image_urls?: string[];
    services?: Array<{ name: string; price?: string; image_url?: string }>;
    product_image_paths?: string[];
    store_hero_image_keyword?: string;
    store_theme_primary?: string;
    store_design_type?: string;
  } = body;

  const results = { store: false, reviews: 0, gallery: 0, errors: [] as string[] };

  // ── 1. Update store fields (only blank fields) ────────────────────────────────
  const updates: string[] = [];
  const vals: any[] = [];

  const set = (col: string, val: string | undefined, existingVal: string) => {
    if (val && !existingVal) { updates.push(`${col} = ?`); vals.push(val); }
  };

  // Blank-only fields (don't overwrite if user already filled them)
  set('store_admin_number', store_admin_number?.replace(/[\s\-\.()\+]/g, ''), store.store_admin_number);
  set('store_email',        store_email,        store.store_email);
  if (store_address) { updates.push('store_address = ?'); vals.push(store_address); }

  // Always overwrite from AI analysis (these come from fresh scrape)
  if (store_hero_title)    { updates.push('store_hero_title = ?');    vals.push(store_hero_title); }
  if (store_hero_subtitle) { updates.push('store_hero_subtitle = ?'); vals.push(store_hero_subtitle.slice(0, 200)); }
  if (store_about_us)      { updates.push('store_about_us = ?');      vals.push(store_about_us); }

  // Smart defaults — always overwrite
  if (store_hero_image_keyword) { updates.push('store_hero_image_keyword = ?'); vals.push(store_hero_image_keyword); }
  if (store_theme_primary)      { updates.push('store_theme_primary = ?');      vals.push(store_theme_primary); }
  if (store_design_type)        { updates.push('store_design_type = ?');        vals.push(store_design_type); }

  // Subdomain — always update from AI (check availability against other stores only)
  if (store_subdomain) {
    const [existing] = await pool.execute(
      'SELECT store_id FROM pelanggan WHERE store_subdomain = ? AND store_id != ?',
      [store_subdomain, store.store_id]
    ) as any[];
    if (!(existing as any[]).length) {
      updates.push('store_subdomain = ?');
      vals.push(store_subdomain);
    }
  }

  if (updates.length) {
    vals.push(store.store_id);
    await pool.execute(`UPDATE pelanggan SET ${updates.join(', ')} WHERE store_id = ?`, vals);
    results.store = true;
  }

  // ── 2. Save services (replace all) — images already on disk, just store URLs ──
  if (Array.isArray(services) && services.length) {
    await pool.execute('DELETE FROM services WHERE client_id = ?', [store.store_id]);
    for (const svc of services.slice(0, 6)) {
      if (!svc.name?.trim()) continue;
      try {
        await pool.execute(
          'INSERT INTO services (client_id, title, price, description, image_url) VALUES (?,?,?,?,?)',
          [store.store_id, svc.name.trim(), svc.price || '', '', svc.image_url || null]
        );
      } catch (e: any) { results.errors.push('service: ' + e.message); }
    }
  }

  // ── 2b. Register product images in FILE/MEDIA (already saved to disk) ─────────
  if (Array.isArray(product_image_paths) && product_image_paths.length) {
    try {
      const [storeRow] = await pool.execute(
        'SELECT store_images FROM pelanggan WHERE store_id=?', [store.store_id]) as any[];
      const existingFiles = JSON.parse((storeRow as any[])?.[0]?.store_images || '[]');
      for (const imgPath of product_image_paths.slice(0, 3)) {
        const fname = imgPath.split('/').pop() || '';
        if (fname) existingFiles.push({ filename: fname, type: 'image', product: '' });
      }
      await pool.execute(
        'UPDATE pelanggan SET store_images=? WHERE store_id=?',
        [JSON.stringify(existingFiles), store.store_id]);
    } catch (e: any) { results.errors.push('product_images: ' + e.message); }
  }

  // ── 3. Replace reviews (clear old AI-generated ones, insert new) ─────────────
  if (Array.isArray(reviews) && reviews.length) {
    await pool.execute('DELETE FROM reviews WHERE client_id = ?', [store.store_id]);
    for (const r of reviews.slice(0, 8)) {
      if (!r.reviewer_name?.trim() || !r.review_text?.trim()) continue;
      try {
        await pool.execute(
          'INSERT INTO reviews (client_id, reviewer_name, rating, review_text) VALUES (?, ?, ?, ?)',
          [store.store_id, r.reviewer_name.trim(), r.rating || 5, r.review_text.trim()]
        );
        results.reviews++;
      } catch (e: any) { results.errors.push('review: ' + e.message); }
    }
  }

  // ── 3. Download and save gallery images (replace old) ───────────────────────
  if (Array.isArray(gallery_image_urls) && gallery_image_urls.length) {
    await pool.execute('DELETE FROM gallery WHERE client_id = ?', [store.store_id]);
    const dir = join(UPLOADS_DIR, store.store_folder, 'gallery');
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    for (const imgUrl of gallery_image_urls.slice(0, 8)) {
        try {
          const res = await fetch(imgUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
              'Referer': 'https://www.instagram.com/',
            },
            signal: AbortSignal.timeout(12000),
          });
          if (!res.ok) continue;

          const buf = Buffer.from(await res.arrayBuffer());
          const filename = `ig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
          await writeFile(join(dir, filename), buf);

          await pool.execute(
            'INSERT INTO gallery (client_id, title, description, image_url) VALUES (?, ?, ?, ?)',
            [store.store_id, 'Foto Instagram', null, `/uploads/${store.store_folder}/gallery/${filename}`]
          );
          results.gallery++;
        } catch (e: any) { results.errors.push('gallery: ' + e.message); }
      }
  }

  // Invalidate client website cache if anything changed
  if (results.store || results.reviews > 0 || results.gallery > 0) {
    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });
  }

  return NextResponse.json(results);
}
