import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Brain, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/ScrollReveal';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background — CSS-only, no JS */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/20 dark:from-primary/10 dark:to-accent/30 pointer-events-none" />
      <div
        className={cn(
          "absolute inset-0 bg-[length:200%_200%] motion-safe:animate-gradient-shift pointer-events-none",
          "bg-gradient-to-br from-primary/[0.08] via-primary/[0.02] to-accent/[0.12]",
          "dark:from-primary/[0.12] dark:via-primary/[0.04] dark:to-accent/[0.18]",
        )}
      />
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-24 lg:py-32 relative">
        <div className="max-w-3xl mx-auto text-center" data-anim="hero-content">
          {/* Badge */}
          <ScrollReveal delay={0}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <GraduationCap className="size-4" />
              Educación médica de nueva generación
            </div>
          </ScrollReveal>

          {/* Headline */}
          <ScrollReveal delay={100}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight mb-6">
              Formación médica con{' '}
              <span className="text-primary">tecnología inmersiva</span>
            </h1>
          </ScrollReveal>

          {/* Subheadline */}
          <ScrollReveal delay={200}>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
              Cursos especializados, simulaciones VR y herramientas de IA para hospitales. Certificaciones oficiales integradas con Moodle.
            </p>
          </ScrollReveal>

          {/* CTAs */}
          <ScrollReveal delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8 btn-press">
                <Link href="/sign-up">Comenzar gratis</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full btn-press">
                <Link href="/productos">Ver cursos</Link>
              </Button>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal delay={400}>
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t">
              {[
                { value: '500+', label: 'Hospitales' },
                { value: '12k+', label: 'Estudiantes' },
                { value: '98%', label: 'Satisfacción' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Features preview */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              icon: Video,
              title: 'Cursos inmersivos',
              desc: 'Contenido especializado con casos clínicos reales y evaluaciones automatizadas.',
            },
            {
              icon: Brain,
              title: 'Simulaciones VR',
              desc: 'Experiencias de realidad virtual para procedimientos y diagnósticos.',
            },
            {
              icon: GraduationCap,
              title: 'Certificación oficial',
              desc: 'Diplomas digitales verificables, integrados con tu LMS institucional.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <ScrollReveal key={title} delay={500 + i * 100}>
              <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm card-hover">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
