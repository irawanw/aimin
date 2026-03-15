import { NextResponse } from 'next/server';

const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://aiminassist.com/api/auth/google/callback';

export async function GET() {
  if (!CLIENT_ID || CLIENT_ID.includes('your-google')) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 });
  }

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
