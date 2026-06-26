'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PayoutRow } from '@/components/admin/payout-row';
import { formatPrice } from '@/lib/utils';
import {
  generateMonthlyPayoutBatch,
  approveAndSendPayout,
  rejectPayout,
} from '@/lib/actions/admin/payouts';
import { toast } from 'sonner';

interface PayoutItem {
  id: string;
  vendorId: string;
  vendor: { displayName: string };
  periodStart: Date;
  periodEnd: Date;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  createdAt: Date;
}

export function PayoutsClient({ payouts: initialPayouts }: { payouts: PayoutItem[] }) {
  const router = useRouter();
  const [payouts, setPayouts] = useState(initialPayouts);
  const [loading, setLoading] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const refresh = () => router.refresh();

  const handleApprove = async (id: string) => {
    setLoading(id);
    try {
      await approveAndSendPayout(id);
      toast.success('Payout aprobado y enviado');
      setPayouts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al aprobar payout');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(id);
    try {
      await rejectPayout(id, 'Rechazado por super_admin');
      toast.success('Payout rechazado');
      setPayouts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar payout');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateBatch = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const result = await generateMonthlyPayoutBatch(periodStart, periodEnd);
      toast.success(
        `Lote generado: ${result.payoutsCreated} payouts para ${result.vendorsWithSales} vendedores con ventas`
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar lote');
    } finally {
      setGenerating(false);
    }
  };

  const totalGross = payouts.reduce((s, p) => s + p.grossAmount, 0);
  const totalCommission = payouts.reduce((s, p) => s + p.commissionAmount, 0);
  const totalNet = payouts.reduce((s, p) => s + p.netAmount, 0);

  const currentMonth = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
    new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona los pagos pendientes a vendedores.
          </p>
        </div>
        <Button onClick={handleGenerateBatch} disabled={generating}>
          <PlusCircle className="size-4" />
          {generating ? 'Generando...' : `Generar lote (${currentMonth})`}
        </Button>
      </div>

      {payouts.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground">No hay payouts pendientes</p>
          <p className="text-sm text-muted-foreground mt-1">
            Genera un lote mensual para calcular las comisiones.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Periodo
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bruto
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Comisión
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Neto
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <PayoutRow
                    key={p.id}
                    payout={p}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    loading={loading}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="rounded-lg border bg-muted/30 px-6 py-3 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-8">
                <span className="text-muted-foreground">Total bruto:</span>
                <span className="font-medium text-foreground">{formatPrice(totalGross)}</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <span className="text-muted-foreground">Total comisión:</span>
                <span className="font-medium text-foreground">
                  {formatPrice(totalCommission)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-8 border-t pt-1">
                <span className="text-muted-foreground font-medium">Total a pagar:</span>
                <span className="font-bold text-foreground">{formatPrice(totalNet)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
