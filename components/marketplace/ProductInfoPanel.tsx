'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, Users, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductInfoPanelProps {
  product: {
    title: string;
    type: string;
    priceCents: number;
    discountCents: number | null;
    capacity: number | null;
    enrolled: number;
    rating: number;
    reviewCount: number;
    instructor: string;
    duration: string;
  };
  formatPrice: (cents: number) => string;
}

export function ProductInfoPanel({ product, formatPrice }: ProductInfoPanelProps) {
  const hasDiscount = product.discountCents !== null && product.discountCents < product.priceCents;
  const spotsLeft = product.capacity ? product.capacity - product.enrolled : null;

  return (
    <div className="sticky top-24">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {/* Price */}
        <div className="mb-4">
          {hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{formatPrice(product.discountCents!)}</span>
              <span className="text-lg text-muted-foreground line-through">{formatPrice(product.priceCents)}</span>
            </div>
          ) : (
            <span className="text-3xl font-bold text-foreground">{formatPrice(product.priceCents)}</span>
          )}
          <p className="text-xs text-muted-foreground mt-1">IVA incluido</p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "size-4",
                  star <= Math.round(product.rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted-foreground"
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-sm text-muted-foreground">({product.reviewCount} reseñas)</span>
        </div>

        {/* Capacity */}
        {spotsLeft !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Users className="size-4" />
            <span>
              {spotsLeft > 0 ? `${spotsLeft} cupos disponibles` : 'Curso lleno'}
            </span>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Clock className="size-4" />
          <span>{product.duration}</span>
        </div>

        {/* Instructor */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <CheckCircle className="size-4" />
          <span>Instructor: <strong className="text-foreground">{product.instructor}</strong></span>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button className="w-full btn-press" size="lg" disabled={spotsLeft !== null && spotsLeft <= 0}>
            Comprar ahora
          </Button>
          <Button variant="outline" className="w-full btn-press" size="lg">
            <ShoppingCart className="size-4 mr-2" />
            Agregar al carrito
          </Button>
        </div>

        {/* Guarantee */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Garantía de reembolso de 30 días
        </p>
      </div>
    </div>
  );
}
