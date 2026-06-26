'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Star, Users, Clock, CheckCircle, Check } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { addToCart } from '@/lib/actions/cart';
import { incrementCartCount } from '@/components/cart/CartPopover';
import { getGuestToken } from '@/lib/guest';
import { toast } from 'sonner';

interface ProductInfoPanelProps {
  productId: string;
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
}

export function ProductInfoPanel({ productId, product }: ProductInfoPanelProps) {
  const router = useRouter();
  const hasDiscount = product.discountCents !== null && product.discountCents < product.priceCents;
  const spotsLeft = product.capacity ? product.capacity - product.enrolled : null;
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      await addToCart(productId, getGuestToken());
      incrementCartCount();
      window.dispatchEvent(new Event('cart-updated'));
      setAdded(true);
      toast.success('Agregado al carrito');
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al agregar');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(productId, getGuestToken());
      window.dispatchEvent(new Event('cart-updated'));
      router.push('/checkout');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar');
    }
  };

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
          <Button
            className="w-full btn-press"
            size="lg"
            disabled={(spotsLeft !== null && spotsLeft <= 0) || adding}
            onClick={handleBuyNow}
          >
            Comprar ahora
          </Button>
          <Button
            variant="outline"
            className={cn(
              "w-full btn-press",
              added && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            )}
            size="lg"
            onClick={handleAddToCart}
            disabled={adding}
          >
            {added ? (
              <>
                <Check className="size-4 mr-2" />
                Agregado
              </>
            ) : (
              <>
                <ShoppingCart className="size-4 mr-2" />
                Agregar al carrito
              </>
            )}
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
