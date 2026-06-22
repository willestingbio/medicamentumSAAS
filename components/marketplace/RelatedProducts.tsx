import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

const relatedProducts = [
  {
    title: 'Enfermería Critical Care',
    slug: 'enfermeria-critical-care',
    type: 'Curso',
    price: '$180.000',
    rating: 4.8,
    reviewCount: 19,
  },
  {
    title: 'Anatomía Humana 3D',
    slug: 'anatomia-humana-3d',
    type: 'VR',
    price: '$200.000',
    rating: 4.9,
    reviewCount: 42,
  },
  {
    title: 'Medicina de Urgencias',
    slug: 'medicina-urgencias',
    type: 'Curso',
    price: '$120.000',
    rating: 4.7,
    reviewCount: 36,
  },
];

export function RelatedProducts({ currentSlug }: { currentSlug: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4">Productos relacionados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {relatedProducts
          .filter((p) => p.slug !== currentSlug)
          .slice(0, 3)
          .map((product) => (
            <Link key={product.slug} href={`/productos/${product.slug}`}>
              <Card className="group card-hover h-full">
                <CardContent className="p-4">
                  <div className="aspect-video rounded-lg bg-muted mb-3 flex items-center justify-center text-muted-foreground text-sm">
                    📚
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {product.type}
                  </span>
                  <h3 className="font-medium text-foreground mt-2 group-hover:text-primary transition-colors line-clamp-1">
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-foreground">{product.price}</span>
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{product.rating}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>
    </div>
  );
}
