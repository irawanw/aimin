import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPelangganAuthKey } from '@/lib/pelanggan-auth';

export async function GET() {
  const jid = getPelangganAuthKey();
  if (!jid) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const [storeRows] = await pool.execute(
      `SELECT p.store_id, p.store_paket, p.store_expired_at, p.store_status,
              pk.pkt_name, pk.pkt_price, pk.pkt_discount, pk.pkt_length
       FROM pelanggan p
       LEFT JOIN paket pk ON p.store_paket = pk.pkt_id
       WHERE p.store_whatsapp_jid = ? OR p.store_folder = ?
       LIMIT 1`,
      [jid, jid]
    );
    const store = (storeRows as any[])[0];
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // All active plans
    const [paketRows] = await pool.execute(
      `SELECT pkt_id, pkt_name, pkt_length FROM paket WHERE pkt_active = 1 ORDER BY pkt_id ASC`
    );

    // All prices from paket_pricing — build a map: pkt_id → { IDR: 60000, USD: 9, ... }
    const [pricingRows] = await pool.execute(
      `SELECT pkt_id, currency_code, price FROM paket_pricing`
    );
    const priceMap: Record<number, Record<string, number>> = {};
    for (const row of pricingRows as any[]) {
      if (!priceMap[row.pkt_id]) priceMap[row.pkt_id] = {};
      priceMap[row.pkt_id][row.currency_code] = Number(row.price);
    }

    // Attach prices to each plan; fall back to pkt_price for IDR if no paket_pricing row
    const [allPaket] = await pool.execute(
      `SELECT pkt_id, pkt_price, pkt_discount FROM paket WHERE pkt_active = 1`
    );
    const fallbackMap: Record<number, number> = {};
    for (const row of allPaket as any[]) {
      fallbackMap[row.pkt_id] = Math.round(row.pkt_price * (1 - row.pkt_discount / 100));
    }

    const paketList = (paketRows as any[]).map(p => ({
      pkt_id: p.pkt_id,
      pkt_name: p.pkt_name,
      pkt_length: p.pkt_length,
      prices: priceMap[p.pkt_id] ?? { IDR: fallbackMap[p.pkt_id] ?? 0 },
    }));

    // All currency configs (for the frontend formatter)
    const [currencyRows] = await pool.execute(
      `SELECT code, symbol, locale, name, lang_default FROM currencies ORDER BY code ASC`
    );

    const now = new Date();
    const expiry = store.store_expired_at ? new Date(store.store_expired_at) : null;
    const daysRemaining = expiry
      ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      store_id: store.store_id,
      store_paket: store.store_paket,
      paket_name: store.pkt_name || 'LITE',
      store_expired_at: store.store_expired_at,
      store_status: store.store_status,
      days_remaining: daysRemaining,
      paket_list: paketList,
      currencies: currencyRows,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
