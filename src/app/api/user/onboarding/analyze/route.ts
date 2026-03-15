import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readdir, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import pool from '@/lib/db';
import sharp from 'sharp';
import { ollamaChat } from '@/lib/llm';

const UPLOADS_DIR = process.env.UPLOADS_DIR || '../aiminv1/uploads';

const execFileAsync = promisify(execFile);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TEXT_CHUNK_SIZE = 12000;
const NIM_DELAY_MS = 600; // delay between NIM calls to avoid rate limiting

const NIM_BASE = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NIM_TEXT_MODEL = 'meta/llama-3.3-70b-instruct';
const NIM_VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct';

// ─── Auth ─────────────────────────────────────────────────────────────────────
function getPelangganJid(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload.jid || null;
  } catch { return null; }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
const FULL_PROMPT = `Kamu adalah AI analis bisnis. Analisa konten berikut dan ekstrak informasi bisnis secara LENGKAP.

Kembalikan HANYA JSON valid (tanpa teks lain):
{
  "store_name": "Nama bisnis/toko/restoran/layanan",
  "store_tagline": "Slogan singkat (maks 100 karakter), kosong jika tidak ada",
  "store_feature": "Deskripsi produk atau layanan utama (maks 500 karakter)",
  "store_address": "Alamat fisik lengkap, kosong jika tidak ada",
  "is_product_catalog": false,
  "knowledge_base": "Konten terstruktur (lihat format di bawah)"
}

Untuk field knowledge_base, gunakan format section headers berikut (sertakan HANYA section yang ada datanya):

== Jam Buka ==
Senin-Jumat: 08.00-21.00
Sabtu-Minggu: 09.00-20.00

== Kontak ==
WhatsApp/Telepon: 0812-xxxx
Instagram/Sosmed: @username

== Menu / Produk ==
[DAFTAR LENGKAP semua item dengan harga dan keterangan]
Nama Item - Rp harga (ukuran/varian/keterangan jika ada)

== Layanan ==
[Daftar layanan jika ada]

== Pembayaran ==
Metode pembayaran yang diterima (Transfer, GoPay, OVO, dll)

== Kebijakan ==
Minimal order, free ongkir, garansi, syarat lainnya

Aturan penting:
- is_product_catalog: true HANYA jika konten adalah spreadsheet/tabel produk murni dengan banyak baris (SKU/kode/stok/harga) tanpa informasi bisnis lainnya. Brosur, menu restoran, company profile → false
- Sertakan SEMUA menu/produk beserta harga, ukuran, dan keterangan lengkap di knowledge_base
- Jawab dalam Bahasa Indonesia
- Jangan mengarang informasi yang tidak ada di konten`;

const MENU_ONLY_PROMPT = `Ekstrak SEMUA item menu/produk beserta harga dan keterangan dari halaman ini.

Kembalikan HANYA JSON valid:
{
  "menu_items": "Nama Item - Rp harga (ukuran/varian/keterangan jika ada)\\nNama Item 2 - Rp harga\\n..."
}

Kelompokkan per kategori jika ada (gunakan baris header kategori). Jika tidak ada menu/produk, kembalikan {"menu_items": ""}`;

// ─── Local Qwen3.5 via vLLM (uses ollamaChat from lib/llm) ──────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Sends SSE keepalive pings every 15s so nginx proxy_read_timeout doesn't fire
function startKeepalive(send: (e: string, d: object) => void): ReturnType<typeof setInterval> {
  return setInterval(() => { try { send('ping', { t: Date.now() }); } catch {} }, 15000);
}

async function qwenText(system: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  return ollamaChat(system, userPrompt, { maxTokens, temperature: 0.1, timeoutMs: 90000 });
}

