import { NextResponse } from 'next/server';
import pool from '@/lib/db';

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin') || '';
  const { searchParams } = new URL(req.url);
  const store = searchParams.get('store');

  if (!store) {
    return NextResponse.json({ error: 'store param required' }, { status: 400 });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT store_name, store_folder, store_theme_primary, widget_enabled, widget_domains, store_language FROM pelanggan WHERE store_subdomain = ?',
      [store]
    );
    const data = rows as any[];

    if (data.length === 0) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404, headers: origin ? corsHeaders(origin) : {} });
    }

    const row = data[0];

    // If embedded from an external site (Origin header present), enforce widget_enabled + domain whitelist
    if (origin) {
      if (!row.widget_enabled) {
        return NextResponse.json({ error: 'Widget not enabled' }, { status: 403, headers: corsHeaders(origin) });
      }
      let domains: string[] = [];
      try { domains = row.widget_domains ? JSON.parse(row.widget_domains) : []; } catch { domains = []; }
      if (!domains.includes(origin)) {
        return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders(origin) });
      }
    }
    // No Origin = direct page access (e.g. success screen demo) — always allow

    return NextResponse.json(
      {
        enabled: true,
        storeName: row.store_name || store,
        primaryColor: row.store_theme_primary || '#6366f1',
        storeFolder: row.store_folder || '',
        language: row.store_language || 'id',
      },
      { headers: origin ? corsHeaders(origin) : {} }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: origin ? corsHeaders(origin) : {} });
  }
}
