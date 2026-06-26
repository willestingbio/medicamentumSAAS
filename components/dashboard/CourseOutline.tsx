'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Play, FileText, HelpCircle, Paperclip, Lock } from 'lucide-react';

type Lesson = {
  id: string;
  type: string;
  title: string;
  order: number;
  isPreview: boolean;
  completed?: boolean;
};

type Module = {
  id: string;
  title: string;
  order: number;
  releaseAfterDays: number | null;
  lessons: Lesson[];
};

interface CourseOutlineProps {
  modules: Module[];
  currentLessonId: string;
  courseSlug: string;
  enrollmentCreatedAt: Date;
}

function LessonTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video': return <Play className="size-3.5" />;
    case 'text': return <FileText className="size-3.5" />;
    case 'quiz': return <HelpCircle className="size-3.5" />;
    case 'resource': return <Paperclip className="size-3.5" />;
    default: return <Play className="size-3.5" />;
  }
}

function isModuleBlocked(releaseAfterDays: number | null, enrollmentCreatedAt: Date): boolean {
  if (!releaseAfterDays) return false;
  const unlockDate = new Date(enrollmentCreatedAt.getTime() + releaseAfterDays * 24 * 60 * 60 * 1000);
  return new Date() < unlockDate;
}

function getUnlockDate(releaseAfterDays: number, enrollmentCreatedAt: Date): string {
  const unlockDate = new Date(enrollmentCreatedAt.getTime() + releaseAfterDays * 24 * 60 * 60 * 1000);
  return unlockDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function CourseOutline({ modules, currentLessonId, courseSlug, enrollmentCreatedAt }: CourseOutlineProps) {
  return (
    <nav className="space-y-1" aria-label="Temario del curso">
      {modules.map((mod) => {
        const blocked = isModuleBlocked(mod.releaseAfterDays, enrollmentCreatedAt);
        const completedInModule = mod.lessons.filter((l) => l.completed).length;

        return (
          <div key={mod.id} className="mb-3">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mod.title}
              </span>
              {blocked ? (
                <Lock className="size-3.5 text-muted-foreground" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {completedInModule}/{mod.lessons.length}
                </span>
              )}
            </div>

            {blocked && mod.releaseAfterDays && (
              <p className="px-3 pb-2 text-xs text-muted-foreground">
                Se desbloquea el {getUnlockDate(mod.releaseAfterDays, enrollmentCreatedAt)}
              </p>
            )}

            <ul className="space-y-0.5">
              {mod.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId;
                const isAccessible = !blocked || lesson.isPreview;

                return (
                  <li key={lesson.id}>
                    {isAccessible ? (
                      <Link
                        href={`/dashboard/cursos/${courseSlug}/${lesson.id}`}
                        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                          isCurrent
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {lesson.completed ? (
                          <CheckCircle className="size-3.5 text-green-500 shrink-0" />
                        ) : (
                          <LessonTypeIcon type={lesson.type} />
                        )}
                        <span className="truncate">{lesson.title}</span>
                        {lesson.isPreview && (
                          <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                            Preview
                          </Badge>
                        )}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground/50">
                        <Lock className="size-3.5 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
