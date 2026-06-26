'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { removeFromCart } from '@/lib/actions/cart';
import { toast } from 'sonner';

interface CartItemRowProps {
  item: {
    id: string;
    productId: string;
    product: {
      title: string;
      slug: string;
      priceCents: number;
      coverImageUrl: string | null;
      type: string;
    };
  };
  guestToken?: string;
  onRemove?: (itemId: string) => void;
}

export function CartItemRow({ item, guestToken, onRemove }: CartItemRowProps) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeFromCart(item.id, guestToken);
      onRemove?.(item.id);
      window.dispatchEvent(new Event('cart-updated'));
      toast.success('Producto eliminado del carrito');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setRemoving(false);
    }
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const typeLabel = item.product.type === 'course' ? 'Curso' :
    item.product.type === 'vr_experience' ? 'Experiencia VR' : 'Automatización IA';

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <div className="relative size-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {item.product.coverImageUrl ? (
          <Image
            src={item.product.coverImageUrl}
            alt={item.product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center size-full text-xs text-muted-foreground">
            {typeLabel}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={`/courses/${item.product.slug}`}
          className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors"
        >
          {item.product.title}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
        <p className="text-sm font-semibold mt-1">{formatPrice(item.product.priceCents)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 flex-shrink-0"
        onClick={handleRemove}
        disabled={removing}
      >
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </div>
  );
}
