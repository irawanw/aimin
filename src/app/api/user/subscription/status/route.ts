import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPelangganAuthKey } from '@/lib/pelanggan-auth';

export async function GET(req: Request) {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const txn_id = searchParams.get('txn_id');
  if (!txn_id) return NextResponse.json({ error: 'txn_id required' }, { status: 400 });

  try {
    const [rows] = await pool.execute(
      `SELECT t.txn_status, t.txn_amount, t.txn_paid_at
       FROM store_transactions t
       JOIN pelanggan p ON p.store_id = t.txn_store_id
       WHERE t.txn_id = ? AND (p.store_whatsapp_jid = ? OR p.store_folder = ?)
       LIMIT 1`,
      [txn_id, jid, jid]
    );
    const txn = (rows as any[])[0];
    if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    return NextResponse.json({ txn_status: txn.txn_status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
