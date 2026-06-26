'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ===== Helper: obtener sesión actual =====
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

// ===== Helper: obtener crear carrito para usuario autenticado =====
async function getOrCreateUserCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

// ===== Helper: obtener crear carrito para guest =====
async function getOrCreateGuestCart(guestToken: string) {
  let cart = await prisma.cart.findUnique({ where: { guestToken } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { guestToken } });
  }
  return cart;
}

// ===== Helper: calcular totals =====
function calculateTotals(items: { product: { priceCents: number } }[]) {
  const subtotalCents = items.reduce((sum, item) => sum + item.product.priceCents, 0);
  const taxRate = parseFloat(process.env.DEFAULT_TAX_RATE || '0.19');
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

// ===== Action: obtener carrito actual =====
export async function getCart(guestToken?: string) {
  const session = await getSession();

  if (session?.user) {
    // Usuario autenticado: carrito por userId
    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return cart;
  }

  // Guest: carrito por guestToken
  if (guestToken) {
    const cart = await prisma.cart.findUnique({
      where: { guestToken },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return cart;
  }

  return null;
}

// ===== Action: agregar item al carrito =====
export async function addToCart(productId: string, guestToken?: string) {
  const session = await getSession();

  // Verificar que el producto existe y está publicado
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.published) {
    throw new Error('Producto no encontrado');
  }

  // Verificar que el usuario no tenga ya acceso al producto
  if (session?.user) {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_productId: { userId: session.user.id, productId } },
    });
    if (existingEnrollment) {
      throw new Error('Ya tienes acceso a este producto');
    }
  }

  if (session?.user) {
    // Usuario autenticado: agregar al carrito del usuario
    const cart = await getOrCreateUserCart(session.user.id);

    // Verificar si ya tiene el item en el carrito
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      throw new Error('Este producto ya está en tu carrito');
    }

    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, userId: session.user.id },
    });
  } else {
    // Guest: agregar al carrito por guestToken
    if (!guestToken) {
      throw new Error('Se requiere un token de invitado');
    }

    const cart = await getOrCreateGuestCart(guestToken);

    // Verificar si ya tiene el item en el carrito
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      throw new Error('Este producto ya está en tu carrito');
    }

    await prisma.cartItem.create({
      data: { cartId: cart.id, productId },
    });
  }

  revalidatePath('/');
  return { success: true };
}

// ===== Action: eliminar item del carrito =====
export async function removeFromCart(cartItemId: string, guestToken?: string) {
  const session = await getSession();

  if (session?.user) {
    // Verificar que el item pertenece al carrito del usuario
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== session.user.id) {
      throw new Error('Item no encontrado');
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
  } else {
    // Guest: verificar que el item pertenece al carrito del guest
    if (!guestToken) {
      throw new Error('Se requiere un token de invitado');
    }

    const cart = await prisma.cart.findUnique({ where: { guestToken } });
    if (!cart) {
      throw new Error('Carrito no encontrado');
    }

    const cartItem = await prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!cartItem || cartItem.cartId !== cart.id) {
      throw new Error('Item no encontrado');
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  revalidatePath('/');
  return { success: true };
}

// ===== Action: limpiar carrito =====
export async function clearCart(guestToken?: string) {
  const session = await getSession();

  if (session?.user) {
    const cart = await prisma.cart.findUnique({ where: { userId: session.user.id } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  } else {
    if (!guestToken) {
      throw new Error('Se requiere un token de invitado');
    }
    const cart = await prisma.cart.findUnique({ where: { guestToken } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  revalidatePath('/');
  return { success: true };
}

// ===== Action: merge guest cart al hacer login =====
export async function mergeGuestCart(guestToken: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Se requiere autenticación');
  }

  const guestCart = await prisma.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });

  if (!guestCart || guestCart.items.length === 0) {
    return { merged: 0, skipped: 0 };
  }

  const userCart = await getOrCreateUserCart(session.user.id);

  // Use interactive transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    let merged = 0;
    let skipped = 0;

    for (const guestItem of guestCart.items) {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId: guestItem.productId,
          },
        },
      });

      if (existingEnrollment) {
        skipped++;
        continue;
      }

      const existingCartItem = await tx.cartItem.findFirst({
        where: { cartId: userCart.id, productId: guestItem.productId },
      });

      if (existingCartItem) {
        skipped++;
        continue;
      }

      await tx.cartItem.update({
        where: { id: guestItem.id },
        data: {
          cartId: userCart.id,
          userId: session.user.id,
        },
      });
      merged++;
    }

    // Delete empty guest cart
    const remainingItems = await tx.cartItem.count({
      where: { cartId: guestCart.id },
    });

    if (remainingItems === 0) {
      await tx.cart.delete({ where: { id: guestCart.id } });
    }

    return { merged, skipped };
  });

  revalidatePath('/');
  return result;
}

// ===== Action: obtener resumen del carrito (para checkout) =====
export async function getCartSummary(guestToken?: string) {
  const cart = await getCart(guestToken);
  if (!cart || cart.items.length === 0) {
    return null;
  }

  const totals = calculateTotals(cart.items);

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
    ...totals,
    itemCount: cart.items.length,
  };
}
