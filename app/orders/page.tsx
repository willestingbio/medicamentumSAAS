'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { getOrderHistory } from '@/lib/actions/checkout';
import { Badge } from '@/components/ui/badge';
import { Package, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  priceCents: number;
  product: {
    title: string;
    type: string;
  };
}

interface Order {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: Date;
  paidAt: Date | null;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  paid: { label: 'Pagada', variant: 'default' },
  failed: { label: 'Fallida', variant: 'destructive' },
  refunded: { label: 'Reembolsada', variant: 'outline' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      router.push('/sign-in?redirect_to=/orders');
      return;
    }

    async function loadOrders() {
      try {
        const data = await getOrderHistory();
        setOrders(data as Order[]);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [session, router]);

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Historial de compras</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="size-16 text-muted-foreground opacity-50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No hay compras aún</h2>
            <p className="text-muted-foreground mb-6">Explora nuestro catálogo y realiza tu primera compra.</p>
            <Link
              href="/productos"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-card rounded-lg border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Orden #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusConfig[order.status]?.variant || 'secondary'}>
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                    <span className="font-bold">{formatPrice(order.totalCents)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.product.title}</span>
                      <span>{formatPrice(item.priceCents)}</span>
                    </div>
                  ))}
                </div>

                {order.status === 'paid' && (
                  <div className="mt-4 pt-4 border-t">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      Ir a Mis Cursos
                      <ExternalLink className="size-3 ml-1" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
