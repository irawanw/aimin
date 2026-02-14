import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function POST(req: Request, { params }: { params: { jid: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    const hash = bcrypt.hashSync(password, 10);
    await pool.execute(
      'INSERT INTO pelanggan_auth (pla_store_whatsapp_jid, pla_password) VALUES (?, ?) ON DUPLICATE KEY UPDATE pla_password = ?',
      [params.jid, hash, hash]
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
