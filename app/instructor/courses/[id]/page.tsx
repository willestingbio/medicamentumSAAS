import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getCourseForEditor } from '@/lib/actions/course-builder/courses';
import { getModulesWithLessons } from '@/lib/actions/course-builder/modules';
import { CourseEditorClient } from './CourseEditorClient';

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let course;
  let modules;
  try {
    [course, modules] = await Promise.all([
      getCourseForEditor(id),
      getModulesWithLessons(id),
    ]);
  } catch (e) {
    redirect('/instructor');
  }

  if (!course) {
    redirect('/instructor');
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user?.role === 'super_admin';

  return (
    <CourseEditorClient
      course={{
        id: course.id,
        productId: course.productId,
        estimatedHours: course.estimatedHours,
        passingScorePct: course.passingScorePct,
        certificateEnabled: course.certificateEnabled,
        product: {
          id: course.product.id,
          title: course.product.title,
          published: course.product.published,
          reviewStatus: course.product.reviewStatus,
        },
      }}
      modules={modules}
      isAdmin={isAdmin}
    />
  );
}
