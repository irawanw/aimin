import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n-context';
import { UserProvider } from '@/lib/user-context';

export const metadata: Metadata = {
  title: 'Aimin Assist – AI WhatsApp Assistant',
  description: 'Otomatisasi WhatsApp bisnis Anda dengan AI cerdas',
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
