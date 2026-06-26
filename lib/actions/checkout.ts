'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { generateOrderReference } from '@/lib/wompi';

interface CheckoutInput {
  billingFirstName: string;
  billingLastName: string;
  billingDocType: string;
  billingDocId: string;
  billingEmail: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPhone?: string;
  couponCode?: string;
}

// ===== Helper: obtener sesión =====
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

// ===== Helper: calcular IVA =====
function calculateTax(subtotalCents: number): number {
  const taxRate = parseFloat(process.env.DEFAULT_TAX_RATE || '0.19');
  return Math.round(subtotalCents * taxRate);
}

// ===== Action: validar cupón =====
async function validateCoupon(code: string, subtotalCents: number) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon) {
    throw new Error('Cupón no válido');
  }

  if (!coupon.active) {
    throw new Error('Este cupón ya no está activo');
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new Error('Este cupón ha expirado');
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw new Error('Este cupón ha alcanzado su límite de uso');
  }

  if (subtotalCents < coupon.minAmountCents) {
    throw new Error(`El monto mínimo para este cupón es $${(coupon.minAmountCents / 100).toLocaleString('es-CO')}`);
  }

  return coupon;
}

// ===== Action: crear orden desde el carrito =====
export async function createOrderFromCart(input: CheckoutInput) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  // Obtener carrito del usuario
  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error('El carrito está vacío');
  }

  // Verificar que todos los productos estén publicados y tengan stock
  for (const item of cart.items) {
    if (!item.product.published) {
      throw new Error(`El producto "${item.product.title}" ya no está disponible`);
    }
    if (item.product.capacity !== null && item.product.capacity <= 0) {
      throw new Error(`El producto "${item.product.title}" no tiene cupos disponibles`);
    }
  }

  // Verificar que el usuario no tenga ya acceso a alguno de los productos
  for (const item of cart.items) {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId: item.productId,
        },
      },
    });
    if (existingEnrollment) {
      throw new Error(`Ya tienes acceso a "${item.product.title}"`);
    }
  }

  // Calcular totales
  const subtotalCents = cart.items.reduce((sum, item) => sum + item.product.priceCents, 0);
  let discountCents = 0;
  let couponId: string | null = null;

  // Aplicar cupón si se proporcionó
  if (input.couponCode) {
    const coupon = await validateCoupon(input.couponCode, subtotalCents);
    discountCents = Math.round(subtotalCents * (coupon.discountPercent / 100));
    couponId = coupon.id;

    // Incrementar contador de uso
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const afterDiscount = subtotalCents - discountCents;
  const taxCents = calculateTax(afterDiscount);
  const totalCents = afterDiscount + taxCents;

  // Crear orden
  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      organizationId: (session.user as any).organizationId || null,
      subtotalCents,
      discountCents,
      taxCents,
      totalCents,
      billingFirstName: input.billingFirstName,
      billingLastName: input.billingLastName,
      billingDocType: input.billingDocType,
      billingDocId: input.billingDocId,
      billingEmail: input.billingEmail,
      billingAddress: input.billingAddress,
      billingCity: input.billingCity,
      billingState: input.billingState,
      billingCountry: input.billingCountry || 'CO',
      billingPhone: input.billingPhone,
      couponId,
      items: {
        create: cart.items.map((item) => ({
          productId: item.productId,
          priceCents: item.product.priceCents,
          quantity: 1,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // Generar reference para Wompi
  const wompiReference = generateOrderReference(order.id);
  await prisma.order.update({
    where: { id: order.id },
    data: { wompiReference },
  });

  // Limpiar carrito después de crear la orden
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  revalidatePath('/checkout');
  revalidatePath('/');

  return {
    orderId: order.id,
    wompiReference,
    totalCents: order.totalCents,
    items: order.items,
  };
}

// ===== Action: obtener resumen de checkout =====
export async function getCheckoutSummary() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return null;
  }

  const subtotalCents = cart.items.reduce((sum, item) => sum + item.product.priceCents, 0);
  const taxCents = calculateTax(subtotalCents);
  const totalCents = subtotalCents + taxCents;

  return {
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.product.title,
      slug: item.product.slug,
      priceCents: item.product.priceCents,
      coverImageUrl: item.product.coverImageUrl,
      type: item.product.type,
    })),
    subtotalCents,
    taxCents,
    totalCents,
    itemCount: cart.items.length,
    user: {
      name: session.user.name,
      email: session.user.email,
    },
  };
}

// ===== Action: obtener orden por ID =====
export async function getOrderById(orderId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true },
      },
      coupon: true,
    },
  });

  if (!order) {
    throw new Error('Orden no encontrada');
  }

  // Verificar que la orden pertenece al usuario
  if (order.userId !== session.user.id) {
    throw new Error('No autorizado');
  }

  return order;
}

// ===== Action: obtener historial de órdenes =====
export async function getOrderHistory() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders;
}

// ===== Action: procesar pago con Wompi =====
export async function processWompiPayment(orderId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  // Obtener la orden
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error('Orden no encontrada');
  }

  if (order.userId !== session.user.id) {
    throw new Error('No autorizado');
  }

  if (order.status !== 'pending') {
    throw new Error('Esta orden ya fue procesada');
  }

  if (!order.wompiReference) {
    throw new Error('Esta orden no tiene una referencia de pago');
  }

  // La transacción se crea del lado del cliente (Wompi Widget).
  // Esta función solo verifica que la orden esté lista para recibir el webhook.
  return {
    orderId: order.id,
    wompiReference: order.wompiReference,
    totalCents: order.totalCents,
    billingEmail: order.billingEmail,
    billingFirstName: order.billingFirstName,
  };
}

// ===== Generar firma de integridad para Wompi =====
import { createHash } from 'crypto';

/**
 * Genera la firma de integridad SHA256 para Wompi.
 * Formato: SHA256(reference + amountInCents + currency + integritySecret)
 * Docs: https://docs.wompi.co/en/docs/colombia/widget-checkout-web/
 */
export async function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string,
): Promise<string> {
  const secret = process.env.WOMPI_INTEGRITY_SECRET || '';
  const concatenated = `${reference}${amountInCents}${currency}${secret}`;
  const hash = createHash('sha256').update(concatenated).digest('hex');

  // Debug: log the exact string being hashed (DO NOT log the secret in production)
  console.log('[Wompi] Integrity signature generated:', {
    reference,
    amountInCents,
    currency,
    hash,
    secretLength: secret.length,
  });

  return hash;
}
