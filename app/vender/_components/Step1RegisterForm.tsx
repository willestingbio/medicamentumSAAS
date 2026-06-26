'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerAsVendor } from '@/lib/actions/vendor/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Store } from 'lucide-react';

const schema = z.object({
  displayName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  bio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function Step1RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const result = await registerAsVendor(data.displayName, data.bio || undefined);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Store className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Cuéntanos sobre ti</CardTitle>
          <p className="text-sm text-muted-foreground">
            Crea tu perfil de creador para vender cursos y experiencias en el marketplace
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre de creador</Label>
              <Input
                id="displayName"
                placeholder="Ej: Dr. Carlos Martínez"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografía (opcional)</Label>
              <Textarea
                id="bio"
                placeholder="Cuéntanos sobre tu experiencia y especialidad..."
                rows={4}
                {...register('bio')}
              />
            </div>

            <Button type="submit" className="w-full btn-press" disabled={loading}>
              {loading ? 'Creando perfil...' : 'Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
