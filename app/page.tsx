import { BlogCarousel } from '@/components/landing/BlogCarousel';
import { Ejemplos } from '@/components/landing/Ejemplos';
import { Hero } from '@/components/landing/Hero';
import { Nosotros } from '@/components/landing/Nosotros';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Nosotros />
      <Ejemplos />
      <BlogCarousel />
    </>
  );
}