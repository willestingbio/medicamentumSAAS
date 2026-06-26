'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getCheckoutSummary, generateWompiSignature } from '@/lib/actions/checkout';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { WompiWidget } from '@/components/checkout/WompiWidget';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface CheckoutSummary {
  items: {
    id: string;
    productId: string;
    title: string;
    slug: string;
    priceCents: number;
    coverImageUrl: string | null;
    type: string;
  }[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
  user: {
    name: string;
    email: string;
  };
}

interface OrderCreated {
  orderId: string;
  wompiReference: string;
  totalCents: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderCreated, setOrderCreated] = useState<OrderCreated | null>(null);
  // Persist order data even when going back to form — so resubmit skips createOrderFromCart
  const [existingOrder, setExistingOrder] = useState<OrderCreated | null>(null);
  const [paying, setPaying] = useState(false);
  const [integritySignature, setIntegritySignature] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) {
      router.push('/sign-in?redirect_to=/checkout');
      return;
    }

    async function loadSummary() {
      try {
        const data = await getCheckoutSummary();
        setSummary(data);
      } catch (error) {
        console.error('Error loading checkout summary:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [session, router]);

  // Re-fetch summary when cart changes (e.g. item removed from CartPopover); redirect if empty
  useEffect(() => {
    if (!session?.user) return;
    const handleCartUpdated = async () => {
      try {
        const data = await getCheckoutSummary();
        setSummary(data);
        if (!data || data.items.length === 0) {
          toast.info('Tu carrito está vacío');
          router.push('/productos');
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, [session, router]);

  const handleOrderCreated = useCallback(async (orderId: string, wompiReference: string, totalCents: number) => {
    const orderData = { orderId, wompiReference, totalCents };
    setOrderCreated(orderData);
    setExistingOrder(orderData);
    try {
      const sig = await generateWompiSignature(wompiReference, totalCents, 'COP');
      setIntegritySignature(sig);
    } catch (err) {
      console.error('Error generating Wompi signature:', err);
    }
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    toast.success('Pago procesado exitosamente');
    router.push(`/checkout/success?orderId=${orderCreated?.orderId}`);
  }, [router, orderCreated]);

  const handlePaymentError = useCallback((error: string) => {
    setPaying(false);
    toast.error(error);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando checkout...</p>
      </div>
    );
  }

  if (!summary || summary.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <ShoppingCart className="size-16 text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <p className="text-muted-foreground">Agrega productos antes de continuar al checkout.</p>
        <Button asChild>
          <Link href="/productos">Explorar catálogo</Link>
        </Button>
      </div>
    );
  }

  const wompiPublicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">
          {orderCreated ? 'Pago' : 'Checkout'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form or Payment */}
          <div className="lg:col-span-2">
            {orderCreated ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOrderCreated(null)}
                  disabled={paying}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  Volver a datos de facturación
                </Button>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pago seguro con Wompi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {wompiPublicKey && integritySignature ? (
                      <WompiWidget
                        publicKey={wompiPublicKey}
                        amountInCents={orderCreated.totalCents}
                        currency="COP"
                        reference={orderCreated.wompiReference}
                        integritySignature={integritySignature}
                        customerEmail={summary.user.email}
                        customerName={summary.user.name}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          {!wompiPublicKey
                            ? 'La llave pública de Wompi no está configurada.'
                            : 'Generando firma de pago...'}
                        </p>
                        {!wompiPublicKey && (
                          <p className="text-xs text-muted-foreground">
                            Agrega <code>NEXT_PUBLIC_WOMPI_PUBLIC_KEY</code> a tu .env.local
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <CheckoutForm
                userName={summary.user.name}
                userEmail={summary.user.email}
                existingOrder={existingOrder}
                onOrderCreated={handleOrderCreated}
              />
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <OrderSummary
                items={summary.items}
                subtotalCents={summary.subtotalCents}
                taxCents={summary.taxCents}
                totalCents={summary.totalCents}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
