import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';
import fs from 'fs';
import path from 'path';

const ALLOWED_EXTENSIONS = ['jpg', 'png', 'gif', 'webp'];

interface ImageEntry {
  filename: string;
  product: string | null;
}

interface StoreProduct {
  folder: string;
  name: string;
}

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

function normalizeImages(raw: any[]): ImageEntry[] {
  return raw.map((img) => {
    if (typeof img === 'string') {
      return { filename: img, product: null };
    }
    return { filename: img.filename, product: img.product ?? null };
  });
}

function getNextNumber(current: ImageEntry[], uploaded: ImageEntry[]): number {
  let max = 0;
  for (const img of [...current, ...uploaded]) {
    const m = img.filename.match(/^(\d+)\./);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

function detectExtension(base64: string): { extension: string; data: string } {
  const match = base64.match(/^data:(\w+)\/(\w+);base64,/);
  let extension = 'jpg';
  let data = base64;

  if (match) {
    extension = match[2].toLowerCase();
    data = base64.substring(base64.indexOf(',') + 1);
  }

  if (extension === 'jpeg') extension = 'jpg';
  return { extension, data };
}

function saveBase64File(
  base64Data: string,
  uploadDir: string,
  number: number
): { success: true; filename: string } | { success: false; error: string } {
  const { extension, data } = detectExtension(base64Data);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { success: false, error: `Invalid file type: ${extension}` };
  }

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length === 0) {
    return { success: false, error: 'Invalid base64 data' };
  }

  const hex = buffer.subarray(0, 4).toString('hex');
  const validMagic =
    hex.startsWith('ffd8ff') ||
    hex.startsWith('89504e47') ||
    hex.startsWith('47494638') ||
    hex.startsWith('52494646');
  if (!validMagic) {
    return { success: false, error: 'Invalid file type detected' };
  }

  const filename = String(number).padStart(2, '0') + '.' + extension;
  const filepath = path.join(uploadDir, filename);

  fs.writeFileSync(filepath, buffer);
  return { success: true, filename };
}

async function updateStoreImages(jid: string, images: ImageEntry[]) {
  images.sort((a, b) => parseInt(a.filename) - parseInt(b.filename));
  await pool.execute(
    'UPDATE pelanggan SET store_images = ? WHERE store_whatsapp_jid = ?',
    [JSON.stringify(images), jid]
  );
}

async function getStoreData(jid: string) {
  const [rows] = await pool.execute(
    'SELECT store_id, store_whatsapp_jid, store_folder, store_images, store_products FROM pelanggan WHERE store_whatsapp_jid = ?',
    [jid]
  );
  const data = rows as any[];
  return data.length > 0 ? data[0] : null;
}

function getMaxImages(plan: string): number {
  return plan === 'pro' ? 20 : 5;
}

function authCheck() {
  const payload = getCurrentUser();
  if (!payload) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }
  if (!payload.storeJid) {
    return { error: NextResponse.json({ error: 'No store linked to this account' }, { status: 400 }) };
  }
  return { payload };
}

