'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import * as OTPAuth from 'otpauth';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

// ===== Password Change =====

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: 'credential',
    },
  });

  if (!account) {
    throw new Error('No tienes una contrasena configurada. Usa Google para iniciar sesion.');
  }

  // Verify current password
  const { verifyPassword } = await import('better-auth/crypto');
  const validPassword = await verifyPassword({
    password: data.currentPassword,
    hash: account.password!,
  });

  if (!validPassword) {
    throw new Error('La contrasena actual es incorrecta');
  }

  // Hash new password
  const { hashPassword } = await import('better-auth/crypto');
  const newHash = await hashPassword(data.newPassword);

  await prisma.account.update({
    where: { id: account.id },
    data: { password: newHash },
  });

  return { success: true };
}

// ===== 2FA Setup =====

export async function get2faStatus() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      twoFactorEnabled: true,
      email: true,
      name: true,
    },
  });

  return {
    enabled: user?.twoFactorEnabled ?? false,
    email: user?.email ?? '',
  };
}

export async function generate2faSecret() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  if (session.user.twoFactorEnabled) {
    throw new Error('Ya tienes 2FA habilitado. Desactivalo primero.');
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'Medicamentum360',
    label: session.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  // Store secret temporarily (not enabled yet — needs verification)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: totp.secret.base32 },
  });

  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export async function verifyAndEnable2fa(otpCode: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorSecret) {
    throw new Error('Primero genera un secreto 2FA');
  }

  if (user.twoFactorEnabled) {
    throw new Error('Ya tienes 2FA habilitado');
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'Medicamentum360',
    label: session.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
  });

  const delta = totp.validate({ token: otpCode, window: 1 });

  if (delta === null) {
    throw new Error('Codigo invalido. Verifica tu aplicacion de autenticacion.');
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: true },
  });

  revalidatePath('/configuracion');
  return { success: true };
}

export async function disable2fa(otpCode: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticacion');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    throw new Error('No tienes 2FA habilitado');
  }

  if (!user.twoFactorSecret) {
    throw new Error('Secreto 2FA no encontrado');
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'Medicamentum360',
    label: session.user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.twoFactorSecret),
  });

  const delta = totp.validate({ token: otpCode, window: 1 });

  if (delta === null) {
    throw new Error('Codigo invalido');
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  revalidatePath('/configuracion');
  return { success: true };
}
