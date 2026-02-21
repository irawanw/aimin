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

    const res = await fetch(`${RAG_SERVICE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return jsonResponse(data, res.status);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
