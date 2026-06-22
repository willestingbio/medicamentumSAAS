import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { getRelatedProducts } from '@/lib/actions/products';

export async function RelatedProducts({ currentSlug }: { currentSlug: string }) {
  const products = await getRelatedProducts(currentSlug, 3);

  if (products.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4">Productos relacionados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {products.map((product) => (
          <Link key={product.slug} href={`/productos/${product.slug}`}>
            <Card className="group card-hover h-full">
              <CardContent className="p-4">
                <div className="aspect-video rounded-lg bg-muted mb-3 flex items-center justify-center text-muted-foreground text-sm">
                  {product.type === 'vr_experience' ? '🎓' : product.type === 'ai_automation' ? '🤖' : '📚'}
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {product.type === 'course' ? 'Curso' : product.type === 'vr_experience' ? 'VR' : 'IA'}
                </span>
                <h3 className="font-medium text-foreground mt-2 group-hover:text-primary transition-colors line-clamp-1">
                  {product.title}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-foreground">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.priceCents)}
                  </span>
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{product.rating}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
