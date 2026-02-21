import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

type FileType = 'image' | 'video' | 'document';

interface FileEntry {
  filename: string;
  type: FileType;
  product: string | null; // free-text tag (kept as 'product' for DB compat)
}

interface StoreProduct {
  folder: string;
  name: string;
}

const FILE_CONFIG: Record<FileType, { exts: string[]; mimes: string[]; maxSize: number; dir: string }> = {
  image: {
    exts: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024,
    dir: 'images',
  },
  video: {
    exts: ['mp4', 'mov', 'webm', 'avi'],
    mimes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
    maxSize: 200 * 1024 * 1024,
    dir: 'videos',
  },
  document: {
    exts: ['pdf', 'docx', 'doc'],
    mimes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
    maxSize: 50 * 1024 * 1024,
    dir: 'docs',
  },
};

function detectFileType(mimeType: string, filename: string): FileType | null {
  for (const [type, cfg] of Object.entries(FILE_CONFIG) as [FileType, typeof FILE_CONFIG[FileType]][]) {
    if (cfg.mimes.includes(mimeType)) return type;
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (cfg.exts.includes(ext)) return type;
  }
  return null;
}

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

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

/** Normalize legacy entries (string | {filename,product}) to FileEntry */
function normalizeFiles(raw: any[]): FileEntry[] {
  return raw.map((item) => {
    if (typeof item === 'string') return { filename: item, type: 'image', product: null };
    return {
      filename: item.filename,
      type: (item.type as FileType) || 'image',
      product: item.product ?? null,
    };
  });
}

async function getStoreData(jid: string) {
  const [rows] = await pool.execute(
    `SELECT p.store_id, p.store_folder, p.store_images, p.store_products,
            COALESCE(pk.pkt_pict_num, 5) as max_images
     FROM pelanggan p
     LEFT JOIN paket pk ON p.store_paket = pk.pkt_id
     WHERE p.store_whatsapp_jid = ?`,
    [jid]
  );
  const data = rows as any[];
  return data.length > 0 ? data[0] : null;
}

