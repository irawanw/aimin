import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

// Returns [fullJid, phoneNumber] e.g. ["628xxx@s.whatsapp.net", "628xxx"]
async function getPelangganIds(): Promise<[string, string] | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const jid: string = payload.jid;
    if (!jid) return null;
    const phone = jid.replace('@s.whatsapp.net', '');
    return [jid, phone];
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const ids = await getPelangganIds();
  if (!ids) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const [jid, phone] = ids;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const bookingSuccess = searchParams.get('booking_success');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let query = 'SELECT * FROM conversation_sessions WHERE pelanggan_id IN (?, ?)';
    const params: any[] = [jid, phone];

    if (from) {
      query += ' AND started_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND started_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(to);
    }
    if (bookingSuccess !== null) {
      query += ' AND booking_success = ?';
      params.push(parseInt(bookingSuccess));
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [[{ total }]] = await pool.execute(countQuery, params) as any;

    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [sessions] = await pool.execute(query, params);

    return NextResponse.json({ total, limit, offset, sessions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
