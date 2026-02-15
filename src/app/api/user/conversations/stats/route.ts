import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

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

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'annual'];

export async function GET(req: Request) {
  const ids = await getPelangganIds();
  if (!ids) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const [jid, phone] = ids;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period. Use: daily, weekly, monthly, annual' }, { status: 400 });
  }

  try {
    let groupBy: string;
    let dateExpr: string;
    if (period === 'daily') {
      groupBy = 'DATE(started_at)';
      dateExpr = 'DATE(started_at) as date';
    } else if (period === 'weekly') {
      groupBy = 'YEARWEEK(started_at, 1)';
      dateExpr = 'MIN(DATE(started_at)) as date';
    } else if (period === 'monthly') {
      groupBy = "DATE_FORMAT(started_at, '%Y-%m')";
      dateExpr = "DATE_FORMAT(MIN(started_at), '%Y-%m-01') as date";
    } else {
      groupBy = 'YEAR(started_at)';
      dateExpr = "DATE_FORMAT(MIN(started_at), '%Y-01-01') as date";
    }

    let where = 'WHERE pelanggan_id IN (?, ?)';
    const params: any[] = [jid, phone];

    if (from) {
      where += ' AND started_at >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND started_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(to);
    }

    const periodQuery = `
      SELECT
        ${dateExpr},
        COUNT(*) as conversations,
        SUM(booking_success) as bookings,
        ROUND(SUM(booking_success) * 100.0 / COUNT(*), 2) as booking_rate,
        ROUND(AVG(msg_count), 1) as avg_messages
      FROM conversation_sessions
      ${where}
      GROUP BY ${groupBy}
      ORDER BY date DESC
      LIMIT 90
    `;

    const [byPeriod] = await pool.execute(periodQuery, params);

    const [[summary]] = await pool.execute(
      `SELECT
        COUNT(*) as total_conversations,
        SUM(booking_success) as total_bookings,
        ROUND(AVG(msg_count), 1) as avg_messages
       FROM conversation_sessions WHERE pelanggan_id IN (?, ?)`,
      [jid, phone]
    ) as any;

    const totalConversations = Number(summary.total_conversations) || 0;
    const totalBookings = Number(summary.total_bookings) || 0;

    return NextResponse.json({
      period,
      total_conversations: totalConversations,
      total_bookings: totalBookings,
      booking_rate: totalConversations > 0
        ? ((totalBookings * 100) / totalConversations).toFixed(2)
        : '0.00',
      avg_messages: summary.avg_messages || 0,
      by_period: byPeriod,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
