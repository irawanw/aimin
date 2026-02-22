import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';
const API_KEY = process.env.API_KEY || '';

/**
 * POST /api/v1/rag/products
 * Called by 3090 backend for store-type customers.
 *
 * Request:
 *   { folder, query, top_k?, price?, price_min?, price_max? }
 *   All price filters are optional — any combination works, all are backward compatible.
 *   price     = budget ceiling shorthand (WHERE price <= price)
 *   price_min = minimum price  (WHERE price >= price_min)
 *   price_max = maximum price  (WHERE price <= price_max)
 *   If both price and price_max are given, the stricter (lower) ceiling is used.
 *
 * Response:
 *   { products: Product[], has_catalog: boolean }
 */
export async function POST(req: Request) {
  const apiKey = req.headers.get('x-api-key') || '';
  if (API_KEY && apiKey !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { folder, query, top_k = 5, price, price_min, price_max } = await req.json();
    if (!folder || !query) {
      return NextResponse.json({ error: 'folder and query are required' }, { status: 400 });
    }

    // Resolve effective ceiling: take the lower of price and price_max if both given
    const effectiveMax = price != null && price_max != null
      ? Math.min(Number(price), Number(price_max))
      : price != null ? Number(price)
      : price_max != null ? Number(price_max)
      : null;

    const effectiveMin = price_min != null ? Number(price_min) : null;
    const hasPriceFilter = effectiveMin != null || effectiveMax != null;

    // Fetch more candidates from Qdrant when filtering by price,
    // so SQL has enough rows after the WHERE clause
    const qdrantTopK = hasPriceFilter ? top_k * 4 : top_k;

    // ── 1. Semantic search ────────────────────────────────────────────────
    const ragRes = await fetch(`${RAG_SERVICE_URL}/products/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, query, top_k: qdrantTopK }),
    });

    if (!ragRes.ok) {
      return NextResponse.json({ error: 'RAG service error' }, { status: 502 });
    }

    const ragData = await ragRes.json();
    const has_index: boolean = ragData.has_index ?? false;

    if (!has_index) {
      return NextResponse.json({ products: [], has_catalog: false });
    }

    const ragProducts: Array<{ product_id: number; score: number }> =
      ragData.products ?? (ragData.product_ids ?? []).map((id: number) => ({ product_id: id, score: 1 }));

    if (!ragProducts.length) {
      return NextResponse.json({ products: [], has_catalog: true });
    }

    const productIds = ragProducts.map((p) => p.product_id);
    const scoreMap = new Map<number, number>(ragProducts.map((p) => [p.product_id, p.score]));

    // ── 2. Hydrate from MySQL with optional price filters ─────────────────
    const idPlaceholders = productIds.map(() => '?').join(',');
    const conditions: string[] = [`id IN (${idPlaceholders})`, 'store_folder = ?', 'is_active = 1'];
    const params: any[] = [...productIds, folder];

    if (effectiveMin != null) {
      conditions.push('price >= ?');
      params.push(effectiveMin);
    }
    if (effectiveMax != null) {
      conditions.push('price <= ?');
      params.push(effectiveMax);
    }

    const [rows] = await pool.execute(
      `SELECT id, sku, name, category, price, currency,
              description, stock_status, stock_qty, image_url, specs
       FROM store_product_catalog
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    // ── 3. Re-rank by Qdrant score, return top_k ─────────────────────────
    const products = (rows as any[])
      .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
      .slice(0, top_k)
      .map((p) => ({
        id: p.id,
        sku: p.sku || null,
        name: p.name,
        category: p.category || null,
        price: p.price ? parseFloat(p.price) : null,
        currency: p.currency || 'IDR',
        description: p.description || null,
        stock_status: p.stock_status,
        stock_qty: p.stock_qty !== null ? parseInt(p.stock_qty) : null,
        image_url: p.image_url || null,
        specs: p.specs ? JSON.parse(p.specs) : {},
      }));

    return NextResponse.json({ products, has_catalog: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
