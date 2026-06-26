'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Users, ShoppingCart, Check } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { addToCart } from '@/lib/actions/cart';
import { incrementCartCount } from '@/components/cart/CartPopover';
import { getGuestToken } from '@/lib/guest';
import { toast } from 'sonner';

interface Product {
  id: string;
  type: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  discountCents: number | null;
  coverImageUrl: string | null;
  capacity: number | null;
  rating: number;
  reviewCount: number;
  published: boolean;
}

function getTypeBadge(type: Product['type']) {
  switch (type) {
    case 'course':
      return { label: 'Curso', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'vr_experience':
      return { label: 'VR', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'ai_automation':
      return { label: 'IA', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    default:
      return { label: type, className: 'bg-secondary text-secondary-foreground' };
  }
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "size-3",
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">({count})</span>
    </div>
  );
}

function PlaceholderIcon({ type }: { type: Product['type'] }) {
  const icon = type === 'vr_experience' ? '🥽' : type === 'ai_automation' ? '🤖' : '📚';
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
      <span className="text-2xl">{icon}</span>
    </div>
  );
}

export function ProductCard({ product }: {
  product: Product;
}) {
  const hasDiscount = product.discountCents !== null && product.discountCents < product.priceCents;
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;

    setAdding(true);
    try {
      await addToCart(product.id, getGuestToken());
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

  return (
    <Link href={`/productos/${product.slug}`}>
      <Card className="group card-hover h-full overflow-hidden transition-shadow hover:shadow-md">
        {/* Cover */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {product.coverImageUrl ? (
            <img
              src={product.coverImageUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <PlaceholderIcon type={product.type} />
          )}
          <span className={cn(
            "absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
            getTypeBadge(product.type).className
          )}>
            {getTypeBadge(product.type).label}
          </span>
          {product.capacity && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/80 backdrop-blur-sm text-muted-foreground flex items-center gap-1">
              <Users className="size-2.5" />
              {product.capacity}
            </span>
          )}
        </div>

        <CardContent className="p-3 space-y-1.5">
          <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {product.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
            {product.description}
          </p>

          <StarRating rating={product.rating} count={product.reviewCount} />

          <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
            <div className="flex items-baseline gap-1.5">
              {hasDiscount ? (
                <>
                  <span className="text-sm font-bold text-foreground">{formatPrice(product.discountCents!)}</span>
                  <span className="text-[11px] text-muted-foreground line-through">{formatPrice(product.priceCents)}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-foreground">{formatPrice(product.priceCents)}</span>
              )}
            </div>
            <button
              className={cn(
                "size-8 rounded-full flex items-center justify-center transition-all duration-200",
                added
                  ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              )}
              aria-label={`Agregar ${product.title} al carrito`}
              onClick={handleAddToCart}
              disabled={adding}
            >
              {added ? <Check className="size-3.5" /> : <ShoppingCart className="size-3.5" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
