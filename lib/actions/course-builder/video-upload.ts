'use server';

import { prisma } from '@/lib/prisma';
import { assertLessonOwner } from './lessons';
import {
  createDirectUploadUrl,
  deleteStreamVideo,
  getVideoStatus,
} from '@/lib/video/stream-client';

export async function getVideoUploadUrl(
  lessonId: string,
  maxDurationSeconds?: number,
) {
  await assertLessonOwner(lessonId);

  const { uploadURL, uid } = await createDirectUploadUrl(maxDurationSeconds);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { streamVideoId: uid },
  });

  return { uploadURL };
}

export async function checkVideoStatus(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { streamVideoId: true },
  });

  if (!lesson) throw new Error('Lección no encontrada');

  await assertLessonOwner(lessonId);

  if (!lesson.streamVideoId) {
    throw new Error('Esta lección no tiene un video asociado');
  }

  const state = await getVideoStatus(lesson.streamVideoId);
  return state;
}

export async function replaceVideo(
  lessonId: string,
  maxDurationSeconds?: number,
) {
  const { lesson } = await assertLessonOwner(lessonId);

  if (lesson.streamVideoId) {
    try {
      await deleteStreamVideo(lesson.streamVideoId);
    } catch (e) {
      console.warn(
        '[course-builder] Cloudflare Stream delete on replace failed:',
        e instanceof Error ? e.message : e,
      );
    }
  }

  const { uploadURL, uid } = await createDirectUploadUrl(maxDurationSeconds);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { streamVideoId: uid },
  });

  return { uploadURL };
}
