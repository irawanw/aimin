import { NextResponse } from 'next/server';

const CHAT_API_BASE = process.env.CHAT_API_BASE || 'http://192.168.18.36:11386';

export async function GET(
  _req: Request,
  { params }: { params: { phone: string } }
) {
  const { phone } = params;

  if (!phone) {
    return NextResponse.json({ error: 'phone required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${CHAT_API_BASE}/api/trial/status/${encodeURIComponent(phone)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: 'Trial status API error', detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Trial status proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to reach trial status API' },
      { status: 502 }
    );
  }
}
