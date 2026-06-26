'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export type DashboardData = {
  enrollments: {
    id: string;
    progressPct: number;
    status: string;
    lastAccessedAt: Date | null;
    createdAt: Date;
    product: {
      id: string;
      title: string;
      slug: string;
      coverImageUrl: string | null;
      type: string;
      moodleCourseId: number | null;
      course: {
        id: string;
        contentSource: string;
      } | null;
    };
  }[];
  certificates: {
    id: string;
    pdfUrl: string;
    issuedAt: Date;
    linkedinUrl: string | null;
    product: {
      id: string;
      title: string;
      slug: string;
    };
  }[];
  calendarEvents: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date | null;
  }[];
  orderCount: number;
  userId: string;
  calendarConnected: boolean;
};

export async function getDashboardData(): Promise<DashboardData> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const userId = session.user.id;

  const [enrollments, certificates, calendarEvents, orderCount, calendarConnection] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            type: true,
            moodleCourseId: true,
            course: {
              select: {
                id: true,
                contentSource: true,
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
    }),
    prisma.certificate.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      take: 10,
    }),
    prisma.order.count({
      where: { userId, status: 'paid' },
    }),
    prisma.calendarConnection.findUnique({
      where: { userId },
      select: { connectedAt: true },
    }),
  ]);

  return {
    enrollments,
    certificates,
    calendarEvents,
    orderCount,
    userId,
    calendarConnected: !!calendarConnection,
  };
}

export async function getUpcomingEvents() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return prisma.calendarEvent.findMany({
    where: {
      userId: session.user.id,
      startsAt: { gte: now, lte: weekFromNow },
    },
    orderBy: { startsAt: 'asc' },
  });
}
