'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Trophy, ShoppingCart, ExternalLink } from 'lucide-react';
import type { DashboardData } from '@/lib/actions/dashboard';
import type { getVrKeys } from '@/lib/actions/vr-keys';
import { CertificateCard } from './CertificateCard';
import { CalendarWidget } from './CalendarWidget';
import { VrKeysCard } from './VrKeysCard';

type Enrollment = DashboardData['enrollments'][number];

function formatProductType(type: string) {
  switch (type) {
    case 'course': return 'Curso';
    case 'vr_experience': return 'Experiencia VR';
    case 'ai_automation': return 'Automatizacion';
    default: return type;
  }
}

function getProgressColor(pct: number) {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-primary';
  if (pct > 0) return 'bg-amber-500';
  return 'bg-muted';
}

function EnrollmentItem({ enrollment }: { enrollment: Enrollment }) {
  const progressColor = getProgressColor(enrollment.progressPct);
  const isMoodleLegacy = enrollment.product.course?.contentSource === 'moodle_legacy';

  return (
    <div className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
      {enrollment.product.coverImageUrl ? (
        <img
          src={enrollment.product.coverImageUrl}
          alt={enrollment.product.title}
          className="h-16 w-24 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-md bg-muted">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
          {enrollment.product.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {formatProductType(enrollment.product.type)}
          </Badge>
          {enrollment.status === 'completed' && (
            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Completado
            </Badge>
          )}
          {isMoodleLegacy && (
            <Badge variant="outline" className="text-xs">Moodle</Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress
            value={enrollment.progressPct}
            className="h-1.5 flex-1"
            indicatorClassName={progressColor}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {enrollment.progressPct}%
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          {enrollment.lastAccessedAt
            ? new Date(enrollment.lastAccessedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
            : 'Sin acceder'}
        </div>
        {isMoodleLegacy && enrollment.product.moodleCourseId ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <a href={`/api/moodle/autologin?courseId=${enrollment.product.moodleCourseId}`} target="_blank" rel="noopener noreferrer">
              Continuar <ExternalLink className="ml-1 size-3" />
            </a>
          </Button>
        ) : (
          <Button asChild size="sm" variant="ghost" className="shrink-0">
            <Link href={`/dashboard/cursos/${enrollment.product.slug}`}>
              Continuar
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

type VrKeyItem = Awaited<ReturnType<typeof getVrKeys>>[number];

export function DashboardContent({
  data,
  vrKeys,
}: {
  data: DashboardData;
  vrKeys: VrKeyItem[];
}) {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');

  const filteredEnrollments = data.enrollments.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return e.progressPct >= 100;
    if (filter === 'not_started') return e.progressPct === 0 && e.status === 'not_started';
    return e.progressPct > 0 && e.progressPct < 100;
  });

  const inProgressCount = data.enrollments.filter(
    (e) => e.progressPct > 0 && e.progressPct < 100
  ).length;
  const completedCount = data.enrollments.filter((e) => e.progressPct >= 100).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" />
            Mis Cursos
          </CardTitle>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{data.enrollments.length} total</span>
            <span>·</span>
            <span>{inProgressCount} en progreso</span>
            <span>·</span>
            <span>{completedCount} completados</span>
          </div>
        </CardHeader>
        <CardContent>
          {data.enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">Aun no tienes cursos</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Explora nuestro marketplace para encontrar tu proximo curso.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/productos">Explorar cursos</Link>
              </Button>
            </div>
          ) : (
            <>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="in_progress">En progreso</TabsTrigger>
                  <TabsTrigger value="completed">Completados</TabsTrigger>
                  <TabsTrigger value="not_started">No iniciados</TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-0">
                  <div className="divide-y divide-border">
                    {filteredEnrollments.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No hay cursos en esta categoria.
                      </p>
                    ) : (
                      filteredEnrollments.map((enrollment) => (
                        <EnrollmentItem key={enrollment.id} enrollment={enrollment} />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <CertificateCard certificates={data.certificates} />

        <CalendarWidget
          events={data.calendarEvents}
          googleConnected={data.calendarConnected}
          userId={data.userId}
        />

        {vrKeys.length > 0 && <VrKeysCard vrKeys={vrKeys} />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-amber-500" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.enrollments.length}</p>
                <p className="text-xs text-muted-foreground">Cursos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.certificates.length}</p>
                <p className="text-xs text-muted-foreground">Certificados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{data.orderCount}</p>
                <p className="text-xs text-muted-foreground">Compras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
