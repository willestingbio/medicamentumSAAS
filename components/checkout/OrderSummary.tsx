'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderItem {
  id: string;
  productId: string;
  title: string;
  slug: string;
  priceCents: number;
  coverImageUrl: string | null;
  type: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  discountCents?: number;
  couponCode?: string;
}

export function OrderSummary({
  items,
  subtotalCents,
  taxCents,
  totalCents,
  discountCents = 0,
  couponCode,
}: OrderSummaryProps) {
  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  const typeLabel = (type: string) =>
    type === 'course' ? 'Curso' :
    type === 'vr_experience' ? 'VR' : 'IA';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumen de compra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="relative size-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center size-full text-xs text-muted-foreground">
                    {typeLabel(item.type)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">{typeLabel(item.type)}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(item.priceCents)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento ({couponCode})</span>
              <span>-{formatPrice(discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA (19%)</span>
            <span>{formatPrice(taxCents)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatPrice(totalCents)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
