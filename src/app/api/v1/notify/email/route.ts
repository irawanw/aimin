import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import pool from '@/lib/db';

const API_KEY     = process.env.API_KEY || '';
const SG_API_KEY  = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL  = process.env.SENDGRID_FROM || 'admin@aiminassist.com';
const FROM_NAME   = 'AiMin Notification';

/*
  Called by the bot when an order notification should be emailed.

  POST /api/v1/notify/email
  Headers: x-api-key: <API_KEY>
  Body:
  {
    storeFolder: "628xxx",          // identifies the store
    subject?: "Pesanan Baru",       // optional override
    customerName?: "Budi",
    customerPhone?: "08xxx",
    customerEmail?: "budi@email.com",
    customerAddress?: "Jl. Merdeka No. 1, Jakarta",
    items?: [{ name, qty, price }], // order items
    total?: 150000,
    notes?: "...",
    deliveryMethod?: "Booking Tanggal",   // human-readable label from bot
    scheduleInfo?: "Sabtu 15 Feb, 19:00", // combined date/time/venue from bot
    visitorCount?: 4,
    rawMessage?: "..."              // fallback plain text if no structured data
  }
*/
export async function POST(req: Request) {
  // Auth
  const apiKey = req.headers.get('x-api-key') || '';
  if (apiKey !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SG_API_KEY || SG_API_KEY.startsWith('SG.your-')) {
    return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    storeFolder, subject,
    customerName, customerPhone, customerAddress, customerEmail,
    items, total, notes,
    deliveryMethod, scheduleInfo, visitorCount,
    rawMessage,
  } = body;

  if (!storeFolder) {
    return NextResponse.json({ error: 'storeFolder required' }, { status: 400 });
  }

  // Lookup store email
  const [rows] = await pool.execute(
    'SELECT store_name, store_email FROM pelanggan WHERE store_folder = ?',
    [storeFolder]
  );
  const store = (rows as any[])[0];

  if (!store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }
  if (!store.store_email) {
    return NextResponse.json({ ok: false, reason: 'No email configured for this store' });
  }

  // Build email
  sgMail.setApiKey(SG_API_KEY);

  const emailSubject = subject || `Pesanan Baru - ${store.store_name}`;
  const html = buildOrderEmailHtml({ storeName: store.store_name, customerName, customerPhone, customerAddress, customerEmail, items, total, notes, deliveryMethod, scheduleInfo, visitorCount, rawMessage });
  const text = buildOrderEmailText({ customerName, customerPhone, customerAddress, customerEmail, items, total, notes, deliveryMethod, scheduleInfo, visitorCount, rawMessage });

  try {
    await sgMail.send({
      to:      store.store_email,
      from:    { email: FROM_EMAIL, name: FROM_NAME },
      subject: emailSubject,
      html,
      text,
    });
    return NextResponse.json({ ok: true, sentTo: store.store_email });
  } catch (err: any) {
    const detail = err?.response?.body?.errors?.[0]?.message || err?.message || 'Unknown error';
    console.error('[email-notify] SendGrid error:', detail);
    return NextResponse.json({ error: 'Failed to send email', detail }, { status: 502 });
  }
}

