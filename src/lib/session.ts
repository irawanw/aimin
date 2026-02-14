import { promises as fs } from 'fs';
import path from 'path';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
};

export type ChatSession = {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: number;
  lastUpdated: number;
};

const SESSIONS_FILE = path.join(process.cwd(), 'chat-sessions.json');
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Load sessions from file
async function loadSessionsFile(): Promise<{ sessions: Record<string, ChatSession> }> {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // If file doesn't exist or is invalid, return empty object
    return { sessions: {} };
  }
}

// Save sessions to file
async function saveSessionsFile(sessions: Record<string, ChatSession>): Promise<void> {
  const data = JSON.stringify({ sessions }, null, 2);
  await fs.writeFile(SESSIONS_FILE, data, 'utf-8');
}

// Clean up expired sessions (older than 24 hours)
export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();
  const { sessions } = await loadSessionsFile();
  const beforeCount = Object.keys(sessions).length;

  // Run cleanup in background, don't block if file doesn't exist yet
  if (beforeCount === 0) return 0;

  // Remove sessions older than 24 hours
  const updatedSessions: Record<string, ChatSession> = {};
  for (const [sessionId, session] of Object.entries(sessions)) {
    const age = now - session.lastUpdated;
    if (age < SESSION_EXPIRY_MS) {
      updatedSessions[sessionId] = session;
    }
  }

  const afterCount = Object.keys(updatedSessions).length;
  const deleted = beforeCount - afterCount;

  if (deleted > 0) {
    await saveSessionsFile(updatedSessions);
    console.log(`Cleaned up ${deleted} expired session(s)`);
  }

  return deleted;
}

// Get a session by ID
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const { sessions } = await loadSessionsFile();
  const session = sessions[sessionId];

  if (!session) {
    return null;
  }

  // Check if session is expired
  const now = Date.now();
  if (now - session.lastUpdated > SESSION_EXPIRY_MS) {
    // Session expired, delete it
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

// Save or update a session
export async function saveSession(session: ChatSession): Promise<void> {
  const { sessions } = await loadSessionsFile();

  sessions[session.sessionId] = {
    ...session,
    lastUpdated: Date.now(),
  };

  await saveSessionsFile(sessions);
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  const { sessions } = await loadSessionsFile();
  delete sessions[sessionId];
  await saveSessionsFile(sessions);
}
