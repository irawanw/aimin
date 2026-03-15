import { Instrument_Serif, Plus_Jakarta_Sans } from 'next/font/google';

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'Daftar Gratis — Aimin Assistant',
  description: 'AI WhatsApp assistant untuk bisnis kamu. 7 hari gratis, langsung aktif.',
};

export default function RegisterPage() {
  return (
    <div
      className={`${serif.variable} ${sans.variable}`}
      style={{
        fontFamily: 'var(--font-sans), sans-serif',
        minHeight: '100svh',
        background: '#faf9f6',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle texture overlay */}
      <style>{`
        body { margin: 0; }
        .reg-page { position: relative; }
        .reg-page::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% 10%, rgba(16,185,129,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 90%, rgba(16,185,129,0.04) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }
        .serif-head { font-family: var(--font-serif), Georgia, serif; }
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 14px 24px;
          background: #111;
          color: #fff;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
          text-decoration: none;
          transition: all 0.2s ease;
          letter-spacing: -0.01em;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);
        }
        .google-btn:hover {
          background: #1a1a1a;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08);
        }
        .google-btn:active { transform: translateY(0); }
        .stat-item { text-align: center; }
        .stat-num {
          font-size: 17px;
          font-weight: 700;
          color: #111;
          line-height: 1;
          font-family: var(--font-sans), sans-serif;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 11px;
          color: #999;
          margin-top: 3px;
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        .divider { width: 1px; height: 28px; background: #e5e5e5; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up-1 { animation: fadeUp 0.5s ease both; }
        .fade-up-2 { animation: fadeUp 0.5s 0.08s ease both; }
        .fade-up-3 { animation: fadeUp 0.5s 0.16s ease both; }
        .fade-up-4 { animation: fadeUp 0.5s 0.24s ease both; }
        .fade-up-5 { animation: fadeUp 0.5s 0.32s ease both; }
      `}</style>

      {/* Logo — top left */}
      <header style={{ position: 'relative', zIndex: 1, padding: '20px 28px', flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '22px',
          color: '#111',
          letterSpacing: '-0.02em',
          fontStyle: 'italic',
        }}>
          AiMin Assistant
        </span>
      </header>

      {/* Main content */}
      <main className="reg-page" style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px 40px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          borderRadius: '20px',
          padding: 'clamp(32px, 5vw, 48px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.07)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>

          {/* Badge */}
          <div className="fade-up-1" style={{ marginBottom: '24px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16,185,129,0.08)',
              color: '#059669',
              fontSize: '12px',
              fontWeight: '600',
              padding: '5px 12px',
              borderRadius: '100px',
              letterSpacing: '0.02em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
              WhatsApp AI Assistant
            </span>
          </div>

          {/* Headline */}
          <h1 className="serif-head fade-up-2" style={{
            fontSize: 'clamp(30px, 6vw, 38px)',
            lineHeight: 1.15,
            color: '#0d0d0d',
            marginBottom: '14px',
            letterSpacing: '-0.02em',
            fontWeight: 400,
          }}>
            Bisnis Selalu&nbsp;Aktif,{' '}
            <em style={{ color: '#059669' }}>Meski Kamu Sedang Istirahat.</em>
          </h1>

          {/* Subtext */}
          <p className="fade-up-3" style={{
            fontSize: '14.5px',
            lineHeight: 1.65,
            color: '#666',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            Setiap pesan yang tidak terjawab bisa jadi peluang terbesar di bisnis kamu.
            Aimin merespons otomatis 24/7 keinginan pelanggan — kamu fokus mengembangkan bisnis.
          </p>

          {/* CTA Button */}
          <div className="fade-up-4">
            <a href="/api/auth/google" className="google-btn">
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 12.9995 12.9231 12.0468 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0468 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4068 3.78409 7.8299 3.96409 7.29V4.9581H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9581L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335"/>
              </svg>
              Daftar Demo Gratis dengan Google
            </a>

            <p style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#aaa',
              marginTop: '12px',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}>
              7 hari GRATIS &middot;
            </p>
          </div>

          {/* Divider */}
          <div className="fade-up-5" style={{
            margin: '28px 0',
            height: '1px',
            background: 'linear-gradient(to right, transparent, #e5e5e5, transparent)',
          }} />

          {/* Trust stats */}
          <div className="fade-up-5" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}>
            <div className="stat-item">
              <div className="stat-num">2.000+</div>
              <div className="stat-label">Bisnis Aktif</div>
            </div>
            <div className="divider" />
            <div className="stat-item">
              <div className="stat-num">4.8 ★</div>
              <div className="stat-label">Rating Pengguna</div>
            </div>
            <div className="divider" />
            <div className="stat-item">
              <div className="stat-num">24/7</div>
              <div className="stat-label">Selalu Online</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '0 16px 24px',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: '12px', color: '#ccc', fontWeight: 400 }}>
          &copy; 2025 Aimin Assist &middot;{' '}
          <a href="/login" style={{ color: '#bbb', textDecoration: 'none' }}>Sudah punya akun?</a>
        </p>
      </footer>
    </div>
  );
}
