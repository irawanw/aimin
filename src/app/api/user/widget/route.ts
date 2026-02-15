import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

interface StoreInfo {
  store_id: number;
  store_subdomain: string;
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
      'SELECT store_id, store_subdomain FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    return data.length > 0 ? { store_id: data[0].store_id, store_subdomain: data[0].store_subdomain } : null;
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
      'SELECT widget_enabled, widget_domains FROM pelanggan WHERE store_id = ?',
      [store.store_id]
    );
    const data = rows as any[];
    if (data.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    const row = data[0];
    let domains: string[] = [];
    try {
      domains = row.widget_domains ? JSON.parse(row.widget_domains) : [];
    } catch {
      domains = [];
    }
    return NextResponse.json({
      enabled: row.widget_enabled === 1,
      domains,
      subdomain: store.store_subdomain,
    });
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
    const { enabled, domains } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
    }
    if (!Array.isArray(domains)) {
      return NextResponse.json({ error: 'domains must be array' }, { status: 400 });
    }
    if (domains.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 domains allowed' }, { status: 400 });
    }

    // Validate each domain format: must be https?://host
    const domainPattern = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9\-._]*(:\d+)?$/;
    for (const d of domains) {
      if (typeof d !== 'string' || !domainPattern.test(d)) {
        return NextResponse.json({ error: `Invalid domain format: ${d}` }, { status: 400 });
      }
    }

    await pool.execute(
      'UPDATE pelanggan SET widget_enabled = ?, widget_domains = ? WHERE store_id = ?',
      [enabled ? 1 : 0, JSON.stringify(domains), store.store_id]
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
