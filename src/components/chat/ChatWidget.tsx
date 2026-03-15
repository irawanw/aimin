'use client';

import { useState, useRef, useEffect, Fragment, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n-context';
import type { ChatMessage, ChatFile } from '@/types';

const STORAGE_KEY = 'chat-widget-session';
const STORAGE_TIMESTAMP_KEY = 'chat-widget-timestamp';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function formatSegment(seg: string, key: number): ReactNode {
  // **bold** or *bold*
  if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4)
    return <strong key={key}>{seg.slice(2, -2)}</strong>;
  if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2)
    return <strong key={key}>{seg.slice(1, -1)}</strong>;
  // _italic_
  if (seg.startsWith('_') && seg.endsWith('_') && seg.length > 2)
    return <em key={key}>{seg.slice(1, -1)}</em>;
  // ~strikethrough~
  if (seg.startsWith('~') && seg.endsWith('~') && seg.length > 2)
    return <s key={key}>{seg.slice(1, -1)}</s>;
  // ```monospace```
  if (seg.startsWith('```') && seg.endsWith('```') && seg.length > 6)
    return <code key={key} className="bg-black/10 rounded px-1 font-mono text-[0.85em]">{seg.slice(3, -3)}</code>;
  // `inline code`
  if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2)
    return <code key={key} className="bg-black/10 rounded px-1 font-mono text-[0.85em]">{seg.slice(1, -1)}</code>;
  return seg;
}

function formatMessage(text: string): ReactNode {
  const TOKEN_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[^`]+```|`[^`\n]+`)/g;
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(TOKEN_RE).map((seg, j) => formatSegment(seg, j))}
    </Fragment>
  ));
}

const TRIAL_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes
const TRIAL_POLL_INTERVAL_MS = 3000;

function FileAttachment({ file }: { file: ChatFile }) {
  if (file.type === 'image') {
    return (
      <a href={file.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.filename}
          className="rounded-xl max-w-full max-h-48 object-cover border border-gray-200 hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </a>
    );
  }

  if (file.type === 'video') {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <video src={file.url} controls preload="metadata" className="max-w-full max-h-48 block" />
        <div className="px-3 py-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.277A1 1 0 0121 8.677v6.646a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <span className="text-[11px] text-gray-500 truncate">{file.filename}</span>
        </div>
      </div>
    );
  }

  // document
  const ext = file.filename.split('.').pop()?.toUpperCase() || 'FILE';
  const isPdf = ext === 'PDF';
  const isWord = ['DOCX', 'DOC'].includes(ext);
  // Show human-readable name: strip pure-timestamp filenames (e.g. "1771688370209.docx" → "Dokumen.docx")
  const nameWithoutExt = file.filename.replace(/\.\w+$/, '');
  const isTimestamp = /^\d{10,}$/.test(nameWithoutExt);
  const displayName = isTimestamp ? `Dokumen.${ext.toLowerCase()}` : file.filename;

  return (
    <a
      href={file.url}
      // PDFs open in browser viewer; DOCX/DOC must be downloaded
      {...(!isPdf ? { download: file.filename } : {})}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold ${isPdf ? 'bg-orange-500' : isWord ? 'bg-blue-500' : 'bg-gray-500'}`}>
        {ext.slice(0, 4)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900">{displayName}</p>
        <p className="text-[10px] text-gray-400">{isPdf ? 'Klik untuk buka' : 'Klik untuk unduh'}</p>
      </div>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isPdf
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        }
      </svg>
    </a>
  );
}


