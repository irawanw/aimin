'use client';

import { useEffect, useRef, useState, useCallback, Suspense, Fragment, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  qrData?: { qrImage: string; pairingPhone: string };
}

/* ── Text formatter: WhatsApp-style markup ── */
const TOKEN_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g;

function formatSegment(seg: string, key: number): ReactNode {
  if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4)
    return <strong key={key}>{seg.slice(2, -2)}</strong>;
  if (seg.startsWith('*') && seg.endsWith('*') && seg.length > 2)
    return <strong key={key}>{seg.slice(1, -1)}</strong>;
  if (seg.startsWith('_') && seg.endsWith('_') && seg.length > 2)
    return <em key={key}>{seg.slice(1, -1)}</em>;
  if (seg.startsWith('~') && seg.endsWith('~') && seg.length > 2)
    return <s key={key}>{seg.slice(1, -1)}</s>;
  if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2)
    return <code key={key} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 3, padding: '0 4px', fontFamily: 'monospace', fontSize: '0.85em' }}>{seg.slice(1, -1)}</code>;
  return seg;
}

function formatLine(line: string, key: number): ReactNode {
  // List items: "- text" or "• text"
  const listMatch = line.match(/^[-•]\s+(.+)/);
  if (listMatch) {
    return (
      <div key={key} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, marginTop: 1 }}>•</span>
        <span>{listMatch[1].split(TOKEN_RE).map((s, j) => formatSegment(s, j))}</span>
      </div>
    );
  }
  return <span key={key}>{line.split(TOKEN_RE).map((s, j) => formatSegment(s, j))}</span>;
}

function formatMessage(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {formatLine(line, i)}
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

/* ── QR Code bubble with live polling ── */
function QRBubble({ initialQrImage, pairingPhone, replyText }: {
  initialQrImage: string;
  pairingPhone: string;
  replyText: string;
}) {
  const [qrImage, setQrImage] = useState(initialQrImage);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [statusMsg, setStatusMsg] = useState('Menunggu scan...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/trial/status/${pairingPhone}`);
        const data = await res.json();
        if (data.qrImage) setQrImage(data.qrImage);
        if (data.status === 'success') {
          clearInterval(intervalRef.current!);
          setStatus('success');
          setStatusMsg(data.message || 'WhatsApp berhasil terhubung!');
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current!);
          setStatus('failed');
          setStatusMsg(data.message || 'Gagal terhubung. Coba lagi.');
        }
      } catch { /* ignore network errors, keep polling */ }
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pairingPhone]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <div style={{
        padding: '10px 12px',
        borderRadius: '16px 16px 16px 4px',
        background: '#1e293b',
        color: 'white',
        fontSize: 13,
        lineHeight: 1.55,
        maxWidth: '82%',
      }}>
        {replyText}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {status !== 'success' && (
            <div style={{ background: 'white', padding: 6, borderRadius: 8, lineHeight: 0 }}>
              <img
                src={qrImage}
                alt="QR WhatsApp"
                width={200}
                height={200}
                style={{ display: 'block', borderRadius: 4 }}
              />
            </div>
          )}
          <div style={{
            fontSize: 12,
            color: status === 'success' ? '#4ade80' : status === 'failed' ? '#f87171' : '#94a3b8',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {status === 'pending' && (
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: '#94a3b8', animation: 'pulse 1.5s infinite',
              }} />
            )}
            {status === 'success' ? '✅ ' : status === 'failed' ? '❌ ' : ''}{statusMsg}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cancelFollowUpRef = useRef(false);

  const greetingForLang = (lang: string): string => {
    switch (lang) {
      case 'fr': return 'Bonjour ! Comment puis-je vous aider ?';
      case 'en': return 'Hello! How can I help you?';
      case 'ar': return 'مرحباً! كيف يمكنني مساعدتك؟';
      case 'zh': return '你好！有什么可以帮您的吗？';
      case 'ja': return 'こんにちは！何かお手伝いできますか？';
      case 'ko': return '안녕하세요! 무엇을 도와드릴까요?';
      case 'es': return '¡Hola! ¿En qué puedo ayudarte?';
      case 'pt': return 'Olá! Como posso ajudá-lo?';
      case 'de': return 'Hallo! Wie kann ich Ihnen helfen?';
      default:   return 'Halo! Ada yang bisa saya bantu?'; // id
    }
  };

  useEffect(() => {
    if (!store) {
      setMessages([{ role: 'assistant', content: greetingForLang('id') }]);
      return;
    }
    fetch('/api/widget/config?store=' + encodeURIComponent(store))
      .then((r) => r.json())
      .then((data) => {
        if (data?.storeName) setStoreName(data.storeName);
        if (data?.primaryColor) setPrimaryColor(data.primaryColor);
        if (data?.storeFolder) setStoreFolder(data.storeFolder);
        setMessages([{ role: 'assistant', content: greetingForLang(data?.language || 'id') }]);
      })
      .catch(() => {
        setMessages([{ role: 'assistant', content: greetingForLang('id') }]);
      });
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
        body: JSON.stringify({ message: text, sessionId, storeFolder, store }),
      });
      const data = await res.json();

      // QR pairing flow
      if (data.isQR && data.qrImage && data.pairingPhone) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.replyText || 'Scan QR code ini dengan WhatsApp kamu.',
            qrData: { qrImage: data.qrImage, pairingPhone: data.pairingPhone },
          },
        ]);
        return;
      }

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
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; background: #0a0f1e; }
        .chat-root { height: 100vh; height: 100dvh; }
        @supports (height: 100dvh) { .chat-root { height: 100dvh; } }
      `}</style>
    <div className="chat-root" style={{ background: '#0a0f1e', display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%',
        width: '100%', maxWidth: 480,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#0f172a', color: '#f1f5f9', overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,0,0,0.5)',
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
            {/* QR pairing bubble */}
            {msg.qrData ? (
              <QRBubble
                initialQrImage={msg.qrData.qrImage}
                pairingPhone={msg.qrData.pairingPhone}
                replyText={msg.content}
              />
            ) : (
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
            )}
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
    </div>
    </>
  );
}

export default function WidgetChatPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f172a', height: '100vh' }} />}>
      <WidgetChatContent />
    </Suspense>
  );
}
