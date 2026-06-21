import type { Metadata } from 'next';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { Footer } from '@/components/layout/Footer';
import { NavBar } from '@/components/layout/NavBar';
import type { NavigationItem } from '@/components/layout/NavBar';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Medicamentum360 — Plataforma Educativa Médica',
  description: 'Plataforma SAAS educativa para hospitales. Cursos, experiencias VR y automatización con IA.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: 'Medicamentum360 — Formación médica inmersiva',
    description: 'Cursos especializados, simulaciones VR y herramientas de IA para hospitales.',
    url: BASE_URL,
    siteName: 'Medicamentum360',
    locale: 'es_CO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medicamentum360',
    description: 'Formación médica inmersiva para hospitales.',
  },
  robots: { index: true, follow: true },
};

const navigationItems: NavigationItem[] = [
  { name: 'Nosotros', href: '/', sectionId: 'nosotros' },
  { name: 'Ejemplos', href: '/', sectionId: 'ejemplos' },
  { name: 'Blog', href: '/', sectionId: 'blog' },
  { name: ' Marketplace', href: '/productos' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className="min-h-screen bg-background flex flex-col">
        <NavBar navigationItems={navigationItems} />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsentBanner />
      </body>
    </html>
  );
}