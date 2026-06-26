'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

function generateApiKey(): string {
  const bytes = crypto.randomBytes(32);
  return `m360_vr_${bytes.toString('base64url')}`;
}

export async function getVrKeys() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  return prisma.vrKey.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          vrAssetUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function generateVrKey(productId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId,
      },
    },
    include: { product: true },
  });

  if (!enrollment) {
    throw new Error('No tienes acceso a este producto');
  }

  if (enrollment.product.type !== 'vr_experience') {
    throw new Error('Este producto no es una experiencia VR');
  }

  const existing = await prisma.vrKey.findUnique({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId,
      },
    },
  });

  if (existing) {
    return {
      keyId: existing.id,
      apiKey: existing.apiKey,
      qrPayload: `m360://vr/access?key=${existing.apiKey}`,
    };
  }

  const apiKey = generateApiKey();

  const vrKey = await prisma.vrKey.create({
    data: {
      userId: session.user.id,
      productId,
      apiKey,
      label: enrollment.product.title,
    },
  });

  revalidatePath('/dashboard');

  return {
    keyId: vrKey.id,
    apiKey: vrKey.apiKey,
    qrPayload: `m360://vr/access?key=${vrKey.apiKey}`,
  };
}

export async function revokeVrKey(vrKeyId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const vrKey = await prisma.vrKey.findUnique({
    where: { id: vrKeyId },
  });

  if (!vrKey || vrKey.userId !== session.user.id) {
    throw new Error('Llave no encontrada');
  }

  await prisma.vrKey.update({
    where: { id: vrKeyId },
    data: { active: false },
  });

  revalidatePath('/dashboard');
  return { success: true };
}

export async function validateVrKey(apiKey: string) {
  const vrKey = await prisma.vrKey.findUnique({
    where: { apiKey },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          vrAssetUrl: true,
        },
      },
    },
  });

  if (!vrKey || !vrKey.active) {
    return { valid: false };
  }

  if (vrKey.expiresAt && vrKey.expiresAt < new Date()) {
    return { valid: false };
  }

  await prisma.vrKey.update({
    where: { id: vrKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    productTitle: vrKey.product.title,
    vrAssetUrl: vrKey.product.vrAssetUrl,
  };
}
