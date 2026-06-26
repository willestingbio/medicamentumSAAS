'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { HlsPlayer } from '@/components/dashboard/HlsPlayer';
import { CourseOutline } from '@/components/dashboard/CourseOutline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { markLessonComplete } from '@/lib/actions/course-progress';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle, List, BookOpen } from 'lucide-react';

type ModuleData = {
  id: string;
  title: string;
  order: number;
  releaseAfterDays: number | null;
  lessons: { id: string; type: string; title: string; order: number; isPreview: boolean }[];
};

interface LessonPlayerContentProps {
  product: { id: string; title: string; slug: string; coverImageUrl: string | null };
  course: { id: string; passingScorePct: number; certificateEnabled: boolean; contentSource: string };
  enrollment: { id: string; progressPct: number; status: string };
  modules: ModuleData[];
  lesson: {
    id: string;
    type: string;
    title: string;
    streamVideoId: string | null;
    videoDurationSec: number | null;
    textContent: string | null;
    resourceKey: string | null;
    resourceLabel: string | null;
    isPreview: boolean;
    module: {
      title: string;
      course: { product: { slug: string } };
      lessons: { id: string; title: string; type: string; order: number; isPreview: boolean }[];
    };
  };
  allLessons: { id: string; type: string; title: string; moduleName: string; moduleOrder: number; completed: boolean }[];
  isCompleted: boolean;
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
  courseSlug: string;
}

export function LessonPlayerContent({
  product,
  course: _course,
  enrollment,
  modules,
  lesson,
  allLessons,
  isCompleted,
  prevLesson,
  nextLesson,
  courseSlug,
}: LessonPlayerContentProps) {
  const [completed, setCompleted] = useState(isCompleted);
  const [progressPct, setProgressPct] = useState(enrollment.progressPct);

  const handleMarkComplete = useCallback(async () => {
    try {
      const result = await markLessonComplete(lesson.id);
      setCompleted(true);
      setProgressPct(result.progressPct);
      toast.success(`Lección completada — progreso: ${result.progressPct}%`);
      if (result.progressPct >= 100) {
        toast.success('¡Felicitaciones! Has completado el curso.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al marcar lección');
    }
  }, [lesson.id]);

  const handleVideoProgress = useCallback(
    (currentTime: number, duration: number) => {
      if (completed) return;
      const pct = (currentTime / duration) * 100;
      if (pct >= 90) {
        handleMarkComplete();
      }
    },
    [completed, handleMarkComplete]
  );

  const handleVideoEnded = useCallback(() => {
    if (!completed) {
      handleMarkComplete();
    }
  }, [completed, handleMarkComplete]);

  const getVideoUrl = (streamVideoId: string) => {
    return `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_ACCOUNT_ID || 'placeholder'}.cloudflarestream.com/${streamVideoId}/manifest/video.m3u8`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-4rem)]">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumb + progress bar */}
        <div className="border-b px-4 lg:px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Mi Aprendizaje</Link>
            <span>/</span>
            <Link href={`/dashboard`} className="hover:text-foreground transition-colors truncate">{product.title}</Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{progressPct}%</span>
          </div>
        </div>

        {/* Video / Content area */}
        <div className="flex-1 px-4 lg:px-6 py-4">
          {lesson.type === 'video' && lesson.streamVideoId ? (
            <div className="aspect-video w-full max-w-4xl mx-auto">
              <HlsPlayer
                src={getVideoUrl(lesson.streamVideoId)}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
                className="w-full h-full"
              />
            </div>
          ) : lesson.type === 'text' && lesson.textContent ? (
            <div className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto">
              <div dangerouslySetInnerHTML={{ __html: lesson.textContent }} />
            </div>
          ) : lesson.type === 'resource' ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <BookOpen className="size-12 text-muted-foreground" />
              <p className="text-muted-foreground">{lesson.resourceLabel || 'Recurso descargable'}</p>
              {lesson.resourceKey && (
                <Button asChild>
                  <a href={`/api/download?key=${encodeURIComponent(lesson.resourceKey)}`} target="_blank" rel="noopener noreferrer">
                    Descargar recurso
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-muted-foreground">Tipo de lección no disponible</p>
            </div>
          )}
        </div>

        {/* Lesson info + actions */}
        <div className="px-4 lg:px-6 py-4 border-t">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{lesson.title}</h2>
              <p className="text-sm text-muted-foreground">{lesson.module.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {completed ? (
                <Badge variant="default" className="gap-1.5">
                  <CheckCircle className="size-3.5" />
                  Completada
                </Badge>
              ) : (
                <Button onClick={handleMarkComplete} variant="outline" size="sm">
                  Marcar como completada
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 lg:px-6 py-4 border-t flex items-center justify-between">
          {prevLesson ? (
            <Button variant="ghost" asChild>
              <Link href={`/dashboard/cursos/${courseSlug}/${prevLesson.id}`}>
                <ArrowLeft className="size-4 mr-2" />
                <span className="hidden sm:inline">Anterior</span>
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {nextLesson ? (
            <Button asChild>
              <Link href={`/dashboard/cursos/${courseSlug}/${nextLesson.id}`}>
                <span className="hidden sm:inline">Siguiente</span>
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard">
                Volver al dashboard
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar — desktop */}
      <div className="hidden lg:block w-72 xl:w-80 border-l bg-muted/30">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm text-foreground">Temario</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allLessons.filter((l) => l.completed).length} de {allLessons.length} lecciones
            </p>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <CourseOutline
              modules={modules}
              currentLessonId={lesson.id}
              courseSlug={courseSlug}
              enrollmentCreatedAt={new Date()}
            />
          </ScrollArea>
        </div>
      </div>

      {/* Sidebar — mobile (bottom sheet) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <List className="size-4" />
              Ver temario
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh]">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Temario</h3>
              <p className="text-xs text-muted-foreground">
                {allLessons.filter((l) => l.completed).length} de {allLessons.length} lecciones
              </p>
            </div>
            <ScrollArea className="h-[calc(70vh-5rem)]">
              <CourseOutline
                modules={modules}
                currentLessonId={lesson.id}
                courseSlug={courseSlug}
                enrollmentCreatedAt={new Date()}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
