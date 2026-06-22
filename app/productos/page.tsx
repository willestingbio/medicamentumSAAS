import { ProductGrid } from '@/components/marketplace/ProductGrid';
import { FilterBar } from '@/components/marketplace/FilterBar';
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

  const { products, hasMore } = await getProducts({ type, search, sort, page: 1, limit: 12 });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Filters */}
        <FilterBar />

        {/* Product Grid with infinite scroll */}
        <div className="mt-6">
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
