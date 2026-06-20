'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client configuration.
 * 
 * Exported hooks:
 * - useSession() — Get current session
 * - useAuthActions() — signIn, signUp, signOut
 * 
 * Usage en componentes:
 * ```tsx
 * 'use client';
 * import { authClient } from '@/lib/auth-client';
 * 
 * export function SignInButton() {
 *   const { signIn } = authClient;
 *   return (
 *     <button onClick={() => signIn.email({ email: 'test@example.com', password: 'pass' })}>
 *       Sign In
 *     </button>
 *   );
 * }
 * ```
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  fetchOptions: {
    // Revalidate session every 5 minutes
    revalidateTags: ['auth'],
  },
});

// Export hooks para conveniencia
export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
