import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    redirect('/sign-in');
  }

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (session.user.role !== 'super_admin') {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: session.user.id },
    });

    if (!vendor) {
      redirect('/sign-in');
    }

    if (vendor.status === 'pending_kyc' || vendor.status === 'pending_review') {
      redirect('/vender');
    }

    if (vendor.status === 'suspended') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <h1 className="text-2xl font-bold text-foreground">Cuenta suspendida</h1>
            <p className="text-muted-foreground mt-2">
              Tu perfil de creador ha sido suspendido. Contacta a soporte para más información.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
