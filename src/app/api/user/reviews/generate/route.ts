import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { revalidateClient } from '@/lib/revalidate-client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

interface StoreInfo {
  store_id: number;
  store_subdomain: string;
  store_folder: string;
  store_name: string;
}

async function getStoreInfo(): Promise<StoreInfo | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const jid = payload.jid;
    if (!jid) return null;
    const [rows] = await pool.execute(
      'SELECT store_id, store_subdomain, store_folder, store_name FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ?',
      [jid, jid]
    );
    const data = rows as any[];
    return data.length > 0 ? {
      store_id: data[0].store_id,
      store_subdomain: data[0].store_subdomain,
      store_folder: data[0].store_folder,
      store_name: data[0].store_name,
    } : null;
  } catch {
    return null;
  }
}

export async function POST() {
  const store = await getStoreInfo();
  if (!store) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Delete existing reviews first
    await pool.execute('DELETE FROM reviews WHERE client_id = ?', [store.store_id]);

    // AI-generated reviews personalized with store name
    const aiReviews = [
      {
        reviewer_name: 'Budi Santoso',
        reviewer_photo_keyword: 'man1',
        rating: 5,
        review_text: `Layanan di ${store.store_name} sangat memuaskan! Kualitas produk terjaga dengan baik dan pelayanannya ramah. Sangat direkomendasikan!`
      },
      {
        reviewer_name: 'Siti Rahayu',
        reviewer_photo_keyword: 'woman1',
        rating: 5,
        review_text: `Pengalaman yang luar biasa! ${store.store_name} benar-benar mengerti apa yang pelanggan butuhkan. Pasti akan kembali lagi.`
      },
      {
        reviewer_name: 'Ahmad Fauzi',
        reviewer_photo_keyword: 'man2',
        rating: 5,
        review_text: `Terima kasih atas pelayanan terbaiknya! Hasilnya memuaskan dan sesuai ekspektasi. ${store.store_name} adalah pilihan yang tepat.`
      }
    ];

    // Insert new reviews
    for (const review of aiReviews) {
      await pool.execute(
        'INSERT INTO reviews (client_id, reviewer_name, reviewer_photo_keyword, rating, review_text) VALUES (?, ?, ?, ?, ?)',
        [store.store_id, review.reviewer_name, review.reviewer_photo_keyword, review.rating, review.review_text]
      );
    }

    // Fetch all reviews to return
    const [rows] = await pool.execute(
      'SELECT id, reviewer_name, reviewer_photo_keyword, rating, review_text, created_at FROM reviews WHERE client_id = ? ORDER BY created_at DESC',
      [store.store_id]
    );

    revalidateClient({ subdomain: store.store_subdomain, storeId: store.store_id });

    return NextResponse.json({ success: true, reviews: rows, count: aiReviews.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
