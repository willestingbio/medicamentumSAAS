import { BlogCarousel } from '@/components/landing/BlogCarousel';
import { Ejemplos } from '@/components/landing/Ejemplos';
import { Hero } from '@/components/landing/Hero';
import { Nosotros } from '@/components/landing/Nosotros';
import { ScrollReveal } from '@/components/ScrollReveal';

export default function HomePage() {
  return (
    <>
      <section id="hero"><Hero /></section>
      <section id="nosotros"><Nosotros /></section>
      <section id="ejemplos"><Ejemplos /></section>
      <ScrollReveal>
        <BlogCarousel />
      </ScrollReveal>
    </>
  );
}
