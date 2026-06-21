'use client';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GraduationCap, Monitor, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    icon: GraduationCap,
    title: 'Formación médica sin límites',
    description:
      'Capacita a tu equipo hospitalario con cursos especializados, simulaciones VR y automatizaciones con IA, todo desde una sola plataforma.',
  },
  {
    icon: Monitor,
    title: 'Aprendizaje inmersivo',
    description:
      'Accede a un LMS potente con tracking de progreso, calendario integrado y certificaciones digitales verificables al completar cada curso.',
  },
  {
    icon: Award,
    title: 'Certificaciones con validez',
    description:
      'Obtén diplomas digitales que puedes compartir en LinkedIn y descargar en PDF. Tu historial académico siempre disponible.',
  },
];

export function AuthCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isHovering && emblaApi) emblaApi.scrollNext();
    }, 5000);
  }, [isHovering, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    startAutoScroll();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [emblaApi, startAutoScroll]);

  return (
    <div
      className="relative flex flex-col justify-center h-full px-8 py-12"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="min-w-full flex-shrink-0">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Icon className="size-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground max-w-sm">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Pasos">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            role="tab"
            aria-selected={i === selectedIndex}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === selectedIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