async function updateStoreFiles(jid: string, files: FileEntry[]) {
  await pool.execute(
    'UPDATE pelanggan SET store_images = ? WHERE store_whatsapp_jid = ?',
    [JSON.stringify(files), jid]
  );
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const store = await getStoreData(jid);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const folderName = store.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const storeProducts: StoreProduct[] = store.store_products ? JSON.parse(store.store_products) : [];
    const currentFiles = normalizeFiles(store.store_images ? JSON.parse(store.store_images) : []);

    const files = currentFiles.map((f) => ({
      filename: f.filename,
      type: f.type,
      product: f.product,
      url: `/uploads/${folderName}/${FILE_CONFIG[f.type].dir}/${f.filename}`,
    }));

    const products = storeProducts
      .filter((p) => p.folder)
      .map((prod) => ({
        folder: prod.folder,
        name: prod.name || prod.folder,
      }));

    return NextResponse.json({
      folder: folderName,
      total_images: currentFiles.length,  // keep field name for compat
      max_images: store.max_images,
      images: files,     // keep field name for compat
      files,             // new field name
      products,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const store = await getStoreData(jid);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const folderName = store.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const currentFiles = normalizeFiles(store.store_images ? JSON.parse(store.store_images) : []);
    const maxFiles = store.max_images;

    if (currentFiles.length >= maxFiles) {
      return NextResponse.json({ error: `Maksimal ${maxFiles} file` }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') || '';

    // ── Multipart upload (new path: all file types) ──────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const tag = (formData.get('tag') as string) || '';

      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const fileType = detectFileType(file.type, file.name);
      if (!fileType) {
        return NextResponse.json(
          { error: `Tipe file tidak didukung: ${file.type || file.name}` },
          { status: 400 }
        );
      }

      const cfg = FILE_CONFIG[fileType];
      if (file.size > cfg.maxSize) {
        return NextResponse.json(
          { error: `File terlalu besar (maks ${cfg.maxSize / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }

      const uploadsDir = getUploadsDir();
      const subDir = path.join(uploadsDir, folderName, cfg.dir);
      fs.mkdirSync(subDir, { recursive: true });

      const ext = file.name.split('.').pop()?.toLowerCase() || cfg.exts[0];
      const filename = `${Date.now()}.${ext}`;
      const filepath = path.join(subDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      const newEntry: FileEntry = { filename, type: fileType, product: tag || null };
      await updateStoreFiles(jid, [...currentFiles, newEntry]);

      return NextResponse.json({
        success: true,
        uploaded: 1,
        filenames: [filename],
        type: fileType,
        url: `/uploads/${folderName}/${cfg.dir}/${filename}`,
        total_images: currentFiles.length + 1,
        errors: [],
      });
    }

    // ── Legacy JSON base64 path (existing image upload from old clients) ──
    const input = await req.json();
    if (input.images && Array.isArray(input.images)) {
      const uploadsDir = getUploadsDir();
      const imagesDir = path.join(uploadsDir, folderName, 'images');
      fs.mkdirSync(imagesDir, { recursive: true });

      const uploaded: FileEntry[] = [];
      const errors: string[] = [];

      for (let i = 0; i < input.images.length; i++) {
        if (currentFiles.length + uploaded.length >= maxFiles) {
          errors.push(`Gambar ${i + 1}: Batas maksimal tercapai`);
          continue;
        }

        const base64 = input.images[i] as string;
        const match = base64.match(/^data:(\w+)\/(\w+);base64,/);
        let ext = 'jpg';
        let data = base64;
        if (match) {
          ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
          data = base64.substring(base64.indexOf(',') + 1);
        }
        if (!FILE_CONFIG.image.exts.includes(ext)) {
          errors.push(`Gambar ${i + 1}: Tipe tidak valid`);
          continue;
        }

        const buffer = Buffer.from(data, 'base64');
        const filename = `${Date.now() + i}.${ext}`;
        fs.writeFileSync(path.join(imagesDir, filename), buffer);
        uploaded.push({ filename, type: 'image', product: null });
      }

      if (uploaded.length > 0) {
        await updateStoreFiles(jid, [...currentFiles, ...uploaded]);
      }

      return NextResponse.json({
        success: true,
        uploaded: uploaded.length,
        filenames: uploaded.map((u) => u.filename),
        errors,
        total_images: currentFiles.length + uploaded.length,
      });
    }

    return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── PUT (update tag) ─────────────────────────────────────────────────────────

export async function PUT(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const input = await req.json();
    const filename = url.searchParams.get('filename') || input.filename;
    const tag: string | undefined = input.product ?? input.tag;

    if (!filename) return NextResponse.json({ error: 'Missing filename' }, { status: 400 });

    const store = await getStoreData(jid);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const currentFiles = normalizeFiles(store.store_images ? JSON.parse(store.store_images) : []);
    const file = currentFiles.find((f) => f.filename === filename);
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });

    // Free-text tag — no validation against product list
    file.product = tag === '' ? null : (tag ?? file.product);
    await updateStoreFiles(jid, currentFiles);

    return NextResponse.json({ success: true, filename, product: file.product });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');
    if (!filename) return NextResponse.json({ error: 'Missing filename' }, { status: 400 });

    const store = await getStoreData(jid);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const folderName = store.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const currentFiles = normalizeFiles(store.store_images ? JSON.parse(store.store_images) : []);

    const index = currentFiles.findIndex((f) => f.filename === filename);
    if (index === -1) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });

    const fileType = currentFiles[index].type;
    const uploadsDir = getUploadsDir();
    const filepath = path.join(uploadsDir, folderName, FILE_CONFIG[fileType].dir, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    currentFiles.splice(index, 1);
    await updateStoreFiles(jid, currentFiles);

    return NextResponse.json({ success: true, deleted: filename, total_images: currentFiles.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
