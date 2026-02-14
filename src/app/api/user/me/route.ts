import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

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
    return NextResponse.json({
      jid: payload.jid,
      store_name: payload.store_name,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
