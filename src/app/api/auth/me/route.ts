import { NextResponse } from 'next/server';
import { getCurrentUser, getUserById } from '@/lib/auth';

export async function GET() {
  const payload = getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const user = getUserById(payload.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const { passwordHash, ...safeUser } = user as any;
  return NextResponse.json({ user: safeUser });
}
