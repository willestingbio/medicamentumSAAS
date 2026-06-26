'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, ArrowRight } from 'lucide-react';
import { CartItemRow } from './CartItemRow';
import { getCart, clearCart } from '@/lib/actions/cart';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  productId: string;
  product: {
    title: string;
    slug: string;
    priceCents: number;
    coverImageUrl: string | null;
    type: string;
  };
}

interface CartData {
  id: string;
  items: CartItem[];
}

interface CartPopoverProps {
  guestToken?: string;
}

// Shared state across NavBar instances
let _cartCount = 0;
let _listeners: Array<() => void> = [];

function setCartCount(n: number) { _cartCount = n; _listeners.forEach(l => l()); }
function subscribeCartCount(l: () => void) { _listeners.push(l); return () => { _listeners = _listeners.filter(x => x !== l); }; }

export function incrementCartCount() { setCartCount(_cartCount + 1); }

export function CartPopover({ guestToken }: CartPopoverProps) {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [badge, setBadge] = useState(_cartCount);

  useEffect(() => subscribeCartCount(() => setBadge(_cartCount)), []);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCart(guestToken);
      setCart(data);
      setCartCount(data?.items.length ?? 0);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }, [guestToken]);

  useEffect(() => {
    if (open) loadCart();
  }, [open, loadCart]);

  useEffect(() => {
    const handleCartUpdated = () => loadCart();
    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, [loadCart]);

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => {
      if (!prev) return prev;
      const newItems = prev.items.filter((item) => item.id !== itemId);
      setCartCount(newItems.length);
      return { ...prev, items: newItems };
    });
  };

  const handleClearCart = async () => {
    try {
      await clearCart(guestToken);
      setCart(null);
      setCartCount(0);
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Carrito vaciado');
    } catch (error) {
      toast.error('Error al vaciar carrito');
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const subtotal = cart?.items.reduce((sum, item) => sum + item.product.priceCents, 0) ?? 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <ShoppingCart className="size-5" />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
            {badge}
          </span>
        )}
      </Button>

      {open && (
        <>
          {createPortal(
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />,
            document.body
          )}
          <div
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 max-h-[70vh] rounded-lg border bg-card shadow-lg flex flex-col overflow-hidden"
            style={{ animation: 'dropdown-in 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h3 className="font-semibold">Carrito ({badge})</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              ) : !cart || cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className="size-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      guestToken={guestToken}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </div>
              )}
            </div>

            {cart && cart.items.length > 0 && (
              <div className="border-t p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IVA (19%)</span>
                  <span className="font-semibold">{formatPrice(Math.round(subtotal * 0.19))}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(Math.round(subtotal * 1.19))}</span>
                </div>
                <Button asChild className="w-full">
                  <Link href="/checkout" onClick={() => setOpen(false)}>
                    Ir a checkout
                    <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={handleClearCart}
                >
                  Vaciar carrito
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
