'use client';

import { useState, useCallback, useEffect } from 'react';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';

declare global {
  interface Window {
    WidgetCheckout: new (config: any) => { open: (callback: (result: any) => void) => void };
  }
}

interface WompiWidgetProps {
  publicKey: string;
  amountInCents: number;
  currency: string;
  reference: string;
  integritySignature: string;
  customerEmail?: string;
  customerName?: string;
  redirectUrl?: string;
  onSuccess: (transaction: { id: string; reference: string; status: string }) => void;
  onError: (error: string) => void;
}

export function WompiWidget({
  publicKey,
  amountInCents,
  currency,
  reference,
  integritySignature,
  customerEmail,
  customerName,
  redirectUrl,
  onSuccess,
  onError,
}: WompiWidgetProps) {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (window.WidgetCheckout) {
      setSdkReady(true);
      return;
    }
    // The Script onLoad already sets sdkReady, but also poll in case
    const interval = setInterval(() => {
      if (window.WidgetCheckout) {
        setSdkReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handlePay = useCallback(() => {
    if (!window.WidgetCheckout) {
      onError('SDK de Wompi no disponible. Recarga la página.');
      return;
    }

    try {
      const config: any = {
        currency,
        amountInCents,
        reference,
        publicKey,
        signature: { integrity: integritySignature },
        redirectUrl: redirectUrl || `${window.location.origin}/checkout/success`,
      };

      if (customerEmail || customerName) {
        config.customerData = {};
        if (customerEmail) config.customerData.email = customerEmail;
        if (customerName) config.customerData.fullName = customerName;
      }

      console.log('[Wompi] Opening widget with config:', {
        currency: config.currency,
        amountInCents: config.amountInCents,
        reference: config.reference,
        publicKey: config.publicKey,
        signature: config.signature,
        hasRedirectUrl: !!config.redirectUrl,
      });

      const checkout = new window.WidgetCheckout(config);
      checkout.open((result: any) => {
        console.log('[Wompi] Widget callback result:', JSON.stringify(result, null, 2));

        if (!result) {
          onError('Widget cerrado sin respuesta. El usuario puede haber cancelado.');
          return;
        }

        const txn = result?.transaction;
        if (txn?.status === 'APPROVED') {
          onSuccess({
            id: txn.id,
            reference: txn.reference || reference,
            status: txn.status,
          });
        } else if (txn?.status === 'DECLINED') {
          onError(`Pago rechazado por Wompi. Verifica los datos de la tarjeta de prueba.`);
        } else if (txn?.status === 'ERROR') {
          onError(`Error en la transacción: ${txn?.status_message || 'Error desconocido de Wompi'}`);
        } else if (txn) {
          onError(`Estado inesperado: ${txn.status}`);
        } else {
          onError(`Respuesta inesperada del widget. Revisa la consola del navegador.`);
        }
      });
    } catch (err) {
      console.error('[Wompi] Error:', err);
      onError('Error al abrir el widget de pago');
    }
  }, [publicKey, amountInCents, currency, reference, integritySignature, redirectUrl, customerEmail, customerName, onSuccess, onError]);

  return (
    <>
      <Script
        src="https://checkout.wompi.co/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.WidgetCheckout) {
            setSdkReady(true);
          }
        }}
      />

      {!sdkReady && (
        <div className="flex items-center gap-3 p-4 border rounded-lg">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Cargando widget de pago...</span>
        </div>
      )}

      {sdkReady && (
        <Button onClick={handlePay} className="w-full" size="lg">
          <CreditCard className="size-4 mr-2" />
          Pagar con Wompi
        </Button>
      )}
    </>
  );
}
