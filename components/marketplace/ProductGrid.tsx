'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { SkeletonGrid } from '@/components/marketplace/SkeletonCard';
import { getProducts, type ProductListItem } from '@/lib/actions/products';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents);
}

interface ProductGridProps {
  initialProducts: ProductListItem[];
  initialHasMore: boolean;
  type?: string;
  search?: string;
  sort?: string;
}

export function ProductGrid({
  initialProducts,
  initialHasMore,
  type = 'all',
  search = '',
  sort = 'popular',
}: ProductGridProps) {
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await getProducts({ type, search, sort, page, limit: 12 });
      setProducts((prev) => [...prev, ...result.products]);
      setHasMore(result.hasMore);
      setPage((p) => p + 1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, type, search, sort]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Reset when filters change
  useEffect(() => {
    setProducts(initialProducts);
    setHasMore(initialHasMore);
    setPage(2);
  }, [initialProducts, initialHasMore, type, search, sort]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            formatPrice={formatPrice}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {/* Loading state */}
      {loading && (
        <div className="mt-6">
          <SkeletonGrid />
        </div>
      )}

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg mb-2">No se encontraron productos</p>
          <p className="text-sm text-muted-foreground">Intenta con otros filtros o términos de búsqueda</p>
        </div>
      )}

      {/* End of list */}
      {!hasMore && products.length > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-8">
          Mostrando todos los {products.length} productos
        </p>
      )}
    </div>
  );
}
