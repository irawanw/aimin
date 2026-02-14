import { NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role, plan: user.plan, storeJid: user.storeJid });
  const { passwordHash, ...safeUser } = user;
  const res = NextResponse.json({ user: safeUser });
  res.cookies.set('aimin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
