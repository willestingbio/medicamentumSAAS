'use client';

import { useState, useEffect } from 'react';
import { Play, FileText, HelpCircle, Paperclip, Save, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getLessonForEditor, updateLessonContent } from '@/lib/actions/course-builder/lessons';
import { getVideoUploadUrl, checkVideoStatus } from '@/lib/actions/course-builder/video-upload';

interface Props {
  lessonId: string | null;
  lessonType: 'video' | 'text' | 'quiz' | 'resource' | null;
  lessonTitle: string | null;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Play,
  text: FileText,
  quiz: HelpCircle,
  resource: Paperclip,
};

const typeLabels: Record<string, string> = {
  video: 'Lección de video',
  text: 'Lección de texto',
  quiz: 'Quiz',
  resource: 'Recurso descargable',
};

export function LessonEditor({ lessonId, lessonType, lessonTitle }: Props) {
  const [lesson, setLesson] = useState<Awaited<ReturnType<typeof getLessonForEditor>> | null>(null);
  const [textContent, setTextContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lessonId) {
      setLesson(null);
      setTextContent('');
      setUploadUrl(null);
      setVideoState(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await getLessonForEditor(lessonId);
        if (cancelled) return;
        setLesson(data);
        setTextContent(data?.textContent ?? '');

        if (data?.type === 'video' && data?.streamVideoId) {
          try {
            const status = await checkVideoStatus(lessonId);
            if (!cancelled) setVideoState(status);
          } catch {
            if (!cancelled) setVideoState('unknown');
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Error al cargar lección');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [lessonId]);

  const handleSave = async () => {
    if (!lessonId) return;
    setSaving(true);
    try {
      await updateLessonContent(lessonId, { textContent: textContent || undefined });
      toast.success('Contenido guardado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestUpload = async () => {
    if (!lessonId) return;
    setUploading(true);
    try {
      const result = await getVideoUploadUrl(lessonId);
      setUploadUrl(result.uploadURL);
      toast.success('URL de subida generada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar URL');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!lessonId) return;
    try {
      const status = await checkVideoStatus(lessonId);
      setVideoState(status);
      toast.success('Estado actualizado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al consultar estado');
    }
  };

  if (!lessonId || !lessonType) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center">
          <FileText className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Selecciona una lección para editarla</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const Icon = typeIcons[lessonType] ?? FileText;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground truncate">
          {lessonTitle}
        </h2>
        <Badge variant="secondary" className="text-xs ml-auto shrink-0">
          {typeLabels[lessonType]}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {lessonType === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Contenido de la lección
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="mt-1.5 flex w-full min-h-[300px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                placeholder="Escribe el contenido de la lección aquí..."
              />
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="size-4" />
              {saving ? 'Guardando...' : 'Guardar contenido'}
            </Button>
          </div>
        )}

        {lessonType === 'video' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Video de la lección</h3>

              {lesson?.streamVideoId ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Video ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{lesson.streamVideoId}</code>
                  </p>
                  {videoState && (
                    <div className="text-sm text-muted-foreground">
                      <p>Estado: <Badge variant="secondary" className="text-xs">{videoState}</Badge></p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCheckStatus}>
                      Verificar estado
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">Esta lección aún no tiene un video asociado.</p>
              )}

              <div className="space-y-3">
                <Button onClick={handleRequestUpload} disabled={uploading} size="sm">
                  <Upload className="size-4" />
                  {uploading ? 'Generando...' : lesson?.streamVideoId ? 'Reemplazar video' : 'Subir video'}
                </Button>

                {uploadUrl && (
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      URL de subida directa (válida temporalmente):
                    </p>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted text-foreground px-2 py-1 rounded flex-1 break-all">
                        {uploadUrl.slice(0, 120)}...
                      </code>
                      <a
                        href={uploadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Usa esta URL con una herramienta como curl o Postman para subir el archivo de video directamente a Cloudflare Stream.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {lessonType === 'quiz' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Editor de Quiz</h3>
              <Badge variant="secondary" className="text-xs">
                {lesson?.quiz?.questions?.length ?? 0} preguntas
              </Badge>
            </div>

            {lesson?.quiz && lesson.quiz.questions.length > 0 ? (
              <div className="space-y-4">
                {/* Quiz Settings */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuración</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mezclar preguntas:</span>
                      <Badge variant={lesson.quiz.shuffleQuestions ? 'default' : 'outline'} className="ml-1 text-xs">
                        {lesson.quiz.shuffleQuestions ? 'Sí' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intentos:</span>
                      <span className="ml-1 font-medium">{lesson.quiz.maxAttempts ?? 'Ilimitado'}</span>
                    </div>
                    {lesson.quiz.timeLimitSec && (
                      <div>
                        <span className="text-muted-foreground">Tiempo límite:</span>
                        <span className="ml-1 font-medium">{Math.floor(lesson.quiz.timeLimitSec / 60)} min</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Questions */}
                {lesson.quiz.questions.map((q: any, qi: number) => (
                  <div key={q.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1">
                          {q.type === 'single_choice' ? 'Opción única' : q.type === 'multiple_choice' ? 'Múltiple' : 'V/F'}
                        </Badge>
                        <p className="text-sm font-medium text-foreground">
                          {qi + 1}. {q.prompt}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 pl-2">
                      {q.options?.map((opt: any) => (
                        <div key={opt.id} className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${
                          opt.isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                        }`}>
                          <span className="text-xs">{opt.isCorrect ? '✓' : '○'}</span>
                          <span>{opt.label}</span>
                          {opt.isCorrect && <Badge className="text-[10px] ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Correcta</Badge>}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                        💡 {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <HelpCircle className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Este quiz no tiene preguntas todavía.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Las preguntas pueden gestionarse desde la API de administración.
                </p>
              </div>
            )}
          </div>
        )}

        {lessonType === 'resource' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Recurso descargable</h3>
              <p className="text-sm text-muted-foreground">
                La carga de archivos estará disponible próximamente. Soporte planeado para PDFs,
                imágenes y modelos 3D.
              </p>
              {lesson?.resourceKey && (
                <p className="text-sm text-muted-foreground mt-2">
                  Archivo actual: {lesson.resourceKey}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
