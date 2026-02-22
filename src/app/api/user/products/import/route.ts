import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PRODUCTS_TEMP_DIR, type ParsedTempFile, type ColumnMapping } from '@/lib/products-types';

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

// ── Price parser: handles IDR formats like "Rp 1.500.000" or "15000,50" ──────
function parsePrice(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).replace(/[^0-9.,]/g, '').trim();
  if (!s) return null;
  // "15.000,50" → Indonesian: dot=thousands, comma=decimal
  if (/,\d{1,2}$/.test(s)) {
    const normalized = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? null : n;
  }
  // "15,000.50" → US/EU format
  if (/\.\d{1,2}$/.test(s) && s.includes(',')) {
    const normalized = s.replace(/,/g, '');
    const n = parseFloat(normalized);
    return isNaN(n) ? null : n;
  }
  // Plain "1.500.000" or "15000" → strip all separators
  const n = parseFloat(s.replace(/[.,]/g, ''));
  return isNaN(n) ? null : n;
}

function parseStockQty(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
}

function normalizeStockStatus(raw: any, qty: number | null): 'in_stock' | 'out_of_stock' | 'preorder' {
  if (raw) {
    const s = String(raw).toLowerCase().trim();
    if (/habis|kosong|out|sold/.test(s)) return 'out_of_stock';
    if (/po|pre.?order/.test(s)) return 'preorder';
    if (/ready|tersedia|ada|in.?stock|available/.test(s)) return 'in_stock';
  }
  if (qty !== null) return qty > 0 ? 'in_stock' : 'out_of_stock';
  return 'in_stock';
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function specsHash(specs: Record<string, any>): string {
  const sorted = Object.keys(specs).sort().reduce((acc, k) => {
    acc[k] = String(specs[k] ?? '').toLowerCase().trim();
    return acc;
  }, {} as Record<string, string>);
  return crypto.createHash('md5').update(JSON.stringify(sorted)).digest('hex').slice(0, 12);
}

interface StructuredRow {
  sku: string | null;
  name: string;
  category: string | null;
  price: number | null;
  price_max: number | null;
  description: string | null;
  stock_status: 'in_stock' | 'out_of_stock' | 'preorder';
  stock_qty: number | null;
  image_url: string | null;
  specs: Record<string, string>;
  merge_key: string; // sku or md5(name+specs)
}

function applyMapping(rows: any[][], headers: string[], mapping: ColumnMapping): StructuredRow[] {
  const colIndex = (colName: string | null): number =>
    colName ? headers.indexOf(colName) : -1;

  const nameIdx = colIndex(mapping.name);
  const skuIdx = colIndex(mapping.sku);
  const catIdx = colIndex(mapping.category);
  const priceIdx = colIndex(mapping.price);
  const pricemaxIdx = colIndex(mapping.price_max);
  const descIdx = colIndex(mapping.description);
  const stockQtyIdx = colIndex(mapping.stock_qty);
  const stockStatusIdx = colIndex(mapping.stock_status);
  const imageIdx = colIndex(mapping.image_url);
  const specIndices = mapping.specs
    .map((s) => ({ key: s, idx: headers.indexOf(s) }))
    .filter((x) => x.idx !== -1);

  const structured: StructuredRow[] = [];

  for (const row of rows) {
    const get = (idx: number) => (idx !== -1 ? row[idx] : null);
    const rawName = get(nameIdx);
    if (!rawName || String(rawName).trim() === '') continue; // skip empty rows

    const name = String(rawName).trim();
    const sku = skuIdx !== -1 && get(skuIdx) ? String(get(skuIdx)).trim() : null;
    const stockQty = parseStockQty(get(stockQtyIdx));
    const specs: Record<string, string> = {};
    for (const { key, idx } of specIndices) {
      const val = row[idx];
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        specs[key] = String(val).trim();
      }
    }

    const merge_key = sku ? `sku:${sku}` : `name:${normalizeName(name)}:${specsHash(specs)}`;

    structured.push({
      sku,
      name,
      category: catIdx !== -1 && get(catIdx) ? String(get(catIdx)).trim() : null,
      price: parsePrice(get(priceIdx)),
      price_max: parsePrice(get(pricemaxIdx)),
      description: descIdx !== -1 && get(descIdx) ? String(get(descIdx)).trim() : null,
      stock_status: normalizeStockStatus(get(stockStatusIdx), stockQty),
      stock_qty: stockQty,
      image_url: imageIdx !== -1 && get(imageIdx) ? String(get(imageIdx)).trim() : null,
      specs,
      merge_key,
    });
  }

  return structured;
}

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { temp_id, mapping }: { temp_id: string; mapping: ColumnMapping } = await req.json();
  if (!temp_id || !mapping) {
    return NextResponse.json({ error: 'temp_id and mapping required' }, { status: 400 });
  }

  const tempPath = path.join(PRODUCTS_TEMP_DIR, `${temp_id}.json`);
  if (!fs.existsSync(tempPath)) {
    return NextResponse.json({ error: 'Upload session expired, silakan upload ulang' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const heartbeat = () => controller.enqueue(encoder.encode(': keep-alive\n\n'));

      try {
        send('progress', { pct: 5, message: 'Membaca file...' });

        const tempData: ParsedTempFile = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
        const { headers, rows, filename } = tempData;

        send('progress', { pct: 10, message: 'Menerapkan pemetaan kolom...' });
        const structured = applyMapping(rows, headers, mapping);

        if (structured.length === 0) {
          send('error', { message: 'Tidak ada baris valid ditemukan setelah pemetaan' });
          controller.close();
          return;
        }

        send('progress', { pct: 15, message: `${structured.length} baris valid ditemukan` });

        // Get store folder
        const [storeRows] = await pool.execute(
          'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid = ?',
          [jid]
        );
        const storeData = (storeRows as any[])[0];
        if (!storeData) { send('error', { message: 'Toko tidak ditemukan' }); controller.close(); return; }
        const folder = storeData.store_folder;

        // Load all existing products for merge
        send('progress', { pct: 20, message: 'Memuat data produk yang ada...' });
        const [existingRows] = await pool.execute(
          'SELECT id, sku, name, specs, is_active FROM store_product_catalog WHERE store_folder = ?',
          [folder]
        );
        const existingMap = new Map<string, number>(); // merge_key → SQL id
        for (const row of existingRows as any[]) {
          const existingSpecs: Record<string, any> = row.specs ? JSON.parse(row.specs) : {};
          const sku = row.sku ? String(row.sku).trim() : null;
          const mk = sku
            ? `sku:${sku}`
            : `name:${normalizeName(row.name)}:${specsHash(existingSpecs)}`;
          existingMap.set(mk, row.id);
        }

        // Process rows: collect inserts and updates
        const toInsert: StructuredRow[] = [];
        const toUpdate: Array<{ id: number; row: StructuredRow }> = [];
        const processedKeys = new Set<string>();

        for (const row of structured) {
          processedKeys.add(row.merge_key);
          const existingId = existingMap.get(row.merge_key);
          if (existingId !== undefined) {
            toUpdate.push({ id: existingId, row });
          } else {
            toInsert.push(row);
          }
        }

        // Find absent products (in DB but not in new upload) → mark inactive
        const absentIds: number[] = [];
        Array.from(existingMap.entries()).forEach(([mk, id]) => {
          if (!processedKeys.has(mk)) absentIds.push(id);
        });

        const total = structured.length;
        let processed = 0;

        // INSERT new products in batches of 50
        send('progress', { pct: 25, message: `Menyimpan ${toInsert.length} produk baru...` });
        const BATCH = 50;
        for (let i = 0; i < toInsert.length; i += BATCH) {
          if (i % 100 === 0 && i > 0) heartbeat();
          const batch = toInsert.slice(i, i + BATCH);
          if (batch.length === 0) break;
          const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
          const values: any[] = [];
          for (const r of batch) {
            values.push(
              folder, r.sku, r.name, r.category, r.price, r.price_max,
              'IDR', r.description, r.stock_status, r.stock_qty, r.image_url,
              JSON.stringify(r.specs)
            );
          }
          await pool.execute(
            `INSERT INTO store_product_catalog
             (store_folder,sku,name,category,price,price_max,currency,description,stock_status,stock_qty,image_url,specs)
             VALUES ${placeholders}`,
            values
          );
          processed += batch.length;
          const pct = 25 + Math.floor((processed / total) * 35);
          send('progress', { pct, message: `Menyimpan produk... ${processed}/${total}` });
        }

        // UPDATE existing products
        send('progress', { pct: 60, message: `Memperbarui ${toUpdate.length} produk...` });
        for (let i = 0; i < toUpdate.length; i++) {
          if (i % 50 === 0 && i > 0) heartbeat();
          const { id, row: r } = toUpdate[i];
          await pool.execute(
            `UPDATE store_product_catalog SET
             sku=?, name=?, category=?, price=?, price_max=?, description=?,
             stock_status=?, stock_qty=?, image_url=?, specs=?, is_active=1
             WHERE id=?`,
            [r.sku, r.name, r.category, r.price, r.price_max, r.description,
             r.stock_status, r.stock_qty, r.image_url, JSON.stringify(r.specs), id]
          );
          processed++;
        }

        // Mark absent products as inactive
        if (absentIds.length > 0) {
          send('progress', { pct: 70, message: `Menonaktifkan ${absentIds.length} produk tidak ada di file...` });
          const placeholders = absentIds.map(() => '?').join(',');
          await pool.execute(
            `UPDATE store_product_catalog SET is_active=0 WHERE id IN (${placeholders})`,
            absentIds
          );
        }

        // Log upload history
        await pool.execute(
          `INSERT INTO store_catalog_upload (store_folder, original_filename, row_count, column_mapping, status)
           VALUES (?, ?, ?, ?, 'processing')`,
          [folder, filename, structured.length, JSON.stringify(mapping)]
        );
        const [uploadResult] = await pool.execute('SELECT LAST_INSERT_ID() AS id');
        const uploadId = (uploadResult as any[])[0].id;

        // Re-index ALL active products to Qdrant
        send('progress', { pct: 75, message: 'Mengambil produk aktif untuk pengindeksan...' });
        const [activeRows] = await pool.execute(
          `SELECT id, name, category, price, description, specs
           FROM store_product_catalog
           WHERE store_folder = ? AND is_active = 1`,
          [folder]
        );
        const activeProducts = (activeRows as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category || null,
          price: p.price ? parseFloat(p.price) : null,
          description: p.description || null,
          specs: p.specs ? JSON.parse(p.specs) : null,
        }));

        send('progress', { pct: 80, message: `Mengindeks ${activeProducts.length} produk ke vektor database...` });
        heartbeat();

        const ragRes = await fetch(`${RAG_SERVICE_URL}/products/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder, products: activeProducts }),
        });
        if (!ragRes.ok) {
          const errText = await ragRes.text().catch(() => '');
          throw new Error(`RAG indexing failed: ${errText}`);
        }
        const ragData = await ragRes.json();

        // Update upload record as done
        await pool.execute(
          'UPDATE store_catalog_upload SET status=?, indexed_count=? WHERE id=?',
          ['done', ragData.indexed || activeProducts.length, uploadId]
        );

        // Clean up temp file
        try { fs.unlinkSync(tempPath); } catch {}

        send('done', {
          inserted: toInsert.length,
          updated: toUpdate.length,
          deactivated: absentIds.length,
          indexed: ragData.indexed || activeProducts.length,
          total_active: activeProducts.length,
        });
      } catch (e: any) {
        send('error', { message: e.message || 'Terjadi kesalahan' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
