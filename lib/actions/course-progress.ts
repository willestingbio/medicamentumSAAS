'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

/**
 * Get full course data for the lesson player.
 * Returns course with modules, lessons, completions, and enrollment.
 */
export async function getCourseForPlayer(slug: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      course: {
        include: {
          modules: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  type: true,
                  title: true,
                  order: true,
                  streamVideoId: true,
                  videoDurationSec: true,
                  isPreview: true,
                  moduleId: true,
                },
              },
            },
          },
        },
      },
      enrollments: {
        where: { userId: session.user.id },
        select: { id: true, progressPct: true, status: true },
      },
    },
  });

  if (!product || !product.course) {
    throw new Error('Curso no encontrado');
  }

  if (product.type !== 'course') {
    throw new Error('Este producto no es un curso');
  }

  const enrollment = product.enrollments[0];
  if (!enrollment) {
    throw new Error('No tienes acceso a este curso');
  }

  // Get completions for this user
  const completions = await prisma.lessonCompletion.findMany({
    where: {
      userId: session.user.id,
      lesson: {
        module: { courseId: product.course.id },
      },
    },
    select: { lessonId: true, completedAt: true },
  });

  const completionMap = new Map(
    completions.map((c) => [c.lessonId, c.completedAt])
  );

  // Flatten lessons with completion status
  const allLessons = product.course.modules.flatMap((mod) =>
    mod.lessons.map((lesson) => ({
      ...lesson,
      moduleName: mod.title,
      moduleOrder: mod.order,
      completed: completionMap.has(lesson.id),
      completedAt: completionMap.get(lesson.id) ?? null,
    }))
  );

  return {
    product: {
      id: product.id,
      title: product.title,
      slug: product.slug,
      coverImageUrl: product.coverImageUrl,
    },
    course: {
      id: product.course.id,
      passingScorePct: product.course.passingScorePct,
      certificateEnabled: product.course.certificateEnabled,
      contentSource: product.course.contentSource,
    },
    enrollment: {
      id: enrollment.id,
      progressPct: enrollment.progressPct,
      status: enrollment.status,
    },
    modules: product.course.modules,
    allLessons,
    totalLessons: allLessons.length,
    completedCount: completions.length,
  };
}

/**
 * Get a single lesson by ID with its module context.
 */
export async function getLessonById(lessonId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              product: { select: { slug: true, title: true } },
            },
          },
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, type: true, order: true, isPreview: true },
          },
        },
      },
    },
  });

  if (!lesson) throw new Error('Lección no encontrada');

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId: lesson.module.course.product.slug
          ? (await prisma.product.findUnique({ where: { slug: lesson.module.course.product.slug } }))?.id ?? ''
          : '',
      },
    },
  });

  if (!enrollment) throw new Error('No tienes acceso a este curso');

  // Check completion
  const completion = await prisma.lessonCompletion.findUnique({
    where: {
      lessonId_userId: {
        lessonId,
        userId: session.user.id,
      },
    },
  });

  return {
    lesson,
    completion: completion ?? null,
    enrollment: {
      id: enrollment.id,
      progressPct: enrollment.progressPct,
    },
  };
}

/**
 * Mark a lesson as completed and recalculate enrollment progress.
 * Also handles auto-completion at 90% video (called from client).
 */
export async function markLessonComplete(lessonId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              product: {
                select: { id: true, slug: true },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) throw new Error('Lección no encontrada');

  const courseId = lesson.module.course.id;
  const productId = lesson.module.course.product.id;

  // Upsert completion (idempotent)
  await prisma.lessonCompletion.upsert({
    where: {
      lessonId_userId: {
        lessonId,
        userId: session.user.id,
      },
    },
    create: {
      lessonId,
      userId: session.user.id,
    },
    update: {},
  });

  // Recalculate progress
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  });

  const completedLessons = await prisma.lessonCompletion.count({
    where: {
      userId: session.user.id,
      lesson: { module: { courseId } },
    },
  });

  const progressPct = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const newStatus = progressPct >= 100 ? 'completed' : progressPct > 0 ? 'in_progress' : 'not_started';

  await prisma.enrollment.update({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId,
      },
    },
    data: {
      progressPct,
      status: newStatus,
      lastAccessedAt: new Date(),
    },
  });

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/cursos/${lesson.module.course.product.slug}`);

  return { progressPct, status: newStatus, completedCount: completedLessons, totalLessons };
}

/**
 * Get all enrollments for the "Mis Cursos" page.
 */
export async function getMyEnrollments() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  return prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          type: true,
          description: true,
          course: {
            select: {
              id: true,
              contentSource: true,
              modules: {
                select: {
                  lessons: {
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { lastAccessedAt: 'desc' },
  });
}
