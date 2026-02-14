'use client';

import { useState, useRef, useEffect, Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';
import type { ChatMessage } from '@/types';

const STORAGE_KEY = 'chat-widget-session';
const STORAGE_TIMESTAMP_KEY = 'chat-widget-timestamp';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function formatMessage(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*.*?\*\*)/).map((seg, j) =>
        seg.startsWith('**') && seg.endsWith('**')
          ? <strong key={j}>{seg.slice(2, -2)}</strong>
          : seg
      )}
    </Fragment>
  ));
}

export default function ChatWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t.chat.welcome },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const followupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');
  const isLoadedRef = useRef(false);

  // Load or create session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (storedSessionId && storedTimestamp) {
      const now = Date.now();
      const age = now - parseInt(storedTimestamp);

      if (age > SESSION_EXPIRY_MS) {
        // Session expired, create new one
        const newSessionId = crypto.randomUUID();
        sessionIdRef.current = newSessionId;
        localStorage.setItem(STORAGE_KEY, newSessionId);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, now.toString());
        // Reset messages
        setMessages([{ role: 'assistant', content: t.chat.welcome }]);
      } else {
        // Use existing session
        sessionIdRef.current = storedSessionId;
        // Load from localStorage first (immediate)
        const storedMessages = localStorage.getItem('chat-messages');
        if (storedMessages) {
          try {
            const parsed = JSON.parse(storedMessages);
            setMessages(parsed);
            isLoadedRef.current = true;
          } catch {
            setMessages([{ role: 'assistant', content: t.chat.welcome }]);
          }
        }
        // Then load from server (will sync if more recent)
        loadSessionFromServer(storedSessionId);
      }
    } else {
      // Create new session
      const newSessionId = crypto.randomUUID();
      sessionIdRef.current = newSessionId;
      localStorage.setItem(STORAGE_KEY, newSessionId);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    }
  }, [t.chat.welcome]);

  // Load session from server
  const loadSessionFromServer = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          // Only update if server has more messages than current (e.g., from another tab)
          const current = messages.length;
          // For new sessions, server will return empty - keep current messages
          if (current === 1 && messages[0].role === 'assistant') {
            // Only welcome message exists, override with server messages
            setMessages(data.messages);
          } else if (data.messages.length > current) {
            // Server has more messages, update
            setMessages(data.messages);
          }
        }
        isLoadedRef.current = true;
      }
    } catch (err) {
      console.error('Error loading session:', err);
    }
  };

  // Save session to localStorage
  const saveSessionToLocal = (msgs: ChatMessage[]) => {
    localStorage.setItem('chat-messages', JSON.stringify(msgs));
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  };

  // Sync session to server
  const syncSessionToServer = async (msgs: ChatMessage[]) => {
    if (!sessionIdRef.current) return;

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          messages: msgs,
        }),
      });
    } catch (err) {
      console.error('Error syncing session:', err);
    }
  };

  // Save messages on change (debounced)
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const timer = setTimeout(() => {
      saveSessionToLocal(messages);
      syncSessionToServer(messages);
    }, 500);

    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (followupTimerRef.current) {
        clearTimeout(followupTimerRef.current);
      }
    };
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;
    if (followupTimerRef.current) {
      clearTimeout(followupTimerRef.current);
      followupTimerRef.current = null;
    }
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.replyText || data.reply || 'No response' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-2xl shadow-brand-600/30 flex items-center justify-center transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">AI</div>
              <div>
                <div className="font-semibold text-sm">{t.chat.title}</div>
                <div className="text-xs text-white/70">Online</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => {
                  if (followupTimerRef.current) {
                    clearTimeout(followupTimerRef.current);
                    followupTimerRef.current = null;
                  }
                  setInput(e.target.value);
                }}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={t.chat.placeholder}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
