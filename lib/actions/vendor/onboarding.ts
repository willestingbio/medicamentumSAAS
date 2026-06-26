'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { encryptBankInfo } from '@/lib/crypto/vendor-bank';
import type { Prisma } from '@prisma/client';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

function generateSlug(displayName: string): string {
  return (
    displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  ) || 'vendor';
}

async function makeUniqueSlug(base: string): Promise<string> {
  const existing = await prisma.vendor.findUnique({ where: { slug: base } });
  if (!existing) return base;
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

export async function assertOwnVendorProfile(vendorId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Perfil de vendedor no encontrado');

  if (vendor.userId !== session.user.id && session.user.role !== 'super_admin') {
    throw new Error('No tienes permiso para acceder a este perfil de vendedor');
  }

  return vendor;
}

export interface RegisterAsVendorResult {
  vendor?: { id: string; displayName: string; slug: string; status: string };
  error?: string;
}

export async function registerAsVendor(
  displayName: string,
  bio?: string,
): Promise<RegisterAsVendorResult> {
  const session = await getSession();
  if (!session?.user) return { error: 'No autenticado' };

  const trimmedName = displayName.trim();
  if (!trimmedName) return { error: 'El nombre de vendedor es obligatorio' };

  const existing = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return {
      error: 'Ya tienes un perfil de vendedor',
      vendor: { id: existing.id, displayName: existing.displayName, slug: existing.slug, status: existing.status },
    };
  }

  const commissionPct = parseFloat(
    process.env.MARKETPLACE_COMMISSION_PCT ?? '20',
  );

  const baseSlug = generateSlug(trimmedName);
  const slug = await makeUniqueSlug(baseSlug);

  const vendor = await prisma.vendor.create({
    data: {
      userId: session.user.id,
      displayName: trimmedName,
      slug,
      bio: bio?.trim() || null,
      status: 'pending_kyc',
      commissionPct,
    },
  });

  return {
    vendor: { id: vendor.id, displayName: vendor.displayName, slug: vendor.slug, status: vendor.status },
  };
}

export async function getMyVendorProfile() {
  const session = await getSession();
  if (!session?.user) return null;

  return prisma.vendor.findUnique({
    where: { userId: session.user.id },
    include: {
      products: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true,
          priceCents: true,
          published: true,
          reviewStatus: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { payouts: true } },
    },
  });
}

export interface VendorKycInput {
  taxIdType: string;
  taxIdNumber: string;
  taxDocumentKey: string;
  bankAccountInfo: Record<string, unknown>;
}

export async function submitVendorKyc(vendorId: string, data: VendorKycInput) {
  const vendor = await assertOwnVendorProfile(vendorId);

  if (vendor.status !== 'pending_kyc' && vendor.status !== 'suspended') {
    throw new Error('El perfil ya se encuentra en revisión o está activo');
  }

  const encryptedBankInfo = encryptBankInfo(data.bankAccountInfo);

  const bankInfoPayload = { encrypted: encryptedBankInfo } as Prisma.JsonObject;

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      taxIdType: data.taxIdType,
      taxIdNumber: data.taxIdNumber,
      taxDocumentKey: data.taxDocumentKey,
      bankAccountInfo: bankInfoPayload,
      status: 'pending_review',
    },
  });

  return { success: true };
}
