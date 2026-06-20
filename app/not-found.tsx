import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-24 min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="size-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">Página no encontrada</h2>
        <p className="text-muted-foreground mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  );
}