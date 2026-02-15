import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('pelanggan_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain: '.aiminassist.com',
    maxAge: 0,
  });
  return res;
}
