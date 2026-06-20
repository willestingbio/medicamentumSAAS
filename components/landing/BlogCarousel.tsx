'use client';
import { useRef } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const posts = [
  {
    title: 'Cómo implementar LMS en hospitales públicos',
    excerpt: 'Guía práctica para hospitales públicos que buscan digitalizar la formación de su personal sin comprometer la seguridad de datos clínicos.',
    date: '15 Jun 2026',
    tag: 'Guía',
  },
  {
    title: 'Realidad virtual en la formación médica: estado del arte 2026',
    excerpt: 'Análisis del uso de VR/AR en facultades de medicina y hospitales. Casos de éxito en Colombia, México y Brasil.',
    date: '8 Jun 2026',
    tag: 'Tecnología',
  },
  {
    title: 'Automatización con IA: casos de uso en administración hospitalaria',
    excerpt: 'Cómo la inteligencia artificial puede reducir hasta un 40% del tiempo administrativo en procesos de admission y scheduling.',
    date: '1 Jun 2026',
    tag: 'IA',
  },
];

export function BlogCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Blog</h2>
            <p className="text-muted-foreground">Artículos, guías y casos de estudio.</p>
          </div>
          <a href="#" className="hidden sm:inline-flex items-center text-sm font-medium text-primary hover:underline">
            Ver todos <ArrowRight className="size-4 ml-1" />
          </a>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {posts.map(({ title, excerpt, date, tag }) => (
            <Card key={title} className="min-w-[280px] max-w-[320px] snap-start flex-shrink-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                    {tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
                <CardTitle className="text-base mb-2 leading-snug">{title}</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{excerpt}</p>
                <a href="#" className="inline-flex items-center text-sm text-primary font-medium mt-4 hover:underline">
                  Leer más <ArrowRight className="size-4 ml-1" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <a href="#" className="sm:hidden inline-flex items-center text-sm font-medium text-primary hover:underline mt-4">
          Ver todos los artículos <ArrowRight className="size-4 ml-1" />
        </a>
      </div>
    </section>
  );
}