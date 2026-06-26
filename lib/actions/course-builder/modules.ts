'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { assertCourseOwner } from './courses';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function assertModuleOwner(moduleId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const moduleRecord = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      course: {
        include: { product: true },
      },
    },
  });

  if (!moduleRecord) throw new Error('Módulo no encontrado');

  if (session.user.role === 'super_admin') {
    return { session, module: moduleRecord };
  }

  if (!moduleRecord.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este módulo');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor || vendor.id !== moduleRecord.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este módulo');
  }

  return { session, module: moduleRecord };
}

export async function createModule(courseId: string, title: string) {
  await assertCourseOwner(courseId);

  const count = await prisma.module.count({ where: { courseId } });

  return prisma.module.create({
    data: {
      courseId,
      title,
      order: count,
    },
  });
}

export async function updateModuleTitle(moduleId: string, title: string) {
  await assertModuleOwner(moduleId);

  return prisma.module.update({
    where: { id: moduleId },
    data: { title },
  });
}

export async function setModuleDripDelay(
  moduleId: string,
  releaseAfterDays: number | null,
) {
  await assertModuleOwner(moduleId);

  return prisma.module.update({
    where: { id: moduleId },
    data: { releaseAfterDays },
  });
}

export async function reorderModules(
  courseId: string,
  orderedModuleIds: string[],
) {
  await assertCourseOwner(courseId);

  await prisma.$transaction(
    orderedModuleIds.map((id, index) =>
      prisma.module.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
}

export async function deleteModule(moduleId: string) {
  await assertModuleOwner(moduleId);

  return prisma.module.delete({ where: { id: moduleId } });
}

export async function getModulesWithLessons(courseId: string) {
  await assertCourseOwner(courseId);

  return prisma.module.findMany({
    where: { courseId },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          type: true,
          order: true,
          isPreview: true,
        },
      },
    },
  });
}
