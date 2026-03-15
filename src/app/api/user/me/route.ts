import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const jid = payload.jid;

    // Fetch dashboard_language from DB so the layout can render the right language immediately
    const [rows] = await pool.execute(
      `SELECT dashboard_language FROM pelanggan WHERE store_whatsapp_jid = ? OR store_folder = ? LIMIT 1`,
      [jid, jid]
    );
    const store = (rows as any[])[0];
    const dashboard_language = store?.dashboard_language || null;

    return NextResponse.json({
      jid: payload.jid,
      store_name: payload.store_name,
      dashboard_language,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
