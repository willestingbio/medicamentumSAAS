import { Suspense } from 'react';
import { getDashboardData } from '@/lib/actions/dashboard';
import { getVrKeys } from '@/lib/actions/vr-keys';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

export const metadata = {
  title: 'Mi Dashboard — Medicamentum360',
  description: 'Panel de aprendizaje y progreso de tus cursos.',
};

export default async function DashboardPage() {
  const [data, vrKeys] = await Promise.all([getDashboardData(), getVrKeys()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mi Aprendizaje
        </h1>
        <p className="text-muted-foreground mt-1">
          Continua donde lo dejaste o explora nuevos cursos.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent data={data} vrKeys={vrKeys} />
      </Suspense>
    </div>
  );
}
