'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function getProfile() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      profilePicUrl: true,
      specialty: true,
      locale: true,
      theme: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

export async function updateProfile(data: {
  name?: string;
  lastName?: string;
  specialty?: string;
  locale?: string;
  theme?: string;
}) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.specialty !== undefined && { specialty: data.specialty }),
      ...(data.locale !== undefined && { locale: data.locale }),
      ...(data.theme !== undefined && { theme: data.theme }),
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      specialty: true,
      locale: true,
      theme: true,
    },
  });

  revalidatePath('/configuracion');
  revalidatePath('/dashboard');

  return user;
}

export async function deleteAccount() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const userId = session.user.id;

  await prisma.$transaction([
    prisma.lessonCompletion.deleteMany({ where: { userId } }),
    prisma.quizAttempt.deleteMany({ where: { userId } }),
    prisma.enrollment.deleteMany({ where: { userId } }),
    prisma.certificate.deleteMany({ where: { userId } }),
    prisma.vrKey.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.cart.deleteMany({ where: { userId } }),
    prisma.calendarConnection.deleteMany({ where: { userId } }),
    prisma.calendarEvent.deleteMany({ where: { userId } }),
    prisma.employeeAssignment.deleteMany({ where: { userId } }),
    prisma.review.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return { success: true };
}

export async function getOrderHistory() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  return prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImageUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