// GET - List images and products for the current user's store
export async function GET() {
  const auth = authCheck();
  if ('error' in auth) return auth.error;
  const { payload } = auth;

  try {
    const store = await getStoreData(payload.storeJid!);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const folderName = store.store_folder || payload.storeJid!.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const storeProducts: StoreProduct[] = store.store_products ? JSON.parse(store.store_products) : [];
    const currentImages = normalizeImages(store.store_images ? JSON.parse(store.store_images) : []);
    const maxImages = getMaxImages(payload.plan);

    const images = currentImages.map((img) => ({
      filename: img.filename,
      product: img.product,
      url: `/uploads/${folderName}/images/${img.filename}`,
    }));

    const products = storeProducts
      .filter((p) => p.folder)
      .map((prod) => ({
        folder: prod.folder,
        name: prod.name || prod.folder,
        image_count: currentImages.filter((i) => i.product === prod.folder).length,
      }));

    return NextResponse.json({
      folder: folderName,
      total_images: currentImages.length,
      max_images: maxImages,
      images,
      products,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST - Upload images
export async function POST(req: Request) {
  const auth = authCheck();
  if ('error' in auth) return auth.error;
  const { payload } = auth;

  try {
    const store = await getStoreData(payload.storeJid!);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const folderName = store.store_folder || payload.storeJid!.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const storeProducts: StoreProduct[] = store.store_products ? JSON.parse(store.store_products) : [];
    const currentImages = normalizeImages(store.store_images ? JSON.parse(store.store_images) : []);
    const maxImages = getMaxImages(payload.plan);

    if (currentImages.length >= maxImages) {
      return NextResponse.json({ error: `Maximum ${maxImages} images allowed` }, { status: 400 });
    }

    const uploadsDir = getUploadsDir();
    const imagesDir = path.join(uploadsDir, folderName, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });

    const input = await req.json();
    const defaultProduct: string | null = input.product ?? null;

    if (defaultProduct !== null && defaultProduct !== '') {
      const valid = storeProducts.some((p) => p.folder === defaultProduct);
      if (!valid) {
        return NextResponse.json({ error: `Invalid product: ${defaultProduct}` }, { status: 400 });
      }
    }

    if (input.images && Array.isArray(input.images)) {
      const uploaded: ImageEntry[] = [];
      const errors: string[] = [];

      for (let i = 0; i < input.images.length; i++) {
        if (currentImages.length + uploaded.length >= maxImages) {
          errors.push(`Image ${i}: Maximum limit reached`);
          continue;
        }
        const nextNum = getNextNumber(currentImages, uploaded);
        const result = saveBase64File(input.images[i], imagesDir, nextNum);
        if (result.success) {
          uploaded.push({ filename: result.filename, product: defaultProduct });
        } else {
          errors.push(`Image ${i}: ${result.error}`);
        }
      }

      if (uploaded.length > 0) {
        await updateStoreImages(payload.storeJid!, [...currentImages, ...uploaded]);
      }

      return NextResponse.json({
        success: true,
        uploaded: uploaded.length,
        filenames: uploaded.map((u) => u.filename),
        errors,
        total_images: currentImages.length + uploaded.length,
      });
    }

    return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - Update image product tag
export async function PUT(req: Request) {
  const auth = authCheck();
  if ('error' in auth) return auth.error;
  const { payload } = auth;

  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');
    const input = await req.json();
    const targetFilename = filename || input.filename;
    const product: string | undefined = input.product;

    if (!targetFilename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    const store = await getStoreData(payload.storeJid!);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const storeProducts: StoreProduct[] = store.store_products ? JSON.parse(store.store_products) : [];
    const currentImages = normalizeImages(store.store_images ? JSON.parse(store.store_images) : []);

    let found = false;
    for (const img of currentImages) {
      if (img.filename === targetFilename) {
        if (product !== undefined && product !== '') {
          const valid = storeProducts.some((p) => p.folder === product);
          if (!valid) {
            return NextResponse.json({ error: `Invalid product: ${product}` }, { status: 400 });
          }
        }
        img.product = product === '' ? null : (product ?? img.product);
        found = true;
        break;
      }
    }

    if (!found) {
      return NextResponse.json({ error: `Image not found: ${targetFilename}` }, { status: 404 });
    }

    await updateStoreImages(payload.storeJid!, currentImages);

    return NextResponse.json({
      success: true,
      filename: targetFilename,
      product: product === '' ? null : product,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE - Remove an image
export async function DELETE(req: Request) {
  const auth = authCheck();
  if ('error' in auth) return auth.error;
  const { payload } = auth;

  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    const store = await getStoreData(payload.storeJid!);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const folderName = store.store_folder || payload.storeJid!.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const currentImages = normalizeImages(store.store_images ? JSON.parse(store.store_images) : []);

    const index = currentImages.findIndex((img) => img.filename === filename);
    if (index === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const uploadsDir = getUploadsDir();
    const filepath = path.join(uploadsDir, folderName, 'images', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    currentImages.splice(index, 1);
    await updateStoreImages(payload.storeJid!, currentImages);

    return NextResponse.json({
      success: true,
      deleted: filename,
      total_images: currentImages.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
