import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/marketplace/Breadcrumb';
import { ProductInfoPanel } from '@/components/marketplace/ProductInfoPanel';
import { ProductReviews } from '@/components/marketplace/ProductReviews';
import { RelatedProducts } from '@/components/marketplace/RelatedProducts';
import { ChevronRight } from 'lucide-react';

// Placeholder data — replace with DB query
const products: Record<string, any> = {
  'cardiologia-avanzada': {
    id: '1',
    type: 'course',
    title: 'Cardiología Avanzada',
    slug: 'cardiologia-avanzada',
    description: 'Casos clínicos interactivos para residentes de cardiología. Interpretación de ECG, manejo de arritmias y protocolos de emergencia. Este curso incluye más de 50 casos clínicos con retroalimentación inmediata, simulaciones de emergencias cardíacas y acceso a una biblioteca de electrocardiogramas annotados.',
    priceCents: 150000,
    discountCents: null,
    coverImageUrl: null,
    capacity: 30,
    enrolled: 18,
    rating: 4.8,
    reviewCount: 24,
    instructor: 'Dr. Carlos Méndez',
    duration: '8 semanas',
    modules: [
      'Interpretación de ECG básica y avanzada',
      'Manejo de arritmias cardíacas',
      'Protocolos de emergencia cardiológica',
      'Casos clínicos interactivos',
      'Evaluación final y certificación',
    ],
    requirements: [
      'Ser médico o residente de medicina',
      'Conocimientos básicos de fisiología cardíaca',
    ],
    audience: 'Residentes de cardiología, médicos generales en urgencias, personal de UCIN',
    reviews: [
      { id: '1', author: 'Dra. María López', rating: 5, comment: 'Excelente curso, los casos clínicos son muy realistas.', date: '2026-05-15' },
      { id: '2', author: 'Dr. Andrés Ramírez', rating: 5, comment: 'Me ayudó mucho en mi rotación de cardiología.', date: '2026-05-10' },
      { id: '3', author: 'Enf. Laura Gómez', rating: 4, comment: 'Muy buen contenido,would like more emergency cases.', date: '2026-04-28' },
    ],
  },
};

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
  const product = products[slug];

  if (!product) {
    notFound();
  }

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
            {/* Media placeholder */}
            <div className="aspect-video rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="text-4xl mb-2 block">
                  {product.type === 'vr_experience' ? '🎓' : product.type === 'ai_automation' ? '🤖' : '📚'}
                </span>
                <p className="text-sm">{getTypeLabel(product.type)}</p>
              </div>
            </div>

            {/* Description */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Descripción</h2>
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </section>

            {/* Modules / Temario */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Temario</h2>
              <ul className="space-y-2">
                {product.modules.map((mod: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <ChevronRight className="size-4 mt-0.5 text-primary shrink-0" />
                    {mod}
                  </li>
                ))}
              </ul>
            </section>

            {/* Requirements */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Requisitos</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {product.requirements.map((req: string, i: number) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </section>

            {/* Audience */}
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">Audiencia</h2>
              <p className="text-sm text-muted-foreground">{product.audience}</p>
            </section>

            {/* Reviews */}
            <ProductReviews reviews={product.reviews} />
          </div>

          {/* Right Column — Sticky Info Panel */}
          <div className="lg:col-span-1">
            <ProductInfoPanel product={product} formatPrice={formatPrice} />
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
