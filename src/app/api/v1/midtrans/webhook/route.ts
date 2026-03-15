import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getStoreByKey, pushBotConfig } from '@/lib/pelanggan-auth';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string
): (sig: string) => boolean {
  const expected = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
    .digest('hex');
  return (sig: string) => sig === expected;
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body on test ping */ }

    const {
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      payment_type,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    // Verify signature — return 400 only on mismatch (not missing fields)
    if (order_id && status_code && gross_amount && signature_key) {
      const isValid = verifySignature(order_id, status_code, gross_amount)(signature_key);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Load transaction — return 200 if not found (e.g. Midtrans test notification)
    const [txnRows] = await pool.execute(
      'SELECT * FROM store_transactions WHERE txn_id = ? LIMIT 1',
      [order_id || '']
    );
    const txn = (txnRows as any[])[0];
    if (!txn) return NextResponse.json({ ok: true });

    const isPaid =
      transaction_status === 'settlement' ||
      (transaction_status === 'capture' && fraud_status === 'accept');

    if (isPaid) {
      // Mark transaction as paid
      await pool.execute(
        `UPDATE store_transactions
         SET txn_status = 'paid', txn_paid_at = NOW(), txn_payment_type = ?, txn_midtrans_id = ?
         WHERE txn_id = ?`,
        [payment_type || null, transaction_id || null, order_id]
      );

      // Load store
      const [storeRows] = await pool.execute(
        'SELECT * FROM pelanggan WHERE store_id = ? LIMIT 1',
        [txn.txn_store_id]
      );
      const store = (storeRows as any[])[0];
      if (!store) return NextResponse.json({ ok: true });

      // Calculate new expiry
      const now = new Date();
      let newExpiry: Date;
      const currentExpiry = store.store_expired_at ? new Date(store.store_expired_at) : null;
      if (currentExpiry && currentExpiry > now && store.store_status === 'AKTIF') {
        // Still active — extend from current expiry
        newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // Expired or inactive — start fresh from now
        newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      const newExpiryStr = newExpiry.toISOString().slice(0, 19).replace('T', ' ');

      // Update pelanggan
      await pool.execute(
        `UPDATE pelanggan
         SET store_paket = ?, store_expired_at = ?, store_status = 'AKTIF'
         WHERE store_id = ?`,
        [txn.txn_paket_id, newExpiryStr, txn.txn_store_id]
      );

      // Push updated config to bot (fire-and-forget)
      const updatedStore = {
        ...store,
        store_paket: txn.txn_paket_id,
        store_expired_at: newExpiryStr,
        store_status: 'AKTIF',
      };
      pushBotConfig(updatedStore);
    } else if (transaction_status === 'expire' || transaction_status === 'cancel') {
      await pool.execute(
        `UPDATE store_transactions SET txn_status = ? WHERE txn_id = ?`,
        [transaction_status === 'expire' ? 'expired' : 'failed', order_id]
      );
    } else if (transaction_status === 'deny' || transaction_status === 'failure') {
      await pool.execute(
        `UPDATE store_transactions SET txn_status = 'failed' WHERE txn_id = ?`,
        [order_id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
