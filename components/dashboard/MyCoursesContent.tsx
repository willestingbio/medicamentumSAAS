'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Glasses, Cpu, ArrowRight } from 'lucide-react';

type Enrollment = {
  id: string;
  progressPct: number;
  status: string;
  lastAccessedAt: Date | null;
  createdAt: Date;
  product: {
    id: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    type: string;
    description: string;
    moodleCourseId: number | null;
    course: {
      id: string;
      contentSource: string;
      modules: { lessons: { id: string }[] }[];
    } | null;
  };
};

function ProductTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'course': return <BookOpen className="size-4" />;
    case 'vr_experience': return <Glasses className="size-4" />;
    case 'ai_automation': return <Cpu className="size-4" />;
    default: return <BookOpen className="size-4" />;
  }
}

function formatType(type: string) {
  switch (type) {
    case 'course': return 'Curso';
    case 'vr_experience': return 'Experiencia VR';
    case 'ai_automation': return 'Automatización';
    default: return type;
  }
}

function getStatusLabel(status: string, progressPct: number) {
  if (status === 'completed') return { label: 'Completado', variant: 'default' as const };
  if (progressPct > 0) return { label: 'En progreso', variant: 'secondary' as const };
  return { label: 'No iniciado', variant: 'outline' as const };
}

export function MyCoursesContent({ enrollments }: { enrollments: Enrollment[] }) {
  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No tienes cursos aún</h3>
        <p className="text-muted-foreground mt-1 mb-4">Explora el marketplace para encontrar cursos</p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 text-primary hover:underline"
        >
          Ir al marketplace <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enrollments.map((enrollment) => {
        const totalLessons = enrollment.product.course?.modules.flatMap((m) => m.lessons).length ?? 0;
        const statusInfo = getStatusLabel(enrollment.status, enrollment.progressPct);
        const isMoodleLegacy = enrollment.product.course?.contentSource === 'moodle_legacy';

        const courseHref = isMoodleLegacy && enrollment.product.moodleCourseId
          ? `/api/moodle/autologin?courseId=${enrollment.product.moodleCourseId}`
          : enrollment.product.type === 'course' && enrollment.product.course
            ? `/dashboard/cursos/${enrollment.product.slug}`
            : `/dashboard`;

        return (
          <Link
            key={enrollment.id}
            href={courseHref}
            className="group"
            {...(isMoodleLegacy ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Card className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="relative aspect-video bg-muted">
                {enrollment.product.coverImageUrl ? (
                  <Image
                    src={enrollment.product.coverImageUrl}
                    alt={enrollment.product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ProductTypeIcon type={enrollment.product.type} />
                  </div>
                )}
                <Badge variant={statusInfo.variant} className="absolute top-2 right-2 text-xs">
                  {statusInfo.label}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {enrollment.product.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatType(enrollment.product.type)}
                    {totalLessons > 0 && ` · ${totalLessons} lecciones`}
                    {isMoodleLegacy && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">Moodle</Badge>
                    )}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium text-foreground">{enrollment.progressPct}%</span>
                  </div>
                  <Progress value={enrollment.progressPct} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
