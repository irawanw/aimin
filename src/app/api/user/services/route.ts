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

interface StoreInfo {
  store_id: number;
  store_subdomain: string;
  store_folder: string;
  max_products: number;
}

async function getStoreInfo(): Promise<StoreInfo | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const jid = payload.jid;
    if (!jid) return null;
    const [rows] = await pool.execute(
      `SELECT p.store_id, p.store_subdomain, p.store_folder,
              COALESCE(pk.pkt_product_num, 5) AS max_products
       FROM pelanggan p
       LEFT JOIN paket pk ON p.store_paket = pk.pkt_id
       WHERE p.store_whatsapp_jid = ?`,
      [jid]
    );
    const data = rows as any[];
    return data.length > 0 ? { store_id: data[0].store_id, store_subdomain: data[0].store_subdomain, store_folder: data[0].store_folder, max_products: data[0].max_products ?? 5 } : null;
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

function saveServiceImage(
  base64Data: string,
  uploadDir: string,
  serviceId: number
): { success: true; filename: string; ext: string } | { success: false; error: string } {
  const { extension, data } = detectExtension(base64Data);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { success: false, error: `Invalid file type: ${extension}` };
  }
  const buffer = Buffer.from(data, 'base64');
  if (buffer.length === 0) {
    return { success: false, error: 'Invalid base64 data' };
  }
  const hex = buffer.subarray(0, 4).toString('hex');
  const validMagic =
    hex.startsWith('ffd8ff') ||
    hex.startsWith('89504e47') ||
    hex.startsWith('47494638') ||
    hex.startsWith('52494646');
  if (!validMagic) {
    return { success: false, error: 'Invalid file type detected' };
  }
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = `svc_${serviceId}.${extension}`;
  const filepath = path.join(uploadDir, filename);
  // Remove old service images with different extensions
  for (const ext of ALLOWED_EXTENSIONS) {
    const old = path.join(uploadDir, `svc_${serviceId}.${ext}`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  fs.writeFileSync(filepath, buffer);
  return { success: true, filename, ext: extension };
}

export async function GET() {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, title, description, price, image_keyword, image_url FROM services WHERE client_id = ?',
      [store.store_id]
    );
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, price, image_keyword, image_base64, image_url: imageUrlInput } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Enforce plan product limit
    const [[{ svc_count }]] = await pool.execute(
      'SELECT COUNT(*) as svc_count FROM services WHERE client_id = ?',
      [store.store_id]
    ) as any;
    if (svc_count >= store.max_products) {
      return NextResponse.json({ error: `Batas maksimal ${store.max_products} layanan untuk paket Anda` }, { status: 400 });
    }

    const [result] = await pool.execute(
      'INSERT INTO services (client_id, title, description, price, image_keyword) VALUES (?, ?, ?, ?, ?)',
      [store.store_id, title, description || null, price || null, image_keyword || null]
    );

    const insertId = (result as any).insertId;
    let image_url: string | null = null;

    // Handle image: base64 upload takes priority, then direct URL
    if (image_base64) {
      const folder = store.store_folder || String(store.store_id);
      const svcDir = path.join(getUploadsDir(), folder, 'services');
      const saveResult = saveServiceImage(image_base64, svcDir, insertId);
      if (saveResult.success) {
        image_url = `/uploads/${folder}/services/${saveResult.filename}`;
        await pool.execute('UPDATE services SET image_url = ? WHERE id = ?', [image_url, insertId]);
      }
    } else if (imageUrlInput && typeof imageUrlInput === 'string') {
      image_url = imageUrlInput;
      await pool.execute('UPDATE services SET image_url = ? WHERE id = ?', [image_url, insertId]);
    }

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true, id: insertId, image_url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, description, price, image_keyword, image_base64, image_url: imageUrlInput, remove_image } = body;

    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let image_url: string | null | undefined = undefined; // undefined = don't change

    const folder = store.store_folder || String(store.store_id);
    const svcDir = path.join(getUploadsDir(), folder, 'services');

    if (remove_image) {
      // Delete existing image file
      for (const ext of ALLOWED_EXTENSIONS) {
        const old = path.join(svcDir, `svc_${id}.${ext}`);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      image_url = null;
    } else if (image_base64) {
      const saveResult = saveServiceImage(image_base64, svcDir, id);
      if (saveResult.success) {
        image_url = `/uploads/${folder}/services/${saveResult.filename}`;
      }
    } else if (imageUrlInput && typeof imageUrlInput === 'string') {
      image_url = imageUrlInput;
    }

    let sql: string;
    let params: any[];

    if (image_url !== undefined) {
      sql = 'UPDATE services SET title = ?, description = ?, price = ?, image_keyword = ?, image_url = ? WHERE id = ? AND client_id = ?';
      params = [title, description || null, price || null, image_keyword || null, image_url, id, store.store_id];
    } else {
      sql = 'UPDATE services SET title = ?, description = ?, price = ?, image_keyword = ? WHERE id = ? AND client_id = ?';
      params = [title, description || null, price || null, image_keyword || null, id, store.store_id];
    }

    const [result] = await pool.execute(sql, params);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true, image_url: image_url !== undefined ? image_url : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    // Delete image files
    const folder = store.store_folder || String(store.store_id);
    const svcDir = path.join(getUploadsDir(), folder, 'services');
    for (const ext of ALLOWED_EXTENSIONS) {
      const old = path.join(svcDir, `svc_${id}.${ext}`);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    const [result] = await pool.execute(
      'DELETE FROM services WHERE id = ? AND client_id = ?',
      [id, store.store_id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
