import { Suspense } from 'react';
import { getMyEnrollments } from '@/lib/actions/course-progress';
import { MyCoursesContent } from '@/components/dashboard/MyCoursesContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

export const metadata = {
  title: 'Mis Cursos — Medicamentum360',
  description: 'Todos tus cursos inscritos y su progreso.',
};

export default async function MyCoursesPage() {
  const enrollments = await getMyEnrollments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Mis Cursos
        </h1>
        <p className="text-muted-foreground mt-1">
          {enrollments.length} curso{enrollments.length !== 1 ? 's' : ''} inscrito{enrollments.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <MyCoursesContent enrollments={enrollments} />
      </Suspense>
    </div>
  );
}
