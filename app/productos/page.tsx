import { FilterBar } from '@/components/marketplace/FilterBar';
import { ProductGrid } from '@/components/marketplace/ProductGrid';
import { getProducts } from '@/lib/actions/products';

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const type = typeof params.type === 'string' ? params.type : 'all';
  const search = typeof params.search === 'string' ? params.search : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'popular';

  const { products, total, hasMore } = await getProducts({ type, search, sort, page: 1, limit: 12 });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Explora cursos, experiencias VR y automatizaciones para tu hospital.
            {total > 0 && <span className="ml-1 text-foreground font-medium">{total} productos</span>}
          </p>
        </div>

        {/* Filters */}
        <FilterBar />

        {/* Product Grid with infinite scroll */}
        <div className="mt-8">
          <ProductGrid
            initialProducts={products}
            initialHasMore={hasMore}
            type={type}
            search={search}
            sort={sort}
          />
        </div>
      </div>
    </div>
  );
}
