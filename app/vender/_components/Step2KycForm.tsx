'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitVendorKyc } from '@/lib/actions/vendor/onboarding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';

const kycSchema = z.object({
  taxIdType: z.string().min(1, 'Selecciona el tipo de documento'),
  taxIdNumber: z.string().min(5, 'Ingresa un número de documento válido'),
  bankName: z.string().min(2, 'Ingresa el nombre del banco'),
  accountType: z.string().min(1, 'Selecciona el tipo de cuenta'),
  accountNumber: z.string().min(5, 'Ingresa un número de cuenta válido'),
});

type KycFormData = z.infer<typeof kycSchema>;

interface Props {
  vendorId: string;
}

export function Step2KycForm({ vendorId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      taxIdType: 'NIT',
      accountType: 'ahorros',
    },
  });

  const onSubmit = async (data: KycFormData) => {
    setError(null);
    setLoading(true);
    try {
      await submitVendorKyc(vendorId, {
        taxIdType: data.taxIdType,
        taxIdNumber: data.taxIdNumber,
        taxDocumentKey: certFile?.name ?? 'pending',
        bankAccountInfo: {
          bankName: data.bankName,
          accountType: data.accountType,
          accountNumber: data.accountNumber,
        },
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Datos fiscales y de pago</CardTitle>
          <p className="text-sm text-muted-foreground">
            Necesitamos esta información para poder realizarte los pagos de tus ventas
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Estos datos se almacenan cifrados y solo se usan para pagarte.
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxIdType">Tipo de documento</Label>
              <Controller
                name="taxIdType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="taxIdType">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIT">NIT</SelectItem>
                      <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.taxIdType && (
                <p className="text-xs text-destructive">{errors.taxIdType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxIdNumber">Número de documento</Label>
              <Input
                id="taxIdNumber"
                placeholder="Ej: 900123456-1"
                {...register('taxIdNumber')}
              />
              {errors.taxIdNumber && (
                <p className="text-xs text-destructive">{errors.taxIdNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Certificado bancario</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                <Upload className="size-4" />
                {certFile ? certFile.name : 'Subir certificado bancario'}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg"
                  className="hidden"
                  onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                placeholder="Ej: Bancolombia"
                {...register('bankName')}
              />
              {errors.bankName && (
                <p className="text-xs text-destructive">{errors.bankName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Tipo de cuenta</Label>
              <Controller
                name="accountType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="accountType">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahorros">Ahorros</SelectItem>
                      <SelectItem value="corriente">Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountType && (
                <p className="text-xs text-destructive">{errors.accountType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Número de cuenta</Label>
              <Input
                id="accountNumber"
                placeholder="Ej: 12345678901"
                {...register('accountNumber')}
              />
              {errors.accountNumber && (
                <p className="text-xs text-destructive">{errors.accountNumber.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full btn-press" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar para revisión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
