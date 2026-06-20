'use client';

import { useEffect } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';

export function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run({
      language: {
        default: 'es',
        autoDetect: 'document',
        translations: {
          es: {
            consentModal: {
              title: 'Usamos cookies',
              description:
                'Utilizamos cookies para analítica, preferencias personalizadas y mejorar tu experiencia en Medicamentum360. Puedes aceptar todas o solo las necesarias.',
              acceptAllBtn: 'Aceptar todas',
              acceptNecessaryBtn: 'Rechazar no-necesarias',
              showPreferencesBtn: 'Cambiar preferencias',
              footer: `
                <a href="/privacidad" target="_blank" rel="noopener">Política de Privacidad</a>
                <a href="/terminos" target="_blank" rel="noopener">Términos y Condiciones</a>
              `,
            },
            preferencesModal: {
              title: 'Preferencias de cookies',
              savePreferencesBtn: 'Guardar preferencias',
              acceptAllBtn: 'Aceptar todas',
              acceptNecessaryBtn: 'Rechazar no-necesarias',
              sections: [
                {
                  title: 'Cookies estrictamente necesarias',
                  description:
                    'Estas cookies son esenciales para el funcionamiento del sitio. Sin ellas, muchas funciones no funcionarían.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Cookies de analítica',
                  description:
                    'Nos ayudan a entender cómo usas Medicamentum360 para mejorar tu experiencia.',
                  linkedCategory: 'analytics',
                },
              ],
            },
          },
        },
      },
      categories: {
        necessary: {
          enabled: true,
          readOnly: true,
        },
        analytics: {
          enabled: false,
        },
      },
      guiOptions: {
        consentModal: {
          layout: 'cloud',
          position: 'bottom right',
          equalWeightButtons: false,
          flipButtons: false,
        },
      },
    });
  }, []);

  return <div id="cookieconsent" />;
}
