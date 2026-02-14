import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [totalPelanggan] = await pool.execute('SELECT COUNT(*) as count FROM pelanggan');
    const [activePelanggan] = await pool.execute("SELECT COUNT(*) as count FROM pelanggan WHERE store_status = 'AKTIF'");
    const [totalPaket] = await pool.execute('SELECT COUNT(*) as count FROM paket');
    const [activePaket] = await pool.execute('SELECT COUNT(*) as count FROM paket WHERE pkt_active = 1');
    const [recentPelanggan] = await pool.execute(
      'SELECT store_whatsapp_jid, store_name, store_admin, store_status, store_type, store_updated_at FROM pelanggan ORDER BY store_updated_at DESC LIMIT 5'
    );
    const [recentPaket] = await pool.execute(
      'SELECT pkt_id, pkt_name, pkt_price, pkt_active, pkt_created_at FROM paket ORDER BY pkt_created_at DESC LIMIT 5'
    );

    return NextResponse.json({
      stats: {
        totalPelanggan: (totalPelanggan as any[])[0].count,
        activePelanggan: (activePelanggan as any[])[0].count,
        totalPaket: (totalPaket as any[])[0].count,
        activePaket: (activePaket as any[])[0].count,
      },
      recentPelanggan,
      recentPaket,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
