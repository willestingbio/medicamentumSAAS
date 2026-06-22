'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function validateOrgCode(orgCode: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { orgCode },
      select: { id: true, name: true },
    });
    return org ?? null;
  } catch {
    return null;
  }
}

export async function createInvitation(email: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userRole = (session.user as any).role;
  const userOrgId = (session.user as any).organizationId;

  if (userRole !== 'hospital_admin' && userRole !== 'super_admin') {
    throw new Error('No autorizado para invitar usuarios');
  }

  if (!userOrgId) {
    throw new Error('Tu cuenta no está asociada a una organización');
  }

  const org = await prisma.organization.findUnique({
    where: { id: userOrgId },
    select: { orgCode: true },
  });

  if (!org) {
    throw new Error('Organización no encontrada');
  }

  const existingInvitation = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: userOrgId,
      email: email.toLowerCase(),
      accepted: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error('Ya existe una invitación pendiente para este correo');
  }

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: userOrgId,
      email: email.toLowerCase(),
      orgCode: org.orgCode,
      invitedByUserId: session.user.id,
      role: 'student',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return invitation;
}

export async function listOrgInvitations() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userRole = (session.user as any).role;
  const userOrgId = (session.user as any).organizationId;

  if (userRole !== 'hospital_admin' && userRole !== 'super_admin') {
    throw new Error('No autorizado');
  }

  if (!userOrgId) {
    throw new Error('Tu cuenta no está asociada a una organización');
  }

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: userOrgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      orgCode: true,
      accepted: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return invitations;
}

export async function deleteInvitation(invitationId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userRole = (session.user as any).role;
  const userOrgId = (session.user as any).organizationId;

  if (userRole !== 'hospital_admin' && userRole !== 'super_admin') {
    throw new Error('No autorizado para eliminar invitaciones');
  }

  if (!userOrgId) {
    throw new Error('Tu cuenta no está asociada a una organización');
  }

  await prisma.organizationInvitation.deleteMany({
    where: {
      id: invitationId,
      organizationId: userOrgId,
    },
  });

  revalidatePath('/org/employees');
}

export async function getOrgInfo() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userOrgId = (session.user as any).organizationId;
  if (!userOrgId) {
    return null;
  }

  const org = await prisma.organization.findUnique({
    where: { id: userOrgId },
    select: { id: true, name: true, orgCode: true },
  });

  return org;
}

export async function listOrgMembers() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('No autenticado');
  }

  const userRole = (session.user as any).role;
  const userOrgId = (session.user as any).organizationId;

  if (userRole !== 'hospital_admin' && userRole !== 'super_admin') {
    throw new Error('No autorizado');
  }

  if (!userOrgId) {
    return [];
  }

  const members = await prisma.user.findMany({
    where: { organizationId: userOrgId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return members;
}