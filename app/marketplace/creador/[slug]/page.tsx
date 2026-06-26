import { notFound } from 'next/navigation';
import { getVendorPublicProfile } from '@/lib/actions/vendor/vendor-products';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Store } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorPublicProfile(slug);

  if (!vendor) {
    notFound();
  }

  const productsForGrid = vendor.products.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    slug: p.slug,
    description: p.description,
    priceCents: p.priceCents,
    discountCents: null as number | null,
    coverImageUrl: p.coverImageUrl,
    capacity: null as number | null,
    rating: 0,
    reviewCount: 0,
    published: true,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Vendor header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
              <Store className="size-7 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {vendor.displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Vendedor independiente
              </p>
            </div>
          </div>
          {vendor.bio && (
            <p className="text-muted-foreground max-w-2xl">{vendor.bio}</p>
          )}
        </div>

        {/* Products grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Productos ({vendor.products.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsForGrid.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
