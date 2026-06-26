'use client';

import { useState } from 'react';
import { ModuleTree } from '@/components/instructor/module-tree';
import { LessonEditor } from '@/components/instructor/lesson-editor';
import { CourseSettings } from '@/components/instructor/course-settings';

interface ModuleWithLessons {
  id: string;
  courseId: string;
  title: string;
  order: number;
  releaseAfterDays: number | null;
  lessons: {
    id: string;
    title: string;
    type: 'video' | 'text' | 'quiz' | 'resource';
    order: number;
    isPreview: boolean;
  }[];
}

interface CourseData {
  id: string;
  productId: string;
  estimatedHours: number | null;
  passingScorePct: number;
  certificateEnabled: boolean;
  product: {
    id: string;
    title: string;
    published: boolean;
    reviewStatus: string;
  };
}

interface Props {
  course: CourseData;
  modules: ModuleWithLessons[];
  isAdmin: boolean;
}

export function CourseEditorClient({ course, modules: initialModules, isAdmin }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [modules, setModules] = useState(initialModules);

  const activeLesson = activeLessonId
    ? modules.flatMap((m) => m.lessons).find((l) => l.id === activeLessonId) ?? null
    : null;

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
  };

  const handleModulesChanged = (updatedModules: ModuleWithLessons[]) => {
    setModules(updatedModules);
    if (activeLessonId) {
      const stillExists = updatedModules.some((m) =>
        m.lessons.some((l) => l.id === activeLessonId),
      );
      if (!stillExists) {
        setActiveLessonId(null);
      }
    }
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-6rem)]">
      <ModuleTree
        modules={modules}
        courseId={course.id}
        activeLessonId={activeLessonId}
        onSelectLesson={handleSelectLesson}
        onModulesChanged={handleModulesChanged}
      />
      <LessonEditor
        lessonId={activeLessonId}
        lessonType={activeLesson?.type ?? null}
        lessonTitle={activeLesson?.title ?? null}
      />
      <CourseSettings course={course} isAdmin={isAdmin} />
    </div>
  );
}
