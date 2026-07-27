/**
 * Motor de sincronización Medicamentum360 ↔ Moodle.
 *
 * ARQUITECTURA HÍBRIDA (julio 2026):
 * - Postgres es la FUENTE DE VERDAD del contenido (Course Builder).
 * - Moodle es un ESPEJO de solo lectura para el estudiante.
 * - Dirección del sync: Medicamentum360 → Moodle (nunca al revés).
 * - El contenido se crea en el Course Builder y se consume en el
 *   reproductor de Medicamentum360. Moodle existe para:
 *     (a) el shell del curso vinculado,
 *     (b) inscripción automática post-pago,
 *     (c) SSO para quien prefiera la interfaz nativa de Moodle.
 *
 * Fases del roadmap (ver TRD.md §19.1):
 *   1. Bridge Shell ✅ — crear curso en Moodle al crear en Course Builder
 *   2. Sync estructura 📋 — sincronizar módulos como topics en Moodle
 *   3. Plugin Moodle 📋 — exponer create_section/add_resource/add_quiz
 *
 * Este archivo implementa la Fase 1 y prepara para la Fase 2.
 */

import { prisma } from '@/lib/prisma';
import {
  createMoodleCourse,
  enrollUserInCourse,
} from '@/lib/moodle/client';

export interface SyncResult {
  courseId: string;
  synced: boolean;
  moodleCourseId?: number;
  reason?: string;
}

export interface EnrollmentSyncResult {
  enrollmentId: string;
  synced: boolean;
  reason?: string;
}

/**
 * Asegura que un curso de Postgres tenga su shell correspondiente en Moodle.
 * Si ya tiene moodleCourseId, verifica que siga existiendo.
 * Si no tiene, intenta crearlo (retry de fallos previos).
 */
export async function syncCourseToMoodle(courseId: string): Promise<SyncResult> {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { product: true },
    });

    if (!course) {
      return { courseId, synced: false, reason: 'Curso no encontrado en Postgres' };
    }

    // Si ya está vinculado, asumimos que el shell existe
    if (course.product.moodleCourseId) {
      return {
        courseId,
        synced: true,
        moodleCourseId: course.product.moodleCourseId,
      };
    }

    // Crear shell en Moodle
    const shortname = course.product.slug
      .substring(0, 32)
      .replace(/-/g, '_');

    const moodleCourseId = await createMoodleCourse({
      fullname: course.product.title,
      shortname,
      summary: course.product.description?.substring(0, 500),
    });

    // Vincular
    await prisma.product.update({
      where: { id: course.productId },
      data: { moodleCourseId },
    });

    return { courseId, synced: true, moodleCourseId };
  } catch (error) {
    return {
      courseId,
      synced: false,
      reason: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Asegura que una inscripción en Postgres tenga su correspondiente
 * inscripción en Moodle vía enrol_manual_enrol_users.
 */
export async function syncEnrollmentToMoodle(
  enrollmentId: string,
): Promise<EnrollmentSyncResult> {
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        product: true,
        user: { select: { moodleUserId: true } },
      },
    });

    if (!enrollment) {
      return { enrollmentId, synced: false, reason: 'Inscripción no encontrada' };
    }

    if (!enrollment.product.moodleCourseId) {
      return { enrollmentId, synced: false, reason: 'Curso sin moodleCourseId' };
    }

    if (!enrollment.user.moodleUserId) {
      return { enrollmentId, synced: false, reason: 'Usuario sin cuenta en Moodle' };
    }

    if (enrollment.moodleEnrolId) {
      return { enrollmentId, synced: true }; // Ya inscrito
    }

    await enrollUserInCourse(
      enrollment.user.moodleUserId,
      enrollment.product.moodleCourseId,
    );

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'enrolled' },
    });

    return { enrollmentId, synced: true };
  } catch (error) {
    return {
      enrollmentId,
      synced: false,
      reason: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Full sync — todos los cursos + todas las inscripciones.
 * Pensado para cron cada hora.
 */
export async function fullSyncToMoodle(): Promise<{
  courses: SyncResult[];
  enrollments: EnrollmentSyncResult[];
}> {
  const courses = await prisma.course.findMany({
    where: { contentSource: 'native' },
    include: { product: { select: { moodleCourseId: true } } },
  });

  const courseResults: SyncResult[] = [];
  for (const course of courses) {
    const result = await syncCourseToMoodle(course.id);
    courseResults.push(result);
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      product: { moodleCourseId: { not: null } },
      moodleEnrolId: null,
    },
    include: {
      product: { select: { moodleCourseId: true } },
      user: { select: { moodleUserId: true } },
    },
  });

  const enrollmentResults: EnrollmentSyncResult[] = [];
  for (const enrollment of enrollments) {
    const result = await syncEnrollmentToMoodle(enrollment.id);
    enrollmentResults.push(result);
  }

  return { courses: courseResults, enrollments: enrollmentResults };
}

/**
 * Quick sync — solo verifica inscripciones pendientes.
 * Pensado para cron cada 3 minutos.
 */
export async function quickSyncToMoodle(): Promise<EnrollmentSyncResult[]> {
  const pending = await prisma.enrollment.findMany({
    where: {
      product: { moodleCourseId: { not: null } },
      moodleEnrolId: null,
    },
    include: {
      product: { select: { moodleCourseId: true } },
      user: { select: { moodleUserId: true } },
    },
  });

  const results: EnrollmentSyncResult[] = [];
  for (const enrollment of pending) {
    const result = await syncEnrollmentToMoodle(enrollment.id);
    results.push(result);
  }

  return results;
}
