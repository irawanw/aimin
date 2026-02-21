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

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'annual'];

export async function GET(req: Request) {
  if (!getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const storeType = searchParams.get('store_type');

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
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

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (from) { where += ' AND started_at >= ?'; params.push(from); }
    if (to) { where += ' AND started_at < DATE_ADD(?, INTERVAL 1 DAY)'; params.push(to); }
    if (storeType) { where += ' AND store_type = ?'; params.push(storeType); }

    const [byPeriod] = await pool.execute(
      `SELECT ${dateExpr},
        COUNT(*) as conversations,
        SUM(booking_success) as bookings,
        ROUND(SUM(booking_success) * 100.0 / COUNT(*), 2) as booking_rate,
        ROUND(AVG(msg_count), 1) as avg_messages
       FROM conversation_sessions ${where}
       GROUP BY ${groupBy}
       ORDER BY date DESC
       LIMIT 90`,
      params
    );

    const [[summary]] = await pool.execute(
      `SELECT COUNT(*) as total_conversations,
        SUM(booking_success) as total_bookings,
        ROUND(AVG(msg_count), 1) as avg_messages
       FROM conversation_sessions ${where}`,
      params
    ) as any;

    // breakdown by store_type
    const [byType] = await pool.execute(
      `SELECT store_type, COUNT(*) as conversations, SUM(booking_success) as bookings
       FROM conversation_sessions ${where}
       GROUP BY store_type ORDER BY conversations DESC`,
      params
    );

    const total = Number(summary.total_conversations) || 0;
    const bookings = Number(summary.total_bookings) || 0;

    return NextResponse.json({
      period,
      total_conversations: total,
      total_bookings: bookings,
      booking_rate: total > 0 ? ((bookings * 100) / total).toFixed(2) : '0.00',
      avg_messages: summary.avg_messages || 0,
      by_period: byPeriod,
      by_type: byType,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
