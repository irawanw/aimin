import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// This is the same backend the client storefront uses — NOT the aimin SaaS bot (11481)
const CLIENT_CHAT_API_BASE = process.env.CLIENT_CHAT_API_BASE || 'http://127.0.0.1:3005';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sessionId, storeFolder: rawFolder, store } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message string required' }, { status: 400 });
    }

    // Resolve storeFolder: use provided value, or look up from store subdomain
    let storeFolder = rawFolder || '';
    if (!storeFolder && store) {
      try {
        const [rows] = await pool.execute(
          'SELECT store_folder FROM pelanggan WHERE store_subdomain = ? LIMIT 1',
          [store]
        ) as any[];
        storeFolder = (rows as any[])[0]?.store_folder || '';
      } catch {}
    }

    const response = await fetch(`${CLIENT_CHAT_API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId: sessionId || '', storeFolder }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: 'Chat API error', detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Widget chat proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to reach chat API' },
      { status: 502 }
    );
  }
}
