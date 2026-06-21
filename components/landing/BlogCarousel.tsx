'use client';
import { useEffect, useRef } from 'react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHovering = useRef(false);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('[data-post]') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 24; // gap-6 = 24px
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -cardWidth * 2 : cardWidth * 2,
      behavior: 'smooth',
    });
  };

  const startAutoScroll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isHovering.current && scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        }
      }
    }, 4000);
  };

  useEffect(() => {
    startAutoScroll();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleMouseEnter = () => { isHovering.current = true; };
  const handleMouseLeave = () => { isHovering.current = false; };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') scroll('left');
    if (e.key === 'ArrowRight') scroll('right');
  };

  return (
    <section id="blog" className="py-24 bg-secondary/30" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Blog</h2>
            <p className="text-muted-foreground">Artículos, guías y casos de estudio.</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="size-9 rounded-full border flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="size-9 rounded-full border flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={() => { if (intervalRef.current) clearInterval(intervalRef.current); }}
          onTouchEnd={startAutoScroll}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
          aria-label="Artículos del blog"
        >
          {posts.map(({ title, excerpt, date, tag }) => (
            <article
              key={title}
              data-post
              className="min-w-[280px] max-w-[320px] snap-start flex-shrink-0"
            >
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
          ))}
        </div>

        <a href="#" className="sm:hidden inline-flex items-center text-sm font-medium text-primary hover:underline mt-4">
          Ver todos los artículos <ArrowRight className="size-4 ml-1" />
        </a>
      </div>
    </section>
  );
}