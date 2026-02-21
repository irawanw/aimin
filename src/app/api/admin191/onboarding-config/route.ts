import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me';

function getAdmin191User(): any | null {
  const cookieStore = cookies();
  const token = cookieStore.get('admin191_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function GET() {
  const admin = getAdmin191User();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM onboarding_config ORDER BY step_order ASC'
    );
    return NextResponse.json({ steps: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = getAdmin191User();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { step_key, step_title, step_description, step_placeholder } = body;

    if (!step_key) return NextResponse.json({ error: 'step_key required' }, { status: 400 });

    await pool.execute(
      `UPDATE onboarding_config
       SET step_title = ?, step_description = ?, step_placeholder = ?, updated_at = NOW()
       WHERE step_key = ?`,
      [step_title || '', step_description || '', step_placeholder || '', step_key]
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
