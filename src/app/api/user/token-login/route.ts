import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'pelanggan_token';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify token: not expired, not used
    const [rows] = await pool.execute(
      `SELECT pat.*, p.store_whatsapp_jid, p.store_name
       FROM pelanggan_auth_token pat
       JOIN pelanggan p ON pat.pat_store_whatsapp_jid = p.store_whatsapp_jid
       WHERE pat.pat_token = ?
       AND pat.pat_expires_at > NOW()
       AND pat.pat_used_at IS NULL`,
      [token]
    );

    const data = rows as any[];
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'Token tidak valid, sudah digunakan, atau sudah kadaluarsa' },
        { status: 401 }
      );
    }

    const user = data[0];

    // Mark token as used
    await pool.execute(
      'UPDATE pelanggan_auth_token SET pat_used_at = NOW() WHERE pat_token = ?',
      [token]
    );

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
      domain: '.aiminassist.com',
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
