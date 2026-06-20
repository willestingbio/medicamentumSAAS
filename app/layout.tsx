import type { Metadata } from 'next';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medicamentum360 — Plataforma Educativa Médica',
  description: 'Plataforma SAAS educativa para hospitales. Cursos, experiencias VR y automatización con IA.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
