import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';

/**
 * Better Auth server configuration.
 * 
 * Endpoints:
 * - POST/GET /api/auth/sign-up
 * - POST/GET /api/auth/sign-in
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - POST /api/auth/sign-in/google (OAuth)
 * 
 * Documentación: https://better-auth.com/docs
 */
export const auth = betterAuth({
  appName: 'Medicamentum360',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email + contraseña
  emailAndPassword: {
    enabled: true,
    autoSignInAfterSignUp: true,
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  // Validación de email (MVP simple, sin verificación)
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'student',
        required: true,
      },
      organizationId: {
        type: 'string',
        required: false,
      },
      moodleUserId: {
        type: 'number',
        required: false,
      },
      specialty: {
        type: 'string',
        required: false,
      },
      locale: {
        type: 'string',
        defaultValue: 'es',
        required: true,
      },
      theme: {
        type: 'string',
        defaultValue: 'system',
        required: true,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60, // Refrescar cada hora
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 1 día en cookie
    },
  },

  // Hooks para validación y lógica personalizada
  hooks: {
    before: [
      {
        // Validar antes de sign-up
        matcher: (ctx) => ctx.path === '/sign-up' && ctx.method === 'POST',
        handler: async (ctx) => {
          // Validaciones adicionales si son necesarias
          // Ej: verificar si el email pertenece a un dominio hospitalario
        },
      },
    ],
    after: [
      {
        // Post sign-up: crear cuenta espejo en Moodle
        matcher: (ctx) => ctx.path === '/sign-up' && ctx.method === 'POST',
        handler: async (ctx) => {
          console.log('[Auth Hook] Post sign-up:', {
            userId: ctx.context.user?.id,
            email: ctx.context.user?.email,
          });
          // La integración con Moodle se hace en lib/moodle/client.ts
          // y se dispara desde un server action o API route, no aquí
        },
      },
    ],
  },

  // Configuración avanzada de seguridad (Fase 8)
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    disableCSRFCheck: false,
  },
});

// Type exports para usar en Server Components y Server Actions
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
