'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { ProductType } from '@prisma/client';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

async function getMyActiveVendor() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor) throw new Error('No tienes un perfil de vendedor');
  if (vendor.status !== 'active') throw new Error('Tu perfil de vendedor no está activo. Debe estar aprobado para crear productos.');

  return vendor;
}

export async function assertVendorProductOwner(productId: string) {
  const vendor = await getMyActiveVendor();

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new Error('Producto no encontrado');
  if (product.vendorId !== vendor.id) throw new Error('No tienes permiso para modificar este producto');

  return { product, vendor };
}

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  ) || 'product';
}

async function makeUniqueProductSlug(base: string): Promise<string> {
  const existing = await prisma.product.findUnique({ where: { slug: base } });
  if (!existing) return base;
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

export interface CreateVendorProductInput {
  title: string;
  description: string;
  type: ProductType;
  priceCents: number;
  coverImageUrl?: string;
}

export async function createVendorProduct(data: CreateVendorProductInput) {
  const vendor = await getMyActiveVendor();

  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) throw new Error('El título del producto es obligatorio');
  if (!data.description.trim()) throw new Error('La descripción es obligatoria');
  if (data.priceCents < 0) throw new Error('El precio no puede ser negativo');

  const baseSlug = generateSlug(trimmedTitle);
  const slug = await makeUniqueProductSlug(baseSlug);

  const product = await prisma.product.create({
    data: {
      type: data.type,
      title: trimmedTitle,
      slug,
      description: data.description.trim(),
      priceCents: data.priceCents,
      coverImageUrl: data.coverImageUrl ?? null,
      vendorId: vendor.id,
      reviewStatus: 'draft',
      published: false,
    },
  });

  if (data.type === 'course') {
    await prisma.course.create({
      data: {
        productId: product.id,
        contentSource: 'native',
      },
    });

    // Crear también el curso en Moodle (shell vacío) para integración completa.
    // No bloquea si Moodle no está configurado (dev) o falla.
    try {
      const { createMoodleCourse } = await import('@/lib/moodle/client');
      const shortname = slug.substring(0, 32).replace(/-/g, '_');
      const moodleCourseId = await createMoodleCourse({
        fullname: trimmedTitle,
        shortname,
        summary: data.description.trim().substring(0, 500),
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { moodleCourseId },
      });
      console.log(`[Vendor] Curso vinculado a Moodle: ${moodleCourseId}`);
    } catch (e) {
      console.warn('[Vendor] Moodle no disponible, curso creado solo en Postgres:', e instanceof Error ? e.message : e);
    }
  }

  return {
    product: {
      id: product.id,
      title: product.title,
      slug: product.slug,
      type: product.type,
      priceCents: product.priceCents,
      reviewStatus: product.reviewStatus,
    },
  };
}

export async function getMyVendorProducts() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!vendor) return [];

  return prisma.product.findMany({
    where: { vendorId: vendor.id },
    include: {
      course: {
        select: {
          id: true,
          modules: {
            select: {
              id: true,
              _count: { select: { lessons: true } },
            },
          },
        },
      },
      _count: { select: { enrollments: true, reviews: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export interface UpdateVendorProductInput {
  title?: string;
  description?: string;
  type?: ProductType;
  priceCents?: number;
  coverImageUrl?: string | null;
}

export async function updateVendorProduct(productId: string, data: UpdateVendorProductInput) {
  const { product } = await assertVendorProductOwner(productId);

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) {
    const trimmed = data.title.trim();
    if (!trimmed) throw new Error('El título no puede estar vacío');
    updateData.title = trimmed;

    if (trimmed !== product.title) {
      const baseSlug = generateSlug(trimmed);
      updateData.slug = await makeUniqueProductSlug(baseSlug);
    }
  }

  if (data.description !== undefined) {
    if (!data.description.trim()) throw new Error('La descripción no puede estar vacía');
    updateData.description = data.description.trim();
  }

  if (data.type !== undefined) {
    updateData.type = data.type;
  }

  if (data.priceCents !== undefined) {
    if (data.priceCents < 0) throw new Error('El precio no puede ser negativo');
    updateData.priceCents = data.priceCents;
  }

  if (data.coverImageUrl !== undefined) {
    updateData.coverImageUrl = data.coverImageUrl;
  }

  if (Object.keys(updateData).length === 0) return { product };

  const updated = await prisma.product.update({
    where: { id: productId },
    data: updateData,
  });

  return {
    product: {
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      type: updated.type,
      priceCents: updated.priceCents,
      coverImageUrl: updated.coverImageUrl,
      reviewStatus: updated.reviewStatus,
    },
  };
}

export async function submitProductForReview(productId: string) {
  const { product } = await assertVendorProductOwner(productId);

  if (product.reviewStatus !== 'draft' && product.reviewStatus !== 'rejected') {
    throw new Error('Solo productos en borrador o rechazados pueden enviarse a revisión');
  }

  if (product.type === 'course') {
    const course = await prisma.course.findUnique({
      where: { productId },
      include: {
        modules: {
          select: {
            id: true,
            _count: { select: { lessons: true } },
          },
        },
      },
    });

    if (!course) throw new Error('El curso asociado no existe');

    const hasValidModule = course.modules.some((m) => m._count.lessons > 0);
    if (!hasValidModule) {
      throw new Error(
        'El curso debe tener al menos un módulo con al menos una lección antes de enviarlo a revisión',
      );
    }
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { reviewStatus: 'pending_review' },
  });

  return {
    product: {
      id: updated.id,
      reviewStatus: updated.reviewStatus,
    },
  };
}

export interface VendorPublicProfile {
  id: string;
  displayName: string;
  slug: string;
  bio: string | null;
  products: {
    id: string;
    type: string;
    title: string;
    slug: string;
    description: string;
    priceCents: number;
    coverImageUrl: string | null;
    createdAt: Date;
  }[];
}

export async function getVendorPublicProfile(slug: string): Promise<VendorPublicProfile | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      slug: true,
      bio: true,
      products: {
        where: {
          published: true,
          reviewStatus: 'approved',
        },
        select: {
          id: true,
          type: true,
          title: true,
          slug: true,
          description: true,
          priceCents: true,
          coverImageUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!vendor || vendor.products.length === 0) return null;

  return vendor;
}
