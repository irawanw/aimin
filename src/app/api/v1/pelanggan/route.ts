import { ApiHandler } from '@/lib/api-handler';
import { authenticate, jsonResponse, corsHeaders } from '@/lib/api-auth';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const api = new ApiHandler('pelanggan', [
  'store_whatsapp_jid', 'store_name', 'store_admin', 'store_address',
  'store_tagline', 'store_feature', 'store_knowledge_base', 'store_images',
  'store_status', 'store_type', 'store_folder', 'store_paket',
  'store_expired_at', 'store_products', 'store_admin_number', 'store_bot_always_on',
  'store_special_prompts',
], 'store_id');

// JOIN with paket table to include store_paket_name and topup_price in the response
async function getWithPaketName(field: string, value: string) {
  const [rows] = await pool.execute(
    `SELECT p.*, pk.pkt_name AS store_paket_name,
            CAST(pk.pkt_price AS UNSIGNED) AS pkt_price,
            CAST(IF(p.store_status = 'TRIAL', pk_lite.pkt_price, pk.pkt_price) AS UNSIGNED) AS topup_price
     FROM pelanggan p
     LEFT JOIN paket pk ON pk.pkt_id = p.store_paket
     LEFT JOIN paket pk_lite ON pk_lite.pkt_id = 1
     WHERE p.${field} = ?`,
    [value]
  ) as any[];
  return rows.length > 0 ? rows[0] : null;
}

async function getAllWithPaketName() {
  const [rows] = await pool.execute(
    `SELECT p.*, pk.pkt_name AS store_paket_name,
            CAST(pk.pkt_price AS UNSIGNED) AS pkt_price,
            CAST(IF(p.store_status = 'TRIAL', pk_lite.pkt_price, pk.pkt_price) AS UNSIGNED) AS topup_price
     FROM pelanggan p
     LEFT JOIN paket pk ON pk.pkt_id = p.store_paket
     LEFT JOIN paket pk_lite ON pk_lite.pkt_id = 1`
  ) as any[];
  return rows;
}

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
      const result = await getWithPaketName('store_folder', folder);
      return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
    } else if (jid) {
      const result = await getWithPaketName('store_whatsapp_jid', jid);
      return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
    } else {
      const rows = await getAllWithPaketName();
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
