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

// ========== Product Review Queue ==========

export interface ReviewQueueProduct {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  reviewStatus: string;
  vendor: { displayName: string } | null;
  course: {
    _count: { modules: number; lessons: number };
  } | null;
  warnings: string[];
}

export async function getReviewQueue(): Promise<ReviewQueueProduct[]> {
  await requireSuperAdmin();

  const products = await prisma.product.findMany({
    where: { reviewStatus: 'pending_review' },
    include: {
      vendor: { select: { displayName: true } },
      course: {
        select: {
          _count: { select: { modules: true } },
          modules: {
            select: {
              _count: { select: { lessons: true } },
              lessons: {
                select: {
                  type: true,
                  streamVideoId: true,
                  quiz: {
                    select: {
                      _count: { select: { questions: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return products.map((p) => {
    const warnings: string[] = [];
    const allLessons = p.course?.modules.flatMap((m) => m.lessons) ?? [];

    // Modules without lessons
    if (p.course) {
      for (const mod of p.course.modules) {
        if (mod._count.lessons === 0) {
          warnings.push(`Módulo "${/* módulo sin título no es posible, siempre tiene */ ''}" sin lecciones`);
        }
      }
    }

    // Video lessons still processing (streamVideoId set but no duration yet)
    for (const lesson of allLessons) {
      if (lesson.type === 'video' && !lesson.streamVideoId) {
        warnings.push(`Lección de video sin streamVideoId asignado`);
      }
    }

    // Quiz lessons without questions
    for (const lesson of allLessons) {
      if (lesson.type === 'quiz' && (!lesson.quiz || lesson.quiz._count.questions === 0)) {
        warnings.push(`Quiz sin preguntas`);
      }
    }

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      coverImageUrl: p.coverImageUrl,
      reviewStatus: p.reviewStatus,
      vendor: p.vendor,
      course: p.course
        ? {
            _count: {
              modules: p.course._count.modules,
              lessons: allLessons.length,
            },
          }
        : null,
      warnings,
    };
  });
}

export async function approveProduct(productId: string) {
  const session = await requireSuperAdmin();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, reviewStatus: true },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (product.reviewStatus !== 'pending_review') {
    throw new Error('El producto no está pendiente de revisión');
  }

  // NOTE: Product model has no `reviewedBy` or `reviewedAt` fields.
  // A schema migration should add: reviewedBy String?, reviewedAt DateTime?
  // For now, we set reviewStatus and log the reviewer identity.
  console.log(
    `[Admin] Product ${productId} approved by super_admin ${session.user.id} (${session.user.email})`
  );

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { reviewStatus: 'approved' },
  });

  revalidatePath('/admin/review-queue');

  return updated;
}

export async function rejectProduct(productId: string, reason: string) {
  const session = await requireSuperAdmin();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, reviewStatus: true },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (product.reviewStatus !== 'pending_review') {
    throw new Error('El producto no está pendiente de revisión');
  }

  // NOTE: Product model has no `reviewReason` or `reviewedBy` fields.
  // A schema migration should add: reviewReason String?, reviewedBy String?, reviewedAt DateTime?
  // For now, we log the rejection reason and set reviewStatus to 'rejected'.
  console.log(
    `[Admin] Product ${productId} rejected by super_admin ${session.user.id}: ${reason}`
  );

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { reviewStatus: 'rejected' },
  });

  revalidatePath('/admin/review-queue');

  return updated;
}

// ========== Vendor Review Queue ==========

export interface VendorPendingReview {
  id: string;
  displayName: string;
  status: string;
  createdAt: Date;
  user: {
    email: string;
    name: string;
  };
}

export async function getVendorsPendingReview(): Promise<VendorPendingReview[]> {
  await requireSuperAdmin();

  return prisma.vendor.findMany({
    where: { status: 'pending_review' },
    include: {
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function approveVendor(vendorId: string) {
  const session = await requireSuperAdmin();

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });

  if (!vendor) {
    throw new Error('Vendedor no encontrado');
  }

  if (vendor.status !== 'pending_review') {
    throw new Error('El vendedor no está pendiente de revisión');
  }

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      status: 'active',
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  revalidatePath('/admin/review-queue');

  return updated;
}

export async function rejectVendor(vendorId: string, reason: string) {
  const session = await requireSuperAdmin();

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  });

  if (!vendor) {
    throw new Error('Vendedor no encontrado');
  }

  if (vendor.status !== 'pending_review') {
    throw new Error('El vendedor no está pendiente de revisión');
  }

  console.log(
    `[Admin] Vendor ${vendorId} rejected by super_admin ${session.user.id}: ${reason}`
  );

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { status: 'pending_kyc' },
  });

  revalidatePath('/admin/review-queue');

  return updated;
}

// ========== Vendor List ==========

export interface VendorListItem {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  productCount: number;
  totalSalesCents: number;
}

export async function getVendorList(): Promise<VendorListItem[]> {
  await requireSuperAdmin();

  const vendors = await prisma.vendor.findMany({
    include: {
      products: {
        select: {
          id: true,
          orderItems: {
            where: { order: { status: 'paid' } },
            select: { priceCents: true, quantity: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return vendors.map((v) => {
    const totalSalesCents = v.products.reduce((sum, product) => {
      return (
        sum +
        product.orderItems.reduce((itemSum, oi) => {
          return itemSum + oi.priceCents * oi.quantity;
        }, 0)
      );
    }, 0);

    return {
      id: v.id,
      displayName: v.displayName,
      slug: v.slug,
      status: v.status,
      productCount: v.products.length,
      totalSalesCents,
    };
  });
}
