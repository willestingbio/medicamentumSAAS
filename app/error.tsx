'use client';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error: _error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container mx-auto px-4 py-24 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">500</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">Error interno</h2>
        <p className="text-muted-foreground mb-8">
          Algo salió mal. Nuestro equipo ha sido notificado.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Ir al inicio
          </Button>
        </div>
      </div>
    </main>
  );
}