'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { checkRateLimit } from '@/lib/rate-limit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const rl = checkRateLimit(`forgot-password:${email}`, 3, 60_000);
      if (!rl.allowed) {
        setError(`Demasiados intentos. Intenta de nuevo en ${Math.ceil(rl.resetIn / 1000)} segundos.`);
        return;
      }
      const res = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Error al enviar el correo');
        return;
      }
      setSent(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      {sent ? (
        <div className="text-center space-y-4">
          <div className="rounded-md bg-primary/10 p-4 text-sm text-primary">
            Revisa tu correo electrónico. Si existe una cuenta con {email}, recibirás un enlace para restablecer tu contraseña.
          </div>
          <Link href="/sign-in" className="text-sm text-primary font-medium hover:underline block">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
