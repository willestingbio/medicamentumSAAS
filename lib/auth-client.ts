'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client configuration with typed session.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  plugins: [
    // customSessionClient no se necesita por separado;
    // la inferencia se da desde el tipo del servidor.
  ],
});

// Export hooks para conveniencia
export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;

// Tipo helper para usar en componentes cliente
export type ClientSession = typeof authClient.$Infer.Session;
