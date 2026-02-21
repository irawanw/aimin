import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';

interface PageProps {
  searchParams: { token?: string };
}

async function processToken(token: string): Promise<
  | { status: 'success'; storeName: string; days: number; newExpiry: string }
  | { status: 'error'; message: string }
> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Load token row — lock it to prevent race conditions
    const [rows] = await conn.execute(
      'SELECT * FROM extend_tokens WHERE token = ? FOR UPDATE',
      [token]
    ) as any[];

    if (rows.length === 0) {
      await conn.rollback();
      return { status: 'error', message: 'Token tidak ditemukan atau sudah tidak valid.' };
    }

    const row = rows[0];

    if (row.used) {
      await conn.rollback();
      return { status: 'error', message: 'Token sudah digunakan sebelumnya.' };
    }

    if (new Date(row.expires_at) < new Date()) {
      await conn.rollback();
      return { status: 'error', message: 'Token sudah kadaluarsa.' };
    }

    // Get pelanggan
    const [pelangganRows] = await conn.execute(
      'SELECT store_id, store_name, store_expired_at, store_status FROM pelanggan WHERE store_whatsapp_jid = ?',
      [row.jid]
    ) as any[];

    if (pelangganRows.length === 0) {
      await conn.rollback();
      return { status: 'error', message: 'Akun pelanggan tidak ditemukan.' };
    }

    const pelanggan = pelangganRows[0];
    const isTrial = pelanggan.store_status === 'TRIAL';

    // Always extend 30 days from today (topup resets from now)
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    // Format for MySQL DATETIME
    const newExpiryStr = newExpiry.toISOString().slice(0, 19).replace('T', ' ');

    // Update expiry + flip TRIAL→AKTIF on first topup
    await conn.execute(
      `UPDATE pelanggan SET store_expired_at = ?${isTrial ? ", store_status = 'AKTIF'" : ''} WHERE store_id = ?`,
      [newExpiryStr, pelanggan.store_id]
    );

    // Invalidate token
    await conn.execute(
      'UPDATE extend_tokens SET used = 1 WHERE token = ?',
      [token]
    );

    await conn.commit();

    // Format new expiry for display
    const displayExpiry = newExpiry.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    return {
      status: 'success',
      storeName: pelanggan.store_name,
      days: 30,
      newExpiry: displayExpiry,
    };

  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export default async function ExtendPage({ searchParams }: PageProps) {
  const token = searchParams.token?.trim();

  if (!token) {
    redirect('/');
  }

  let result: Awaited<ReturnType<typeof processToken>>;
  try {
    result = await processToken(token);
  } catch {
    result = { status: 'error', message: 'Terjadi kesalahan sistem. Silakan hubungi admin.' };
  }

  const isSuccess = result.status === 'success';

  return (
    <main className="min-h-screen bg-[#070b14] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-1 ring-[#2EE6C9]/30">
            <Image src="/logo.jpg" alt="Aimin" fill className="object-cover" sizes="36px" />
          </div>
          <span className="font-bold text-[#FFD84D] tracking-tight">Aimin Assistant</span>
        </div>

        {isSuccess ? (
          <div
            className="rounded-2xl p-8"
            style={{ background: '#0a0d15', border: '1px solid rgba(46,230,201,0.15)' }}
          >
            {/* Success icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(46,230,201,0.1)', border: '1px solid rgba(46,230,201,0.3)' }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#2EE6C9" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Paket berhasil diperpanjang {(result as any).days} hari!
            </h1>

            <p className="text-white/50 text-sm mb-6">
              Toko <span className="text-white font-semibold">{(result as any).storeName}</span> aktif hingga
            </p>

            <div
              className="inline-block px-5 py-2.5 rounded-xl mb-8"
              style={{ background: 'rgba(46,230,201,0.08)', border: '1px solid rgba(46,230,201,0.2)' }}
            >
              <span className="text-[#2EE6C9] font-semibold">{(result as any).newExpiry}</span>
            </div>

            <div className="pt-6 border-t border-white/[0.06]">
              <Link
                href="/"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Kembali ke beranda →
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-8"
            style={{ background: '#0a0d15', border: '1px solid rgba(255,80,80,0.15)' }}
          >
            {/* Error icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)' }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#ff5050" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-white mb-3">Link Tidak Valid</h1>
            <p className="text-white/50 text-sm mb-8">{(result as any).message}</p>

            <div className="pt-6 border-t border-white/[0.06]">
              <Link
                href="/"
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                Kembali ke beranda →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
