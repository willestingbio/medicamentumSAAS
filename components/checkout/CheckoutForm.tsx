'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createOrderFromCart } from '@/lib/actions/checkout';
import { toast } from 'sonner';

interface CheckoutFormProps {
  userName: string;
  userEmail: string;
  existingOrder?: { orderId: string; wompiReference: string; totalCents: number } | null;
  onOrderCreated: (orderId: string, wompiReference: string, totalCents: number) => void;
}

export function CheckoutForm({ userName, userEmail, existingOrder, onOrderCreated }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    billingFirstName: userName.split(' ')[0] || '',
    billingLastName: userName.split(' ').slice(1).join(' ') || '',
    billingDocType: 'CC',
    billingDocId: '',
    billingEmail: userEmail,
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingCountry: 'CO',
    billingPhone: '',
    couponCode: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If an order was already created (user went back from payment step), skip re-creation
      if (existingOrder) {
        onOrderCreated(existingOrder.orderId, existingOrder.wompiReference, existingOrder.totalCents);
        return;
      }

      const result = await createOrderFromCart({
        ...formData,
        billingDocType: formData.billingDocType,
      });

      toast.success('Orden creada. Ahora completa el pago.');
      onOrderCreated(result.orderId, result.wompiReference, result.totalCents);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Datos de facturación</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingFirstName">Nombre</Label>
              <Input
                id="billingFirstName"
                name="billingFirstName"
                value={formData.billingFirstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingLastName">Apellido</Label>
              <Input
                id="billingLastName"
                name="billingLastName"
                value={formData.billingLastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Document */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingDocType">Tipo doc.</Label>
              <select
                id="billingDocType"
                name="billingDocType"
                value={formData.billingDocType}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="CC">Cédula</option>
                <option value="NIT">NIT</option>
                <option value="CE">Cédula Extranjería</option>
                <option value="PASS">Pasaporte</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="billingDocId">Número de documento</Label>
              <Input
                id="billingDocId"
                name="billingDocId"
                value={formData.billingDocId}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Email de facturación</Label>
            <Input
              id="billingEmail"
              name="billingEmail"
              type="email"
              value={formData.billingEmail}
              onChange={handleChange}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Dirección (opcional)</Label>
            <Input
              id="billingAddress"
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleChange}
            />
          </div>

          {/* City / State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingCity">Ciudad (opcional)</Label>
              <Input
                id="billingCity"
                name="billingCity"
                value={formData.billingCity}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingState">Departamento (opcional)</Label>
              <Input
                id="billingState"
                name="billingState"
                value={formData.billingState}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="billingPhone">Teléfono (opcional)</Label>
            <Input
              id="billingPhone"
              name="billingPhone"
              type="tel"
              value={formData.billingPhone}
              onChange={handleChange}
            />
          </div>

          {/* Coupon */}
          <div className="space-y-2">
            <Label htmlFor="couponCode">Cupón de descuento (opcional)</Label>
            <Input
              id="couponCode"
              name="couponCode"
              value={formData.couponCode}
              onChange={handleChange}
              placeholder="Ej: DESCUENTO20"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Creando orden...' : 'Continuar al pago'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
