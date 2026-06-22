import { ProductCard } from '@/components/marketplace/ProductCard';
import { FilterBar } from '@/components/marketplace/FilterBar';

const placeholderProducts = [
  {
    id: '1',
    type: 'course' as const,
    title: 'Cardiología Avanzada',
    slug: 'cardiologia-avanzada',
    description: 'Casos clínicos interactivos para residentes de cardiología. Interpretación de ECG, manejo de arritmias y protocolos de emergencia.',
    priceCents: 150000,
    discountCents: null,
    coverImageUrl: null,
    capacity: 30,
    rating: 4.8,
    reviewCount: 24,
    published: true,
  },
  {
    id: '2',
    type: 'vr_experience' as const,
    title: 'Neurocirugía Virtual',
    slug: 'neurocirugia-virtual',
    description: 'Simulaciones de procedimientos neuroquirúrgicos con feedback en tiempo real. Visualización 3D de anatomía cerebral.',
    priceCents: 250000,
    discountCents: 200000,
    coverImageUrl: null,
    capacity: 15,
    rating: 4.9,
    reviewCount: 8,
    published: true,
  },
  {
    id: '3',
    type: 'course' as const,
    title: 'Medicina de Urgencias',
    slug: 'medicina-urgencias',
    description: 'Curso intensivo de atención trauma y código sepsis. Escenarios simulados para entrenamiento en equipo multidisciplinar.',
    priceCents: 120000,
    discountCents: null,
    coverImageUrl: null,
    capacity: 50,
    rating: 4.7,
    reviewCount: 36,
    published: true,
  },
  {
    id: '4',
    type: 'ai_automation' as const,
    title: 'Automatización de Admisión Hospitalaria',
    slug: 'automatizacion-admision',
    description: 'Reduce hasta un 40% del tiempo administrativo en procesos de admisión y scheduling con IA.',
    priceCents: 350000,
    discountCents: 300000,
    coverImageUrl: null,
    capacity: null,
    rating: 4.6,
    reviewCount: 12,
    published: true,
  },
  {
    id: '5',
    type: 'course' as const,
    title: 'Enfermería Critical Care',
    slug: 'enfermeria-critical-care',
    description: 'Formación especializada en cuidados intensivos. Manejo de ventilación mecánica, hemodinamia y sedación.',
    priceCents: 180000,
    discountCents: null,
    coverImageUrl: null,
    capacity: 40,
    rating: 4.8,
    reviewCount: 19,
    published: true,
  },
  {
    id: '6',
    type: 'vr_experience' as const,
    title: 'Anatomía Humana 3D',
    slug: 'anatomia-humana-3d',
    description: 'Exploración inmersiva del cuerpo humano con modelos anatómicos de alta fidelidad. Ideal para estudiantes de medicina.',
    priceCents: 200000,
    discountCents: null,
    coverImageUrl: null,
    capacity: 25,
    rating: 4.9,
    reviewCount: 42,
    published: true,
  },
];

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents);
}

export default function MarketplacePage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Explora cursos, experiencias VR y automatizaciones para tu hospital.</p>
        </div>

        {/* Filters */}
        <FilterBar />

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {placeholderProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