async function nimText(prompt: string, content: string): Promise<string> {
  const res = await fetch(NIM_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_TEXT_MODEL,
      messages: [{ role: 'user', content: `${prompt}\n\n---KONTEN---\n${content}` }],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`NIM error ${res.status}: ${err.slice(0, 150)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function nimVision(prompt: string, base64: string): Promise<string> {
  const res = await fetch(NIM_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NIM_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      }],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`NIM vision error ${res.status}: ${err.slice(0, 150)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJson(raw: string): any {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

// ─── PDF utilities ────────────────────────────────────────────────────────────
async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse');
  const fn = pdfParse.default ?? pdfParse;
  const result = await fn(buffer);
  return result.text || '';
}

async function pdfToImages(buffer: Buffer): Promise<string[]> {
  const dir = await mkdtemp(join(tmpdir(), 'pdf-'));
  try {
    const inputPath = join(dir, 'input.pdf');
    await writeFile(inputPath, buffer);
    await execFileAsync('pdftoppm', ['-jpeg', '-r', '120', inputPath, join(dir, 'page')]);
    const files = (await readdir(dir))
      .filter(f => f.match(/\.(jpg|jpeg|ppm)$/))
      .sort();
    const images: string[] = [];
    for (const f of files) {
      const data = await readFile(join(dir, f));
      images.push(data.toString('base64'));
    }
    return images;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ buffer });
  return result.value
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_: string, cells: string) => {
      const cellTexts = Array.from(cells.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
        .map((m: RegExpMatchArray) => m[1].replace(/<[^>]+>/g, '').trim())
        .filter((c: string) => c.length > 0);
      return cellTexts.length ? cellTexts.join(' | ') + '\n' : '';
    })
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Preserve href URLs from anchor tags: <a href="URL">text</a> → text (URL)
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      const url = href.trim();
      if (!url || url.startsWith('#') || url.startsWith('javascript')) return text;
      return text ? `${text} (${url})` : url;
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// ─── Scrape Job Helpers ───────────────────────────────────────────────────────
async function createScrapeJob(platform: string, target: string): Promise<string> {
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO scrape_jobs (id, platform, target, status) VALUES (?, ?, ?, 'pending')`,
    [id, platform, target]
  );
  return id;
}

async function waitForScrapeJob(
  jobId: string,
  send: (event: string, data: object) => void,
  timeoutMs = 90000
): Promise<{ result: any; error?: string }> {
  const deadline = Date.now() + timeoutMs;
  let dots = 0;

  while (Date.now() < deadline) {
    await sleep(2000);
    dots++;

    const [rows] = await pool.execute(
      `SELECT status, result, error_msg FROM scrape_jobs WHERE id=?`,
      [jobId]
    ) as any[];

    if (!rows.length) throw new Error('Job not found');
    const job = rows[0];

    if (job.status === 'done') {
      return { result: JSON.parse(job.result || '{}') };
    }
    if (job.status === 'error') {
      return { result: null, error: job.error_msg || 'Scraper error' };
    }
    if (job.status === 'timeout') {
      return { result: null, error: 'Extension did not respond in time' };
    }

    // Heartbeat — show phase-aware messages
    const elapsed = Math.round((Date.now() - (deadline - timeoutMs)) / 1000);
    const phases = [
      { until: 10, msg: 'Opening Instagram profile' },
      { until: 20, msg: 'Reading bio and profile info' },
      { until: 35, msg: 'Loading post images' },
      { until: 50, msg: 'Accessing stories and highlights' },
      { until: 70, msg: 'Extracting images from highlights' },
      { until: 100, msg: 'Finalising data extraction' },
    ];
    const phase = phases.find(p => elapsed <= p.until) || phases[phases.length - 1];
    const dot = '.'.repeat((dots % 3) + 1);
    send('progress', {
      pct: Math.min(8 + Math.round(elapsed / timeoutMs * 1000 * 0.45), 52),
      message: `${phase.msg}${dot} (${elapsed}s)`,
    });
  }

  throw new Error('Timeout waiting for scraper extension');
}

// ─── Instagram Prompts ────────────────────────────────────────────────────────
const INSTAGRAM_PROFILE_SYSTEM = `Kamu adalah AI analis bisnis yang mengekstrak informasi dari data profil Instagram.
Kembalikan HANYA JSON valid tanpa markdown, tanpa komentar, tanpa teks lain.

SEMUA nilai harus berupa string biasa (bukan object atau array).

{
  "store_name": "nama bisnis dari nama profil",
  "store_tagline": "slogan singkat dari bio, maks 100 karakter",
  "store_feature": "deskripsi produk atau layanan dari bio, maks 500 karakter",
  "store_address": "alamat fisik jika ada di bio, kosong jika tidak ada",
  "knowledge_base": "teks multi-baris dengan format section:\n\n== Profil ==\nnama: [isi]\nbio: [isi]\nkategori: [isi]\n\n== Kontak ==\nWhatsApp: [nomor jika ada]\nInstagram: @[username]\nWebsite: [url jika ada]\n\n== Produk/Layanan ==\n[deskripsi dari bio jika relevan]"
}

PENTING:
- knowledge_base HARUS berupa satu string panjang, BUKAN object atau array
- Gunakan HANYA informasi yang diberikan, jangan mengarang
- Kembalikan JSON saja, tidak ada teks lain`;

// Strict vision prompt — text reading ONLY, no image description
const INSTAGRAM_IMAGE_PROMPT = `READ TEXT ONLY. Do NOT describe the image.

Your ONLY task: copy verbatim every piece of text visible in the image.
- Prices (e.g. Rp 25.000), product names, phone numbers, addresses, opening hours → copy exactly
- Do NOT describe colors, objects, logos, people, or visual elements
- Do NOT use words like "image shows", "the photo contains", "advertisement", "logo", "box"
- Do NOT add bullet points or formatting not present in the original text
- Do NOT repeat the same text
- If the image contains NO readable text at all → respond with exactly: SKIP`;

// Testimonial image — extract name + quote as JSON
const TESTIMONIAL_IMAGE_PROMPT = `READ TEXT ONLY from this customer testimonial/review image.
Extract the customer name and their review text.
Return ONLY JSON: {"name": "first name or customer name", "text": "their exact review quote"}
If no clear testimonial text is visible, return: {"name": "", "text": ""}
Do NOT describe the image. Do NOT add text that isn't visible.`;

// Post image — check relevance then extract
const POST_IMAGE_PROMPT = `READ TEXT ONLY from this Instagram business post image.
Is there product, menu, pricing, or business information visible?
Return ONLY JSON:
{"relevant": true, "title": "one of: Tips, FAQ, Promo, Produk, Menu, Info, Layanan", "content": "all readable text verbatim"}
If no useful business text: {"relevant": false, "title": "", "content": ""}
Do NOT describe the image. Copy text exactly as shown.`;

// Classify highlight by name
function isPricelistHighlight(title: string): boolean {
  return /pricelist|harga|price|katalog|menu|daftar/i.test(title);
}
function isTestimonialHighlight(title: string): boolean {
  return /testimoni|review|ulasan|testi|feedback/i.test(title);
}
function isProductHighlight(title: string): boolean {
  return /produk|product|koleksi|item/i.test(title) && !isPricelistHighlight(title) && !isTestimonialHighlight(title);
}

// Pricelist service extraction prompt
const PRICELIST_SERVICE_PROMPT = `Extract up to 3 products from this pricelist image.
Return ONLY JSON: [{"name":"concise name max 40 chars","price":"Rp X.XXX"}]
Only items with clear name AND price. Return [] if none.
Do NOT describe the image.`;

// Extract dominant color from a base64 image using sharp
async function extractDominantColor(base64: string): Promise<string> {
  try {
    const buf = Buffer.from(base64, 'base64');
    const { data } = await sharp(buf).resize(8, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    let bestR = 16, bestG = 185, bestB = 129, bestSat = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness < 40 || brightness > 220) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat > bestSat) { bestSat = sat; bestR = r; bestG = g; bestB = b; }
    }
    return `#${bestR.toString(16).padStart(2, '0')}${bestG.toString(16).padStart(2, '0')}${bestB.toString(16).padStart(2, '0')}`;
  } catch {
    return '#10b981';
  }
}

// Pick design template based on store type and KB content
function pickDesignType(storeType: string, knowledgeBase: string): string {
  const combined = (storeType + ' ' + knowledgeBase).toLowerCase();
  if (/food|kuliner|frozen|bakery|makanan|minuman|resto|cafe/.test(combined) && /store|toko|produk/.test(combined + storeType)) return 'image-heavy';
  if (/beauty|salon|spa|kecantikan|perawatan/.test(combined)) return 'elegant';
  if (/tech|komputer|servis|it |laptop|software|hardware/.test(combined)) return 'minimal';
  if (/fashion|clothing|baju|pakaian|retail|busana/.test(combined) && /store|toko/.test(storeType)) return 'bold';
  if (storeType === 'store') return 'compact';
  return 'modern';
}

// ─── Local OCR via rag-service ────────────────────────────────────────────────
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';

async function localOcr(base64: string): Promise<string> {
  try {
    const res = await fetch(`${RAG_SERVICE_URL}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    // Only trust result if confidence is decent
    if ((data.confidence || 0) < 0.25) return '';
    return (data.text || '').trim();
  } catch { return ''; }
}

// ─── Fetch image URL as base64 ────────────────────────────────────────────────
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://www.instagram.com/',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('base64');
  } catch { return null; }
}

// Image description indicators — NIM tends to describe images instead of reading text
const DESCRIPTION_PHRASES = [
  'the image', 'the photo', 'the picture', 'this image', 'this photo',
  'advertisement for', 'image shows', 'image is', 'photo shows',
  'the logo', 'the box', 'the package', 'the title of the image',
  'in the top-left', 'in the bottom', 'cartoon character', 'bright colors',
  'overall, the image', 'the use of', 'placed on', 'surrounded by',
];

function isUsefulVisionResult(raw: string): boolean {
  if (!raw || raw.trim().length < 15) return false;
  const lower = raw.trim().toLowerCase();
  if (lower === 'skip') return false;
  if (lower.startsWith('tidak ada teks')) return false;
  if (lower.startsWith('no text')) return false;
  if (lower.startsWith('tidak ada konten')) return false;
  // Reject if the model described the image instead of reading text
  const descriptionCount = DESCRIPTION_PHRASES.filter(p => lower.includes(p)).length;
  if (descriptionCount >= 2) return false; // clearly describing, not reading
  return true;
}

async function handleInstagram(
  username: string,
  storeFolder: string,
  send: (event: string, data: object) => void
): Promise<any> {
  const clean = username.replace(/^@/, '').trim();
  if (!process.env.SCRAPER_TOKEN) throw new Error('SCRAPER_TOKEN not configured');

  // ── Step 1: Queue job, wait for extension to scrape ──────────────────────────
  send('progress', { pct: 3, message: 'Queuing scrape job...' });
  const jobId = await createScrapeJob('instagram', clean);
  send('progress', { pct: 5, message: 'Browser opening Instagram profile...' });
  const { result, error } = await waitForScrapeJob(jobId, send, 100000);
  if (error || !result) throw new Error(error || 'Scraper returned no data');

  // Sanity check
  if (result.url && !result.url.includes(clean)) {
    throw new Error(`Scraper fetched wrong profile. URL: ${result.url}`);
  }

  // ── Step 2: Analyze profile — only structured fields, NO fullText ─────────────
  // fullText contains logged-in user's nav data — don't include it
  send('progress', { pct: 55, message: 'Analysing bio and contact info...' });
  const profileText = [
    `Target profil: @${clean}`,
    `Nama profil: ${result.name || ''}`,
    `Bio: ${result.bio || ''}`,
    `Kategori: ${result.category || ''}`,
    `Followers: ${result.followers || ''}`,
    `Website: ${result.website || ''}`,
    result.phones?.length ? `Nomor telepon ditemukan di halaman: ${(result.phones as string[]).join(', ')}` : '',
    result.address ? `Alamat ditemukan di halaman: ${result.address}` : '',
    result.postCaptions?.length ? `\nCaption postingan:\n${(result.postCaptions as string[]).slice(0, 8).map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}` : '',
    result.allHighlights?.length ? `\nHighlights tersedia: ${(result.allHighlights as string[]).join(', ')}` : '',
  ].filter(Boolean).join('\n');

  console.log('[analyze] ig result.name:', result.name, '| bio len:', result.bio?.length, '| phones:', result.phones, '| highlights:', result.allHighlights?.length);
  const ka2 = startKeepalive(send);
  const profileRaw = await qwenText(INSTAGRAM_PROFILE_SYSTEM, profileText);
  clearInterval(ka2);
  console.log('[analyze] qwen raw (first 300):', profileRaw?.slice(0, 300));
  const parsedProfile = parseJson(profileRaw);
  console.log('[analyze] parsed store_name:', parsedProfile?.store_name, '| tagline:', parsedProfile?.store_tagline?.slice(0,50));
  // Fallback chain: Qwen → extension name → username
  const profileData = parsedProfile || { store_name: result.name || clean, store_tagline: result.bio };
  // If store_name is empty, looks like a username (underscores, no spaces), or equals username → improve it
  const looksLikeUsername = (s: string) => !s || s === clean || (s.includes('_') && !s.includes(' '));
  if (looksLikeUsername(profileData.store_name)) {
    // Try extension name first
    if (result.name && !looksLikeUsername(result.name)) {
      profileData.store_name = result.name;
    } else {
      // Extract business name from captions — look for "@username" mentions or business name patterns
      const allText = (result.postCaptions || []).join(' ');
      // Common pattern in Indonesian IG: business name appears before "@" in captions
      const nameFromCaption = allText.match(/\b([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+)\b/);
      if (nameFromCaption) profileData.store_name = nameFromCaption[1];
      else profileData.store_name = clean; // fallback to username if nothing better
    }
  }

  // knowledge_base must be a string — Qwen sometimes returns it as an object
  let knowledgeBase: string;
  if (typeof profileData.knowledge_base === 'string') {
    knowledgeBase = profileData.knowledge_base;
  } else if (profileData.knowledge_base && typeof profileData.knowledge_base === 'object') {
    // Convert object sections to plain text e.g. {"== Profil ==": ["a","b"]} → "== Profil ==\na\nb"
    knowledgeBase = Object.entries(profileData.knowledge_base as Record<string, any>).map(([k, v]) => {
      const content = Array.isArray(v)
        ? v.join('\n')
        : typeof v === 'object'
          ? Object.entries(v as Record<string, any>).map(([k2, v2]) => `${k2}: ${v2}`).join('\n')
          : String(v);
      return `${k}\n${content}`;
    }).join('\n\n');
  } else {
    knowledgeBase = '';
  }

  // ── Step 3: Process story highlights by category ─────────────────────────────
  const storyData: Array<{ title: string; imageUrls: string[] }> = result.storyData || [];
  const processedFnames = new Set<string>();
  const normFname = (u: string) => { try { return new URL(u).pathname.split('/').pop() || u; } catch { return u; } };

  const reviewsFromVision: Array<{ reviewer_name: string; review_text: string; rating: number }> = [];
  const galleryImageUrls: string[] = [];
  // Services saved to disk; image_url is a relative path
  const services: Array<{ name: string; price: string; image_url?: string }> = [];
  // Product images already saved to disk; paths relative to uploads root
  const product_image_paths: string[] = [];

  if (storyData.length) {
    const pricelistStories   = storyData.filter(s => isPricelistHighlight(s.title));
    const testimonialStories = storyData.filter(s => isTestimonialHighlight(s.title));
    const productStories     = storyData.filter(s => isProductHighlight(s.title));
    const otherStories       = storyData.filter(s => !isPricelistHighlight(s.title) && !isTestimonialHighlight(s.title) && !isProductHighlight(s.title));

    const totalImgs = storyData.reduce((s, st) => s + Math.min((st.imageUrls || []).length, 3), 0);
    let imgIdx = 0;

    // Helper: save base64 to disk, return relative path or null
    const saveImg = async (b64: string, subDir: string, prefix: string): Promise<string | null> => {
      if (!storeFolder) return null;
      try {
        const dir = join(UPLOADS_DIR, storeFolder, subDir);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        const fname = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        await writeFile(join(dir, fname), Buffer.from(b64, 'base64'));
        return `/uploads/${storeFolder}/${subDir}/${fname}`;
      } catch { return null; }
    };

    // 3a — Pricelist highlights → localOcr→qwen (primary) or nimVision (fallback)
    for (const story of pricelistStories) {
      const urls = (story.imageUrls || []).filter(u => !processedFnames.has(normFname(u))).slice(0, 3);
      urls.forEach(u => processedFnames.add(normFname(u)));
      const sectionTexts: string[] = [];
      for (const imgUrl of urls) {
        imgIdx++;
        send('progress', { pct: 62 + Math.round(imgIdx / Math.max(totalImgs, 1) * 18), message: `Reading pricelist "${story.title}" (${imgIdx}/${totalImgs})...` });
        const b64 = await fetchImageBase64(imgUrl);
        if (!b64) continue;

        // Try local OCR first (fast, no rate limit)
        let rawText = await localOcr(b64);
        let usedNim = false;
        if (rawText.length < 30) {
          // OCR got too little — fall back to NIM vision
          await sleep(NIM_DELAY_MS);
          rawText = await nimVision(INSTAGRAM_IMAGE_PROMPT, b64).catch(() => '');
          usedNim = true;
        }

        const textForKb = usedNim ? rawText : rawText;
        if (isUsefulVisionResult(textForKb)) sectionTexts.push(textForKb.trim());

        // Structure services from extracted text using qwenText (no NIM needed)
        if (rawText.length >= 20) {
          const svcRaw = usedNim
            ? await nimVision(PRICELIST_SERVICE_PROMPT, b64).catch(() => '')
            : await qwenText(
                'Extract up to 3 products from this pricelist text. Return ONLY JSON array: [{"name":"concise name max 40 chars","price":"Rp X.XXX"}]. Only items with clear name AND price. Return [] if none.',
                rawText, 512
              ).catch(() => '');
          try {
            const arrMatch = svcRaw.match(/\[[\s\S]*\]/);
            if (arrMatch) {
              const parsed = JSON.parse(arrMatch[0]);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (item.name?.trim()) {
                    const image_url = await saveImg(b64, 'services', 'svc');
                    services.push({ name: item.name.trim().slice(0, 40), price: item.price || '', ...(image_url ? { image_url } : {}) });
                    sectionTexts.push(`${item.name.trim()} – ${item.price || ''}`);
                  }
                }
              }
            }
          } catch {}
        }
      }
      if (sectionTexts.length) {
        const seen = new Set<string>();
        const deduped = sectionTexts.join('\n').split('\n').filter(l => { const k = l.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }).join('\n');
        if (deduped.trim()) knowledgeBase += `\n\n== ${story.title} ==\n${deduped.trim()}`;
      }
    }

    // 3b — Testimonial highlights → localOcr→qwen (primary) or nimVision (fallback)
    for (const story of testimonialStories) {
      const urls = (story.imageUrls || []).filter(u => !processedFnames.has(normFname(u))).slice(0, 3);
      urls.forEach(u => processedFnames.add(normFname(u)));
      for (const imgUrl of urls) {
        imgIdx++;
        send('progress', { pct: 62 + Math.round(imgIdx / Math.max(totalImgs, 1) * 18), message: `Reading testimonial "${story.title}" (${imgIdx}/${totalImgs})...` });
        const b64 = await fetchImageBase64(imgUrl);
        if (!b64) continue;

        let rawText = await localOcr(b64);
        if (rawText.length < 20) {
          // OCR too sparse — fall back to NIM
          await sleep(NIM_DELAY_MS);
          const nimRaw = await nimVision(TESTIMONIAL_IMAGE_PROMPT, b64).catch(() => '');
          const parsed = parseJson(nimRaw);
          if (parsed?.name?.trim() && parsed?.text?.trim() && parsed.text.length > 15) {
            reviewsFromVision.push({ reviewer_name: parsed.name.trim(), review_text: parsed.text.trim(), rating: 5 });
          }
          continue;
        }

        // Parse reviewer + quote from OCR text using qwenText
        const structRaw = await qwenText(
          'Extract reviewer name and review text from this testimonial. Return ONLY JSON: {"name":"first name","text":"their review quote"}. If no clear testimonial, return {"name":"","text":""}.',
          rawText, 256
        ).catch(() => '');
        const parsed = parseJson(structRaw);
        if (parsed?.name?.trim() && parsed?.text?.trim() && parsed.text.length > 15) {
          reviewsFromVision.push({ reviewer_name: parsed.name.trim(), review_text: parsed.text.trim(), rating: 5 });
        }
      }
    }

    // 3c — Product highlights → save images to disk, collect paths
    for (const story of productStories) {
      const urls = (story.imageUrls || []).filter(u => !processedFnames.has(normFname(u))).slice(0, 3);
      urls.forEach(u => processedFnames.add(normFname(u)));
      let savedPath: string | null = null;
      for (const imgUrl of urls) {
        imgIdx++;
        send('progress', { pct: 62 + Math.round(imgIdx / Math.max(totalImgs, 1) * 18), message: `Downloading product images "${story.title}" (${imgIdx}/${totalImgs})...` });
        const b64 = await fetchImageBase64(imgUrl);
        if (!b64) continue;
        const path = await saveImg(b64, 'images', 'img');
        if (path) { product_image_paths.push(path); if (!savedPath) savedPath = path; }
        galleryImageUrls.push(imgUrl);
      }
      // Add a name-only service entry for this product highlight
      if (urls.length > 0) {
        services.push({ name: story.title, price: '', ...(savedPath ? { image_url: savedPath } : {}) });
      }
    }

    // 3d — Other highlights → gallery only
    for (const story of otherStories) {
      const urls = (story.imageUrls || []).filter(u => !processedFnames.has(normFname(u))).slice(0, 3);
      urls.forEach(u => processedFnames.add(normFname(u)));
      galleryImageUrls.push(...urls);
    }
  }

  // ── Step 6: Generate website content from assembled KB ────────────────────────
  send('progress', { pct: 88, message: 'Generating website content...' });
  const websiteSystem = `Generate compelling Indonesian website content based on this business knowledge base.
Return ONLY JSON (no other text):
{
  "hero_subtitle": "Value proposition max 110 chars — key benefit, in Indonesian",
  "about_us": "2-3 sentences max 380 chars about what makes this business special, in Indonesian"
}
Be specific. Use real details from the knowledge base. No generic filler text.`;
  const ka6 = startKeepalive(send);
  const websiteRaw = await qwenText(websiteSystem, knowledgeBase.slice(0, 3000)).catch(() => '');
  clearInterval(ka6);
  const websiteData = parseJson(websiteRaw) || {};

  // ── Step 7: Derive contact/meta fields + smart defaults ───────────────────────
  const store_admin_number: string = ((result.phones as string[]) || [])
    .map((p: string) => p.replace(/[\s\-\.()\+]/g, ''))
    .find((p: string) => p.length >= 10) || '';

  const searchText = (result.bio || '') + ' ' + (result.fullText || '').slice(0, 2000);
  const emailMatch = searchText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const store_email = emailMatch?.[0] || '';

  // Subdomain — max 20 chars, clean trailing dashes
  const store_subdomain = (profileData.store_name || result.name || clean)
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 20).replace(/-+$/, '') || 'toko';

  const store_address = profileData.store_address || result.address || '';
  // hero_title comes from profile, NOT from Qwen
  const store_hero_title    = profileData.store_name || result.name || clean;
  const store_hero_subtitle = websiteData.hero_subtitle || (profileData.store_tagline || '').slice(0, 150);
  const store_about_us      = websiteData.about_us     || profileData.store_feature || '';

  // Dominant color — read from first saved service image (already on disk)
  let store_theme_primary = '#10b981';
  const firstSvcPath = services[0]?.image_url || product_image_paths[0];
  if (firstSvcPath && storeFolder) {
    const absPath = join(UPLOADS_DIR, firstSvcPath.replace(`/uploads/${storeFolder}/`, '').replace('/uploads/', ''));
    try {
      const imgBuf = await readFile(absPath);
      store_theme_primary = await extractDominantColor(imgBuf.toString('base64'));
    } catch {}
  }

  // Hero image keyword from first product name (1-2 words)
  const firstProductName = services[0]?.name || '';
  const store_hero_image_keyword = firstProductName
    .split(/\s+/).slice(0, 2).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'food';

  // Template selection from KB + store_type
  const store_design_type = pickDesignType(profileData.store_type || '', knowledgeBase);

  // Reviews — prefer vision-extracted, fall back to KB text parsing
  const reviews = reviewsFromVision.length > 0 ? reviewsFromVision : extractReviewsFromKB(knowledgeBase);

  send('progress', { pct: 97, message: 'Finalising results...' });
  return {
    ...profileData,
    store_address,
    knowledge_base: knowledgeBase,
    store_admin_number,
    store_email,
    store_subdomain,
    store_hero_title,
    store_hero_subtitle,
    store_about_us,
    reviews,
    gallery_image_urls: galleryImageUrls.slice(0, 8),
    services,
    product_image_paths,
    store_hero_image_keyword,
    store_theme_primary,
    store_design_type,
  };
}

// ─── Extract reviews from KB testimonial sections ─────────────────────────────
function extractReviewsFromKB(kb: string): Array<{ reviewer_name: string; review_text: string; rating: number }> {
  const reviews: Array<{ reviewer_name: string; review_text: string; rating: number }> = [];
  // Find all testimonial/review sections
  const sectionRe = /==\s*(?:Testimoni(?:al)?|Review|Ulasan)\s*==\n([\s\S]*?)(?=\n==|$)/gi;
  let secMatch;
  while ((secMatch = sectionRe.exec(kb)) !== null) {
    const text = secMatch[1];
    // Pattern: "quoted text" - Name  OR  Name: "quoted text"
    const quoteRe = /"([^"]{10,300})"\s*[-–]\s*([^\n"]{2,50})/g;
    let m;
    while ((m = quoteRe.exec(text)) !== null && reviews.length < 8) {
      reviews.push({ review_text: m[1].trim(), reviewer_name: m[2].trim(), rating: 5 });
    }
    // Pattern: lines starting with "-" or "*" that look like testimonials (no quotes)
    if (reviews.length === 0) {
      text.split('\n').forEach(line => {
        const clean = line.replace(/^[-*•]\s*/, '').trim();
        if (clean.length > 30 && clean.length < 300 && reviews.length < 5) {
          reviews.push({ review_text: clean, reviewer_name: 'Pelanggan', rating: 5 });
        }
      });
    }
  }
  return reviews;
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  if (!process.env.NVIDIA_NIM_API_KEY) return new Response(JSON.stringify({ error: 'AI service not configured' }), { status: 503 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        const contentType = req.headers.get('content-type') || '';

        // ── JSON body (Instagram or URL) ──────────────────────────────────────
        if (contentType.includes('application/json')) {
          const body = await req.json().catch(() => ({}));
          console.log('[analyze] request body platform:', body.platform, 'url:', body.url?.slice(0,50));

          if (body.platform === 'instagram' && body.username) {
            console.log('[analyze] instagram:', body.username);
            // Resolve store_folder so handleInstagram can save images to disk
            let storeFolder = '';
            try {
              const [sfRows] = await pool.execute(
                'SELECT store_folder FROM pelanggan WHERE store_whatsapp_jid=? OR store_folder=? LIMIT 1',
                [jid, jid]
              ) as any[];
              storeFolder = (sfRows as any[])[0]?.store_folder || '';
            } catch {}
            const igResult = await handleInstagram(body.username, storeFolder, send);
            console.log('[analyze] ig done, store_name:', igResult?.store_name, 'kb_len:', igResult?.knowledge_base?.length);
            // Strip any accidental base64 fields before sending (safety net for large payload)
            const { product_image_bases: _b, ...igResultClean } = igResult;
            send('done', { data: { ...igResultClean, is_product_catalog: false } });
            return;
          }

          // ── URL analyze: crawl all pages → vLLM chapter extraction ──────────
          const urlStr: string = (body.url || '').trim();
          if (!urlStr) { send('error', { message: 'URL cannot be empty' }); return; }

          let parsedUrl: URL;
          try { parsedUrl = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`); }
          catch { send('error', { message: 'Invalid URL' }); return; }

          const SKIP_PATH = /\/(login|register|signup|cart|checkout|my-account|account|profile|wishlist|privacy|terms|sitemap|404|search|tag\/|feed\/|wp-json|wp-admin|wp-login)/i;

          // ── Fetch a page via rag-service Scrapling endpoint ───────────────────
          const scrapePage = async (targetUrl: string): Promise<{ text: string; links: string[]; title: string }> => {
            try {
              const r = await fetch(`${RAG_SERVICE_URL}/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl, timeout_ms: 30000 }),
                signal: AbortSignal.timeout(40_000),
                cache: 'no-store',
              });
              if (!r.ok) {
                console.warn('[analyze] scrape non-ok:', r.status, targetUrl.slice(0, 60));
                return { text: '', links: [], title: '' };
              }
              return await r.json();
            } catch (e: any) {
              console.warn('[analyze] scrape error:', e?.message, targetUrl.slice(0, 60));
              return { text: '', links: [], title: '' };
            }
          };

          // ── Step 1: Fetch homepage via Scrapling ──────────────────────────────
          send('progress', { pct: 5, message: 'Fetching website...' });
          const homePage = await scrapePage(parsedUrl.toString());
          console.log('[analyze] scrape homepage len:', homePage.text.length, 'links:', homePage.links.length);
          if (!homePage.text.trim()) {
            send('error', { message: 'Cannot access URL or no content returned' }); return;
          }

          // ── Step 2: Score and pick best sublinks — max 6, skip city/variant pages ──
          const siteOrigin = parsedUrl.origin;
          const seenLinks = new Set<string>([parsedUrl.href.split('?')[0].split('#')[0].replace(/\/$/, '')]);
          const seenPaths = new Set<string>(); // deduplicate /parent/city1, /parent/city2 → keep only /parent
          const linkCandidates: Array<{ url: string; score: number }> = [];

          for (const href of homePage.links) {
            try {
              const abs = href.startsWith('http') ? href : new URL(href, siteOrigin).href;
              const clean = abs.split('?')[0].split('#')[0].replace(/\/$/, '');
              if (!clean.startsWith(siteOrigin)) continue;
              if (/\.(jpg|jpeg|png|gif|webp|svg|css|js|ico|pdf|zip|xml|woff|ttf)$/i.test(clean)) continue;
              if (/^mailto:|^tel:/.test(clean)) continue;
              if (seenLinks.has(clean) || SKIP_PATH.test(clean)) continue;
              const pathParts = clean.replace(siteOrigin, '').split('/').filter(Boolean);
              const depth = pathParts.length;
              // Skip if a parent path was already seen (avoids 10x city variants)
              if (depth >= 2) {
                const parentPath = pathParts.slice(0, depth - 1).join('/');
                if (seenPaths.has(parentPath)) continue;
              }
              seenLinks.add(clean);
              seenPaths.add(pathParts.join('/'));
              const isHighValue = /service|product|about|contact|menu|catalog|location|faq|price|tarif|offre|solution|distribution|impression|street|journal|couverture|equipe|methode|reference|client/i.test(clean);
              const score = isHighValue ? (depth <= 2 ? 12 : 6) : (depth <= 1 ? 4 : 1);
              linkCandidates.push({ url: clean, score });
            } catch {}
          }

          linkCandidates.sort((a, b) => b.score - a.score);
          const toFetch = linkCandidates.slice(0, 6).map(l => l.url); // max 6 subpages
          console.log('[analyze] links to crawl:', toFetch.length, toFetch.map(u => { try { return new URL(u).pathname; } catch { return u; } }).join(', '));

          // ── Step 3: Fetch subpages sequentially with per-page progress ────────
          const subPages: Array<{ text: string; title: string }> = [];
          for (let i = 0; i < toFetch.length; i++) {
            send('progress', { pct: 12 + Math.round((i / toFetch.length) * 28), message: `Crawling page ${i + 2} of ${toFetch.length + 1}...` });
            const p = await scrapePage(toFetch[i]);
            subPages.push({ text: p.text, title: p.title });
          }

          // ── Step 4: Build per-page sections for RAG KB ───────────────────────
          const titleFromUrl = (url: string) =>
            new URL(url).pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Home';

          // Deduplicate repeated nav/footer lines
          const homeLines = new Set(
            homePage.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 15 && l.length < 120)
          );
          const deduped = (txt: string) =>
            txt.split('\n').filter((l: string) => !homeLines.has(l.trim())).join('\n').replace(/\n{3,}/g, '\n\n').trim();

          const allPages: Array<{ title: string; content: string }> = [
            { title: homePage.title || titleFromUrl(parsedUrl.href), content: homePage.text },
            ...toFetch.map((u, i) => ({
              title: subPages[i].title || titleFromUrl(u),
              content: deduped(subPages[i].text),
            })).filter(p => p.content.length > 100),
          ];

          console.log('[analyze] pages crawled:', allPages.length, allPages.map(p => p.title).join(' | '));

          // ── Step 5: Qwen — extract profile fields from homepage text ──────────
          send('progress', { pct: 42, message: `Analysing content from ${allPages.length} pages...` });

          const PROFILE_SYSTEM = `You are a business analyst AI. Extract key business profile fields from the website content below.

Reply in EXACTLY this format (one-line JSON, no newlines inside values):

[JSON]
{"store_name":"actual business name","store_tagline":"short slogan max 100 chars","store_feature":"main products/services description max 400 chars","store_address":"full physical address including street, city, postal code or empty string","store_email":"business email address or empty string","store_admin_number":"phone number digits only (no spaces/dashes) or empty string","store_hero_subtitle":"hero sentence max 110 chars","store_about_us":"2-3 sentence business description max 380 chars","store_language":"language code: id/en/fr/es/etc"}
[/JSON]

Rules:
- store_name must be the REAL business name (not the domain name)
- store_address: combine street + city + postal code into one line, empty if not found
- store_email: extract email address if present, empty if not found
- store_admin_number: digits only, no country code prefix needed, empty if not found
- store_language must match the language used on the website
- All string values on ONE line, NO literal newlines inside JSON values`;

          const kaUrl = startKeepalive(send);
          const vllmRaw = await qwenText(PROFILE_SYSTEM, allPages[0].content.slice(0, 6000), 600).catch((e: any) => {
            console.error('[analyze] qwen FAILED:', e?.message || e);
            return '';
          });
          clearInterval(kaUrl);

          const urlResult: any = {};
          const jsonBlockMatch = vllmRaw.match(/\[JSON\]\s*([\s\S]*?)\s*\[\/JSON\]/);
          if (jsonBlockMatch) {
            const parsed = parseJson(jsonBlockMatch[1].trim());
            if (parsed) Object.assign(urlResult, parsed);
          }
          if (!urlResult.store_name) {
            const fallback = parseJson(vllmRaw);
            if (fallback) Object.assign(urlResult, fallback);
          }

          // Fallback: derive store_name from page title or hostname if Qwen failed/returned nothing
          if (!urlResult.store_name) {
            const titleFallback = (homePage.title || '').replace(/[-|·–].*$/, '').trim();
            urlResult.store_name = titleFallback || parsedUrl.hostname.replace(/^www\./, '');
            console.warn('[analyze] qwen returned no store_name, using fallback:', urlResult.store_name);
          }
          console.log('[analyze] qwen profile done, store_name:', urlResult.store_name);

          // ── Step 6: LLM-clean scraped pages into structured KB ───────────────
          send('progress', { pct: 78, message: 'Building knowledge base...' });

          // Combine all pages for LLM cleaning — remove nav/footer noise,
          // structure into clean sections so RAG chunks are meaningful.
          const rawCombined = allPages.map(p => {
            const sectionTitle = p.title.replace(/[=\n]/g, '').trim();
            return `=== ${sectionTitle} ===\n${p.content.slice(0, 8000)}`;
          }).join('\n\n---\n\n');

          const KB_CLEAN_SYSTEM = `You are a knowledge base formatter for a business chatbot. Clean and restructure the raw website content below.

REMOVE: navigation menus, cookie/GDPR banners, footer links, social media buttons, repeated headers/footers, JavaScript error text, "Back to top" links, breadcrumbs, pagination.
KEEP: services and prices, contact details (phone/email/address), business hours, about/history text, team info, policies, FAQ content.

Format using == Section Name == headers. Use the SAME LANGUAGE as the source content. Be concise but complete — preserve all prices and contact details exactly.

Reply with ONLY the clean knowledge base text, no preamble.`;

          const kaKb = startKeepalive(send);
          const cleanedKB = await qwenText(KB_CLEAN_SYSTEM, rawCombined.slice(0, 14000), 1500).catch((e: any) => {
            console.warn('[analyze] KB clean LLM failed, using raw:', e?.message);
            return '';
          });
          clearInterval(kaKb);

          // Fallback: use raw sections if LLM cleaning failed
          const rawFallbackKB = allPages.map(p => {
            const sectionTitle = p.title.replace(/[=\n]/g, '').trim();
            return `== ${sectionTitle} ==\n${p.content.slice(0, 10000)}`;
          }).join('\n\n');

          const fullKB = cleanedKB.trim().length > 200 ? cleanedKB.trim() : rawFallbackKB;

          urlResult.knowledge_base = fullKB;
          urlResult.store_hero_title = urlResult.store_name;

          send('progress', { pct: 98, message: 'Done!' });
          console.log('[analyze] url final, store_name:', urlResult.store_name, 'kb_len:', fullKB.length, 'pages:', allPages.length);
          send('done', { data: { ...urlResult, is_product_catalog: false } });
          return;
        }

        // ── File upload ───────────────────────────────────────────────────────
        if (contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          const file = formData.get('file') as File | null;
          // store_type reserved for future use
          formData.get('store_type');
          if (!file) { send('error', { message: 'No file provided' }); return; }
          if (file.size > MAX_FILE_SIZE) { send('error', { message: 'File too large (max 50MB)' }); return; }

          const name = file.name.toLowerCase();
          const buffer = Buffer.from(await file.arrayBuffer());
          const result: any = {};

          // ── PDF ────────────────────────────────────────────────────────────
          if (name.endsWith('.pdf')) {
            send('progress', { pct: 5, message: 'Reading PDF...' });
            const text = await extractPdfText(buffer);

            if (text.trim().length > 100) {
              // Text PDF — chunk processing
              const chunks: string[] = [];
              for (let i = 0; i < text.length; i += TEXT_CHUNK_SIZE)
                chunks.push(text.slice(i, i + TEXT_CHUNK_SIZE));

              send('progress', { pct: 10, message: `Text PDF detected · ${chunks.length} part(s)`, total: chunks.length, current: 0 });

              for (let i = 0; i < chunks.length; i++) {
                const pct = Math.round(10 + ((i + 1) / chunks.length) * 80);
                send('progress', {
                  pct,
                  message: i === 0
                    ? `Analysing part ${i + 1} of ${chunks.length}...`
                    : `Extracting items from part ${i + 1} of ${chunks.length}...`,
                  current: i + 1,
                  total: chunks.length,
                });

                if (i === 0) {
                  const raw = await nimText(FULL_PROMPT, chunks[0]);
                  Object.assign(result, parseJson(raw) || {});
                } else {
                  await sleep(NIM_DELAY_MS);
                  const raw = await nimText(MENU_ONLY_PROMPT, chunks[i]);
                  const parsed = parseJson(raw);
                  if (parsed?.menu_items?.trim()) {
                    result.knowledge_base = [result.knowledge_base, parsed.menu_items.trim()]
                      .filter(Boolean).join('\n\n');
                  }
                }
              }

            } else {
              // Image/scanned PDF — convert pages
              send('progress', { pct: 8, message: 'Scanned PDF detected, converting pages...' });
              const pages = await pdfToImages(buffer);
              if (!pages.length) { send('error', { message: 'Cannot read pages from PDF' }); return; }

              send('progress', { pct: 12, message: `${pages.length} page(s) found`, total: pages.length, current: 0 });

              for (let i = 0; i < pages.length; i++) {
                const pct = Math.round(12 + ((i + 1) / pages.length) * 80);
                send('progress', {
                  pct,
                  message: i === 0
                    ? `Analysing page ${i + 1} of ${pages.length}...`
                    : `Extracting items from page ${i + 1} of ${pages.length}...`,
                  current: i + 1,
                  total: pages.length,
                });

                if (i === 0) {
                  const raw = await nimVision(FULL_PROMPT, pages[0]);
                  Object.assign(result, parseJson(raw) || {});
                } else {
                  await sleep(NIM_DELAY_MS);
                  const raw = await nimVision(MENU_ONLY_PROMPT, pages[i]);
                  const parsed = parseJson(raw);
                  if (parsed?.menu_items?.trim()) {
                    result.knowledge_base = [result.knowledge_base, parsed.menu_items.trim()]
                      .filter(Boolean).join('\n\n');
                  }
                }
              }
            }

          // ── DOCX ──────────────────────────────────────────────────────────
          } else if (name.endsWith('.docx')) {
            send('progress', { pct: 10, message: 'Reading DOCX...' });
            const text = await extractDocxText(buffer);
            if (!text.trim()) { send('error', { message: 'Cannot read text from DOCX' }); return; }

            const chunks: string[] = [];
            for (let i = 0; i < text.length; i += TEXT_CHUNK_SIZE)
              chunks.push(text.slice(i, i + TEXT_CHUNK_SIZE));

            for (let i = 0; i < chunks.length; i++) {
              send('progress', {
                pct: Math.round(15 + ((i + 1) / chunks.length) * 75),
                message: i === 0 ? 'Analysing document...' : `Extracting items from part ${i + 1}/${chunks.length}...`,
                current: i + 1, total: chunks.length,
              });
              if (i === 0) {
                const raw = await nimText(FULL_PROMPT, chunks[0]);
                Object.assign(result, parseJson(raw) || {});
              } else {
                await sleep(NIM_DELAY_MS);
                const raw = await nimText(MENU_ONLY_PROMPT, chunks[i]);
                const parsed = parseJson(raw);
                if (parsed?.menu_items?.trim()) {
                  result.knowledge_base = [result.knowledge_base, parsed.menu_items.trim()]
                    .filter(Boolean).join('\n\n');
                }
              }
            }

          // ── Image ─────────────────────────────────────────────────────────
          } else if (name.match(/\.(jpg|jpeg|png|webp)$/)) {
            send('progress', { pct: 20, message: 'Analysing image...' });
            const base64 = buffer.toString('base64');
            const raw = await nimVision(FULL_PROMPT, base64);
            Object.assign(result, parseJson(raw) || {});

          } else {
            send('error', { message: 'Unsupported format. Use PDF, DOCX, JPG, or PNG.' });
            return;
          }

          send('progress', { pct: 98, message: 'Finalising results...' });
          send('done', { data: { ...result, is_product_catalog: !!result.is_product_catalog } });

        } else {
          send('error', { message: 'Unsupported Content-Type' });
        }

      } catch (e: any) {
        console.error('[analyze] error:', e?.message || e);
        try { send('error', { message: e.message || 'An error occurred' }); } catch {}
      } finally {
        try { controller.close(); } catch {}
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
