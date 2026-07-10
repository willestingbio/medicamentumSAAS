import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { customSession } from 'better-auth/plugins';
import { prisma } from './prisma';
import type { AppUser } from './auth-types';

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
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[Auth] BREVO_API_KEY not configured — email skipped');
    return;
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: 'Medicamentum360', email: 'noreply@medicamentum360.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) console.warn('[Auth] Brevo email failed:', res.status);
  } catch (e) {
    console.warn('[Auth] Email send skipped:', e instanceof Error ? e.message : e);
  }
}

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
      await sendEmail(
        user.email,
        'Restablece tu contraseña — Medicamentum360',
        `<p>Hola ${user.name ?? ''},</p>
<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
<p><a href="${url}">Restablecer contraseña</a></p>
<p>Si no solicitaste esto, ignora este mensaje.</p>`,
      );
    },
  },

  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        user.email,
        'Verifica tu email — Medicamentum360',
        `<p>Hola ${user.name ?? ''},</p>
<p>Gracias por registrarte. Haz clic en el siguiente enlace para verificar tu email:</p>
<p><a href="${url}">Verificar email</a></p>`,
      );
    },
  },

  // Google OAuth
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },

  // Campos adicionales del usuario
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
        if (ctx.context.user?.email && ctx.context.user?.name) {
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
      }
      return {};
    },
  },

  plugins: [
    customSession(async ({ user, session }) => {
      const u = user as unknown as AppUser;

      let vendorStatus: AppUser['vendorStatus'] = null;
      try {
        const vendor = await prisma.vendor.findUnique({
          where: { userId: u.id },
          select: { status: true },
        });
        vendorStatus = vendor?.status ?? null;
      } catch {
        // Si la tabla vendor no existe todavía (first deploy), ignorar
      }

      return {
        user: {
          ...u,
          vendorStatus,
        },
        session,
      };
    }),
  ],

  // Rate limiting: en producción VPS, migrar a Redis store cuando esté disponible
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    storage: 'memory',
  },

  onAPIError: {
    throw: false,
  },

  // Configuración avanzada de seguridad (Fase 8)
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    disableCSRFCheck: false,
  },
});

// Type exports para usar en Server Components y Server Actions
export type Session = typeof auth.$Infer.Session & { user: AppUser };
export type User = AppUser;
