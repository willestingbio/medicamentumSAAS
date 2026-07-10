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

// ========== Admin Course List ==========

export interface AdminCourseItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  priceCents: number;
  published: boolean;
  reviewStatus: string;
  vendor: { displayName: string } | null;
  _count: { modules: number; lessons: number; enrollments: number };
}

export async function adminGetAllCourses(): Promise<AdminCourseItem[]> {
  await requireSuperAdmin();

  const products = await prisma.product.findMany({
    where: { type: 'course' },
    include: {
      vendor: { select: { displayName: true } },
      course: {
        include: {
          modules: {
            include: {
              _count: { select: { lessons: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    priceCents: p.priceCents,
    published: p.published,
    reviewStatus: p.reviewStatus,
    vendor: p.vendor,
    _count: {
      modules: p.course?.modules.length ?? 0,
      lessons:
        p.course?.modules.reduce(
          (sum, m) => sum + m._count.lessons,
          0
        ) ?? 0,
      enrollments: p._count.enrollments,
    },
  }));
}

// ========== Update Vendor Commission ==========

export async function adminUpdateVendorCommission(
  vendorId: string,
  commissionPct: number
) {
  await requireSuperAdmin();

  if (commissionPct < 0 || commissionPct > 100) {
    throw new Error('El porcentaje de comisión debe estar entre 0 y 100');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, displayName: true },
  });

  if (!vendor) {
    throw new Error('Vendedor no encontrado');
  }

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { commissionPct },
  });

  revalidatePath('/admin/vendors');

  return updated;
}

// ========== Suspend Vendor ==========

export async function adminSuspendVendor(vendorId: string) {
  await requireSuperAdmin();

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });

  if (!vendor) {
    throw new Error('Vendedor no encontrado');
  }

  if (vendor.status === 'suspended') {
    throw new Error('El vendedor ya está suspendido');
  }

  // Set vendor status to suspended
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { status: 'suspended' },
  });

  // Unpublish all their products
  await prisma.product.updateMany({
    where: { vendorId, published: true },
    data: { published: false },
  });

  revalidatePath('/admin/vendors');

  return { success: true };
}

// ========== Reactivate Vendor ==========

export async function adminReactivateVendor(vendorId: string) {
  await requireSuperAdmin();

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });

  if (!vendor) {
    throw new Error('Vendedor no encontrado');
  }

  if (vendor.status !== 'suspended') {
    throw new Error('El vendedor no está suspendido');
  }

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { status: 'active' },
  });

  revalidatePath('/admin/vendors');

  return updated;
}
