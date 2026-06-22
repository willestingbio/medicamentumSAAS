import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/marketplace/Breadcrumb';
import { ProductInfoPanel } from '@/components/marketplace/ProductInfoPanel';
import { ProductReviews } from '@/components/marketplace/ProductReviews';
import { RelatedProducts } from '@/components/marketplace/RelatedProducts';
import { VRViewer } from '@/components/marketplace/VRViewer';
import { getProductBySlug } from '@/lib/actions/products';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents);
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'course': return 'Curso';
    case 'vr_experience': return 'Experiencia VR';
    case 'ai_automation': return 'Automatización IA';
    default: return type;
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const isVR = product.type === 'vr_experience';

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Marketplace', href: '/productos' },
            { label: product.title },
          ]}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left Column — Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media: VR viewer or image placeholder */}
            {isVR ? (
              <VRViewer assetUrl={product.vrAssetUrl} />
            ) : (
              <div className="aspect-video rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">
                    {product.type === 'ai_automation' ? '🤖' : '📚'}
                  </span>
                  <p className="text-sm">{getTypeLabel(product.type)}</p>
                </div>
              </div>
            )}

            {/* Description */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Descripción</h2>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </section>

            {/* Reviews */}
            <ProductReviews
              reviews={product.reviews.map((r) => ({
                id: r.id,
                author: r.user.name,
                rating: r.rating,
                comment: r.comment || '',
                date: r.createdAt.toISOString().split('T')[0],
              }))}
            />
          </div>

          {/* Right Column — Sticky Info Panel */}
          <div className="lg:col-span-1">
            <ProductInfoPanel
              product={{
                title: product.title,
                type: product.type,
                priceCents: product.priceCents,
                discountCents: product.discountCents,
                capacity: product.capacity,
                enrolled: product._count.enrollments,
                rating: product.rating,
                reviewCount: product.reviewCount,
                instructor: 'Instructor',
                duration: 'Variable',
              }}
              formatPrice={formatPrice}
            />
          </div>
        </div>

        {/* Related Products */}
        <section className="mt-16">
          <RelatedProducts currentSlug={product.slug} />
        </section>
      </div>
    </div>
  );
}
