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
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Editor de Quiz</h3>
              <p className="text-sm text-muted-foreground">
                El editor de quiz estará disponible próximamente. Por ahora puedes gestionar
                las preguntas desde la consola de administración.
              </p>
              {lesson?.quiz && (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Preguntas: {lesson.quiz.questions.length}</p>
                  <p>Intentos: {lesson.quiz._count.attempts}</p>
                </div>
              )}
            </div>
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
