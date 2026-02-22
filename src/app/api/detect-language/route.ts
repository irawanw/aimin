import { NextRequest, NextResponse } from 'next/server';

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export async function GET(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : realIp) || '127.0.0.1';

  // Private/local IP → default Indonesian
  if (isPrivateIp(ip)) {
    return NextResponse.json({ lang: 'id', country: null });
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('ip-api failed');
    const data = await res.json();
    const country: string | null = data.countryCode || null;
    const lang = country === 'ID' ? 'id' : 'en';
    return NextResponse.json({ lang, country });
  } catch {
    // Fallback to Indonesian on lookup failure
    return NextResponse.json({ lang: 'id', country: null });
  }
}
