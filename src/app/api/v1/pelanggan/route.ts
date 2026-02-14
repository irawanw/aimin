import { ApiHandler } from '@/lib/api-handler';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

const api = new ApiHandler('pelanggan', [
  'store_whatsapp_jid', 'store_name', 'store_admin', 'store_address',
  'store_tagline', 'store_feature', 'store_knowledge_base', 'store_images',
  'store_status', 'store_type', 'store_folder', 'store_paket',
  'store_expired_at', 'store_products', 'store_admin_number', 'store_bot_always_on',
  'store_special_prompts',
], 'store_id');

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const folder = url.searchParams.get('folder');
    const jid = url.searchParams.get('jid');

    if (folder) {
      const result = await api.getOne(folder, 'store_folder');
      return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
    } else if (jid) {
      const result = await api.getOne(jid, 'store_whatsapp_jid');
      return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
    } else {
      const rows = await api.getAll();
      return jsonResponse(rows);
    }
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function POST(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const data = await req.json();
    const result = await api.create(data);
    return jsonResponse(result, result.error ? 400 : 201);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function PUT(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Identifier required' }, 400);
    const data = await req.json();
    const result = await api.update(jid, data, 'store_whatsapp_jid');
    return jsonResponse(result, result.error ? 400 : 200);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

export async function DELETE(req: Request) {
  const authErr = authenticate();
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const jid = url.searchParams.get('jid');
    if (!jid) return jsonResponse({ error: 'Identifier required' }, 400);
    const result = await api.delete(jid, 'store_whatsapp_jid');
    return jsonResponse(result);
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
