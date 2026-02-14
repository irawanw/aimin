import { NextResponse } from 'next/server';
import { verifyAdmin, signAdminToken } from '@/lib/admin191-auth';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }
    const admin = await verifyAdmin(username, password);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = signAdminToken(admin);
    const res = NextResponse.json({ ok: true, admin });
    res.cookies.set('admin191_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
