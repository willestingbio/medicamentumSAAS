'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, CheckCircle, XCircle, BookOpen, Layers, Video } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { approveProduct, rejectProduct } from '@/lib/actions/admin/review-queue';
import { toast } from 'sonner';

interface ReviewProduct {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  reviewStatus: string;
  vendor: { displayName: string } | null;
  course: {
    _count: { modules: number; lessons: number };
  } | null;
  warnings: string[];
}

export function ReviewProductCard({ product, onAction }: {
  product: ReviewProduct;
  onAction?: () => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await approveProduct(product.id);
      toast.success(`"${product.title}" aprobado`);
      onAction?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (reason: string) => {
    setLoading('reject');
    try {
      await rejectProduct(product.id, reason);
      toast.success(`"${product.title}" rechazado`);
      onAction?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setLoading(null);
    }
  };

  const hasWarnings = product.warnings.length > 0;

  return (
    <>
      <Card className={cn(hasWarnings && 'border-amber-500/50')}>
        <CardContent className="p-5">
          <div className="flex gap-4">
            {/* Cover image */}
            <div className="relative aspect-video w-40 shrink-0 rounded-lg bg-muted overflow-hidden">
              {product.coverImageUrl ? (
                <img
                  src={product.coverImageUrl}
                  alt={product.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <BookOpen className="size-8" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground truncate">
                    {product.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    por {product.vendor?.displayName ?? 'Desconocido'}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Pendiente
                </Badge>
              </div>

              {/* Course stats */}
              {product.course && (
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="size-3" />
                    {product.course._count.modules} módulos
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="size-3" />
                    {product.course._count.lessons} lecciones
                  </span>
                </div>
              )}

              {/* Warnings */}
              {hasWarnings && (
                <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-medium mb-1">
                    <AlertTriangle className="size-3" />
                    Advertencias de validación
                  </div>
                  <ul className="space-y-0.5">
                    {product.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-600 dark:text-amber-300/80">
                        • {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <Link href={`/productos/${product.slug}`} target="_blank">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="size-3.5" />
                    Vista previa
                  </Button>
                </Link>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApprove}
                  disabled={loading !== null}
                >
                  <CheckCircle className="size-3.5" />
                  {loading === 'approve' ? 'Aprobando...' : 'Aprobar'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={loading !== null}
                >
                  <XCircle className="size-3.5" />
                  Rechazar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        title={`Rechazar "${product.title}"`}
        description="Esta acción rechazará el producto y el vendor deberá corregirlo antes de reenviarlo."
      />
    </>
  );
}
