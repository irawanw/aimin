import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8002';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const body = await req.json();

    // Fire-and-forget — embedding on CPU can take 30-60s for large KBs.
    // Return 202 immediately so the caller doesn't time out.
    fetch(`${RAG_SERVICE_URL}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});

    return jsonResponse({ status: 'queued' }, 202);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function DELETE(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const body = await req.json();

    const res = await fetch(`${RAG_SERVICE_URL}/index`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return jsonResponse(data, res.status);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
