import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "size-3.5",
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

export function ProductCard({ product, formatPrice }: {
  product: Product;
  formatPrice: (cents: number) => string;
}) {
  const badge = getTypeBadge(product.type);
  const hasDiscount = product.discountCents !== null && product.discountCents < product.priceCents;

  return (
    <Link href={`/productos/${product.slug}`}>
      <Card className="group card-hover h-full">
        <CardContent className="p-5 flex flex-col h-full">
          {/* Cover Image Placeholder */}
          <div className="relative aspect-video rounded-lg bg-muted mb-4 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              {product.type === 'vr_experience' ? '🎓' : product.type === 'ai_automation' ? '🤖' : '📚'}
            </div>
            {/* Type Badge */}
            <span className={cn(
              "absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium",
              badge.className
            )}>
              {badge.label}
            </span>
            {/* Capacity */}
            {product.capacity && (
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-background/80 backdrop-blur-sm text-muted-foreground flex items-center gap-1">
                <Users className="size-3" />
                {product.capacity}
              </span>
            )}
          </div>

          {/* Content */}
          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
            {product.description}
          </p>

          {/* Rating */}
          <StarRating rating={product.rating} count={product.reviewCount} />

          {/* Price + Cart */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-lg font-bold text-foreground">{formatPrice(product.discountCents!)}</span>
                  <span className="text-sm text-muted-foreground line-through">{formatPrice(product.priceCents)}</span>
                </>
              ) : (
                <span className="text-lg font-bold text-foreground">{formatPrice(product.priceCents)}</span>
              )}
            </div>
            <button
              className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 group-hover:scale-110"
              aria-label={`Agregar ${product.title} al carrito`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <ShoppingCart className="size-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
