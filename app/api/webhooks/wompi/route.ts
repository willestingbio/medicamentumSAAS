import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWompiSignature } from '@/lib/wompi';
import { enrollUserInCourse } from '@/lib/moodle/client';
import { sendOrderConfirmationEmail } from '@/lib/email/brevo';

/**
 * Webhook de Wompi — POST /api/webhooks/wompi
 *
 * Flujo:
 * 1. Valida HMAC signature
 * 2. Verifica idempotencia (ya procesado?)
 * 3. Actualiza Order.status = paid
 * 4. Crea Enrollment en DB
 * 5. Inscriben en Moodle (si es curso)
 * 6. Envía email de confirmación
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Leer body raw para validación HMAC
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-wompi-signature') || '';

    // 2. Validar HMAC signature
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET!;
    if (!validateWompiSignature(rawBody, signatureHeader, eventsSecret)) {
      console.error('[Wompi Webhook] Invalid HMAC signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const transaction = payload.transaction;

    if (!event || !transaction) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 4. Solo procesar eventos de transacción
    if (event !== 'transaction.updated') {
      return NextResponse.json({ received: true });
    }

    const { id: wompiTransactionId, status, reference } = transaction;

    // 5. Buscar orden por wompiReference (nuestra reference interna)
    const order = await prisma.order.findFirst({
      where: { wompiReference: reference },
      include: {
        items: { include: { product: { include: { course: true } } } },
        user: true,
      },
    });

    if (!order) {
      console.error(`[Wompi Webhook] Order not found for reference: ${reference}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 6. Idempotencia: si ya está paid, ignorar
    if (order.status === 'paid') {
      console.log(`[Wompi Webhook] Order ${order.id} already paid, skipping`);
      return NextResponse.json({ received: true });
    }

    // 7. Mapear status de Wompi a nuestro OrderStatus
    let orderStatus: 'paid' | 'failed' | 'refunded';
    switch (status) {
      case 'APPROVED':
        orderStatus = 'paid';
        break;
      case 'DECLINED':
      case 'VOIDED':
      case 'ERROR':
        orderStatus = 'failed';
        break;
      default:
        return NextResponse.json({ received: true });
    }

    // 8. Actualizar orden — guardamos el ID real de la transacción de Wompi
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus,
        wompiTransactionId, // ID real de la transacción en Wompi
        paidAt: orderStatus === 'paid' ? new Date() : null,
      },
    });

    // 9. Si el pago fue aprobado, crear enrollments
    if (orderStatus === 'paid') {
      for (const item of order.items) {
        // Crear enrollment en DB
        const enrollment = await prisma.enrollment.upsert({
          where: {
            userId_productId: {
              userId: order.userId,
              productId: item.productId,
            },
          },
          create: {
            userId: order.userId,
            productId: item.productId,
            progressPct: 0,
            status: 'not_started',
          },
          update: {}, // No actualizar si ya existe
        });

        // Si es un curso moodle_legacy con moodleCourseId, inscribir en Moodle
        // Cursos nativos (Course Builder) NO deben inscribirse en Moodle
        if (
          item.product.course?.contentSource === 'moodle_legacy' &&
          item.product.moodleCourseId &&
          order.user.moodleUserId
        ) {
          try {
            const moodleUserId = order.user.moodleUserId;
            const moodleCourseId = item.product.moodleCourseId;

            await enrollUserInCourse(moodleUserId, moodleCourseId);

            // Actualizar enrollment con estado
            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { status: 'enrolled' },
            });

            console.log(`[Wompi Webhook] Enrolled user ${order.userId} in Moodle course ${moodleCourseId}`);
          } catch (error) {
            console.error(`[Wompi Webhook] Moodle enrollment failed for user ${order.userId}:`, error);
            // No fallar el webhook por un error de Moodle — el enrollment en DB ya está creado
            // El syncMoodleProgress se encargará después
          }
        }
      }

      // 10. Enviar email de confirmación
      try {
        await sendOrderConfirmationEmail({
          to: order.user.email,
          userName: order.user.name,
          orderId: order.id,
          items: order.items.map((item) => ({
            title: item.product.title,
            priceCents: item.priceCents,
          })),
          totalCents: order.totalCents,
        });
        console.log(`[Wompi Webhook] Confirmation email sent to ${order.user.email}`);
      } catch (error) {
        console.error(`[Wompi Webhook] Email send failed:`, error);
        // No fallar el webhook por un error de email
      }

      // 11. Log de analytics
      console.log(JSON.stringify({
        event: 'purchase',
        orderId: order.id,
        userId: order.userId,
        totalCents: order.totalCents,
        itemCount: order.items.length,
      }));
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Wompi Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
