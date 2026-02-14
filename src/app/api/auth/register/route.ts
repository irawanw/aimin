import { NextResponse } from 'next/server';
import { createUser, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, name, password } = await req.json();
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  }
  const user = createUser(email, name, password);
  if (!user) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role, plan: user.plan });
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
