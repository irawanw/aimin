import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAdminFromCookies } from '@/lib/admin191-auth';

export async function GET(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const statusFilter = searchParams.get('status') || '';
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (statusFilter) {
      whereClauses.push('t.txn_status = ?');
      params.push(statusFilter);
    }

    const where = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [rows] = await pool.execute(
      `SELECT t.txn_id, t.txn_type, t.txn_amount, t.txn_status,
              t.txn_payment_type, t.txn_created_at, t.txn_paid_at,
              pk.pkt_name,
              p.store_name, p.store_subdomain, p.store_folder
       FROM store_transactions t
       JOIN pelanggan p ON p.store_id = t.txn_store_id
       LEFT JOIN paket pk ON pk.pkt_id = t.txn_paket_id
       ${where}
       ORDER BY t.txn_created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM store_transactions t ${where}`,
      params
    );
    const total = (countRows as any[])[0]?.total || 0;

    return NextResponse.json({ transactions: rows, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
