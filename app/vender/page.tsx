import { getMyVendorProfile } from '@/lib/actions/vendor/onboarding';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Step1RegisterForm } from './_components/Step1RegisterForm';
import { Step2KycForm } from './_components/Step2KycForm';
import { CheckCircle, Clock, ShieldAlert, ArrowRight } from 'lucide-react';

export default async function VenderPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect('/sign-in?redirect=/vender');
  }

  const vendor = await getMyVendorProfile();

  if (!vendor) {
    return <Step1RegisterForm />;
  }

  if (vendor.status === 'pending_kyc') {
    return <Step2KycForm vendorId={vendor.id} />;
  }

  if (vendor.status === 'pending_review') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-yellow-500/10">
              <Clock className="size-6 text-yellow-500" />
            </div>
            <CardTitle className="text-xl">En revisión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tu perfil de creador está en revisión. Te avisamos por correo en un máximo de 48 horas.
            </p>
            <Button variant="outline" asChild>
              <Link href="/productos">Volver al marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendor.status === 'active') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="size-6 text-green-500" />
            </div>
            <CardTitle className="text-xl">Tu perfil de creador está activo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Ya puedes crear y gestionar tus cursos, módulos y experiencias desde el panel de instructor.
            </p>
            <Button asChild>
              <Link href="/instructor" className="gap-2">
                Ir al panel de instructor
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vendor.status === 'suspended') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="size-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Cuenta suspendida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tu perfil de creador ha sido suspendido. Ponte en contacto con soporte para más información.
            </p>
            <Button variant="outline" asChild>
              <Link href="/productos">Volver al marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
