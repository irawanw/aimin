import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

export async function GET(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const txn_id = searchParams.get('txn_id');
  if (!txn_id) return NextResponse.json({ error: 'txn_id required' }, { status: 400 });

  const res = await fetch(`${MIDTRANS_BASE_URL}/v2/${encodeURIComponent(txn_id)}/status`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64'),
    },
  });
  const data = await res.json();
  return NextResponse.json({ status: data.transaction_status, data });
}
