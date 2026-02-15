import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const BATCH_API_KEY = process.env.BATCH_API_KEY || '';

// Convert ISO 8601 or any date string to MySQL DATETIME format
function toMysqlDatetime(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // Optional API key check
  if (BATCH_API_KEY) {
    const auth = req.headers.get('authorization') || '';
    const key = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (key !== BATCH_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessions } = body;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return NextResponse.json({ error: 'sessions array required' }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    let sessionsProcessed = 0;
    let messagesSaved = 0;

    for (const session of sessions) {
      if (!session.session_key || !session.pelanggan_id || !session.started_at) continue;

      await conn.execute(
        `INSERT INTO conversation_sessions
         (session_key, pelanggan_id, store_folder, store_type, customer_ref, channel,
          started_at, last_msg_at, booking_success, order_total, msg_count, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         last_msg_at = VALUES(last_msg_at),
         booking_success = VALUES(booking_success),
         order_total = VALUES(order_total),
         msg_count = VALUES(msg_count),
         status = VALUES(status),
         updated_at = NOW()`,
        [
          session.session_key,
          session.pelanggan_id,
          session.store_folder || null,
          session.store_type || 'store',
          session.customer_ref || null,
          session.channel || 'whatsapp',
          toMysqlDatetime(session.started_at),
          toMysqlDatetime(session.last_msg_at),
          session.booking_success ? 1 : 0,
          session.order_total || 0,
          session.msg_count || 0,
          session.status || 'active',
        ]
      );
      sessionsProcessed++;

      if (Array.isArray(session.messages) && session.messages.length > 0) {
        for (const m of session.messages) {
          if (!m.role || !m.content || !m.sent_at) continue;
          try {
            await conn.execute(
              `INSERT IGNORE INTO conversation_messages
               (session_key, pelanggan_id, role, content, sent_at)
               VALUES (?, ?, ?, ?, ?)`,
              [session.session_key, session.pelanggan_id, m.role, m.content, toMysqlDatetime(m.sent_at)]
            );
            messagesSaved++;
          } catch {}
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessions_processed: sessionsProcessed,
      messages_saved: messagesSaved,
    });
  } catch (e: any) {
    console.error('[API] Batch push error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
