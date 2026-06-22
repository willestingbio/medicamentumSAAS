import { BlogCarousel } from '@/components/landing/BlogCarousel';
import { Ejemplos } from '@/components/landing/Ejemplos';
import { Hero } from '@/components/landing/Hero';
import { LandingAnimations } from '@/components/landing/LandingAnimations';
import { Nosotros } from '@/components/landing/Nosotros';

export default function HomePage() {
  return (
    <>
      <LandingAnimations />
      <section id="hero"><Hero /></section>
      <section id="nosotros"><Nosotros /></section>
      <section id="ejemplos"><Ejemplos /></section>
      <section id="blog"><BlogCarousel /></section>
    </>
  );
}
