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

export async function GET(
  _req: Request,
  { params }: { params: { session_key: string } }
) {
  if (!getAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_key } = params;

  try {
    const [sessions] = await pool.execute(
      'SELECT * FROM conversation_sessions WHERE session_key = ?',
      [session_key]
    ) as any;

    const session = sessions[0];
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const [messages] = await pool.execute(
      'SELECT role, content, sent_at FROM conversation_messages WHERE session_key = ? ORDER BY sent_at ASC',
      [session_key]
    );

    return NextResponse.json({ session, messages });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
