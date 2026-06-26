'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { uploadFile, getSignedDownloadUrl } from '@/lib/storage/client';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function getUserCertificates() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  return prisma.certificate.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
  });
}

export async function generateCertificate(enrollmentId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { product: true },
  });

  if (!enrollment) {
    throw new Error('Inscripción no encontrada');
  }

  if (enrollment.userId !== session.user.id) {
    throw new Error('No autorizado');
  }

  if (enrollment.status !== 'completed' && enrollment.progressPct < 100) {
    throw new Error('Debes completar el curso para generar el certificado');
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: enrollment.productId } },
  });

  if (existing) {
    return { certificateId: existing.id, pdfUrl: existing.pdfUrl };
  }

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(245, 245, 250);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setDrawColor(129, 39, 207);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(129, 39, 207);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(129, 39, 207);
  doc.text('CERTIFICADO', pageWidth / 2, 45, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text('de finalizacion', pageWidth / 2, 55, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Se certifica que', pageWidth / 2, 80, { align: 'center' });

  const userName = session.user.name || 'Usuario';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 30, 30);
  doc.text(userName, pageWidth / 2, 95, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text('ha completado satisfactoriamente el curso', pageWidth / 2, 110, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(129, 39, 207);
  doc.text(enrollment.product.title, pageWidth / 2, 125, { align: 'center' });

  const issueDate = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha de emision: ${issueDate}`, pageWidth / 2, 145, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Medicamentum360 — Plataforma Educativa Medica', pageWidth / 2, pageHeight - 25, { align: 'center' });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const filename = `certificates/${session.user.id}/${enrollment.productId}.pdf`;
  const pdfUrl = await uploadFile(filename, pdfBuffer, 'application/pdf');

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    `${process.env.BETTER_AUTH_URL || 'https://medicamentum360.com'}/certificados/${enrollment.productId}`
  )}`;

  const certificate = await prisma.certificate.create({
    data: {
      userId: session.user.id,
      productId: enrollment.productId,
      pdfUrl,
      linkedinUrl,
    },
  });

  revalidatePath('/dashboard');

  return { certificateId: certificate.id, pdfUrl, linkedinUrl };
}

export async function getCertificateDownloadUrl(certificateId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
  });

  if (!certificate || certificate.userId !== session.user.id) {
    throw new Error('Certificado no encontrado');
  }

  const key = certificate.pdfUrl.replace(process.env.STORAGE_PUBLIC_URL || '', '');
  return getSignedDownloadUrl(key, 3600);
}
