import { NextResponse } from 'next/server';
import { getAdminFromCookies } from '@/lib/admin191-auth';
import { fork } from 'child_process';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const LLM_DIR = process.env.LLM_DIR || '/data/www/llm';

// In-memory session store (single PM2 instance)
interface PairSession {
  status: 'scanning' | 'success' | 'failed';
  qrImage: string | null;
  message?: string;
}
const sessions = new Map<string, PairSession>();

/** POST — initiate manager bot re-pairing for a given JID */
export async function POST(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let jid: string;
  try {
    const body = await req.json();
    jid = (body.jid || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!jid) return NextResponse.json({ error: 'jid required' }, { status: 400 });

  // Extract phone from JID (e.g. 6289527466937@s.whatsapp.net → 6289527466937)
  const phone = jid.includes('@') ? jid.split('@')[0] : jid;

  // Wipe stale manager auth session
  const authPath = path.join(LLM_DIR, 'auth_sessions', phone);
  if (fs.existsSync(authPath)) {
    try { fs.rmSync(authPath, { recursive: true, force: true }); } catch {}
  }

  // Use phone as sessionId (unique per JID)
  sessions.set(phone, { status: 'scanning', qrImage: null });

  // Fork manager_register.js from llm dir
  const child = fork(
    path.join(LLM_DIR, 'manager_register.js'),
    [phone],
    { cwd: LLM_DIR, silent: true }
  );

  let firstQr: string | null = null;

  // Wait up to 20s for the first QR before returning
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 20000);

    child.on('message', async (msg: any) => {
      if (msg.type === 'qr') {
        try {
          const png = await QRCode.toDataURL(msg.data, { width: 256, margin: 1 });
          sessions.set(phone, { status: 'scanning', qrImage: png });
          if (!firstQr) {
            firstQr = png;
            clearTimeout(timer);
            resolve();
          }
        } catch {}
      } else if (msg.type === 'success') {
        sessions.set(phone, { status: 'success', qrImage: null, message: 'Manager bot terhubung!' });
        // Restart aimin-mgr so the new session is loaded
        const { spawn } = await import('child_process');
        spawn('bash', ['-c', 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && pm2 restart aimin-mgr'], {
          detached: true, stdio: 'ignore',
        }).unref();
        clearTimeout(timer);
        resolve();
      } else if (msg.type === 'error') {
        sessions.set(phone, { status: 'failed', qrImage: null, message: msg.message });
        clearTimeout(timer);
        resolve();
      }
    });

    child.on('exit', () => {
      const s = sessions.get(phone);
      if (s?.status === 'scanning') {
        sessions.set(phone, { status: 'failed', qrImage: null, message: 'Proses berakhir sebelum scan' });
      }
      clearTimeout(timer);
      resolve();
    });
  });

  // Keep child running in background for QR refresh
  child.unref();

  const session = sessions.get(phone);
  if (!session?.qrImage && session?.status === 'scanning') {
    return NextResponse.json({ error: 'Timeout waiting for QR' }, { status: 504 });
  }

  return NextResponse.json({
    ok: true,
    isQR: true,
    isPairing: true,
    qrImage: session?.qrImage,
    pairingPhone: phone,
    status: session?.status,
  });
}

/** GET — poll current QR / status for a pairing session */
export async function GET(req: Request) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone') || '';

  const session = sessions.get(phone);
  if (!session) return NextResponse.json({ status: 'not_found' }, { status: 404 });

  return NextResponse.json({
    qrImage:  session.qrImage,
    status:   session.status,
    message:  session.message,
  });
}
