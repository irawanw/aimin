import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPelangganAuthKey } from '@/lib/pelanggan-auth';

export async function GET(req: Request) {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await pool.execute(
      `SELECT t.txn_id, t.txn_paket_id, t.txn_type, t.txn_amount, t.txn_status,
              t.txn_payment_type, t.txn_created_at, t.txn_paid_at,
              pk.pkt_name
       FROM store_transactions t
       JOIN pelanggan p ON p.store_id = t.txn_store_id
       LEFT JOIN paket pk ON pk.pkt_id = t.txn_paket_id
       WHERE p.store_whatsapp_jid = ? OR p.store_folder = ?
       ORDER BY t.txn_created_at DESC
       LIMIT ? OFFSET ?`,
      [jid, jid, limit, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM store_transactions t
       JOIN pelanggan p ON p.store_id = t.txn_store_id
       WHERE p.store_whatsapp_jid = ? OR p.store_folder = ?`,
      [jid, jid]
    );
    const total = (countRows as any[])[0]?.total || 0;

    return NextResponse.json({ transactions: rows, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
