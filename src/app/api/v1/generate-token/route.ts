import crypto from 'crypto';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const jid = body.jid;

    if (!jid) {
      return jsonResponse({ error: 'Missing required parameter: jid' }, 400);
    }

    // Verify pelanggan exists
    const [rows] = await pool.execute(
      'SELECT store_whatsapp_jid, store_name FROM pelanggan WHERE store_whatsapp_jid = ?',
      [jid]
    );
    const data = rows as any[];
    if (data.length === 0) {
      return jsonResponse({ error: 'Pelanggan not found' }, 404);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Ensure table exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pelanggan_auth_token (
        pat_id INT AUTO_INCREMENT PRIMARY KEY,
        pat_store_whatsapp_jid VARCHAR(100) NOT NULL,
        pat_token VARCHAR(64) NOT NULL UNIQUE,
        pat_expires_at DATETIME NOT NULL,
        pat_used_at DATETIME DEFAULT NULL,
        pat_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (pat_token),
        INDEX idx_jid (pat_store_whatsapp_jid)
      )
    `);

    await pool.execute(
      'INSERT INTO pelanggan_auth_token (pat_store_whatsapp_jid, pat_token, pat_expires_at, pat_created_at) VALUES (?, ?, NOW() + INTERVAL 6 HOUR, NOW())',
      [jid, token]
    );

    // Build login URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aiminassist.com';
    const loginUrl = `${baseUrl}/user?token=${token}`;

    return jsonResponse({
      success: true,
      jid,
      store_name: data[0].store_name,
      login_url: loginUrl,
      expires_in: '6 hours',
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
