import { NextResponse } from 'next/server';

// Cleanup expired sessions (can be called by cron job)
export async function POST(req: Request) {
  try {
    // Dynamically import session functions
    const { cleanupExpiredSessions } = await import('@/lib/session');
    const deleted = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      deleted,
      message: `Cleaned up ${deleted} expired session(s)`,
    });
  } catch (err) {
    console.error('Error cleaning up sessions:', err);
    return NextResponse.json({ error: 'Failed to cleanup sessions' }, { status: 500 });
  }
}
