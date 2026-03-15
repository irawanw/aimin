import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';
const MIDTRANS_SNAP_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

function auth() {
  return 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
}

export async function POST(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, payment_method, label } = await req.json();
  const gross = Math.max(1000, Math.round(Number(amount)));
  if (!gross) return NextResponse.json({ error: 'amount required' }, { status: 400 });

  const txn_id = `TEST-${Date.now()}`;
  let qr_string: string | null = null;
  let qr_code_url: string | null = null;
  let snap_token: string | null = null;

  if (payment_method === 'qris') {
    const res = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth() },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: { order_id: txn_id, gross_amount: gross },
      }),
    });
    const data = await res.json();
    if (!res.ok || !['200','201','202'].includes(String(data.status_code))) {
      return NextResponse.json({ error: data.status_message || 'QRIS error' }, { status: 400 });
    }
    qr_string = data.qr_string || null;
    const qrAction = Array.isArray(data.actions)
      ? data.actions.find((a: any) => a.name === 'generate-qr-code')
      : null;
    qr_code_url = qrAction?.url || null;
  } else {
    const res = await fetch(`${MIDTRANS_SNAP_URL}/snap/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth() },
      body: JSON.stringify({
        transaction_details: { order_id: txn_id, gross_amount: gross },
        credit_card: { secure: true },
        customer_details: { first_name: label || 'Test Payment' },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      return NextResponse.json({ error: data.error_messages?.[0] || 'Snap error' }, { status: 400 });
    }
    snap_token = data.token;
  }

  return NextResponse.json({ txn_id, amount: gross, qr_string, qr_code_url, snap_token });
}
