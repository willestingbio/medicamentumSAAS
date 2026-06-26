'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function getMyPayoutHistory() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!vendor) throw new Error('No tienes un perfil de vendedor');

  return prisma.payout.findMany({
    where: { vendorId: vendor.id },
    orderBy: { periodStart: 'desc' },
  });
}
