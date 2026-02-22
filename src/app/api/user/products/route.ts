import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';

function getPelangganJid(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get('pelanggan_token')?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.jid || null;
  } catch {
    return null;
  }
}

async function getStoreFolder(jid: string): Promise<string | null> {
  const [rows] = await pool.execute(
    'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
    [jid]
  );
  const data = rows as any[];
  return data[0]?.store_folder || null;
}

// ─── GET — paginated product list ────────────────────────────────────────────

export async function GET(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const folder = await getStoreFolder(jid);
    if (!folder) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const activeOnly = url.searchParams.get('active') !== '0';
    const offset = (page - 1) * limit;

    const conditions: string[] = ['store_folder = ?'];
    const params: any[] = [folder];

    if (activeOnly) { conditions.push('is_active = 1'); }
    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM store_product_catalog ${where}`,
      params
    );
    const total = (countRows as any[])[0].total;

    const [rows] = await pool.execute(
      `SELECT id, sku, name, category, price, price_max, currency, description,
              stock_status, stock_qty, image_url, specs, is_active, updated_at
       FROM store_product_catalog ${where}
       ORDER BY is_active DESC, updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const products = (rows as any[]).map((p) => ({
      ...p,
      specs: p.specs ? JSON.parse(p.specs) : null,
      price: p.price ? parseFloat(p.price) : null,
      price_max: p.price_max ? parseFloat(p.price_max) : null,
    }));

    // Category list for filter dropdown
    const [catRows] = await pool.execute(
      `SELECT DISTINCT category FROM store_product_catalog
       WHERE store_folder = ? AND category IS NOT NULL AND is_active = 1
       ORDER BY category`,
      [folder]
    );
    const categories = (catRows as any[]).map((r) => r.category);

    // Stats
    const [statsRows] = await pool.execute(
      `SELECT
         SUM(is_active = 1) AS active_count,
         SUM(is_active = 0) AS inactive_count
       FROM store_product_catalog WHERE store_folder = ?`,
      [folder]
    );
    const stats = (statsRows as any[])[0];

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      categories,
      stats: {
        active: stats.active_count || 0,
        inactive: stats.inactive_count || 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── DELETE — clear entire catalog ───────────────────────────────────────────

export async function DELETE() {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const folder = await getStoreFolder(jid);
    if (!folder) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    await pool.execute('DELETE FROM store_product_catalog WHERE store_folder = ?', [folder]);
    await pool.execute('DELETE FROM store_catalog_upload WHERE store_folder = ?', [folder]);

    // Remove from Qdrant
    await fetch(`${RAG_SERVICE_URL}/products/index`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
