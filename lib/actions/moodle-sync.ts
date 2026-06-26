'use server';

/**
 * Moodle Progress Sync
 *
 * Syncs progress for courses with contentSource: 'moodle_legacy'.
 * For 'native' courses, progress is calculated directly from LessonCompletion in Postgres.
 *
 * This action can be called:
 * - Manually from the dashboard (pull-to-refresh)
 * - Via a cron job (e.g., every 6 hours)
 * - After a Moodle completion event webhook
 *
 * TRD.md §19.1: Moodle is used ONLY for enrolment/SSO for legacy courses.
 * Progress for native courses lives entirely in Postgres.
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getCourseCompletion } from '@/lib/moodle/client';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

/**
 * Sync progress from Moodle for a single enrollment.
 * Only applies to courses with contentSource: 'moodle_legacy' and a moodleCourseId.
 */
export async function syncMoodleProgress(enrollmentId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      product: {
        include: {
          course: true,
        },
      },
      user: {
        select: { moodleUserId: true },
      },
    },
  });

  if (!enrollment) throw new Error('Inscripción no encontrada');
  if (enrollment.userId !== session.user.id) throw new Error('No autorizado');

  // Only sync for moodle_legacy courses with a linked Moodle course
  if (
    enrollment.product.course?.contentSource !== 'moodle_legacy' ||
    !enrollment.product.moodleCourseId ||
    !enrollment.user.moodleUserId
  ) {
    return { synced: false, reason: 'Curso no es moodle_legacy o falta vinculación Moodle' };
  }

  try {
    const completion = await getCourseCompletion(
      enrollment.user.moodleUserId,
      enrollment.product.moodleCourseId
    );

    const moodleProgress = completion?.completionstatus?.completionstate;
    // Moodle completion states: 0=incomplete, 1=complete, 2=complete-pass, 3=complete-fail
    const isComplete = moodleProgress === 1 || moodleProgress === 2;

    const newProgressPct = isComplete ? 100 : enrollment.progressPct;
    const newStatus = isComplete ? 'completed' : enrollment.progressPct > 0 ? 'in_progress' : 'not_started';

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progressPct: newProgressPct,
        status: newStatus,
        lastAccessedAt: new Date(),
      },
    });

    return {
      synced: true,
      progressPct: newProgressPct,
      status: newStatus,
      moodleState: moodleProgress,
    };
  } catch (error) {
    console.error('[MoodleSync] Error syncing progress:', error);
    return {
      synced: false,
      reason: error instanceof Error ? error.message : 'Error desconocido al sincronizar con Moodle',
    };
  }
}

/**
 * Sync progress for ALL moodle_legacy enrollments of the current user.
 * Useful as a bulk refresh from the dashboard.
 */
export async function syncAllMoodleProgress() {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: session.user.id,
      product: {
        course: {
          contentSource: 'moodle_legacy',
        },
      },
    },
    include: {
      product: {
        include: { course: true },
      },
    },
  });

  const results = [];
  for (const enrollment of enrollments) {
    if (enrollment.product.moodleCourseId) {
      const result = await syncMoodleProgress(enrollment.id);
      results.push({ enrollmentId: enrollment.id, ...result });
    }
  }

  return results;
}
