import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const ALLOWED_EXTENSIONS = ['jpg', 'png', 'gif', 'webp'];

function getPelangganJid(): string | null {
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
  const jid = getPelangganJid();
  if (!jid) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT store_whatsapp_jid, store_name, store_admin, store_address,
              store_tagline, store_feature, store_knowledge_base, store_images,
              store_status, store_type, store_fulfillment, store_folder, store_paket, store_expired_at,
              store_products, store_admin_number, store_bot_always_on, store_email, store_whatsapp_bot, store_updated_at,
              store_id, store_subdomain, store_design_type, store_site_type,
              store_theme_primary, store_theme_background, store_hero_title, store_hero_subtitle,
              store_hero_image, store_hero_image_keyword, store_about_us,
              store_latitude, store_longitude
       FROM pelanggan WHERE store_whatsapp_jid = ?`,
      [jid]
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
  const jid = getPelangganJid();
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
      'store_latitude', 'store_longitude',
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
      const [storeRows] = await pool.execute(
        'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
        [jid]
      );
      const storeData = (storeRows as any[])[0];
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
      const [storeRows] = await pool.execute(
        'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
        [jid]
      );
      const storeData = (storeRows as any[])[0];
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
    values.push(jid);

    await pool.execute(
      `UPDATE pelanggan SET ${updates.join(', ')} WHERE store_whatsapp_jid = ?`,
      values
    );

    // Invalidate client-side cache so changes appear instantly
    const [storeRows] = await pool.execute(
      'SELECT store_id, store_subdomain FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const store = (storeRows as any[])[0];
    if (store) {
      revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
