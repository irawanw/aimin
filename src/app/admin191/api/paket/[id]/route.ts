import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute('SELECT * FROM paket WHERE pkt_id = ?', [params.id]);
    const data = rows as any[];
    if (data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const fields = [
      'pkt_name', 'pkt_description', 'pkt_price', 'pkt_discount', 'pkt_length',
      'pkt_pict_num', 'pkt_kb_length', 'pkt_prompt', 'pkt_token_length', 'pkt_temp', 'pkt_active',
    ];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    vals.push(params.id);
    await pool.execute(`UPDATE paket SET ${sets.join(',')} WHERE pkt_id = ?`, vals);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await pool.execute('DELETE FROM paket WHERE pkt_id = ?', [params.id]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
