import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

const MAX_IMAGES = 20;
const ALLOWED_EXTENSIONS = ['jpg', 'png', 'gif', 'webp', 'pdf'];
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];

// Resolve uploads dir relative to project root (aiminv1 compatibility)
function getUploadsDir(): string {
  // Use the same uploads directory as aiminv1
  return process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'aiminv1', 'uploads');
}

interface ImageEntry {
  filename: string;
  product: string | null;
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
    return { success: false, error: `Invalid file type: ${extension}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length === 0) {
    return { success: false, error: 'Invalid base64 data' };
  }

  // Validate by checking magic bytes for common types
  const hex = buffer.subarray(0, 4).toString('hex');
  const validMagic =
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e47') || // PNG
    hex.startsWith('47494638') || // GIF
    hex.startsWith('52494646') || // WEBP (RIFF)
    hex.startsWith('25504446'); // PDF
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Missing required parameter: jid' }, 400);

    const [rows] = await pool.execute(
      'SELECT store_id, store_whatsapp_jid, store_folder, store_images, store_products FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    if (data.length === 0) return jsonResponse({ error: 'Pelanggan not found' }, 404);

    const pelanggan = data[0];
    const folderName = pelanggan.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const storeProducts: any[] = pelanggan.store_products ? JSON.parse(pelanggan.store_products) : [];
    const currentImages = normalizeImages(pelanggan.store_images ? JSON.parse(pelanggan.store_images) : []);

    const productFilter = url.searchParams.get('product');

    const imageUrls: any[] = [];
    for (const img of currentImages) {
      if (productFilter !== null) {
        if (productFilter === '' && img.product !== null) continue;
        if (productFilter !== '' && img.product !== productFilter) continue;
      }
      imageUrls.push({
        filename: img.filename,
        product: img.product,
        url: `/uploads/${folderName}/images/${img.filename}`,
      });
    }

    const productsSummary: any[] = [];
    for (const prod of storeProducts) {
      const folder = prod.folder;
      if (!folder) continue;
      const count = currentImages.filter((i) => i.product === folder).length;
      productsSummary.push({
        folder,
        name: prod.name || folder,
        image_count: count,
      });
    }

    return jsonResponse({
      jid,
      folder: folderName,
      count: imageUrls.length,
      total_images: currentImages.length,
      max_images: MAX_IMAGES,
      images: imageUrls,
      products: productsSummary,
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function POST(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Missing required parameter: jid' }, 400);

    const [rows] = await pool.execute(
      'SELECT store_id, store_whatsapp_jid, store_folder, store_images, store_products FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    if (data.length === 0) return jsonResponse({ error: 'Pelanggan not found' }, 404);

    const pelanggan = data[0];
    const folderName = pelanggan.store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const storeProducts: any[] = pelanggan.store_products ? JSON.parse(pelanggan.store_products) : [];
    const currentImages = normalizeImages(pelanggan.store_images ? JSON.parse(pelanggan.store_images) : []);

    if (currentImages.length >= MAX_IMAGES) {
      return jsonResponse({ error: `Maximum ${MAX_IMAGES} images allowed` }, 400);
    }

    const uploadsDir = getUploadsDir();
    const imagesDir = path.join(uploadsDir, folderName, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });

    const input = await req.json();
    const defaultProduct: string | null = input.product ?? null;

    // Validate product
    if (defaultProduct !== null && defaultProduct !== '') {
      const valid = storeProducts.some((p: any) => p.folder === defaultProduct);
      if (!valid) return jsonResponse({ error: `Invalid product: ${defaultProduct}` }, 400);
    }

    if (input.images && Array.isArray(input.images)) {
      const uploaded: ImageEntry[] = [];
      const errors: string[] = [];

      for (let i = 0; i < input.images.length; i++) {
        if (currentImages.length + uploaded.length >= MAX_IMAGES) {
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
        const all = [...currentImages, ...uploaded];
        await updateStoreImages(jid, all);
      }

      return jsonResponse({
        success: true,
        uploaded: uploaded.length,
        filenames: uploaded.map((u) => u.filename),
        errors,
        total_images: currentImages.length + uploaded.length,
      });
    } else if (input.image) {
      const nextNum = getNextNumber(currentImages, []);
      const result = saveBase64File(input.image, imagesDir, nextNum);
      if (result.success) {
        currentImages.push({ filename: result.filename, product: defaultProduct });
        await updateStoreImages(jid, currentImages);
        return jsonResponse({
          success: true,
          filename: result.filename,
          product: defaultProduct,
          url: `/uploads/${folderName}/images/${result.filename}`,
          total_images: currentImages.length,
        });
      } else {
        return jsonResponse({ error: result.error }, 400);
      }
    } else {
      return jsonResponse({ error: "No image data provided. Use 'image' for single or 'images' array for multiple" }, 400);
    }
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function PUT(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Missing required parameter: jid' }, 400);

    const filename = url.searchParams.get('filename');
    const input = await req.json();
    const targetFilename = filename || input.filename;
    const product: string | undefined = input.product;

    if (!targetFilename) return jsonResponse({ error: 'Missing required parameter: filename' }, 400);

    const [rows] = await pool.execute(
      'SELECT store_images, store_products FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    if (data.length === 0) return jsonResponse({ error: 'Pelanggan not found' }, 404);

    const storeProducts: any[] = data[0].store_products ? JSON.parse(data[0].store_products) : [];
    const currentImages = normalizeImages(data[0].store_images ? JSON.parse(data[0].store_images) : []);

    let found = false;
    for (const img of currentImages) {
      if (img.filename === targetFilename) {
        if (product !== undefined && product !== '') {
          const valid = storeProducts.some((p: any) => p.folder === product);
          if (!valid) return jsonResponse({ error: `Invalid product: ${product}` }, 400);
        }
        img.product = product === '' ? null : (product ?? img.product);
        found = true;
        break;
      }
    }

    if (!found) return jsonResponse({ error: `Image not found: ${targetFilename}` }, 404);

    await updateStoreImages(jid, currentImages);

    return jsonResponse({
      success: true,
      filename: targetFilename,
      product: product === '' ? null : product,
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function DELETE(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Missing required parameter: jid' }, 400);

    const [rows] = await pool.execute(
      'SELECT store_folder, store_images FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    if (data.length === 0) return jsonResponse({ error: 'Pelanggan not found' }, 404);

    const folderName = data[0].store_folder || jid.replace('@s.whatsapp.net', '').replace(/[^a-zA-Z0-9]/g, '');
    const currentImages = normalizeImages(data[0].store_images ? JSON.parse(data[0].store_images) : []);
    const uploadsDir = getUploadsDir();
    const imagesDir = path.join(uploadsDir, folderName, 'images');

    const filename = url.searchParams.get('filename');
    let input: any = {};
    try { input = await req.json(); } catch {}
    const targetFilename = filename || input.filename;

    if (!targetFilename) {
      const deleteAll = url.searchParams.get('all') === 'true' || input.all;
      if (deleteAll) {
        for (const img of currentImages) {
          const fp = path.join(imagesDir, img.filename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        await updateStoreImages(jid, []);
        return jsonResponse({ success: true, message: 'All images deleted' });
      }
      return jsonResponse({ error: 'Missing filename parameter or set all=true to delete all' }, 400);
    }

    const index = currentImages.findIndex((img) => img.filename === targetFilename);
    if (index === -1) return jsonResponse({ error: 'Image not found' }, 404);

    const fp = path.join(imagesDir, targetFilename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    currentImages.splice(index, 1);
    await updateStoreImages(jid, currentImages);

    return jsonResponse({
      success: true,
      deleted: targetFilename,
      total_images: currentImages.length,
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function PATCH(req: Request) {
  return PUT(req);
}
