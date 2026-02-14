import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

export async function POST(req: Request) {
  try {
    const { jid, password } = await req.json();

    if (!jid || !password) {
      return NextResponse.json({ error: 'JID dan password wajib diisi' }, { status: 400 });
    }

    // Normalize JID: if user enters just the number, append @s.whatsapp.net
    const normalizedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;

    // Look up the password hash
    const [authRows] = await pool.execute(
      `SELECT pa.pla_password, p.store_whatsapp_jid, p.store_name
       FROM pelanggan_auth pa
       JOIN pelanggan p ON pa.pla_store_whatsapp_jid = p.store_whatsapp_jid
       WHERE pa.pla_store_whatsapp_jid = ?`,
      [normalizedJid]
    );

    const data = authRows as any[];
    if (data.length === 0) {
      return NextResponse.json({ error: 'Akun tidak ditemukan atau password belum diset' }, { status: 401 });
    }

    const user = data[0];
    const valid = bcrypt.compareSync(password, user.pla_password);
    if (!valid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    // Create JWT session
    const jwtToken = jwt.sign(
      {
        jid: user.store_whatsapp_jid,
        store_name: user.store_name,
        type: 'pelanggan',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({
      success: true,
      jid: user.store_whatsapp_jid,
      store_name: user.store_name,
    });

    res.cookies.set(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
