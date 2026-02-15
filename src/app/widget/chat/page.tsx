'use client';

import { useEffect, useRef, useState, useCallback, Suspense, Fragment, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

/* ── Text formatter: **bold** + newlines ── */
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

/* ── Simple inline lightbox (works inside cross-origin iframe) ── */
function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(0);

  const go = useCallback((dir: -1 | 1) => {
    setIndex((prev) => (prev + dir + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, go]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 50) go(diff < 0 ? 1 : -1);
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          borderRadius: '50%', width: 36, height: 36,
          color: 'white', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>

      {/* Counter */}
      {images.length > 1 && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
          {index + 1} / {images.length}
        </div>
      )}

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            style={{ position: 'absolute', left: 8, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >‹</button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            style={{ position: 'absolute', right: 8, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >›</button>
        </>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={`Foto ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
        draggable={false}
      />

      {/* Dots */}
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              style={{
                width: 8, height: 8, borderRadius: '50%', border: 'none',
                background: i === index ? 'white' : 'rgba(255,255,255,0.35)',
                cursor: 'pointer', padding: 0,
                transform: i === index ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Typing dots ── */
function TypingIndicator({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#1e293b', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            style={{
              width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
              display: 'inline-block',
              animation: 'bounce 1.2s infinite',
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

/* ── Main chat content ── */
function WidgetChatContent() {
  const searchParams = useSearchParams();
  const store = searchParams.get('store') || '';

  const [sessionId] = useState(() => 'widget-' + store + '-' + crypto.randomUUID());
  const [storeName, setStoreName] = useState('Chat');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [storeFolder, setStoreFolder] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Halo! Ada yang bisa saya bantu?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelFollowUpRef = useRef(false);

  useEffect(() => {
    if (!store) return;
    fetch('/api/widget/config?store=' + encodeURIComponent(store))
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setStoreName(data.storeName);
        if (data?.primaryColor) setPrimaryColor(data.primaryColor);
        if (data?.storeFolder) setStoreFolder(data.storeFolder);
      })
      .catch(() => {});
  }, [store]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    cancelFollowUpRef.current = false;

    try {
      const res = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, storeFolder }),
      });
      const data = await res.json();

      const responseImages: string[] = Array.isArray(data.images) && data.images.length > 0 ? data.images : [];

      if (Array.isArray(data.messages) && data.messages.length > 0) {
        // Sequential messages with WhatsApp-like typing delays
        for (let i = 0; i < data.messages.length; i++) {
          const msg = data.messages[i];
          const delay = typeof msg.typingDelay === 'number' ? msg.typingDelay : 1000;

          if (i > 0) {
            if (cancelFollowUpRef.current) { setLoading(false); break; }
            // Idle pause (human-like gap between follow-up messages)
            setLoading(false);
            const idleTime = (Math.floor(Math.random() * 6) + 15) * 1000;
            await new Promise((resolve) => setTimeout(resolve, idleTime));
            if (cancelFollowUpRef.current) break;
            setLoading(true);
            const remainingDelay = Math.max(delay - idleTime, 500);
            await new Promise((resolve) => setTimeout(resolve, remainingDelay));
            if (cancelFollowUpRef.current) break;
          } else {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const isLast = i === data.messages.length - 1;
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: msg.text || '',
              ...(isLast && responseImages.length > 0 ? { images: responseImages } : {}),
            },
          ]);
        }
      } else {
        // Fallback for old/simple response format
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.replyText || data.reply || data.message || data.response || 'Maaf, tidak ada respons.',
            ...(responseImages.length > 0 ? { images: responseImages } : {}),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Maaf, terjadi kesalahan. Silakan coba lagi.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0f172a', color: '#f1f5f9', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px', background: primaryColor,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12, color: 'white',
        }}>AI</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'white' }}>{storeName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Online</div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1, overflowY: 'auto', padding: '12px 10px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '82%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? primaryColor : '#1e293b',
                color: 'white',
                fontSize: 13,
                lineHeight: 1.55,
                wordBreak: 'break-word',
              }}
            >
              {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}

              {/* Image thumbnails */}
              {msg.images && msg.images.length > 0 && (
                <div style={{
                  marginTop: 8,
                  display: 'grid',
                  gridTemplateColumns: msg.images.length === 1 ? '1fr' : msg.images.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
                  gap: 4,
                }}>
                  {msg.images.map((src, imgIdx) => (
                    <button
                      key={imgIdx}
                      onClick={() => setLightbox({ images: msg.images!, index: imgIdx })}
                      style={{
                        padding: 0, border: 'none', cursor: 'pointer',
                        borderRadius: 8, overflow: 'hidden',
                        aspectRatio: '1', background: '#334155',
                      }}
                    >
                      <img
                        src={src}
                        alt={`Foto ${imgIdx + 1}`}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && <TypingIndicator color={primaryColor} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 10px',
          borderTop: '1px solid #1e293b',
          display: 'flex', gap: 8, flexShrink: 0,
          background: '#0f172a',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Cancel pending follow-up messages when user starts typing
            cancelFollowUpRef.current = true;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Ketik pesan..."
          rows={1}
          style={{
            flex: 1, padding: '8px 12px',
            borderRadius: 12, border: '1px solid #334155',
            background: '#1e293b', color: '#f1f5f9',
            fontSize: 13, resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          aria-label="Kirim"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            border: 'none', background: primaryColor,
            color: 'white',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, alignSelf: 'flex-end',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" />
          </svg>
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={closeLightbox} />
      )}
    </div>
  );
}

export default function WidgetChatPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f172a', height: '100vh' }} />}>
      <WidgetChatContent />
    </Suspense>
  );
}
