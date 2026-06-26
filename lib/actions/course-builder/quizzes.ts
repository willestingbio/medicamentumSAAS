'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function assertQuizOwner(quizId: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      lesson: {
        include: {
          module: {
            include: {
              course: {
                include: { product: true },
              },
            },
          },
        },
      },
    },
  });

  if (!quiz) throw new Error('Quiz no encontrado');

  if (session.user.role === 'super_admin') {
    return { session, quiz };
  }

  if (!quiz.lesson.module.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este quiz');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId: session.user.id },
  });

  if (!vendor || vendor.id !== quiz.lesson.module.course.product.vendorId) {
    throw new Error('No tienes permiso para gestionar este quiz');
  }

  return { session, quiz };
}

export async function addQuizQuestion(
  quizId: string,
  type: 'single_choice' | 'multiple_choice' | 'true_false',
  prompt: string,
) {
  await assertQuizOwner(quizId);

  const count = await prisma.quizQuestion.count({ where: { quizId } });

  return prisma.quizQuestion.create({
    data: {
      quizId,
      type,
      prompt,
      order: count,
    },
  });
}

export async function updateQuizQuestion(
  questionId: string,
  data: { prompt?: string; type?: 'single_choice' | 'multiple_choice' | 'true_false'; explanation?: string },
) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true, type: true },
  });

  if (!question) throw new Error('Pregunta no encontrada');

  await assertQuizOwner(question.quizId);

  return prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      ...(data.prompt !== undefined && { prompt: data.prompt }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.explanation !== undefined && { explanation: data.explanation }),
    },
  });
}

export async function deleteQuizQuestion(questionId: string) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true },
  });

  if (!question) throw new Error('Pregunta no encontrada');

  await assertQuizOwner(question.quizId);

  return prisma.quizQuestion.delete({ where: { id: questionId } });
}

export async function addQuizOption(
  questionId: string,
  label: string,
  isCorrect?: boolean,
) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true, type: true },
  });

  if (!question) throw new Error('Pregunta no encontrada');

  await assertQuizOwner(question.quizId);

  const count = await prisma.quizOption.count({ where: { questionId } });

  if (isCorrect && (question.type === 'single_choice' || question.type === 'true_false')) {
    await prisma.quizOption.updateMany({
      where: { questionId },
      data: { isCorrect: false },
    });
  }

  return prisma.quizOption.create({
    data: {
      questionId,
      label,
      isCorrect: isCorrect ?? false,
      order: count,
    },
  });
}

export async function updateQuizOption(
  optionId: string,
  data: { label?: string; isCorrect?: boolean },
) {
  const option = await prisma.quizOption.findUnique({
    where: { id: optionId },
    include: {
      question: { select: { quizId: true, type: true } },
    },
  });

  if (!option) throw new Error('Opción no encontrada');

  await assertQuizOwner(option.question.quizId);

  if (
    data.isCorrect &&
    (option.question.type === 'single_choice' || option.question.type === 'true_false')
  ) {
    await prisma.quizOption.updateMany({
      where: { questionId: option.questionId, id: { not: optionId } },
      data: { isCorrect: false },
    });
  }

  return prisma.quizOption.update({
    where: { id: optionId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.isCorrect !== undefined && { isCorrect: data.isCorrect }),
    },
  });
}

export async function deleteQuizOption(optionId: string) {
  const option = await prisma.quizOption.findUnique({
    where: { id: optionId },
    include: {
      question: { select: { quizId: true } },
    },
  });

  if (!option) throw new Error('Opción no encontrada');

  await assertQuizOwner(option.question.quizId);

  return prisma.quizOption.delete({ where: { id: optionId } });
}

export async function reorderQuestions(
  quizId: string,
  orderedQuestionIds: string[],
) {
  await assertQuizOwner(quizId);

  await prisma.$transaction(
    orderedQuestionIds.map((id, index) =>
      prisma.quizQuestion.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
}

export async function reorderOptions(
  questionId: string,
  orderedOptionIds: string[],
) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { quizId: true },
  });

  if (!question) throw new Error('Pregunta no encontrada');

  await assertQuizOwner(question.quizId);

  await prisma.$transaction(
    orderedOptionIds.map((id, index) =>
      prisma.quizOption.update({
        where: { id },
        data: { order: index },
      }),
    ),
  );
}

export async function updateQuizSettings(
  quizId: string,
  data: {
    shuffleQuestions?: boolean;
    maxAttempts?: number | null;
    timeLimitSec?: number | null;
  },
) {
  await assertQuizOwner(quizId);

  return prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
      ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
      ...(data.timeLimitSec !== undefined && { timeLimitSec: data.timeLimitSec }),
    },
  });
}
