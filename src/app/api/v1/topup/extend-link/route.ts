import { NextResponse } from 'next/server';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const { jid, days } = await req.json();

    if (!jid || !days || typeof days !== 'number' || days <= 0) {
      return jsonResponse({ error: 'jid and days (positive number) are required' }, 400);
    }

    // Verify pelanggan exists
    const [rows] = await pool.execute(
      'SELECT store_id FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    ) as any[];

    if (rows.length === 0) {
      return jsonResponse({ error: 'pelanggan not found' }, 404);
    }

    // Generate secure one-time token
    const token = crypto.randomBytes(32).toString('hex');

    // Expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO extend_tokens (token, jid, days, expires_at) VALUES (?, ?, ?, ?)',
      [token, jid, days, expiresAt]
    );

    const link = `https://aiminassist.com/extend?token=${token}`;
    return jsonResponse({ token, link }, 201);

  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
