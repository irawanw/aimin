import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN || '';

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Headers': 'Content-Type' } }));
}

// POST — extension posts scraped result
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.token) {
    return cors(NextResponse.json({ error: 'Missing id or token' }, { status: 400 }));
  }

  if (!SCRAPER_TOKEN || body.token !== SCRAPER_TOKEN) {
    return cors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  const { id, result, error } = body;

  if (error) {
    await pool.execute(
      `UPDATE scrape_jobs SET status='error', error_msg=? WHERE id=?`,
      [String(error).slice(0, 500), id]
    );
  } else {
    await pool.execute(
      `UPDATE scrape_jobs SET status='done', result=? WHERE id=?`,
      [JSON.stringify(result), id]
    );
  }

  return cors(NextResponse.json({ ok: true }));
}
