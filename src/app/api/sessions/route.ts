import { NextResponse } from 'next/server';
import type { ChatMessage } from '@/lib/session';

// Run background cleanup occasionally (1 in 20 requests)
async function maybeRunCleanup() {
  const chance = Math.random();
  if (chance < 0.05) { // 5% chance
    const { cleanupExpiredSessions } = await import('@/lib/session');
    cleanupExpiredSessions().catch(err => console.error('Background cleanup error:', err));
  }
}

// Load session
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Run background cleanup occasionally
    maybeRunCleanup().catch(() => {});

    // Dynamically import session functions (avoid import errors)
    const { getSession } = await import('@/lib/session');
    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({ sessionId, messages: [] });
    }

    return NextResponse.json({ sessionId, messages: session.messages });
  } catch (err) {
    console.error('Error loading session:', err);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}

// Save session
export async function POST(req: Request) {
  try {
    const { sessionId, messages } = await req.json();

    if (!sessionId || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'sessionId and messages array required' }, { status: 400 });
    }

    // Dynamically import session functions
    const { saveSession } = await import('@/lib/session');

    const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
    }));

    const now = Date.now();
    const { getSession } = await import('@/lib/session');
    const existingSession = await getSession(sessionId);

    const session = {
      sessionId,
      messages: chatMessages,
      createdAt: existingSession?.createdAt || now,
      lastUpdated: now,
    };

    await saveSession(session);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving session:', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

// Delete session
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Dynamically import session functions
    const { deleteSession } = await import('@/lib/session');
    await deleteSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
