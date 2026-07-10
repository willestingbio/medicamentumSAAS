'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function linkUserToOrganization(orgCode: string) {
  const session = await getSession();
  if (!session?.user) {
    return { error: 'No autenticado' };
  }

  // Prevent users already in an org from switching to another
  if (session.user.organizationId) {
    return { error: 'Ya perteneces a una organización' };
  }

  try {
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { orgCode },
      include: { organization: true },
    });

    if (!invitation) {
      return { error: 'Código de invitación inválido' };
    }

    if (invitation.accepted) {
      return { error: 'Esta invitación ya fue utilizada' };
    }

    if (invitation.expiresAt < new Date()) {
      return { error: 'Esta invitación ha expirado' };
    }

    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { accepted: true },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    return { success: true, organizationName: invitation.organization.name };
  } catch {
    return { error: 'Error al vincular con la organización' };
  }
}

export async function getOrgDetails(orgCode: string) {
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