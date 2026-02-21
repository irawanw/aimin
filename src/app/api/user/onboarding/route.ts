import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

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

async function ensureSchema() {
  // Add onboarding column if not exists
  try {
    await pool.execute(
      `ALTER TABLE pelanggan ADD COLUMN IF NOT EXISTS store_onboarding_done TINYINT(1) DEFAULT 0`
    );
  } catch {
    // Column might already exist, ignore
  }

  // Create onboarding_config table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS onboarding_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      step_key VARCHAR(50) NOT NULL UNIQUE,
      step_title VARCHAR(300) NOT NULL,
      step_description TEXT,
      step_placeholder VARCHAR(500),
      step_order INT DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Insert defaults if empty
  const defaults = [
    {
      step_key: 'store_name',
      step_title: 'Apa nama toko kamu? 🏪',
      step_description: 'Nama toko akan ditampilkan di website dan digunakan oleh AI assistant kamu saat menyapa pelanggan.',
      step_placeholder: 'Contoh: Warung Kopi Nusantara',
      step_order: 1,
    },
    {
      step_key: 'store_type',
      step_title: 'Apa jenis usaha kamu? 🎯',
      step_description: 'Pilih jenis usaha yang paling sesuai agar AI dapat merespons pelanggan dengan cara yang tepat.',
      step_placeholder: '',
      step_order: 2,
    },
    {
      step_key: 'store_tagline',
      step_title: 'Apa tagline bisnis kamu? ✨',
      step_description: 'Tagline adalah kalimat singkat yang menggambarkan bisnis kamu. Ini akan tampil di halaman website.',
      step_placeholder: 'Contoh: Kopi terbaik dengan cita rasa autentik',
      step_order: 3,
    },
    {
      step_key: 'store_feature',
      step_title: 'Ceritakan produk unggulan kamu 🌟',
      step_description: 'Jelaskan produk atau layanan utama yang kamu tawarkan. AI akan menggunakan info ini untuk menjawab pertanyaan pelanggan.',
      step_placeholder: 'Contoh: Kami menjual berbagai kopi arabika dan robusta pilihan dari Aceh, Toraja, dan Flores...',
      step_order: 4,
    },
    {
      step_key: 'store_knowledge_base',
      step_title: 'Knowledge Base AI kamu 🧠',
      step_description: 'Tambahkan info penting seperti jam buka, kebijakan toko, FAQ, atau info lain yang sering ditanyakan pelanggan.',
      step_placeholder: 'Contoh:\nJam buka: Senin–Sabtu 08.00–22.00\nGratis ongkir untuk pembelian di atas Rp 100.000\nPembayaran: Transfer BCA, GoPay, OVO',
      step_order: 5,
    },
    {
      step_key: 'store_images',
      step_title: 'Upload foto produk kamu 📸',
      step_description: 'Foto produk membantu AI mengenali produk kamu dan bisa dikirimkan ke pelanggan yang bertanya. Langkah ini bisa dilewati.',
      step_placeholder: '',
      step_order: 6,
    },
    {
      step_key: 'store_address',
      step_title: 'Di mana lokasi toko kamu? 📍',
      step_description: 'Alamat toko akan digunakan untuk menampilkan lokasi di website dan membantu pelanggan menemukanmu.',
      step_placeholder: 'Contoh: Jl. Sudirman No. 123, Menteng, Jakarta Pusat 10310',
      step_order: 7,
    },
    {
      step_key: 'store_fulfillment',
      step_title: 'Bagaimana cara pengiriman/layanan? 🚀',
      step_description: 'Pilih semua metode yang tersedia agar AI dapat menginformasikan kepada pelanggan dengan benar.',
      step_placeholder: '',
      step_order: 8,
    },
  ];

  for (const d of defaults) {
    await pool.execute(
      `INSERT IGNORE INTO onboarding_config (step_key, step_title, step_description, step_placeholder, step_order)
       VALUES (?, ?, ?, ?, ?)`,
      [d.step_key, d.step_title, d.step_description, d.step_placeholder, d.step_order]
    );
  }
}

export async function GET() {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    await ensureSchema();

    const [storeRows] = await pool.execute(
      'SELECT store_onboarding_done FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );

    const store = (storeRows as any[])[0];

    const [configRows] = await pool.execute(
      'SELECT * FROM onboarding_config ORDER BY step_order ASC'
    );

    return NextResponse.json({
      onboarding_done: store?.store_onboarding_done || 0,
      steps: configRows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const jid = getPelangganJid();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const body = await req.json();

    const allowedFields = [
      'store_name', 'store_type', 'store_tagline', 'store_feature',
      'store_knowledge_base', 'store_address', 'store_fulfillment',
    ];

    const updates: string[] = ['store_onboarding_done = 1'];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (field in body && body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-geocode address
    if ('store_address' in body && body.store_address) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(body.store_address)}&format=json&limit=1&countrycodes=id`,
          { headers: { 'User-Agent': 'AiMinAssist/1.0 (aiminassist.com)' } }
        );
        const geoData = await geoRes.json();
        if (Array.isArray(geoData) && geoData[0]) {
          updates.push('store_latitude = ?', 'store_longitude = ?');
          values.push(parseFloat(geoData[0].lat), parseFloat(geoData[0].lon));
        }
      } catch {
        // Geocoding failed silently
      }
    }

    updates.push('store_updated_at = NOW()');
    values.push(jid);

    await pool.execute(
      `UPDATE pelanggan SET ${updates.join(', ')} WHERE store_whatsapp_jid = ?`,
      values
    );

    // Invalidate client cache
    const [storeRows] = await pool.execute(
      'SELECT store_id, store_subdomain FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const store = (storeRows as any[])[0];
    if (store) revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
