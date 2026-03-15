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
 *   price     = budget ceiling shorthand (WHERE price <= price)
 *   price_min = minimum price  (WHERE price >= price_min)
 *   price_max = maximum price  (WHERE price <= price_max)
 *   If both price and price_max are given, the stricter (lower) ceiling is used.
 *
 * Response (grouped by product):
 *   {
 *     products: [{
 *       name, category, score, price_min, price_max, description, image_url, currency,
 *       variants: [{ id, sku, specs, price, stock_status, stock_qty, image_url }]
 *     }],
 *     has_catalog: boolean
 *   }
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

    // Fetch more candidate groups from Qdrant when filtering by price,
    // so there's enough slack after SQL-level variant filtering
    const qdrantTopK = hasPriceFilter ? top_k * 3 : top_k;

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

    const ragProducts: Array<{
      product_name?: string;
      product_category?: string;
      product_id?: number;
      score: number;
    }> = ragData.products ?? [];

    if (!ragProducts.length) {
      return NextResponse.json({ products: [], has_catalog: true });
    }

    // Backward-compat check: old vectors store product_id, not product_name.
    // Signal the caller to re-import the catalog to rebuild vectors in the new format.
    if (ragProducts[0].product_id != null && ragProducts[0].product_name == null) {
      console.warn('[RAG] Old product_id vector format detected — user must re-import catalog');
      return NextResponse.json({ products: [], has_catalog: false });
    }

    // Build score map keyed by lowercased product name
    const scoreMap = new Map<string, number>();
    for (const p of ragProducts) {
      if (p.product_name) {
        scoreMap.set(p.product_name.toLowerCase(), p.score);
      }
    }

    const productNames = ragProducts
      .map((p) => p.product_name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
      .map((name) => name.toLowerCase());

    if (!productNames.length) {
      return NextResponse.json({ products: [], has_catalog: true });
    }

    // ── 2. Hydrate ALL variants for matched products ──────────────────────
    const namePlaceholders = productNames.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT id, sku, name, category, price, currency,
              description, stock_status, stock_qty, image_url, specs
       FROM store_product_catalog
       WHERE store_folder = ?
         AND LOWER(name) IN (${namePlaceholders})
         AND is_active = 1`,
      [folder, ...productNames]
    );

    const allVariants = rows as any[];

    // ── 3. Group variants by lowercased product name ──────────────────────
    const grouped = new Map<string, any[]>();
    for (const row of allVariants) {
      const key = (row.name as string).toLowerCase();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }

    // ── 4. Build response, applying price filter at variant level ─────────
    const productGroups: any[] = [];

    for (const ragProduct of ragProducts) {
      if (!ragProduct.product_name) continue;
      const nameKey = ragProduct.product_name.toLowerCase();
      const variants = grouped.get(nameKey) ?? [];

      // Apply price filter at variant level
      const filteredVariants = hasPriceFilter
        ? variants.filter((v) => {
            const p = v.price != null ? parseFloat(v.price) : null;
            if (p === null) return false;
            if (effectiveMin != null && p < effectiveMin) return false;
            if (effectiveMax != null && p > effectiveMax) return false;
            return true;
          })
        : variants;

      // Skip product if no variants survive the filter
      if (!filteredVariants.length) continue;

      const prices = filteredVariants
        .map((v) => (v.price != null ? parseFloat(v.price) : NaN))
        .filter((p) => !isNaN(p));

      const price_min_val = prices.length ? Math.min(...prices) : null;
      const price_max_val = prices.length ? Math.max(...prices) : null;

      const firstWithDesc = filteredVariants.find((v) => v.description);
      const firstWithImg = filteredVariants.find((v) => v.image_url);

      productGroups.push({
        name: filteredVariants[0].name,
        category: filteredVariants[0].category || null,
        score: scoreMap.get(nameKey) ?? 0,
        price_min: price_min_val,
        price_max: price_max_val,
        description: firstWithDesc?.description || null,
        image_url: firstWithImg?.image_url || null,
        currency: filteredVariants[0].currency || 'IDR',
        variants: filteredVariants.map((v) => ({
          id: v.id,
          sku: v.sku || null,
          specs: v.specs ? JSON.parse(v.specs) : {},
          price: v.price != null ? parseFloat(v.price) : null,
          stock_status: v.stock_status,
          stock_qty: v.stock_qty !== null ? parseInt(v.stock_qty) : null,
          image_url: v.image_url || null,
        })),
      });

      if (productGroups.length >= top_k) break;
    }

    return NextResponse.json({ products: productGroups, has_catalog: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