// ── HTML email template ────────────────────────────────────────
function buildOrderEmailHtml(data: {
  storeName: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  items?: { name: string; qty?: number; price?: number }[];
  total?: number;
  notes?: string;
  deliveryMethod?: string;
  scheduleInfo?: string;
  visitorCount?: string | number;
  rawMessage?: string;
}): string {
  const { storeName, customerName, customerPhone, customerAddress, customerEmail, items, total, notes, deliveryMethod, scheduleInfo, visitorCount, rawMessage } = data;
  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const itemsHtml = items?.length
    ? `<table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:12px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:left;font-size:12px;color:#6b7280;font-weight:600;padding:8px 10px;border-radius:4px 0 0 4px;">Produk</th>
            <th style="text-align:center;font-size:12px;color:#6b7280;font-weight:600;padding:8px 6px;">Qty</th>
            <th style="text-align:right;font-size:12px;color:#6b7280;font-weight:600;padding:8px 10px;border-radius:0 4px 4px 0;">Harga</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 10px;font-size:14px;color:#111827;">${item.name}</td>
            <td style="padding:8px 6px;text-align:center;font-size:14px;color:#374151;">${item.qty ?? 1}</td>
            <td style="padding:8px 10px;text-align:right;font-size:14px;color:#374151;">${item.price ? fmt(item.price) : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '';

  const totalHtml = total
    ? `<div style="text-align:right;margin-top:8px;font-size:16px;font-weight:700;color:#111827;">Total: ${fmt(total)}</div>`
    : '';

  const rawHtml = !items?.length && rawMessage
    ? `<div style="background:#f9fafb;border-left:3px solid #10b981;padding:12px 16px;border-radius:0 8px 8px 0;margin:12px 0;font-size:14px;color:#374151;white-space:pre-wrap;">${rawMessage}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:24px 32px;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:4px;">Notifikasi Pesanan</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;">${storeName}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <div style="display:inline-block;background:#ecfdf5;color:#059669;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:20px;">
              🛒 Pesanan Baru Masuk
            </div>

            <!-- Customer info -->
            ${customerName || customerPhone ? `
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:10px;">Informasi Pelanggan</div>
              ${customerName    ? `<div style="font-size:14px;color:#111827;margin-bottom:4px;"><span style="color:#6b7280;">Nama:</span> <strong>${customerName}</strong></div>` : ''}
              ${customerPhone   ? `<div style="font-size:14px;color:#111827;margin-bottom:4px;"><span style="color:#6b7280;">Telepon:</span> <strong>${customerPhone}</strong></div>` : ''}
              ${customerEmail   ? `<div style="font-size:14px;color:#111827;margin-bottom:4px;"><span style="color:#6b7280;">Email:</span> <strong>${customerEmail}</strong></div>` : ''}
              ${customerAddress ? `<div style="font-size:14px;color:#111827;margin-bottom:4px;"><span style="color:#6b7280;">Alamat:</span> <strong>${customerAddress}</strong></div>` : ''}
              ${visitorCount    ? `<div style="font-size:14px;color:#111827;margin-bottom:4px;"><span style="color:#6b7280;">Jumlah Tamu:</span> <strong>${visitorCount} orang</strong></div>` : ''}
              ${deliveryMethod  ? `<div style="font-size:14px;color:#111827;margin-top:4px;"><span style="color:#6b7280;">Metode:</span> <strong>${deliveryMethod}</strong></div>` : ''}
            </div>` : ''}

            <!-- Schedule info -->
            ${scheduleInfo ? `
            <div style="background:#eff6ff;border-radius:8px;padding:16px;margin-bottom:16px;border-left:3px solid #3b82f6;">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#3b82f6;margin-bottom:8px;">📅 Jadwal / Reservasi</div>
              <div style="font-size:14px;color:#1e40af;white-space:pre-wrap;">${scheduleInfo}</div>
            </div>` : ''}

            <!-- Items -->
            ${itemsHtml}
            ${totalHtml}
            ${rawHtml}

            <!-- Notes -->
            ${notes ? `
            <div style="margin-top:16px;padding:12px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#d97706;margin-bottom:4px;">Catatan</div>
              <div style="font-size:14px;color:#374151;">${notes}</div>
            </div>` : ''}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f3f4f6;">
            <div style="font-size:12px;color:#9ca3af;text-align:center;">
              Dikirim oleh <strong>AiMin</strong> · <a href="https://aiminassist.com" style="color:#10b981;text-decoration:none;">aiminassist.com</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Plain text fallback ────────────────────────────────────────
function buildOrderEmailText(data: {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerEmail?: string;
  items?: { name: string; qty?: number; price?: number }[];
  total?: number;
  notes?: string;
  deliveryMethod?: string;
  scheduleInfo?: string;
  visitorCount?: string | number;
  rawMessage?: string;
}): string {
  const { customerName, customerPhone, customerAddress, customerEmail, items, total, notes, deliveryMethod, scheduleInfo, visitorCount, rawMessage } = data;
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const lines: string[] = ['=== PESANAN BARU ===', ''];
  if (customerName)    lines.push(`Nama         : ${customerName}`);
  if (customerPhone)   lines.push(`Telepon      : ${customerPhone}`);
  if (customerEmail)   lines.push(`Email        : ${customerEmail}`);
  if (customerAddress) lines.push(`Alamat       : ${customerAddress}`);
  if (visitorCount)    lines.push(`Jumlah Tamu  : ${visitorCount} orang`);
  if (deliveryMethod)  lines.push(`Metode       : ${deliveryMethod}`);
  if (scheduleInfo)    lines.push(`Jadwal       : ${scheduleInfo}`);
  if (customerName || customerPhone) lines.push('');
  if (items?.length) {
    lines.push('Produk:');
    items.forEach(i => lines.push(`  - ${i.name} x${i.qty ?? 1}${i.price ? ` @ ${fmt(i.price)}` : ''}`));
    lines.push('');
  }
  if (total) lines.push(`Total: ${fmt(total)}`, '');
  if (notes) lines.push(`Catatan: ${notes}`, '');
  if (!items?.length && rawMessage) lines.push(rawMessage, '');
  lines.push('---', 'AiMin · aiminassist.com');
  return lines.join('\n');
}
