import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const UPLOADS_DIR = process.env.UPLOADS_DIR || '../aiminv1/uploads';

interface GalleryItem {
  id?: number;
  title: string;
  description: string;
  image_url?: string;
}

// Helper: Verify token and get store info
async function getStoreFromToken(token: string) {
  const payload = jwt.verify(token, JWT_SECRET) as any;
  const jid = payload.jid;

  const [rows] = await pool.execute(
    'SELECT store_id, store_subdomain, store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
    [jid]
  ) as any;

  if (!rows || rows.length === 0) {
    throw new Error('Store not found');
  }

  return rows[0];
}

// Helper: Save base64 image
async function saveImage(base64: string, folder: string, type: 'gallery'): Promise<string> {
  const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid image data');

  const mimeType = matches[1];
  const extension = mimeType.split('/')[1];
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (!allowed.includes(extension)) throw new Error('Invalid image type');

  const buffer = Buffer.from(matches[2], 'base64');
  const fs = await import('fs');
  const path = await import('path');

  const dir = path.join(UPLOADS_DIR, folder, type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
  const filepath = path.join(dir, filename);

  fs.writeFileSync(filepath, buffer);

  return `/uploads/${folder}/${type}/${filename}`;
}

// DELETE handler
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStoreFromToken(token);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    // Get the gallery item to delete image
    const [items] = await pool.execute(
      'SELECT image_url FROM gallery WHERE id = ? AND client_id = ?',
      [id, store.store_id]
    ) as any;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = items[0];

    // Delete file if exists
    if (item.image_url) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const filepath = path.join(UPLOADS_DIR, item.image_url);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    // Delete from database
    await pool.execute(
      'DELETE FROM gallery WHERE id = ? AND client_id = ?',
      [id, store.store_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE gallery error:', error);
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
  }
}

// PUT handler (update)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStoreFromToken(token);
    const body = await request.json() as GalleryItem & { id?: number };

    if (!body.id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (!body.title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    // If new image provided, save it first
    let imageUrl = body.image_url;
    if (body.image_url && body.image_url.startsWith('data:image')) {
      imageUrl = await saveImage(body.image_url, store.store_folder, 'gallery');
    }

    await pool.execute(
      'UPDATE gallery SET title = ?, description = ?, image_url = COALESCE(?, image_url) WHERE id = ? AND client_id = ?',
      [body.title, body.description, body.image_url?.startsWith('data:image') ? imageUrl : null, body.id, store.store_id]
    );

    // Cache invalidation
    const { revalidateClient } = await import('@/lib/revalidate-client');
    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    const [updated] = await pool.execute(
      'SELECT * FROM gallery WHERE id = ?',
      [body.id]
    ) as any[];

    return NextResponse.json({ item: updated[0] });
  } catch (error: any) {
    console.error('PUT gallery error:', error);
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 });
  }
}

// POST handler (create)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStoreFromToken(token);
    const body = await request.json() as GalleryItem;

    if (!body.title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    // Save image if provided
    let imageUrl: string | undefined;
    if (body.image_url && body.image_url.startsWith('data:image')) {
      imageUrl = await saveImage(body.image_url, store.store_folder, 'gallery');
    } else if (body.image_url) {
      imageUrl = body.image_url;
    }

    const [result] = await pool.execute(
      'INSERT INTO gallery (client_id, title, description, image_url) VALUES (?, ?, ?, ?)',
      [store.store_id, body.title, body.description || null, imageUrl || null]
    ) as any;

    const [items] = await pool.execute(
      'SELECT * FROM gallery WHERE id = ?',
      [result.insertId]
    ) as any[];

    // Cache invalidation
    const { revalidateClient } = await import('@/lib/revalidate-client');
    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ item: items[0] });
  } catch (error: any) {
    console.error('POST gallery error:', error);
    return NextResponse.json({ error: 'Failed to create gallery item' }, { status: 500 });
  }
}

// GET handler
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStoreFromToken(token);

    const [items] = await pool.execute(
      'SELECT * FROM gallery WHERE client_id = ? ORDER BY created_at DESC',
      [store.store_id]
    ) as any[];

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('GET gallery error:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}
