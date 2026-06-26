'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Store, Mail, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { approveVendor, rejectVendor } from '@/lib/actions/admin/review-queue';
import { toast } from 'sonner';

interface VendorItem {
  id: string;
  displayName: string;
  status: string;
  createdAt: Date;
  user: {
    email: string;
    name: string;
  };
}

export function ReviewVendorCard({ vendor, onAction }: {
  vendor: VendorItem;
  onAction?: () => void;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await approveVendor(vendor.id);
      toast.success(`Vendedor "${vendor.displayName}" aprobado`);
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
      await rejectVendor(vendor.id, reason);
      toast.success(`Vendedor "${vendor.displayName}" rechazado`);
      onAction?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setLoading(null);
    }
  };

  const formattedDate = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(new Date(vendor.createdAt));

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Store className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {vendor.displayName}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Mail className="size-3" />
                  <span className="truncate">{vendor.user.email}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="size-3" />
                  Registrado {formattedDate}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              Pendiente
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-4">
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
        </CardContent>
      </Card>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        title={`Rechazar a "${vendor.displayName}"`}
        description="El vendedor será devuelto al estado de verificación KYC para corregir sus datos."
      />
    </>
  );
}
