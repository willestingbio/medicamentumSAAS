import { Suspense } from 'react';
import { getProfile } from '@/lib/actions/profile';
import { SettingsContent } from '@/components/settings/SettingsContent';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';

export const metadata = {
  title: 'Configuracion — Medicamentum360',
  description: 'Administra tu perfil y preferencias.',
};

export default async function SettingsPage() {
  const profile = await getProfile();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configuracion
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra tu perfil, preferencias e integraciones.
        </p>
      </div>

      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent profile={profile} />
      </Suspense>

      <SecuritySettings />
    </div>
  );
}
