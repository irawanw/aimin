import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { jid: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = crypto.randomBytes(32).toString('hex');
    await pool.execute(
      'INSERT INTO pelanggan_auth_token (pat_store_whatsapp_jid, pat_token, pat_expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 6 HOUR))',
      [params.jid, token]
    );
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
