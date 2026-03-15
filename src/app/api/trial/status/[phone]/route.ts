import { NextResponse } from 'next/server';

const CLIENT_CHAT_API_BASE = process.env.CLIENT_CHAT_API_BASE || process.env.CHAT_API_BASE || 'http://127.0.0.1:3005';

export async function GET(
  _req: Request,
  { params }: { params: { phone: string } }
) {
  const { phone } = params;
  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${CLIENT_CHAT_API_BASE}/api/trial/status/${phone}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ status: 'failed', message: 'Upstream error' }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'failed', message: 'Cannot reach bot server' }, { status: 200 });
  }
}
