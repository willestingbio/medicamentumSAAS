import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCourseCompletion } from '@/lib/moodle/client';
import {
  fullSyncToMoodle,
  quickSyncToMoodle,
} from '@/lib/moodle/sync';

/**
 * Cron: Sync Moodle — GET /api/cron/moodle-sync
 *
 * Arquitectura híbrida (julio 2026):
 *   ?mode=quick     → sync rápido Medicamentum360→Moodle (cada 3 min)
 *   ?mode=full      → sync completo Medicamentum360→Moodle (cada hora)
 *   ?mode=legacy    → sync inverso: leer progreso desde Moodle para
 *                      cursos moodle_legacy (cada 6 horas)
 *
 * Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get('mode') ?? 'quick';

  try {
    if (mode === 'legacy') {
      const results = await syncLegacyEnrollments();
      return NextResponse.json({
        direction: 'moodle→postgres',
        synced: results.filter((r) => r.synced).length,
        failed: results.filter((r) => !r.synced).length,
        total: results.length,
      });
    }

    if (mode === 'full') {
      const result = await fullSyncToMoodle();
      return NextResponse.json({
        direction: 'postgres→moodle',
        courses: result.courses.filter((r) => r.synced).length,
        coursesFailed: result.courses.filter((r) => !r.synced).length,
        enrollments: result.enrollments.filter((r) => r.synced).length,
        enrollmentsFailed: result.enrollments.filter((r) => !r.synced).length,
      });
    }

    // Default: quick
    const results = await quickSyncToMoodle();
    return NextResponse.json({
      direction: 'postgres→moodle',
      mode: 'quick',
      synced: results.filter((r) => r.synced).length,
      failed: results.filter((r) => !r.synced).length,
      total: results.length,
    });
  } catch (error) {
    console.error('[Cron MoodleSync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

/**
 * Sync progress from Moodle → Postgres for moodle_legacy courses.
 * Solo aplica a cursos legacy vinculados a Moodle.
 */
async function syncLegacyEnrollments() {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      product: {
        course: { contentSource: 'moodle_legacy' },
      },
    },
    include: {
      product: { select: { moodleCourseId: true } },
      user: { select: { moodleUserId: true } },
    },
  });

  const results: Array<{
    enrollmentId: string;
    synced: boolean;
    progressPct?: number;
    status?: string;
    reason?: string;
  }> = [];

  for (const enrollment of enrollments) {
    if (!enrollment.product.moodleCourseId || !enrollment.user.moodleUserId) {
      results.push({
        enrollmentId: enrollment.id,
        synced: false,
        reason: 'Missing moodleCourseId or moodleUserId',
      });
      continue;
    }

    try {
      const completion = await getCourseCompletion(
        enrollment.user.moodleUserId,
        enrollment.product.moodleCourseId,
      );

      const moodleProgress = completion?.completionstatus?.completionstate;
      const isComplete = moodleProgress === 1 || moodleProgress === 2;

      const newProgressPct = isComplete ? 100 : enrollment.progressPct;
      const newStatus = isComplete
        ? 'completed'
        : enrollment.progressPct > 0
          ? 'in_progress'
          : 'not_started';

      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          progressPct: newProgressPct,
          status: newStatus,
          lastAccessedAt: new Date(),
        },
      });

      results.push({
        enrollmentId: enrollment.id,
        synced: true,
        progressPct: newProgressPct,
        status: newStatus,
      });
    } catch (error) {
      results.push({
        enrollmentId: enrollment.id,
        synced: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
