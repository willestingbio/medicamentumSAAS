import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';
import { createClient } from '@insforge/sdk';
import jwt from 'jsonwebtoken';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Cliente InsForge server-side para enviar emails transaccionales.
 * Los callbacks de Better Auth se ejecutan sin sesión de usuario,
 * así que firmamos un JWT de servicio de 5 minutos con INSFORGE_JWT_SECRET.
 */
function insforgeServerClient() {
  const token = jwt.sign(
    { sub: 'better-auth-service', role: 'authenticated', aud: 'insforge-api' },
    requireEnv('INSFORGE_JWT_SECRET'),
    { algorithm: 'HS256', expiresIn: '5m' },
  );
  const c = createClient({ baseUrl: requireEnv('NEXT_PUBLIC_INSFORGE_BASE_URL') });
  c.getHttpClient().setAuthToken(token);
  return c;
}

/**
 * Better Auth server configuration.
 * 
 * Endpoints:
 * - POST/GET /api/auth/sign-up
 * - POST/GET /api/auth/sign-in
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - POST /api/auth/sign-in/google (OAuth)
 * - POST /api/auth/forget-password
 * - POST /api/auth/reset-password
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

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const insforge = insforgeServerClient();
      const { error } = await insforge.emails.send({
        to: user.email,
        subject: 'Restablece tu contraseña — Medicamentum360',
        html: `<p>Hola ${user.name ?? ''},</p>
<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
<p><a href="${url}">Restablecer contraseña</a></p>
<p>Si no solicitaste esto, ignora este mensaje.</p>`,
      });
      if (error) throw new Error(error.message);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const insforge = insforgeServerClient();
      const { error } = await insforge.emails.send({
        to: user.email,
        subject: 'Verifica tu email — Medicamentum360',
        html: `<p>Hola ${user.name ?? ''},</p>
<p>Gracias por registrarte. Haz clic en el siguiente enlace para verificar tu email:</p>
<p><a href="${url}">Verificar email</a></p>`,
      });
      if (error) throw new Error(error.message);
    },
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  // Verificación de email vía InsForge (Brevo SMTP o cloud relay)
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

  hooks: {
    before: async () => {
      // Validaciones antes de sign-up
    },
    after: async (ctx: any) => {
      if (ctx.path === '/sign-up' && ctx.method === 'POST') {
        if (!ctx.context.user?.email || !ctx.context.user?.name) return;
        try {
          const { createMoodleUser } = await import('./moodle/client');
          const nameParts = ctx.context.user.name.trim().split(' ');
          const firstname = nameParts[0] || ctx.context.user.name;
          const lastname = nameParts.length > 1
            ? nameParts.slice(1).join(' ')
            : firstname;
          const moodleUserId = await createMoodleUser({
            username: ctx.context.user.email.split('@')[0],
            email: ctx.context.user.email,
            firstname,
            lastname,
            password: crypto.randomUUID().slice(0, 12) + '!Aa1',
          });
          if (moodleUserId) {
            const { prisma } = await import('./prisma');
            await prisma.user.update({
              where: { id: ctx.context.user.id },
              data: { moodleUserId },
            });
          }
        } catch (e) {
          console.warn('[Auth Hook] Moodle user creation skipped:', e instanceof Error ? e.message : e);
        }
      }
    },
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
