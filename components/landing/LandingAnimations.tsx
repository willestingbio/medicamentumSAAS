'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function LandingAnimations() {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || typeof window === 'undefined') return;
    hasAnimated.current = true;

    const ctx = gsap.context(() => {
      // Ejemplos section — reveal from Nosotros direction (upward, as if emerging from Nosotros)
      const ejemplosSection = document.querySelector('#ejemplos');
      if (ejemplosSection) {
        const ejemplosCards = ejemplosSection.querySelectorAll('[data-anim="ejemplo-card"]');
        const ejemplosTitle = ejemplosSection.querySelector('[data-anim="ejemplos-title"]');

        // Title slides in from left (originating from Nosotros position)
        if (ejemplosTitle) {
          gsap.fromTo(ejemplosTitle,
            { opacity: 0, x: -60, scale: 0.95 },
            {
              opacity: 1, x: 0, scale: 1,
              duration: 0.5,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: ejemplosTitle,
                start: 'top 85%',
                once: true,
              },
            }
          );
        }

        // Cards fan out from center-bottom as if unfolding from Nosotros
        if (ejemplosCards.length) {
          gsap.fromTo(ejemplosCards,
            {
              opacity: 0,
              y: 80,
              scale: 0.85,
              rotateX: 15,
              transformOrigin: 'center bottom',
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              rotateX: 0,
              duration: 0.6,
              ease: 'power3.out',
              stagger: 0.12,
              scrollTrigger: {
                trigger: ejemplosSection,
                start: 'top 75%',
                once: true,
              },
            }
          );
        }
      }

      // Blog section — reveal from right side (as if originating from Ejemplos)
      const blogSection = document.querySelector('#blog');
      if (blogSection) {
        const blogCards = blogSection.querySelectorAll('[data-anim="blog-card"]');
        const blogTitle = blogSection.querySelector('[data-anim="blog-title"]');

        if (blogTitle) {
          gsap.fromTo(blogTitle,
            { opacity: 0, x: 60, scale: 0.95 },
            {
              opacity: 1, x: 0, scale: 1,
              duration: 0.5,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: blogTitle,
                start: 'top 85%',
                once: true,
              },
            }
          );
        }

        // Blog cards slide in from right with stagger
        if (blogCards.length) {
          gsap.fromTo(blogCards,
            {
              opacity: 0,
              x: 100,
              scale: 0.9,
              rotateY: -8,
              transformOrigin: 'left center',
            },
            {
              opacity: 1,
              x: 0,
              scale: 1,
              rotateY: 0,
              duration: 0.6,
              ease: 'power3.out',
              stagger: 0.1,
              scrollTrigger: {
                trigger: blogSection,
                start: 'top 75%',
                once: true,
              },
            }
          );
        }
      }

      // Hero parallax — subtle upward drift on scroll
      const heroContent = document.querySelector('[data-anim="hero-content"]');
      if (heroContent) {
        gsap.to(heroContent, {
          y: -40,
          opacity: 0.6,
          ease: 'none',
          scrollTrigger: {
            trigger: heroContent,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

      // Nosotros icons — scale pop on scroll
      const nosotrosIcons = document.querySelectorAll('[data-anim="nosotros-icon"]');
      if (nosotrosIcons.length) {
        gsap.fromTo(nosotrosIcons,
          { scale: 0, rotation: -15 },
          {
            scale: 1,
            rotation: 0,
            duration: 0.4,
            ease: 'back.out(2)',
            stagger: 0.1,
            scrollTrigger: {
              trigger: nosotrosIcons[0],
              start: 'top 85%',
              once: true,
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return null;
}
