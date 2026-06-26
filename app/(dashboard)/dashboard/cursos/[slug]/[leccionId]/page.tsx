import { notFound } from 'next/navigation';
import { getCourseForPlayer, getLessonById } from '@/lib/actions/course-progress';
import { LessonPlayerContent } from '@/components/dashboard/LessonPlayerContent';
import { Suspense } from 'react';

interface PageProps {
  params: Promise<{ slug: string; leccionId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { leccionId } = await params;
  try {
    const { lesson } = await getLessonById(leccionId);
    return { title: `${lesson.title} — Medicamentum360` };
  } catch {
    return { title: 'Lección — Medicamentum360' };
  }
}

export default async function LessonPlayerPage({ params }: PageProps) {
  const { slug, leccionId } = await params;

  let courseData;
  let lessonData;
  try {
    [courseData, lessonData] = await Promise.all([
      getCourseForPlayer(slug),
      getLessonById(leccionId),
    ]);
  } catch {
    notFound();
  }

  const { product, course, enrollment, modules, allLessons } = courseData;
  const { lesson, completion } = lessonData;

  // Find prev/next lessons
  const currentIndex = allLessons.findIndex((l) => l.id === leccionId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Cargando lección...</p></div>}>
      <LessonPlayerContent
        product={product}
        course={course}
        enrollment={enrollment}
        modules={modules}
        lesson={lesson}
        allLessons={allLessons}
        isCompleted={!!completion}
        prevLesson={prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null}
        nextLesson={nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null}
        courseSlug={slug}
      />
    </Suspense>
  );
}
