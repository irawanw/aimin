import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

interface StoreInfo {
  store_id: number;
  store_subdomain: string;
  store_folder: string;
  store_name: string;
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
      'SELECT store_id, store_subdomain, store_folder, store_name FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ?',
      [jid, jid]
    );
    const data = rows as any[];
    return data.length > 0 ? {
      store_id: data[0].store_id,
      store_subdomain: data[0].store_subdomain,
      store_folder: data[0].store_folder,
      store_name: data[0].store_name,
    } : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, reviewer_name, reviewer_photo_keyword, rating, review_text, created_at FROM reviews WHERE client_id = ? ORDER BY created_at DESC',
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
    const { reviewer_name, reviewer_photo_keyword, rating, review_text } = body;

    if (!reviewer_name || !review_text) {
      return NextResponse.json({ error: 'Reviewer name and review text are required' }, { status: 400 });
    }

    const [result] = await pool.execute(
      'INSERT INTO reviews (client_id, reviewer_name, reviewer_photo_keyword, rating, review_text) VALUES (?, ?, ?, ?, ?)',
      [store.store_id, reviewer_name, reviewer_photo_keyword || null, rating || 5, review_text]
    );

    const insertId = (result as any).insertId;
    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true, id: insertId });
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
    const { id, reviewer_name, reviewer_photo_keyword, rating, review_text } = body;

    if (!id) {
      return NextResponse.json({ error: 'Review id is required' }, { status: 400 });
    }
    if (!reviewer_name || !review_text) {
      return NextResponse.json({ error: 'Reviewer name and review text are required' }, { status: 400 });
    }

    const [result] = await pool.execute(
      'UPDATE reviews SET reviewer_name = ?, reviewer_photo_keyword = ?, rating = ?, review_text = ? WHERE id = ? AND client_id = ?',
      [reviewer_name, reviewer_photo_keyword || null, rating || 5, review_text, id, store.store_id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true });
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
      return NextResponse.json({ error: 'Review id is required' }, { status: 400 });
    }

    const [result] = await pool.execute(
      'DELETE FROM reviews WHERE id = ? AND client_id = ?',
      [id, store.store_id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