export default function ChatWidget() {
  const { t, locale } = useI18n();
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
  const pairingPollRef = useRef<NodeJS.Timeout | null>(null);
  const pairingDeadlineRef = useRef<number>(0);
  const langRef = useRef<string>('id');
  const localeMountedRef = useRef(false);

  // Detect visitor language from IP on mount (only sets initial default)
  useEffect(() => {
    fetch('/api/detect-language')
      .then((r) => r.json())
      .then((data) => {
        // Only apply IP detection if the user hasn't manually switched language
        if (data.lang && !localStorage.getItem('aimin_lang')) {
          langRef.current = data.lang;
        }
      })
      .catch(() => { /* keep default 'id' */ });
  }, []);

  // Sync langRef and reinit chat when user switches language via the navbar
  useEffect(() => {
    if (!localeMountedRef.current) {
      localeMountedRef.current = true;
      langRef.current = locale;
      return;
    }
    // Language was changed manually — update ref and restart chat
    langRef.current = locale;
    const newSessionId = crypto.randomUUID();
    sessionIdRef.current = newSessionId;
    localStorage.setItem(STORAGE_KEY, newSessionId);
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    localStorage.removeItem('chat-messages');
    isLoadedRef.current = true;
    setMessages([{ role: 'assistant', content: t.chat.welcome }]);
    setInput('');
    setLoading(false);
    if (followupTimerRef.current) { clearTimeout(followupTimerRef.current); followupTimerRef.current = null; }
    if (pairingPollRef.current) { clearInterval(pairingPollRef.current); pairingPollRef.current = null; }
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (pairingPollRef.current) {
        clearInterval(pairingPollRef.current);
      }
    };
  }, []);

  const startPairingPoll = (phone: string) => {
    // Clear any existing poll
    if (pairingPollRef.current) {
      clearInterval(pairingPollRef.current);
    }
    pairingDeadlineRef.current = Date.now() + TRIAL_TIMEOUT_MS;

    pairingPollRef.current = setInterval(async () => {
      if (Date.now() > pairingDeadlineRef.current) {
        clearInterval(pairingPollRef.current!);
        pairingPollRef.current = null;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Waktu habis. Silahkan coba lagi dengan mengetik #TRIAL#nomorhp' },
        ]);
        return;
      }

      try {
        const res = await fetch(`/api/trial/status/${encodeURIComponent(phone)}`);
        if (!res.ok) return; // keep polling on transient errors
        const data = await res.json();

        // Refresh QR image in the last QR message if WA rotated it
        if (data.qrImage) {
          setMessages((prev) => {
            const idx = [...prev].reverse().findIndex((m) => m.qrData);
            if (idx === -1) return prev;
            const realIdx = prev.length - 1 - idx;
            const updated = [...prev];
            updated[realIdx] = {
              ...updated[realIdx],
              qrData: { ...updated[realIdx].qrData!, qrImage: data.qrImage },
            };
            return updated;
          });
        }

        if (data.status === 'success' || data.status === 'failed') {
          clearInterval(pairingPollRef.current!);
          pairingPollRef.current = null;
          // Remove qrData from the QR message (hide image) and add status message
          setMessages((prev) => {
            const updated = prev.map((m) => m.qrData ? { ...m, qrData: undefined } : m);
            return [...updated, { role: 'assistant' as const, content: data.message }];
          });
        }
        // 'pending' → keep polling
      } catch {
        // transient error, keep polling
      }
    }, TRIAL_POLL_INTERVAL_MS);
  };

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
        body: JSON.stringify({ message: userMsg.content, sessionId: sessionIdRef.current, lang: langRef.current }),
      });
      const data = await res.json();
      const replyText = data.replyText || data.reply || 'No response';

      // Use files[] (new), fall back to images[] (legacy plain URL strings)
      const files: ChatFile[] = data.files
        ? data.files
        : (data.images as string[] | undefined)?.map((url: string) => ({
            url,
            type: 'image' as const,
            filename: url.split('/').pop() || 'image',
          })) ?? [];

      // QR pairing flow — show QR image in bubble and start polling
      if (data.isQR && data.qrImage && data.pairingPhone) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            qrData: { qrImage: data.qrImage, pairingPhone: data.pairingPhone },
          },
        ]);
        startPairingPoll(data.pairingPhone);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: replyText, files: files.length ? files : undefined },
      ]);
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-mint-600 hover:bg-mint-700 text-white rounded-full shadow-2xl shadow-mint-600/30 flex items-center justify-center transition-colors"
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
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl shadow-gray-500/20 border border-gray-100 flex flex-col overflow-hidden"
            style={{ height: '480px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-mint-600 to-mint-500 text-white px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">AI</div>
              <div>
                <div className="font-semibold text-sm">{t.chat.title}</div>
                <div className="text-xs text-white/70">Online</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-mint-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                  </div>
                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-1.5 space-y-1.5 max-w-[85%]">
                      {msg.files.map((file, fi) => <FileAttachment key={fi} file={file} />)}
                    </div>
                  )}
                  {msg.qrData && (
                    <div className="mt-2 flex flex-col items-start gap-2">
                      <div style={{ background: 'white', padding: 6, borderRadius: 8, lineHeight: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.qrData.qrImage}
                          alt="QR WhatsApp"
                          width={200}
                          height={200}
                          style={{ display: 'block', borderRadius: 4 }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', animation: 'pulse 1.5s infinite' }} />
                        Menunggu scan...
                      </span>
                    </div>
                  )}
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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-500/20 transition-all"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="bg-mint-600 hover:bg-mint-700 disabled:opacity-50 disabled:hover:bg-mint-600 text-white px-3 py-2 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
