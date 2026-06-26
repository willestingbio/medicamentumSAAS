'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getOrderById } from '@/lib/actions/checkout';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  billingFirstName: string;
  billingLastName: string;
  createdAt: Date;
  items: {
    id: string;
    priceCents: number;
    product: {
      title: string;
      type: string;
    };
  }[];
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      router.push('/sign-in?redirect_to=/checkout');
      return;
    }

    if (!orderId) {
      router.push('/dashboard');
      return;
    }

    async function loadOrder() {
      try {
        const data = await getOrderById(orderId!);
        setOrder(data as Order);
      } catch (error) {
        console.error('Error loading order:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [session, orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-card rounded-xl border p-8 text-center">
          <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">¡Compra exitosa!</h1>
          <p className="text-muted-foreground mb-6">
            Tu orden ha sido procesada. Recibirás un email de confirmación en breve.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground mb-1">Orden</p>
            <p className="font-mono font-medium">#{order.id.slice(-8).toUpperCase()}</p>
            <div className="mt-3 space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate">{item.product.title}</span>
                  <span>{formatPrice(item.priceCents)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                Ir a Mis Cursos
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/productos">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
