import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';

function getAdmin(): any | null {
  const cookieStore = cookies();
  const token = cookieStore.get('admin191_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const bookingSuccess = searchParams.get('booking_success');
  const storeType = searchParams.get('store_type');
  const search = searchParams.get('search'); // matches pelanggan_id, store_folder, customer_ref
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (from) { where += ' AND started_at >= ?'; params.push(from); }
    if (to) { where += ' AND started_at < DATE_ADD(?, INTERVAL 1 DAY)'; params.push(to); }
    if (bookingSuccess !== null && bookingSuccess !== '') {
      where += ' AND booking_success = ?';
      params.push(parseInt(bookingSuccess));
    }
    if (storeType) { where += ' AND store_type = ?'; params.push(storeType); }
    if (search) {
      where += ' AND (pelanggan_id LIKE ? OR store_folder LIKE ? OR customer_ref LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const countQuery = `SELECT COUNT(*) as total FROM conversation_sessions ${where}`;
    const [[{ total }]] = await pool.execute(countQuery, params) as any;

    const dataQuery = `SELECT * FROM conversation_sessions ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`;
    const [sessions] = await pool.execute(dataQuery, [...params, limit, offset]);

    return NextResponse.json({ total, limit, offset, sessions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
