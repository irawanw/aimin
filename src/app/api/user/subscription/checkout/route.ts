import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPelangganAuthKey } from '@/lib/pelanggan-auth';
import crypto from 'crypto';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const MIDTRANS_BASE_URL = IS_PRODUCTION
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';
const MIDTRANS_SNAP_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

function midtransAuth() {
  return 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');
}

export async function POST(req: Request) {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { paket_id, payment_method } = body as { paket_id: number; payment_method: 'qris' | 'snap' };

  if (!paket_id || !payment_method) {
    return NextResponse.json({ error: 'paket_id and payment_method required' }, { status: 400 });
  }

  try {
    // Load current store — use paket_pricing IDR price for pro-rata credit calc
    const [storeRows] = await pool.execute(
      `SELECT p.store_id, p.store_folder, p.store_name, p.store_paket, p.store_expired_at, p.store_status,
              COALESCE(pp.price, ROUND(pk.pkt_price * (1 - pk.pkt_discount/100))) AS cur_idr_price,
              pk.pkt_length AS cur_length
       FROM pelanggan p
       LEFT JOIN paket pk ON p.store_paket = pk.pkt_id
       LEFT JOIN paket_pricing pp ON pp.pkt_id = pk.pkt_id AND pp.currency_code = 'IDR'
       WHERE p.store_whatsapp_jid = ? OR p.store_folder = ?
       LIMIT 1`,
      [jid, jid]
    );
    const store = (storeRows as any[])[0];
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Load target paket — prefer paket_pricing IDR price, fall back to pkt_price * discount
    const [targetRows] = await pool.execute(
      `SELECT p.pkt_id, p.pkt_name, p.pkt_length,
              COALESCE(pp.price, ROUND(p.pkt_price * (1 - p.pkt_discount/100))) AS idr_price
       FROM paket p
       LEFT JOIN paket_pricing pp ON pp.pkt_id = p.pkt_id AND pp.currency_code = 'IDR'
       WHERE p.pkt_id = ? LIMIT 1`,
      [paket_id]
    );
    const target = (targetRows as any[])[0];
    if (!target) return NextResponse.json({ error: 'Paket not found' }, { status: 404 });

    const targetDiscounted = Math.round(Number(target.idr_price));

    // Determine txn_type
    const now = new Date();
    const expiry = store.store_expired_at ? new Date(store.store_expired_at) : null;
    const isExpired = !expiry || expiry <= now;
    const currentPaket = store.store_paket || 0;

    let txn_type: 'new' | 'extend' | 'upgrade';
    if (isExpired || !currentPaket) {
      txn_type = 'new';
    } else if (paket_id > currentPaket) {
      txn_type = 'upgrade';
    } else {
      txn_type = 'extend';
    }

    // Calculate amount (all in IDR)
    let finalAmount = targetDiscounted;
    if (txn_type === 'upgrade' && store.cur_idr_price && store.cur_length) {
      const daysRemaining = Math.max(
        0,
        Math.ceil((expiry!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      const dailyRateCurrent = Number(store.cur_idr_price) / store.cur_length;
      const credit = Math.round(daysRemaining * dailyRateCurrent);
      finalAmount = Math.max(1000, targetDiscounted - credit);
    }

    // Generate order ID
    const ts = Date.now();
    const txn_id = `TXN-${store.store_folder}-${ts}`;

    let qr_string: string | null = null;
    let qr_code_url: string | null = null;
    let snap_token: string | null = null;

    if (payment_method === 'qris') {
      // Try Core API QRIS without acquirer first (more compatible with sandbox)
      const chargeBody = {
        payment_type: 'qris',
        transaction_details: {
          order_id: txn_id,
          gross_amount: finalAmount,
        },
      };
      const res = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: midtransAuth(),
        },
        body: JSON.stringify(chargeBody),
      });
      const data = await res.json();

      if (!res.ok || (data.status_code && !['200', '201', '202'].includes(String(data.status_code)))) {
        // QRIS Core API not enabled for this merchant (e.g. error 116) — fall back to Snap
        const snapBody = {
          transaction_details: { order_id: txn_id, gross_amount: finalAmount },
          enabled_payments: ['qris'],
          credit_card: { secure: true },
          customer_details: { first_name: store.store_name || store.store_folder },
        };
        const snapRes = await fetch(`${MIDTRANS_SNAP_URL}/snap/v1/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: midtransAuth() },
          body: JSON.stringify(snapBody),
        });
        const snapData = await snapRes.json();
        if (!snapRes.ok || !snapData.token) {
          return NextResponse.json(
            { error: snapData.error_messages?.[0] || data.status_message || 'Gagal membuat transaksi QRIS' },
            { status: 400 }
          );
        }
        // Return as snap_token so the UI opens Snap popup (which shows QRIS)
        snap_token = snapData.token;
      } else {
        qr_string = data.qr_string || null;
        // QR image URL from actions — needed for Midtrans sandbox simulator
        const qrAction = Array.isArray(data.actions)
          ? data.actions.find((a: any) => a.name === 'generate-qr-code')
          : null;
        qr_code_url = qrAction?.url || null;
      }
    } else {
      // Snap API
      const snapBody = {
        transaction_details: {
          order_id: txn_id,
          gross_amount: finalAmount,
        },
        credit_card: { secure: true },
        customer_details: {
          first_name: store.store_name || store.store_folder,
        },
      };
      const res = await fetch(`${MIDTRANS_SNAP_URL}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: midtransAuth(),
        },
        body: JSON.stringify(snapBody),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        return NextResponse.json(
          { error: data.error_messages?.[0] || 'Midtrans Snap error' },
          { status: 400 }
        );
      }
      snap_token = data.token;
    }

    // Save transaction
    await pool.execute(
      `INSERT INTO store_transactions
         (txn_id, txn_store_id, txn_paket_id, txn_type, txn_amount, txn_status, txn_snap_token, txn_qr_string)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [txn_id, store.store_id, paket_id, txn_type, finalAmount, snap_token, qr_string]
    );

    return NextResponse.json({
      txn_id,
      amount: finalAmount,
      txn_type,
      qr_string,
      qr_code_url,
      snap_token,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
