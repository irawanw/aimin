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

export async function GET(
  _req: Request,
  { params }: { params: { session_key: string } }
) {
  const ids = await getPelangganIds();
  if (!ids) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const [jid, phone] = ids;

  const { session_key } = params;

  try {
    const [sessions] = await pool.execute(
      'SELECT * FROM conversation_sessions WHERE session_key = ? AND pelanggan_id IN (?, ?)',
      [session_key, jid, phone]
    ) as any;

    const session = sessions[0];
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const [messages] = await pool.execute(
      'SELECT role, content, sent_at FROM conversation_messages WHERE session_key = ? ORDER BY sent_at ASC',
      [session_key]
    );

    return NextResponse.json({ session, messages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
