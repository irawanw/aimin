const CLIENT_URL = process.env.CLIENT_REVALIDATE_URL || 'http://127.0.0.1:3000/api/revalidate';
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'aimin-revalidate-key';

export async function revalidateClient(opts: { subdomain?: string; storeId?: number }) {
  try {
    await fetch(CLIENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: REVALIDATE_SECRET,
        subdomain: opts.subdomain,
        storeId: opts.storeId,
      }),
    });
  } catch {
    // Non-critical: don't fail the main request if revalidation fails
  }
}
