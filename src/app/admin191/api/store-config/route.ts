import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute('SELECT * FROM store_config ORDER BY store_id ASC');
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const fields = ['store_whatsapp_jid', 'store_name', 'store_admin', 'store_tagline', 'store_feature', 'store_knowledge_base'];
    const cols: string[] = [];
    const vals: any[] = [];
    const placeholders: string[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        cols.push(f);
        vals.push(body[f]);
        placeholders.push('?');
      }
    }
    if (cols.length === 0) return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    await pool.execute(`INSERT INTO store_config (${cols.join(',')}) VALUES (${placeholders.join(',')})`, vals);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
