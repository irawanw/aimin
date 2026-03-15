import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import { pushBotConfig } from '@/lib/pelanggan-auth';
import crypto from 'crypto';

// Sandbox-only: simulate a Midtrans settlement webhook for a pending transaction.
// Calls our own webhook endpoint with a correctly-signed payload.
export async function POST(req: Request) {
  if (process.env.MIDTRANS_IS_PRODUCTION === 'true') {
    return NextResponse.json({ error: 'Only available in sandbox mode' }, { status: 403 });
  }

  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { txn_id } = await req.json();
  if (!txn_id) return NextResponse.json({ error: 'txn_id required' }, { status: 400 });

  // Load transaction
  const [rows] = await pool.execute(
    'SELECT * FROM store_transactions WHERE txn_id = ? LIMIT 1',
    [txn_id]
  );
  const txn = (rows as any[])[0];
  if (!txn) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  if (txn.txn_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const grossAmount = Number(txn.txn_amount).toFixed(2);
  const statusCode = '200';

  // Build signature exactly as Midtrans does
  const signature = crypto
    .createHash('sha512')
    .update(txn_id + statusCode + grossAmount + serverKey)
    .digest('hex');

  // Call our own webhook endpoint (same as Midtrans would)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aiminassist.com';
  const webhookPayload = {
    order_id: txn_id,
    transaction_id: `sim-${Date.now()}`,
    transaction_status: 'settlement',
    fraud_status: 'accept',
    payment_type: 'qris',
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signature,
  };

  const webhookRes = await fetch(`${baseUrl}/api/v1/midtrans/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const webhookData = await webhookRes.json();

  if (!webhookRes.ok) {
    return NextResponse.json({ error: webhookData.error || 'Webhook failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: `Transaction ${txn_id} settled successfully` });
}
