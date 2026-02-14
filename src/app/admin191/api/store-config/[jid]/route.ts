import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { jid: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute('SELECT * FROM store_config WHERE store_whatsapp_jid = ?', [params.jid]);
    const data = rows as any[];
    if (data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { jid: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const fields = ['store_name', 'store_admin', 'store_tagline', 'store_feature', 'store_knowledge_base'];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(body[f]);
      }
    }
    if (sets.length === 0) return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    vals.push(params.jid);
    await pool.execute(`UPDATE store_config SET ${sets.join(',')} WHERE store_whatsapp_jid = ?`, vals);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { jid: string } }) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await pool.execute('DELETE FROM store_config WHERE store_whatsapp_jid = ?', [params.jid]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
