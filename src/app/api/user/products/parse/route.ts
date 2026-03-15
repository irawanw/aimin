import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PRODUCTS_TEMP_DIR, type ParsedTempFile, type ColumnMapping } from '@/lib/products-types';
import { LLM } from '@/lib/llm';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

async function detectColumnMapping(headers: string[], sampleRows: any[][]): Promise<ColumnMapping> {
  const prompt = `You are analyzing a product catalog spreadsheet exported from an inventory system.

Headers: ${JSON.stringify(headers)}
Sample rows (up to 3):
${sampleRows.map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`).join('\n')}

Map EACH column header to exactly one of these field types:
- "name"         : product name (required, usually "Nama", "Nama Produk", "Product Name")
- "sku"          : product code, SKU, barcode, article number
- "category"     : product category or type
- "price"        : selling price (lowest/main price)
- "price_max"    : maximum price for range pricing
- "description"  : product description or notes
- "stock_qty"    : stock quantity (number)
- "stock_status" : availability text (ready/habis/tersedia etc)
- "image_url"    : image URL or path
- "spec"         : product attribute or variation (color/warna, size/ukuran, material/bahan, RAM, SSD, processor, brand, etc.)
- "ignore"       : irrelevant column (date added, internal notes, etc.)

Return ONLY valid JSON in this exact format (no explanation):
{"name":"<col or null>","sku":"<col or null>","category":"<col or null>","price":"<col or null>","price_max":null,"description":"<col or null>","stock_qty":"<col or null>","stock_status":"<col or null>","image_url":null,"specs":["<spec col>","<spec col>"]}

Rules:
- "specs" is an array of column names that describe product attributes/variations
- Put color, size, material, RAM, SSD, processor, brand, weight etc. in "specs"
- null means the column was not found or is being ignored
- Every column must appear exactly once (either mapped to a field or in specs or ignored)`;

  try {
    const res = await fetch(LLM.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.05,
        max_tokens: 600,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.name || null,
      sku: parsed.sku || null,
      category: parsed.category || null,
      price: parsed.price || null,
      price_max: parsed.price_max || null,
      description: parsed.description || null,
      stock_qty: parsed.stock_qty || null,
      stock_status: parsed.stock_status || null,
      image_url: parsed.image_url || null,
      specs: Array.isArray(parsed.specs) ? parsed.specs : [],
    };
  } catch {
    // Fallback: guess by header name
    const lower = headers.map((h) => h.toLowerCase());
    const find = (...terms: string[]) =>
      headers.find((_, i) => terms.some((t) => lower[i].includes(t))) || null;
    return {
      name: find('nama', 'name', 'produk', 'product', 'item'),
      sku: find('sku', 'kode', 'code', 'barcode', 'artikel'),
      category: find('kategori', 'category', 'jenis', 'tipe', 'type'),
      price: find('harga', 'price', 'harga jual', 'selling'),
      price_max: find('harga max', 'price max', 'harga tertinggi'),
      description: find('deskripsi', 'description', 'keterangan', 'notes'),
      stock_qty: find('stok', 'stock', 'qty', 'jumlah'),
      stock_status: find('status', 'availability', 'tersedia'),
      image_url: find('gambar', 'image', 'foto', 'photo', 'url'),
      specs: headers.filter((h) => {
        const hl = h.toLowerCase();
        return ['warna', 'color', 'ukuran', 'size', 'bahan', 'material',
          'ram', 'ssd', 'processor', 'brand', 'merek', 'motif', 'pola'].some((t) => hl.includes(t));
      }),
    };
  }
}

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['csv', 'xls', 'xlsx'].includes(ext)) {
      return NextResponse.json({ error: 'Format file harus CSV, XLS, atau XLSX' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rawRows.length < 2) {
      return NextResponse.json({ error: 'File kosong atau tidak memiliki data' }, { status: 400 });
    }

    const headers = (rawRows[0] as any[]).map((h) => String(h ?? '').trim()).filter(Boolean);
    const dataRows = rawRows
      .slice(1)
      .filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined))
      .map((r) => headers.map((_, i) => r[i] ?? ''));

    if (dataRows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data ditemukan' }, { status: 400 });
    }

    const sampleRows = dataRows.slice(0, 3);
    const mapping = await detectColumnMapping(headers, sampleRows);

    // Save all parsed rows to temp file (TTL handled by OS /tmp cleanup)
    fs.mkdirSync(PRODUCTS_TEMP_DIR, { recursive: true });
    const tempId = crypto.randomUUID();
    const tempData: ParsedTempFile = { headers, rows: dataRows, filename: file.name };
    fs.writeFileSync(path.join(PRODUCTS_TEMP_DIR, `${tempId}.json`), JSON.stringify(tempData));

    return NextResponse.json({
      temp_id: tempId,
      filename: file.name,
      row_count: dataRows.length,
      headers,
      sample_rows: sampleRows,
      mapping,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
