import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { generateUniqueSlug, pushBotConfig } from '@/lib/pelanggan-auth';

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI || 'https://aiminassist.com/api/auth/google/callback';
const JWT_SECRET    = process.env.JWT_SECRET || 'dev-secret-change-me';
const BASE          = process.env.NEXT_PUBLIC_BASE_URL || 'https://aiminassist.com';

const oauthClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${BASE}/login?error=google_cancelled`);
  }

  try {
    // Exchange code for tokens + verify id_token
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken:  tokens.id_token!,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.redirect(`${BASE}/login?error=no_email`);
    }

    const googleEmail = payload.email.toLowerCase();
    const googleName  = payload.name || googleEmail.split('@')[0];

    // Find existing pelanggan by store_email
    const [rows] = await pool.execute(
      'SELECT store_whatsapp_jid, store_folder, store_name, store_onboarding_done FROM pelanggan WHERE LOWER(store_email) = ?',
      [googleEmail]
    );
    let pelanggan = (rows as any[])[0];

    if (!pelanggan) {
      // New user — generate unique slug and create record
      const folder = await generateUniqueSlug(googleName);

      // Detect dashboard language from Google account locale
      const googleLocale = payload.locale || '';
      const localeLower = googleLocale.toLowerCase().split(/[-_]/)[0];
      const dashboardLang = localeLower === 'fr' ? 'fr' : localeLower === 'id' || localeLower === 'ms' ? 'id' : 'en';

      await pool.execute(
        `INSERT INTO pelanggan
           (store_whatsapp_jid, store_name, store_email, store_folder, store_status, store_language,
            store_bot_always_on, store_whatsapp_bot, store_onboarding_done,
            store_paket, store_expired_at, dashboard_language)
         VALUES (NULL, ?, ?, ?, 'AKTIF', ?, 1, 0, 0,
                 2, DATE_ADD(NOW(), INTERVAL 3 DAY), ?)`,
        [googleName, googleEmail, folder, dashboardLang, dashboardLang]
      );

      pelanggan = { store_whatsapp_jid: null, store_folder: folder, store_name: googleName, store_onboarding_done: 0 };

      // Warm bot cache for WebChat (folder-based lookup)
      const [newRows] = await pool.execute(
        'SELECT * FROM pelanggan WHERE store_folder = ?',
        [folder]
      );
      const newStore = (newRows as any[])[0];
      if (newStore) pushBotConfig(newStore);
    }

    // Auth key: use WA JID if available, else fall back to store_folder
    const authKey = pelanggan.store_whatsapp_jid || pelanggan.store_folder;

    const token = jwt.sign(
      { jid: authKey, store_name: pelanggan.store_name, type: 'pelanggan' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const dest = pelanggan.store_onboarding_done ? '/user' : '/user/onboarding';
    const res  = NextResponse.redirect(`${BASE}${dest}`);
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
    console.error('[google-oauth] callback error:', err);
    return NextResponse.redirect(`${BASE}/login?error=oauth_failed`);
  }
}
