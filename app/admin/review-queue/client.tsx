'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewProductCard } from '@/components/admin/review-product-card';
import { ReviewVendorCard } from '@/components/admin/review-vendor-card';
import { Package, Store } from 'lucide-react';

interface ReviewProduct {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  reviewStatus: string;
  vendor: { displayName: string } | null;
  course: { _count: { modules: number; lessons: number } } | null;
  warnings: string[];
}

interface VendorItem {
  id: string;
  displayName: string;
  status: string;
  createdAt: Date;
  user: { email: string; name: string };
}

export function ReviewQueueClient({
  products,
  vendors,
}: {
  products: ReviewProduct[];
  vendors: VendorItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState('products');

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Cola de revisión
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa y aprueba productos y vendedores pendientes.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="size-4" />
            Productos pendientes
            {products.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {products.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1.5">
            <Store className="size-4" />
            Vendors pendientes
            {vendors.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {vendors.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No hay productos pendientes de revisión
              </p>
            </div>
          ) : (
            products.map((p) => (
              <ReviewProductCard key={p.id} product={p} onAction={refresh} />
            ))
          )}
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          {vendors.length === 0 ? (
            <div className="text-center py-16">
              <Store className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">
                No hay vendedores pendientes de revisión
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vendors.map((v) => (
                <ReviewVendorCard key={v.id} vendor={v} onAction={refresh} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
