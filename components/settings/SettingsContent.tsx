'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Palette, ShoppingBag, Save, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfile, deleteAccount } from '@/lib/actions/profile';
import { signOut } from '@/lib/auth-client';

type Profile = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  specialty: string | null;
  locale: string;
  theme: string;
  role: string;
  createdAt: Date;
} | null;

export function SettingsContent({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    lastName: profile?.lastName ?? '',
    specialty: profile?.specialty ?? '',
    theme: profile?.theme ?? 'system',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        lastName: form.lastName,
        specialty: form.specialty,
        theme: form.theme,
      });
      toast.success('Perfil actualizado correctamente');
      router.refresh();
    } catch {
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      toast.success('Cuenta eliminada correctamente');
      window.location.href = '/';
    } catch {
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellidos</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Tus apellidos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electronico</Label>
            <Input
              id="email"
              value={profile?.email ?? ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El correo no se puede cambiar desde aqui.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Especialidad / Cargo</Label>
            <Input
              id="specialty"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              placeholder="Ej: Enfermera jefe, Medico general"
            />
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Rol</p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile?.role?.replace('_', ' ') ?? 'student'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Miembro desde</p>
              <p className="text-xs text-muted-foreground">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('es-CO', {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'light', label: 'Claro' },
                  { value: 'dark', label: 'Oscuro' },
                  { value: 'system', label: 'Sistema' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={form.theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, theme: option.value })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Idioma</Label>
              <Input value="Espanol" disabled className="bg-muted" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Historial de compras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consulta todas tus compras y facturas.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href="/orders">Ver historial</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <CardTitle className="text-lg text-destructive">Zona de peligro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Eliminar tu cuenta es una acción permanente e irreversible. Se borrarán todos tus datos, cursos inscritos, certificados y compras.
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar cuenta
              </Button>
            ) : (
              <div className="space-y-3 rounded-md border border-destructive/50 p-4">
                <p className="text-sm text-destructive font-medium">
                  Escribe <span className="font-bold">ELIMINAR</span> para confirmar:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="ELIMINAR"
                  className="border-destructive/50 focus-visible:ring-destructive"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={confirmText !== 'ELIMINAR' || deleting}
                    onClick={handleDeleteAccount}
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Sí, eliminar mi cuenta
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmText('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
