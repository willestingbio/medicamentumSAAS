'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function runAnimations() {
  const ctx = gsap.context(() => {
    // Ejemplos
    const ejemplosSection = document.querySelector('#ejemplos');
    if (ejemplosSection) {
      const ejemplosTitle = ejemplosSection.querySelector('[data-anim="ejemplos-title"]');
      const ejemplosCards = ejemplosSection.querySelectorAll('[data-anim="ejemplo-card"]');

      if (ejemplosTitle) {
        gsap.fromTo(ejemplosTitle,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: ejemplosTitle, start: 'top 88%', once: true } }
        );
      }
      if (ejemplosCards.length) {
        gsap.fromTo(ejemplosCards,
          { opacity: 0, y: 50, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power2.out', stagger: 0.1,
            scrollTrigger: { trigger: ejemplosSection, start: 'top 80%', once: true } }
        );
      }
    }

    // Blog
    const blogSection = document.querySelector('#blog');
    if (blogSection) {
      const blogTitle = blogSection.querySelector('[data-anim="blog-title"]');
      const blogCards = blogSection.querySelectorAll('[data-anim="blog-card"]');

      if (blogTitle) {
        gsap.fromTo(blogTitle,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
            scrollTrigger: { trigger: blogTitle, start: 'top 88%', once: true } }
        );
      }
      if (blogCards.length) {
        gsap.fromTo(blogCards,
          { opacity: 0, y: 40, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08,
            scrollTrigger: { trigger: blogSection, start: 'top 80%', once: true } }
        );
      }
    }

    // Hero parallax
    const heroContent = document.querySelector('[data-anim="hero-content"]');
    if (heroContent) {
      gsap.to(heroContent, {
        y: -30, opacity: 0.7, ease: 'none',
        scrollTrigger: { trigger: heroContent, start: 'top top', end: 'bottom top', scrub: 1 },
      });
    }

    // Nosotros icons
    const nosotrosIcons = document.querySelectorAll('[data-anim="nosotros-icon"]');
    if (nosotrosIcons.length) {
      gsap.fromTo(nosotrosIcons,
        { scale: 0, rotation: -10 },
        { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.5)', stagger: 0.08,
          scrollTrigger: { trigger: nosotrosIcons[0], start: 'top 88%', once: true } }
      );
    }
  });
  return ctx;
}

export function LandingAnimations() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Kill any stale ScrollTriggers first
    ScrollTrigger.getAll().forEach(t => t.kill());

    const timer = setTimeout(() => {
      const ctx = runAnimations();
      return () => ctx.revert();
    }, 400);

    return () => {
      clearTimeout(timer);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return null;
}
