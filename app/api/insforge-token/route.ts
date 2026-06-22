import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const { headers } = await import('next/headers');
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const { default: jwt } = await import('jsonwebtoken');

  const token = jwt.sign(
    {
      sub: session.user.id,
      role: 'authenticated',
      aud: 'insforge-api',
      user_role: (session.user as any)?.role || 'student',
      organization_id: (session.user as any)?.organizationId || '',
    },
    process.env.INSFORGE_JWT_SECRET || '',
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  return NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
