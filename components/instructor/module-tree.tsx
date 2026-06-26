'use client';

import { useState } from 'react';
import {
  Play,
  FileText,
  HelpCircle,
  Paperclip,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createModule, deleteModule } from '@/lib/actions/course-builder/modules';
import { createLesson, deleteLesson } from '@/lib/actions/course-builder/lessons';

interface LessonLight {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'resource';
  order: number;
  isPreview: boolean;
}

interface ModuleWithLessons {
  id: string;
  courseId: string;
  title: string;
  order: number;
  releaseAfterDays: number | null;
  lessons: LessonLight[];
}

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  text: FileText,
  quiz: HelpCircle,
  resource: Paperclip,
};

const typeLabel: Record<string, string> = {
  video: 'Video',
  text: 'Texto',
  quiz: 'Quiz',
  resource: 'Recurso',
};

interface Props {
  modules: ModuleWithLessons[];
  courseId: string;
  activeLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onModulesChanged: (modules: ModuleWithLessons[]) => void;
}

export function ModuleTree({
  modules,
  courseId,
  activeLessonId,
  onSelectLesson,
  onModulesChanged,
}: Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (modules.length > 0) initial.add(modules[0].id);
    return initial;
  });
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingLessons, setAddingLessons] = useState<Record<string, { active: boolean; title: string; type: LessonLight['type'] }>>({});

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const mod = await createModule(courseId, newModuleTitle.trim());
      const newModule: ModuleWithLessons = {
        id: mod.id,
        courseId: mod.courseId,
        title: mod.title,
        order: mod.order,
        releaseAfterDays: mod.releaseAfterDays,
        lessons: [],
      };
      onModulesChanged([...modules, newModule]);
      setNewModuleTitle('');
      setAddingModule(false);
      setExpandedModules((prev) => new Set(prev).add(mod.id));
      toast.success('Módulo creado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear módulo');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await deleteModule(moduleId);
      onModulesChanged(modules.filter((m) => m.id !== moduleId));
      toast.success('Módulo eliminado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar módulo');
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    const state = addingLessons[moduleId];
    if (!state || !state.title.trim()) {
      setAddingLessons((prev) => ({
        ...prev,
        [moduleId]: { active: true, title: '', type: 'text' },
      }));
      return;
    }
    try {
      const lesson = await createLesson(moduleId, state.type, state.title.trim());
      const updated = modules.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          lessons: [
            ...m.lessons,
            {
              id: lesson.id,
              title: lesson.title,
              type: lesson.type,
              order: lesson.order,
              isPreview: lesson.isPreview,
            },
          ],
        };
      });
      onModulesChanged(updated);
      setAddingLessons((prev) => {
        const copy = { ...prev };
        delete copy[moduleId];
        return copy;
      });
      onSelectLesson(lesson.id);
      toast.success('Lección creada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear lección');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      const updated = modules.map((m) => ({
        ...m,
        lessons: m.lessons.filter((l) => l.id !== lessonId),
      }));
      onModulesChanged(updated);
      toast.success('Lección eliminada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar lección');
    }
  };

  const updateLessonState = (moduleId: string, updates: Partial<{ title: string; type: LessonLight['type'] }>) => {
    setAddingLessons((prev) => ({
      ...prev,
      [moduleId]: { ...(prev[moduleId] || { active: true, title: '', type: 'text' }), ...updates },
    }));
  };

  return (
    <div className="w-64 xl:w-72 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Contenido del curso</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {modules.map((mod) => {
          const isExpanded = expandedModules.has(mod.id);
          const lessonState = addingLessons[mod.id];
          const totalLessons = mod.lessons.length;

          return (
            <div key={mod.id} className="mb-1">
              <div className="flex items-center gap-1 group/module rounded-md hover:bg-muted/60 px-1 py-0.5">
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={isExpanded ? 'Colapsar módulo' : 'Expandir módulo'}
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {mod.title}
                </span>
                <span className="text-xs text-muted-foreground mr-1">
                  {totalLessons}
                </span>
                <button
                  onClick={() => handleDeleteModule(mod.id)}
                  className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/module:opacity-100 transition-opacity"
                  aria-label="Eliminar módulo"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {mod.releaseAfterDays && (
                <div className="flex items-center gap-1 pl-8 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Liberación: {mod.releaseAfterDays}d
                </div>
              )}

              {isExpanded && (
                <div className="ml-3 mt-0.5">
                  {mod.lessons.map((lesson) => {
                    const Icon = typeIcon[lesson.type] || FileText;
                    return (
                      <div key={lesson.id} className="group/lesson flex items-center gap-1">
                        <button
                          onClick={() => onSelectLesson(lesson.id)}
                          className={cn(
                            'flex items-center gap-2 flex-1 rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                            activeLessonId === lesson.id
                              ? 'bg-accent text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                          )}
                        >
                          <Icon className="size-3.5 shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                          {lesson.isPreview && (
                            <span className="text-[10px] bg-secondary text-secondary-foreground px-1 rounded ml-auto shrink-0">
                              Preview
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/lesson:opacity-100 transition-opacity shrink-0"
                          aria-label="Eliminar lección"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })}

                  {lessonState?.active ? (
                    <div className="pl-6 pr-2 py-1.5 space-y-1.5">
                      <Input
                        value={lessonState.title}
                        onChange={(e) => updateLessonState(mod.id, { title: e.target.value })}
                        placeholder="Título de la lección"
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddLesson(mod.id);
                          if (e.key === 'Escape') {
                            setAddingLessons((prev) => {
                              const copy = { ...prev };
                              delete copy[mod.id];
                              return copy;
                            });
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        {(['text', 'video', 'quiz', 'resource'] as const).map((t) => {
                          const Icon = typeIcon[t];
                          return (
                            <button
                              key={t}
                              onClick={() => updateLessonState(mod.id, { type: t })}
                              className={cn(
                                'p-1 rounded text-xs',
                                lessonState.type === t
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
                              )}
                              title={typeLabel[t]}
                            >
                              <Icon className="size-3.5" />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleAddLesson(mod.id)}>
                          Agregar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2"
                          onClick={() => {
                            setAddingLessons((prev) => {
                              const copy = { ...prev };
                              delete copy[mod.id];
                              return copy;
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddLesson(mod.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pl-6 py-1 w-full"
                    >
                      <Plus className="size-3" />
                      Agregar lección
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {addingModule ? (
          <div className="p-2 space-y-1.5">
            <Input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Título del módulo"
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddModule();
                if (e.key === 'Escape') {
                  setAddingModule(false);
                  setNewModuleTitle('');
                }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleAddModule}>
                Agregar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={() => {
                  setAddingModule(false);
                  setNewModuleTitle('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingModule(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-2 w-full mt-1"
          >
            <Plus className="size-3.5" />
            Agregar módulo
          </button>
        )}
      </div>
    </div>
  );
}
