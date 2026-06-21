'use client';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

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
    excerpt: 'Cómo la inteligencia artificial puede reducir hasta un 40% del tiempo administrativo en procesos de admisión y scheduling.',
    date: '1 Jun 2026',
    tag: 'IA',
  },
  {
    title: 'Certificaciones médicas digitales: guía completa 2026',
    excerpt: 'Todo lo que necesitas saber sobre diplomas digitales verificables, blockchain y estándares internacionales.',
    date: '25 May 2026',
    tag: 'Certificación',
  },
  {
    title: 'Tablet vs Desktop: rendimiento en aulas hospitalarias',
    excerpt: 'Estudio comparativo del acceso a contenidos formativos desde dispositivos táctiles en entornos clínicos.',
    date: '18 May 2026',
    tag: 'Dispositivos',
  },
];

export function BlogCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: false,
  });

  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevEnabled(emblaApi.canScrollPrev());
    setNextEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isHovering && emblaApi) emblaApi.scrollNext();
    }, 4000);
  }, [isHovering, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    startAutoScroll();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [emblaApi, startAutoScroll]);

  return (
    <section
      id="blog"
      className="py-24 bg-secondary/30"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') scrollPrev();
        if (e.key === 'ArrowRight') scrollNext();
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Artículos del blog"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Blog</h2>
            <p className="text-muted-foreground">Artículos, guías y casos de estudio.</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={scrollPrev}
              disabled={!prevEnabled}
              className="size-9 rounded-full border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={scrollNext}
              disabled={!nextEnabled}
              className="size-9 rounded-full border flex items-center justify-center hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {posts.map(({ title, excerpt, date, tag }) => (
              <div key={title} className="min-w-[280px] max-w-[320px] flex-shrink-0">
                <article className="h-full">
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                          {tag}
                        </span>
                        <time className="text-xs text-muted-foreground" dateTime={date}>{date}</time>
                      </div>
                      <CardTitle className="text-base mb-2 leading-snug flex-shrink-0">{title}</CardTitle>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-4">{excerpt}</p>
                      <a
                        href="#"
                        className="inline-flex items-center text-sm text-primary font-medium mt-4 group-hover:gap-1 transition-all"
                        aria-label={`Leer más: ${title}`}
                      >
                        Leer más <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </CardContent>
                  </Card>
                </article>
              </div>
            ))}
          </div>
        </div>

        <a href="#" className="sm:hidden inline-flex items-center text-sm font-medium text-primary hover:underline mt-4">
          Ver todos los artículos <ArrowRight className="size-4 ml-1" />
        </a>
      </div>
    </section>
  );
}
