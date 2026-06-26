'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function assertCourseOwner(courseId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      product: true,
    },
  });

  if (!course) throw new Error('Curso no encontrado');

  if (session.user.role === 'super_admin') {
    return { session, course };
  }

  if (!course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este curso');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor || vendor.id !== course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este curso');
  }

  return { session, course };
}

export async function getMyCourses() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  if (session.user.role === 'super_admin') {
    return prisma.course.findMany({
      include: {
        product: {
          select: { title: true, slug: true, coverImageUrl: true, published: true, reviewStatus: true },
        },
        _count: { select: { modules: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor) throw new Error('No tienes un perfil de vendedor');

  return prisma.course.findMany({
    where: { product: { vendorId: vendor.id } },
    include: {
      product: {
        select: { title: true, slug: true, coverImageUrl: true, published: true, reviewStatus: true },
      },
      _count: { select: { modules: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getCourseForEditor(courseId: string) {
  await assertCourseOwner(courseId);

  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      product: true,
      modules: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { lessons: true } },
        },
      },
    },
  });
}

export async function updateCourseSettings(
  courseId: string,
  data: {
    estimatedHours?: number;
    passingScorePct?: number;
    certificateEnabled?: boolean;
  },
) {
  await assertCourseOwner(courseId);

  return prisma.course.update({
    where: { id: courseId },
    data: {
      ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
      ...(data.passingScorePct !== undefined && { passingScorePct: data.passingScorePct }),
      ...(data.certificateEnabled !== undefined && { certificateEnabled: data.certificateEnabled }),
    },
  });
}

export async function submitCourseForReview(courseId: string) {
  const { course } = await assertCourseOwner(courseId);

  return prisma.product.update({
    where: { id: course.productId },
    data: { reviewStatus: 'pending_review' },
  });
}

export async function publishCourse(courseId: string) {
  const { session, course } = await assertCourseOwner(courseId);

  if (session.user.role === 'super_admin') {
    return prisma.product.update({
      where: { id: course.productId },
      data: { published: true, reviewStatus: 'approved' },
    });
  }

  if (course.product.reviewStatus !== 'approved') {
    throw new Error('El curso debe ser aprobado antes de publicarlo');
  }

  return prisma.product.update({
    where: { id: course.productId },
    data: { published: true },
  });
}
