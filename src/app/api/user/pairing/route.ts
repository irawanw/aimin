import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { getPelangganAuthKey, getStoreByKey, pushBotConfig } from '@/lib/pelanggan-auth';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const CLIENT_CHAT_API_BASE = process.env.CLIENT_CHAT_API_BASE || process.env.CHAT_API_BASE || 'http://127.0.0.1:3005';

/** POST — initiate pairing: send #pair#{storeFolder} to bot */
export async function POST() {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const store = await getStoreByKey(jid);
    if (!store?.store_folder) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const storeFolder = store.store_folder;
    const res = await fetch(`${CLIENT_CHAT_API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `#pair#${storeFolder}`,
        sessionId: `pairing-${storeFolder}-${Date.now()}`,
        storeFolder,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Bot API error' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Pairing initiate error:', err);
    return NextResponse.json({ error: 'Failed to initiate pairing' }, { status: 500 });
  }
}

/**
 * PATCH — save paired WA JID after successful scan.
 * Body: { waJid: "628xxx@s.whatsapp.net" }
 * Updates store_whatsapp_jid + store_whatsapp_bot=1, pushes bot config, re-issues JWT.
 */
export async function PATCH(req: Request) {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let waJid: string;
  try {
    const body = await req.json();
    waJid = (body.waJid || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!waJid || !waJid.includes('@s.whatsapp.net')) {
    return NextResponse.json({ error: 'Invalid waJid' }, { status: 400 });
  }

  try {
    const store = await getStoreByKey(jid);
    if (!store?.store_folder) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Save the real WA JID and enable WA bot
    await pool.execute(
      `UPDATE pelanggan SET store_whatsapp_jid = ?, store_whatsapp_bot = 1, store_updated_at = NOW()
       WHERE store_folder = ?`,
      [waJid, store.store_folder]
    );

    // Fetch fresh store record (now has WA JID set) for bot push
    const updated = await getStoreByKey(waJid);
    if (updated) {
      pushBotConfig(updated); // pushes for both store_folder (WebChat) and waJid (WA bot)
    }

    // Re-issue pelanggan_token with real WA JID as jid
    const token = jwt.sign(
      { jid: waJid, store_name: store.store_name, type: 'pelanggan' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const res = NextResponse.json({ success: true, waJid });
    res.cookies.set('pelanggan_token', token, {
      httpOnly: true,
      secure:   true,
      sameSite: 'lax',
      path:     '/',
      domain:   '.aiminassist.com',
      maxAge:   7 * 24 * 60 * 60,
    });
    return res;
  } catch (err) {
    console.error('Pairing save error:', err);
    return NextResponse.json({ error: 'Failed to save pairing' }, { status: 500 });
  }
}
