import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

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

async function getStoreFolder(jid: string): Promise<string> {
  const [rows] = await pool.execute(
    'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
    [jid]
  );
  const data = (rows as any[])[0];
  return data?.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
}

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('video') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: `File terlalu besar. Maksimal 500 MB.` }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate MP4 magic bytes: bytes 4-7 must be 'ftyp'
    if (buffer.length < 8) {
      return NextResponse.json({ error: 'File tidak valid' }, { status: 400 });
    }
    const boxType = buffer.subarray(4, 8).toString('ascii');
    if (boxType !== 'ftyp') {
      return NextResponse.json({ error: 'Hanya file MP4 yang diperbolehkan' }, { status: 400 });
    }

    // Save to uploads folder
    const folder = await getStoreFolder(jid);
    const uploadsDir = getUploadsDir();
    const folderDir = path.join(uploadsDir, folder);
    fs.mkdirSync(folderDir, { recursive: true });

    const destPath = path.join(folderDir, 'hero-video.mp4');
    fs.writeFileSync(destPath, buffer);

    // Build absolute URL (served by aimin app's uploads route)
    const videoUrl = `https://aiminassist.com/uploads/${folder}/hero-video.mp4`;

    // Update store_website_others.hero_video_url
    const [rows] = await pool.execute(
      'SELECT store_website_others, store_id, store_subdomain FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const store = (rows as any[])[0];
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    let others: Record<string, any> = {};
    try { others = JSON.parse(store.store_website_others || '{}'); } catch {}
    others.hero_video_url = videoUrl;

    await pool.execute(
      'UPDATE pelanggan SET store_website_others = ?, store_updated_at = NOW() WHERE store_whatsapp_jid = ?',
      [JSON.stringify(others), jid]
    );

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true, url: videoUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  const jid = getPelangganJid();
  if (!jid) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const folder = await getStoreFolder(jid);
    const uploadsDir = getUploadsDir();
    const destPath = path.join(uploadsDir, folder, 'hero-video.mp4');

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    const [rows] = await pool.execute(
      'SELECT store_website_others, store_id, store_subdomain FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const store = (rows as any[])[0];
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    let others: Record<string, any> = {};
    try { others = JSON.parse(store.store_website_others || '{}'); } catch {}
    delete others.hero_video_url;

    await pool.execute(
      'UPDATE pelanggan SET store_website_others = ?, store_updated_at = NOW() WHERE store_whatsapp_jid = ?',
      [JSON.stringify(others), jid]
    );

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
