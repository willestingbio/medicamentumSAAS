'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }
  if (session.user.role !== 'super_admin') {
    throw new Error('Acceso denegado: se requiere rol super_admin');
  }
  return session;
}

// ========== Payout Batch Generation ==========

export interface MonthlyPayoutBatchResult {
  totalVendors: number;
  vendorsWithSales: number;
  payoutsCreated: number;
}

export async function generateMonthlyPayoutBatch(
  periodStart: Date,
  periodEnd: Date
): Promise<MonthlyPayoutBatchResult> {
  await requireSuperAdmin();

  const activeVendors = await prisma.vendor.findMany({
    where: { status: 'active' },
    include: {
      products: {
        select: {
          id: true,
          orderItems: {
            where: {
              order: {
                status: 'paid',
                paidAt: {
                  gte: periodStart,
                  lte: periodEnd,
                },
              },
            },
            select: {
              priceCents: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  let payoutsCreated = 0;
  let vendorsWithSales = 0;

  for (const vendor of activeVendors) {
    const grossAmount = vendor.products.reduce((sum, product) => {
      return (
        sum +
        product.orderItems.reduce((itemSum, oi) => {
          return itemSum + oi.priceCents * oi.quantity;
        }, 0)
      );
    }, 0);

    if (grossAmount === 0) continue;

    vendorsWithSales++;

    const commissionPct = vendor.commissionPct ?? 20;
    const commissionAmount = Math.round(grossAmount * (commissionPct / 100));
    const netAmount = grossAmount - commissionAmount;

    await prisma.payout.create({
      data: {
        vendorId: vendor.id,
        periodStart,
        periodEnd,
        grossAmount,
        commissionAmount,
        netAmount,
        status: 'pending',
      },
    });

    payoutsCreated++;
  }

  revalidatePath('/admin/payouts');

  return {
    totalVendors: activeVendors.length,
    vendorsWithSales,
    payoutsCreated,
  };
}

// ========== Pending Payouts ==========

export interface PendingPayoutItem {
  id: string;
  vendorId: string;
  vendor: { displayName: string };
  periodStart: Date;
  periodEnd: Date;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: string;
  createdAt: Date;
}

export async function getPendingPayouts(): Promise<PendingPayoutItem[]> {
  await requireSuperAdmin();

  return prisma.payout.findMany({
    where: { status: 'pending' },
    include: {
      vendor: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

// ========== Approve & Send Payout ==========

export async function approveAndSendPayout(payoutId: string) {
  await requireSuperAdmin();

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true },
  });

  if (!payout) {
    throw new Error('Payout no encontrado');
  }

  if (payout.status !== 'pending') {
    throw new Error('El payout no está en estado pendiente');
  }

  // Set to 'processing'
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'processing' },
  });

  // TODO: In production, this is where we call the Wompi Payout API
  // to transfer netAmount to the vendor's registered bank account.
  // The Wompi Payout API reference would be stored in wompiPayoutRef.
  // For now, we mark as paid directly with a stub.
  console.log(
    `[Admin] Payout ${payoutId} marked as paid (Wompi integration pending)`
  );

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  revalidatePath('/admin/payouts');

  return updated;
}

// ========== Reject Payout ==========

export async function rejectPayout(payoutId: string, reason?: string) {
  await requireSuperAdmin();

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true },
  });

  if (!payout) {
    throw new Error('Payout no encontrado');
  }

  if (payout.status !== 'pending') {
    throw new Error('El payout no está en estado pendiente');
  }

  if (reason) {
    console.log(`[Admin] Payout ${payoutId} rejected: ${reason}`);
  }

  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: { status: 'failed' },
  });

  revalidatePath('/admin/payouts');

  return updated;
}
