import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import pool from '@/lib/db';

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute('SELECT * FROM pelanggan ORDER BY store_updated_at DESC');
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
      'store_whatsapp_jid', 'store_name', 'store_admin', 'store_address',
      'store_tagline', 'store_feature', 'store_knowledge_base', 'store_status',
      'store_type', 'store_folder', 'store_paket', 'store_expired_at',
      'store_admin_number', 'store_bot_always_on', 'store_special_prompts',
    ];
    const cols: string[] = [];
    const vals: any[] = [];
    const placeholders: string[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        cols.push(f);
        let val = body[f];
        if (f === 'store_expired_at' && val) {
          val = new Date(val).toISOString().slice(0, 19).replace('T', ' ');
        }
        vals.push(val);
        placeholders.push('?');
      }
    }
    if (cols.length === 0) return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
    await pool.execute(`INSERT INTO pelanggan (${cols.join(',')}) VALUES (${placeholders.join(',')})`, vals);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
