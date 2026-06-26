import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { rlsClaimsStore } from '@/lib/rls-store';

const { GET: rawGet, POST: rawPost } = toNextJsHandler(auth);

function wrap(fn: (req: Request) => Promise<Response>): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      const session = await auth.api.getSession({ headers: Object.fromEntries(req.headers.entries()) }).catch(() => null);
      const claims = session ? {
        sub: session.user.id,
        user_role: (session.user as any)?.role || 'student',
        organization_id: (session.user as any)?.organizationId || '',
      } : null;
      return rlsClaimsStore.run(claims, () => fn(req));
    } catch (e: any) {
      console.error('[Auth Handler Error]', e);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  };
}

export const GET = wrap(rawGet);
export const POST = wrap(rawPost);
