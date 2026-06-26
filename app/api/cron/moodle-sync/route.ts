import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCourseCompletion } from '@/lib/moodle/client';

/**
 * Cron: Sync Moodle Progress — POST/GET /api/cron/moodle-sync
 *
 * Protected by CRON_SECRET header. Designed to be called every 6 hours
 * by an external cron service (e.g., cron-job.org, Vercel Cron, or a
 * simple crontab on the VPS).
 *
 * Iterates ALL enrollments with contentSource: 'moodle_legacy' and
 * syncs completion status from Moodle → Postgres.
 */
export async function POST(req: NextRequest) {
  try {
    // Validar CRON_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await syncAllMoodleLegacyEnrollments();

    return NextResponse.json({
      synced: results.filter((r) => r.synced).length,
      failed: results.filter((r) => !r.synced).length,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('[Cron MoodleSync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

/**
 * Sync ALL moodle_legacy enrollments — no auth required (cron only).
 */
async function syncAllMoodleLegacyEnrollments() {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      product: {
        course: {
          contentSource: 'moodle_legacy',
        },
      },
    },
    include: {
      product: {
        select: {
          moodleCourseId: true,
        },
      },
      user: {
        select: {
          moodleUserId: true,
        },
      },
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
        enrollment.product.moodleCourseId
      );

      const moodleProgress = completion?.completionstatus?.completionstate;
      const isComplete = moodleProgress === 1 || moodleProgress === 2;

      const newProgressPct = isComplete ? 100 : enrollment.progressPct;
      const newStatus = isComplete ? 'completed' : enrollment.progressPct > 0 ? 'in_progress' : 'not_started';

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
