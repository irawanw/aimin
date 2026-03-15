import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getPelangganAuthKey } from '@/lib/pelanggan-auth';

async function extractProductsFromKB(kbText: string): Promise<{ folder: string; name: string; source: 'kb'; [key: string]: unknown }[]> {
  const kbFormatterUrl = process.env.KB_FORMATTER_URL;
  if (kbFormatterUrl) {
    try {
      const res = await fetch(`${kbFormatterUrl}/parse-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: kbText }),
        signal: AbortSignal.timeout(90000),
      });
      if (res.ok) {
        const data = await res.json();
        const apiProducts = data.products;
        if (Array.isArray(apiProducts) && apiProducts.length > 0) {
          return apiProducts.map((p: Record<string, unknown>) => ({ ...p, source: 'kb' as const })) as { folder: string; name: string; source: 'kb'; [key: string]: unknown }[];
        }
      }
    } catch { /* fall through */ }
  }

  // Regex fallback — handles comma-separated and newline-separated
  const products: { folder: string; name: string; source: 'kb' }[] = [];
  const seen = new Set<string>();
  for (const line of kbText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('==') || trimmed.startsWith('#')) continue;
    for (const seg of trimmed.split(/,\s*/)) {
      const inner = seg.match(/(?:\d+[\.\)]\s*)?(?:[*•-]\s*)?(.+?)\s*[-–]\s*Rp\s*[\d.,]+/i);
      if (!inner) continue;
      const name = inner[1].replace(/^\d+[\.\)]\s*/, '').replace(/^[*•-]\s*/, '').trim();
      if (name.length < 2 || name.length > 80 || name.split(/\s+/).length > 7) continue;
      const folder = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
      if (folder && !seen.has(folder)) { seen.add(folder); products.push({ folder, name, source: 'kb' }); }
    }
  }
  return products;
}

export async function POST(req: NextRequest) {
  const jid = getPelangganAuthKey();
  if (!jid) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));
      const emit = (event: string, data: object) => enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      try {
        // Step 1: fetch current KB from DB
        const [rows] = await pool.execute(
          'SELECT store_knowledge_base, store_products FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ? LIMIT 1',
          [jid, jid]
        ) as any[];
        const row = rows[0];
        if (!row) { emit('error', { message: 'Toko tidak ditemukan' }); controller.close(); return; }

        const kbText: string = row.store_knowledge_base || '';
        if (!kbText.trim()) { emit('done', { count: 0 }); controller.close(); return; }

        emit('progress', { pct: 5, message: 'Menghubungi AI parser...' });

        // Heartbeat every 8s so connection stays alive
        let pct = 5;
        const heartbeat = setInterval(() => {
          pct = Math.min(pct + 6, 85);
          enqueue(`event: progress\ndata: ${JSON.stringify({ pct, message: 'Menganalisis produk...' })}\n\n`);
        }, 8000);

        let kbProducts: { folder: string; name: string; source: 'kb'; [key: string]: unknown }[] = [];
        try {
          kbProducts = await extractProductsFromKB(kbText);
        } finally {
          clearInterval(heartbeat);
        }

        emit('progress', { pct: 92, message: 'Menyimpan ke database...' });

        // Merge: keep manual, replace kb-sourced
        const existing: any[] = row.store_products ? JSON.parse(row.store_products) : [];
        const manual = existing.filter((p: any) => p.source !== 'kb');
        const merged = [...manual, ...kbProducts];

        await pool.execute(
          'UPDATE pelanggan SET store_products = ? WHERE store_whatsapp_jid = ? OR store_folder = ?',
          [JSON.stringify(merged), jid, jid]
        );

        emit('done', { count: kbProducts.length, total: merged.length });
      } catch (e: any) {
        emit('error', { message: e.message || 'Terjadi kesalahan' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
