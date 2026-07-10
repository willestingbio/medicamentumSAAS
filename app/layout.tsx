import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { Footer } from '@/components/layout/Footer';
import { NavBar } from '@/components/layout/NavBar';
import type { NavigationItem } from '@/components/layout/NavBar';
import { PageTransition } from '@/components/PageTransition';
import { auth } from '@/lib/auth';
import { Toaster } from 'sonner';
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
  { name: 'Ejemplos', href: '/', sectionId: 'ejemplos', showOn: 'landing' },
  { name: 'Blog', href: '/', sectionId: 'blog', showOn: 'landing' },
  { name: 'Mi Aprendizaje', href: '/dashboard', showOn: 'authenticated' },
  { name: 'Productos', href: '/productos' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Medicamentum360',
  description: 'Plataforma SAAS educativa para hospitales. Cursos, experiencias VR y automatización con IA.',
  url: BASE_URL,
  address: { '@type': 'PostalAddress', addressCountry: 'CO' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // No session cookie — normal for guests
  }

  const serializableSession = session ? {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: (session.user as any).image ?? null,
      role: (session.user as any).role ?? 'student',
      organizationId: (session.user as any).organizationId ?? null,
    },
  } : null;

  let vendorStatus: string | null = null;
  if (session?.user) {
    const { prisma } = await import('@/lib/prisma');
    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    });
    vendorStatus = vendor?.status ?? null;
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var mode = localStorage.getItem('color-theme');
              if (mode === 'dark' || (!mode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="min-h-screen bg-background flex flex-col">
        <NavBar navigationItems={navigationItems} initialSession={serializableSession} vendorStatus={vendorStatus} />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <CookieConsentBanner />
        <Toaster position="top-center" richColors closeButton offset={80} />
      </body>
    </html>
  );
}
