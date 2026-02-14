import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute('SELECT * FROM paket ORDER BY pkt_id ASC');
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
    const fields = [
      'pkt_name', 'pkt_description', 'pkt_price', 'pkt_discount', 'pkt_length',
      'pkt_pict_num', 'pkt_kb_length', 'pkt_prompt', 'pkt_token_length', 'pkt_temp', 'pkt_active',
    ];
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
    const [result] = await pool.execute(`INSERT INTO paket (${cols.join(',')}) VALUES (${placeholders.join(',')})`, vals);
    return NextResponse.json({ ok: true, id: (result as any).insertId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
