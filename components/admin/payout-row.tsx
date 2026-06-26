'use client';

import { CheckCircle, XCircle, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

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

function formatPeriod(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' });
  return `${fmt.format(new Date(start))} — ${fmt.format(new Date(end))}`;
}

export function PayoutRow({
  payout,
  onApprove,
  onReject,
  loading,
}: {
  payout: PayoutItem;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  loading: string | null;
}) {
  const commissionPct =
    payout.grossAmount > 0
      ? Math.round((payout.commissionAmount / payout.grossAmount) * 100)
      : 0;

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <User className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground text-sm">
            {payout.vendor.displayName}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="size-3.5" />
          {formatPeriod(payout.periodStart, payout.periodEnd)}
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-right text-foreground font-medium">
        {formatPrice(payout.grossAmount)}
      </td>
      <td className="py-3 px-4 text-sm text-right text-muted-foreground">
        {formatPrice(payout.commissionAmount)}
        <span className="text-xs ml-1">({commissionPct}%)</span>
      </td>
      <td className="py-3 px-4 text-sm text-right text-foreground font-semibold">
        {formatPrice(payout.netAmount)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="default"
            size="sm"
            onClick={() => onApprove(payout.id)}
            disabled={loading !== null}
          >
            <CheckCircle className="size-3.5" />
            {loading === payout.id ? 'Enviando...' : 'Aprobar'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onReject(payout.id)}
            disabled={loading !== null}
          >
            <XCircle className="size-3.5" />
            Rechazar
          </Button>
        </div>
      </td>
    </tr>
  );
}
