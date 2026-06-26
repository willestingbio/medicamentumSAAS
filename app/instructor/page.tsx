import Link from 'next/link';
import { BookOpen, Plus, Layers } from 'lucide-react';
import { getMyCourses } from '@/lib/actions/course-builder/courses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function StatusBadge({ published, reviewStatus }: { published: boolean; reviewStatus: string }) {
  if (published) return <Badge>Publicado</Badge>;
  if (reviewStatus === 'pending_review') return <Badge variant="secondary">En revisión</Badge>;
  if (reviewStatus === 'rejected') return <Badge variant="destructive">Rechazado</Badge>;
  return <Badge variant="outline">Borrador</Badge>;
}

export default async function InstructorPage() {
  const courses = await getMyCourses();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Cursos</h1>
          <p className="text-muted-foreground mt-1">Gestiona el contenido de tus cursos</p>
        </div>
        <Button asChild>
          <Link href="/admin/products">
            <Plus className="size-4" />
            Nuevo curso
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <BookOpen className="size-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">No tienes cursos todavía</h3>
              <p className="text-muted-foreground mt-1">
                Crea tu primer producto tipo &quot;curso&quot; en el marketplace para empezar
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/admin/products">Ir al marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/instructor/courses/${course.id}`}>
              <Card className="group card-hover h-full transition-shadow hover:shadow-md">
                <div className="aspect-video rounded-t-xl bg-muted flex items-center justify-center overflow-hidden">
                  {course.product.coverImageUrl ? (
                    <img
                      src={course.product.coverImageUrl}
                      alt={course.product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="size-8 text-muted-foreground" />
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {course.product.title}
                    </CardTitle>
                    <StatusBadge
                      published={course.product.published}
                      reviewStatus={course.product.reviewStatus}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-4" />
                      {course._count.modules} módulo{course._count.modules !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
