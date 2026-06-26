'use server';

/**
 * Google Calendar Integration
 *
 * Fetches upcoming events from the user's Google Calendar.
 * Uses OAuth2 with refresh_token for persistent access.
 *
 * Flow:
 * 1. User clicks "Connect Google Calendar" → /api/auth/calendar (OAuth redirect)
 * 2. Google redirects to /api/auth/calendar/callback → stores refresh_token
 * 3. Dashboard calls getCalendarEvents() → uses refresh_token to get access_token → fetches events
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

/**
 * Get a valid access token using the stored refresh_token.
 */
async function getAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId },
  });

  if (!connection?.refreshToken) return null;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    console.error('[Calendar] Token refresh failed:', tokenRes.status);
    return null;
  }

  const tokens = await tokenRes.json();
  return tokens.access_token;
}

/**
 * Check if the user has connected their Google Calendar.
 */
export async function getCalendarConnectionStatus() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const connection = await prisma.calendarConnection.findUnique({
    where: { userId: session.user.id },
    select: { connectedAt: true, calendarId: true },
  });

  return { connected: !!connection, connectedAt: connection?.connectedAt ?? null };
}

/**
 * Fetch upcoming events from Google Calendar.
 * Returns events in the same format as the local CalendarEvent model.
 */
export async function getGoogleCalendarEvents() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const accessToken = await getAccessToken(session.user.id);
  if (!accessToken) {
    return { connected: false, events: [] };
  }

  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead

    const res = await fetch(
      `${CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        // Token may be revoked — disconnect
        await prisma.calendarConnection.delete({ where: { userId: session.user.id } }).catch(() => {});
        return { connected: false, events: [] };
      }
      throw new Error(`Calendar API error: ${res.status}`);
    }

    const data = await res.json();
    const events = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || 'Sin título',
      startsAt: item.start?.dateTime || item.start?.date,
      endsAt: item.end?.dateTime || item.end?.date || null,
      location: item.location || null,
      hangoutLink: item.hangoutLink || null,
    }));

    return { connected: true, events };
  } catch (e) {
    console.error('[Calendar] Error fetching events:', e);
    return { connected: true, events: [] };
  }
}

/**
 * Disconnect Google Calendar — removes the stored connection.
 */
export async function disconnectCalendar() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  await prisma.calendarConnection.delete({
    where: { userId: session.user.id },
  }).catch(() => {});

  revalidatePath('/configuracion');
  revalidatePath('/dashboard');
  return { success: true };
}
