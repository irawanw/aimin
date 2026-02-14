'use client';

import { useState, useRef, useEffect, Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

export default function ChatInterface() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t.chat.welcome },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const followupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>('');
  const isLoadedRef = useRef(false);
  const hasAutoSentRef = useRef(false);

  // Load session from server
  const loadSessionFromServer = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const current = messages.length;
          if (current === 1 && messages[0].role === 'assistant') {
            setMessages(data.messages);
          } else if (data.messages.length > current) {
            setMessages(data.messages);
          }
        }
      }
    } catch (err) {
      console.error('Error loading session:', err);
    }
  };

  // Auto-send message from CTA
  useEffect(() => {
    const ctaMsg = searchParams.get('msg');
    if (ctaMsg && !hasAutoSentRef.current && !loading && isLoadedRef.current) {
      hasAutoSentRef.current = true;
      setTimeout(() => {
        const userMsg: ChatMessage = { role: 'user', content: ctaMsg };
        setMessages((prev) => [...prev, userMsg]);
        setLoading(true);
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: ctaMsg, sessionId: sessionIdRef.current }),
        })
          .then(res => res.json())
          .then(data => {
            setMessages((prev) => [...prev, { role: 'assistant', content: data.replyText || data.reply || 'No response' }]);
          })
          .finally(() => setLoading(false));
      }, 500);
    }
  }, [searchParams, loading, isLoadedRef.current]);

  // Load or create session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem(STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (storedSessionId && storedTimestamp) {
      const now = Date.now();
      const age = now - parseInt(storedTimestamp);

      if (age > SESSION_EXPIRY_MS) {
        const newSessionId = crypto.randomUUID();
        sessionIdRef.current = newSessionId;
        localStorage.setItem(STORAGE_KEY, newSessionId);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, now.toString());
        setMessages([{ role: 'assistant', content: t.chat.welcome }]);
        isLoadedRef.current = true;
      } else {
        sessionIdRef.current = storedSessionId;
        const storedMessages = localStorage.getItem('chat-messages');
        if (storedMessages) {
          try {
            const parsed = JSON.parse(storedMessages);
            setMessages(parsed);
            isLoadedRef.current = true;
          } catch {
            setMessages([{ role: 'assistant', content: t.chat.welcome }]);
            isLoadedRef.current = true;
          }
        }
        const loadAndSetReady = async () => {
          await loadSessionFromServer(storedSessionId);
          isLoadedRef.current = true;
        };
        loadAndSetReady();
      }
    } else {
      const newSessionId = crypto.randomUUID();
      sessionIdRef.current = newSessionId;
      localStorage.setItem(STORAGE_KEY, newSessionId);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
      isLoadedRef.current = true;
    }
  }, [t.chat.welcome]);

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
    <main className="h-screen flex flex-col bg-gradient-to-br from-mint-50 to-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-mint-600 to-mint-500 text-white px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-base font-bold">AI</div>
          <div>
            <div className="font-semibold">{t.chat.title}</div>
            <div className="text-xs text-white/70">Online • Powered by Aimin Assistant</div>
          </div>
        </Link>
        {messages.length > 1 && (
          <button
            onClick={() => {
              localStorage.removeItem('chat-messages');
              setMessages([{ role: 'assistant', content: t.chat.welcome }]);
            }}
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Clear Chat
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-[70%] px-3 sm:px-5 py-2 sm:py-3 rounded-3xl text-xs sm:text-base sm:text-lg leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-mint-600 text-white rounded-br-md' : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'}`}>
                {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-3 sm:px-5 py-2 sm:py-4 rounded-3xl rounded-bl-md shadow-sm border border-gray-100">
                <div className="flex gap-1 sm:gap-1.5">
                  <span className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 sm:w-2.5 h-1.5 sm:h-2.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 sm:p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <input
              value={input}
              onChange={(e) => {
                if (followupTimerRef.current) {
                  clearTimeout(followupTimerRef.current);
                  followupTimerRef.current = null;
                }
                setInput(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={t.chat.placeholder}
              className="flex-1 px-3 sm:px-5 py-2 sm:py-4 text-xs sm:text-base border border-gray-200 rounded-2xl focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 transition-all"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-mint-600 hover:bg-mint-700 disabled:opacity-50 disabled:hover:bg-mint-600 text-white px-4 sm:px-6 py-2 sm:py-4 rounded-2xl transition-colors font-medium text-[10px] sm:text-sm"
            >
              Send
            </button>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </main>
  );
}
