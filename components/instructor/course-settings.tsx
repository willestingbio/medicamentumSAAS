'use client';

import { useState } from 'react';
import { ArrowLeft, Settings, Eye, Send, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  updateCourseSettings,
  submitCourseForReview,
  publishCourse,
} from '@/lib/actions/course-builder/courses';

interface CourseSettingsData {
  id: string;
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
  course: CourseSettingsData;
  isAdmin: boolean;
}

function StatusBadge({ published, reviewStatus }: { published: boolean; reviewStatus: string }) {
  if (published) return <Badge>Publicado</Badge>;
  if (reviewStatus === 'pending_review') return <Badge variant="secondary">En revisión</Badge>;
  if (reviewStatus === 'rejected') return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge variant="outline">Borrador</Badge>;
}

export function CourseSettings({ course, isAdmin }: Props) {
  const [estimatedHours, setEstimatedHours] = useState(
    course.estimatedHours?.toString() ?? '',
  );
  const [passingScorePct, setPassingScorePct] = useState(
    course.passingScorePct.toString(),
  );
  const [certificateEnabled, setCertificateEnabled] = useState(
    course.certificateEnabled,
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateCourseSettings(course.id, {
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        passingScorePct: Number(passingScorePct),
        certificateEnabled,
      });
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    try {
      await submitCourseForReview(course.id);
      toast.success('Curso enviado a revisión');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishCourse(course.id);
      toast.success('Curso publicado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = isAdmin || course.product.reviewStatus === 'approved';
  const canSubmitForReview = !isAdmin && !course.product.published && course.product.reviewStatus !== 'pending_review';

  return (
    <div className="w-80 flex-shrink-0 border-l border-border bg-muted/30 flex flex-col">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Configuración</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Link
          href="/instructor"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground pb-2 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Volver a Mis Cursos
        </Link>

        <div>
          <h3 className="text-sm font-medium text-foreground">{course.product.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge
              published={course.product.published}
              reviewStatus={course.product.reviewStatus}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="estimatedHours">Horas estimadas</Label>
          <Input
            id="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="Ej: 40"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="passingScore">Nota mínima (%)</Label>
          <Input
            id="passingScore"
            type="number"
            min="1"
            max="100"
            value={passingScorePct}
            onChange={(e) => setPassingScorePct(e.target.value)}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="certificateEnabled" className="text-sm font-medium cursor-pointer">
                Certificado al completar
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los estudiantes recibirán un certificado PDF al terminar el curso
              </p>
            </div>
            <button
              id="certificateEnabled"
              role="switch"
              aria-checked={certificateEnabled}
              onClick={() => setCertificateEnabled(!certificateEnabled)}
              className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 ${
                certificateEnabled ? 'bg-primary' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <span className={`pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ${
                certificateEnabled ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="w-full">
          <Settings className="size-4" />
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>

        <Separator />

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" disabled>
            <Eye className="size-4" />
            Vista previa
          </Button>

          {canSubmitForReview && (
            <Button
              size="sm"
              className="w-full"
              onClick={handleSubmitForReview}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {submitting ? 'Enviando...' : 'Enviar a revisión'}
            </Button>
          )}

          {canPublish && !course.product.published && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {publishing ? 'Publicando...' : 'Publicar curso'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
