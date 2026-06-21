import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const token = jwt.sign(
    {
      sub: session.user.id,
      role: 'authenticated',
      aud: 'insforge-api',
      org_id: null,
    },
    requireEnv('INSFORGE_JWT_SECRET'),
    { algorithm: 'HS256', expiresIn: '1h' },
  );

  return NextResponse.json(
    { token },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
