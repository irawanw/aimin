import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n-context';
import { UserProvider } from '@/lib/user-context';

export const metadata: Metadata = {
  title: 'Aimin – AI-Powered Business Automation',
  description: 'Transform your WhatsApp business with intelligent AI chat assistants, automation engines, and real-time analytics.',
  keywords: ['AI chatbot', 'WhatsApp automation', 'business automation', 'customer service AI'],
  openGraph: {
    title: 'Aimin – AI-Powered Business Automation',
    description: 'Transform your WhatsApp business with intelligent AI chat assistants.',
    images: ['/logo.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <I18nProvider>
          <UserProvider>
            {children}
          </UserProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
