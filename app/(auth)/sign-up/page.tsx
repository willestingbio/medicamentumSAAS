'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import zxcvbn from 'zxcvbn';
import { authClient } from '@/lib/auth-client';
import { getOrgDetails, linkUserToOrganization } from '@/lib/actions/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastname: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
    email: z.string().email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

function passwordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  const result = zxcvbn(password);
  const map = [
    { label: 'Muy débil', color: 'bg-destructive' },
    { label: 'Débil', color: 'bg-destructive' },
    { label: 'Regular', color: 'bg-yellow-500' },
    { label: 'Fuerte', color: 'bg-lime-500' },
    { label: 'Muy fuerte', color: 'bg-green-500' },
  ];
  return { score: result.score, ...map[result.score] };
}

interface OrganizationInfo {
  id: string;
  name: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode = searchParams.get('org_code');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  useEffect(() => {
    if (orgCode) {
      setOrgLoading(true);
      getOrgDetails(orgCode)
        .then((org) => {
          if (org) {
            setOrganization(org);
          } else {
            setOrgError('Código de invitación inválido');
          }
        })
        .catch(() => setOrgError('Error al validar el código'))
        .finally(() => setOrgLoading(false));
    }
  }, [orgCode]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const password = watch('password', '');
  const strength = passwordStrength(password);

  const onSubmit = async (data: SignUpForm) => {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await authClient.signUp.email({
        name: `${data.name} ${data.lastname}`,
        email: data.email,
        password: data.password,
      });
      if (authError) {
        setError(authError.message || 'Error al crear la cuenta');
        setLoading(false);
        return;
      }

      if (orgCode) {
        const linkResult = await linkUserToOrganization(orgCode);
        if (linkResult.error) {
          setError(linkResult.error);
          setLoading(false);
          return;
        }
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({ provider: 'google' });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {organization
            ? `Uniendote a ${organization.name}`
            : 'Únete a Medicamentum360'}
        </p>
      </div>

      {organization && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm">
          <Building2 className="size-4 text-primary" />
          <span className="text-foreground">
            Serás añadido como empleado de <strong>{organization.name}</strong>
          </span>
        </div>
      )}

      {orgError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {orgError}
        </div>
      )}

      <Button variant="outline" className="w-full gap-2 btn-press" onClick={handleGoogleSignIn}>
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continuar con Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">o</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Juan" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastname">Apellidos</Label>
            <Input id="lastname" placeholder="Pérez" {...register('lastname')} />
            {errors.lastname && (
              <p className="text-xs text-destructive">{errors.lastname.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="correo@hospital.com" {...register('email')} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
          {password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.color : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{strength.label}</p>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="acceptTerms"
            type="checkbox"
            className="mt-1 size-4 rounded border-input accent-primary"
            {...register('acceptTerms')}
          />
          <Label htmlFor="acceptTerms" className="text-xs font-normal leading-relaxed">
            Acepto los{' '}
            <Link href="/terminos" className="text-primary hover:underline" target="_blank">
              Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
              Política de Privacidad
            </Link>
          </Label>
        </div>
        {errors.acceptTerms && (
          <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" className="w-full btn-press" disabled={loading || orgLoading}>
          {loading ? 'Creando cuenta...' : orgLoading ? 'Validando...' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/sign-in" className="text-primary font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}