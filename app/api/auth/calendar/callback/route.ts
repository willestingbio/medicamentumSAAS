import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/api/auth/calendar/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/configuracion?error=calendar_auth_failed`, request.url)
    );
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      // User may have already granted access — no refresh_token returned
      // Try to use the access_token directly for a test call
      if (!tokens.access_token) {
        throw new Error('No tokens received');
      }
    }

    // Upsert calendar connection
    await prisma.calendarConnection.upsert({
      where: { userId: state },
      create: {
        userId: state,
        refreshToken: tokens.refresh_token || '',
        calendarId: 'primary',
      },
      update: {
        refreshToken: tokens.refresh_token || undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.redirect(
      new URL('/configuracion?calendar=connected', request.url)
    );
  } catch (e) {
    console.error('[Calendar OAuth] Error:', e);
    return NextResponse.redirect(
      new URL('/configuracion?error=calendar_connection_failed', request.url)
    );
  }
}
