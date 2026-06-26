'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { assertModuleOwner } from './modules';
import { deleteStreamVideo } from '@/lib/video/stream-client';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function assertLessonOwner(lessonId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!lesson) throw new Error('Lección no encontrada');

  if (session.user.role === 'super_admin') {
    return { session, lesson };
  }

  if (!lesson.module.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar esta lección');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor || vendor.id !== lesson.module.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar esta lección');
  }

  return { session, lesson };
}

export async function createLesson(
  moduleId: string,
  type: 'video' | 'text' | 'quiz' | 'resource',
  title: string,
) {
  await assertModuleOwner(moduleId);

  const count = await prisma.lesson.count({ where: { moduleId } });

  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.create({
      data: {
        moduleId,
        type,
        title,
        order: count,
      },
    });

    if (type === 'quiz') {
      await tx.quiz.create({
        data: { lessonId: lesson.id },
      });
    }

    return lesson;
  });
}

export async function updateLessonContent(
  lessonId: string,
  data: { textContent?: string; isPreview?: boolean },
) {
  await assertLessonOwner(lessonId);

  return prisma.lesson.update({
    where: { id: lessonId },
    data: {
      ...(data.textContent !== undefined && { textContent: data.textContent }),
      ...(data.isPreview !== undefined && { isPreview: data.isPreview }),
    },
  });
}

export async function reorderLessons(
  moduleId: string,
  orderedLessonIds: string[],
) {
  await assertModuleOwner(moduleId);

  await prisma.$transaction(
    orderedLessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
}

export async function deleteLesson(lessonId: string) {
  const { lesson } = await assertLessonOwner(lessonId);

  if (lesson.type === 'video' && lesson.streamVideoId) {
    try {
      await deleteStreamVideo(lesson.streamVideoId);
    } catch (e) {
      console.warn(
        '[course-builder] Cloudflare Stream delete failed:',
        e instanceof Error ? e.message : e,
      );
    }
  }

  return prisma.lesson.delete({ where: { id: lessonId } });
}

export async function getLessonForEditor(lessonId: string) {
  await assertLessonOwner(lessonId);

  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              options: {
                orderBy: { order: 'asc' },
              },
            },
          },
          _count: { select: { attempts: true } },
        },
      },
    },
  });
}
