import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';
const KB_FORMATTER_URL = process.env.KB_FORMATTER_URL || '';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function getPelangganJid(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.jid || null;
  } catch {
    return null;
  }
}

interface FormatterResult {
  text: string;
  formatted_length: number;
  // New: pre-chunked chapters from LLM formatter (when available)
  chapters?: Array<{ title: string; content: string }>;
}

async function formatWithLLM(file: File): Promise<FormatterResult> {
  const formData = new FormData();
  formData.append('file', file);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const res = await fetch(`${KB_FORMATTER_URL}/format`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`Formatter returned ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.formatted_text) throw new Error('Formatter returned empty text');
    return {
      text: data.formatted_text as string,
      formatted_length: data.formatted_length ?? data.formatted_text.length,
      // Pass chapters through if formatter provides them
      chapters: Array.isArray(data.chapters) && data.chapters.length > 0
        ? data.chapters
        : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const fn = pdfParse.default ?? pdfParse;
  const result = await fn(buffer);
  return result.text || '';
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;
  return html
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_: string, cells: string) => {
      const cellTexts = Array.from(cells.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
        .map((m: RegExpMatchArray) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter((c: string) => c.length > 0);
      return cellTexts.length ? cellTexts.join(' | ') + '\n' : '';
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── SSE POST ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {}
      };
      const heartbeat = () => {
        try { controller.enqueue(encoder.encode(': keep-alive\n\n')); } catch {}
      };

      try {
        // 1. Parse multipart
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) { send('error', { message: 'No file provided' }); return; }
        if (file.size > MAX_FILE_SIZE) { send('error', { message: 'File too large (max 50MB)' }); return; }

        const fileName = file.name.toLowerCase();
        const isPdf  = fileName.endsWith('.pdf');
        const isDocx = fileName.endsWith('.docx');
        if (!isPdf && !isDocx) { send('error', { message: 'Hanya PDF dan DOCX yang didukung' }); return; }

        // 2. Load store
        send('progress', { pct: 5, message: 'Menyiapkan...' });
        const [rows] = await pool.execute(
          'SELECT store_id, store_subdomain, store_folder FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ?',
          [jid, jid]
        ) as any[];
        const store = rows[0];
        if (!store) { send('error', { message: 'Store not found' }); return; }

        let finalText = '';
        let usedFormatter = false;
        let formatterChapters: Array<{ title: string; content: string }> | undefined;

        // 3a. LLM formatter path
        if (KB_FORMATTER_URL) {
          send('progress', { pct: 15, message: 'Memformat dokumen dengan AI (ini bisa 1–2 menit)...' });

          const state: {
            done: boolean;
            result: FormatterResult | null;
            error: Error | null;
          } = { done: false, result: null, error: null };

          formatWithLLM(file)
            .then(r => { state.result = r; })
            .catch(e => { state.error = e; })
            .finally(() => { state.done = true; });

          // Send heartbeats + progress while waiting
          let heartbeatPct = 20;
          while (!state.done) {
            await new Promise(r => setTimeout(r, 8_000));
            if (!state.done) {
              heartbeatPct = Math.min(heartbeatPct + 6, 72);
              send('progress', { pct: heartbeatPct, message: 'AI sedang memproses dokumen...' });
              heartbeat();
            }
          }

          if (state.result) {
            finalText = state.result.text.trim();
            usedFormatter = true;
            formatterChapters = state.result.chapters;
          } else {
            send('progress', {
              pct: 75,
              message: `Formatter tidak tersedia (${state.error?.message?.slice(0, 60)}), menggunakan ekstraksi lokal...`,
            });
          }
        }

        // 3b. Local fallback
        if (!finalText) {
          send('progress', { pct: 15, message: 'Mengekstrak teks dari dokumen...' });
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          finalText = isPdf
            ? await extractPdfText(buffer)
            : await extractDocxText(buffer);
          finalText = finalText.trim();
        }

        if (!finalText) { send('error', { message: 'Tidak dapat mengekstrak teks dari file' }); return; }

        // 4. Save to DB
        send('progress', { pct: 85, message: 'Menyimpan ke database...' });
        await pool.execute(
          'UPDATE pelanggan SET store_knowledge_base = ?, store_updated_at = NOW() WHERE store_whatsapp_jid = ?',
          [finalText, jid]
        );
        revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

        // 5. RAG index (fire-and-forget)
        // Use chapters if formatter returned them, otherwise fall back to raw text
        send('progress', { pct: 95, message: 'Mengindeks ke RAG...' });
        if (store.store_folder) {
          const ragBody = (usedFormatter && formatterChapters)
            ? { folder: store.store_folder, chapters: formatterChapters }
            : { folder: store.store_folder, text: finalText };
          fetch(`${RAG_SERVICE_URL}/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ragBody),
          }).catch(() => {});
        }

        send('done', {
          text: finalText,
          characters: finalText.length,
          used_llm_formatter: usedFormatter,
        });
      } catch (e: any) {
        try { send('error', { message: e.message || 'Terjadi kesalahan' }); } catch {}
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',   // disable nginx response buffering
    },
  });
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE() {
  const jid = getPelangganJid();
  if (!jid) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT store_id, store_subdomain, store_folder FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ?',
      [jid, jid]
    ) as any[];
    const store = rows[0];
    if (!store) {
      return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404 });
    }

    await pool.execute(
      'UPDATE pelanggan SET store_knowledge_base = NULL, store_updated_at = NOW() WHERE store_whatsapp_jid = ? OR store_folder = ?',
      [jid, jid]
    );

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    if (store.store_folder) {
      fetch(`${RAG_SERVICE_URL}/index`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: store.store_folder }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
