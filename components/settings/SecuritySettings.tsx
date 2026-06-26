'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  changePassword,
  generate2faSecret,
  verifyAndEnable2fa,
  disable2fa,
} from '@/lib/actions/auth-settings';

export function SecuritySettings() {
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [twoFaStatus, setTwoFaStatus] = useState<{ enabled: boolean }>({ enabled: false });
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupStep, setSetupStep] = useState<'idle' | 'show-secret' | 'verify'>('idle');
  const [loading2fa, setLoading2fa] = useState(false);

  const handleChangePassword = async () => {
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('Las contrasenas no coinciden');
      return;
    }
    if (passwordForm.newPass.length < 8) {
      toast.error('La contrasena debe tener al menos 8 caracteres');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass,
      });
      toast.success('Contrasena actualizada');
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar contrasena');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleGenerate2fa = async () => {
    setLoading2fa(true);
    try {
      const result = await generate2faSecret();
      setTwoFaSecret(result.secret);
      setOtpauthUrl(result.otpauthUrl);
      setSetupStep('show-secret');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar 2FA');
    } finally {
      setLoading2fa(false);
    }
  };

  const handleVerify2fa = async () => {
    if (verifyCode.length !== 6) {
      toast.error('El codigo debe tener 6 digitos');
      return;
    }
    setLoading2fa(true);
    try {
      await verifyAndEnable2fa(verifyCode);
      setTwoFaStatus({ enabled: true });
      setSetupStep('idle');
      setTwoFaSecret(null);
      setOtpauthUrl(null);
      setVerifyCode('');
      toast.success('2FA habilitado correctamente');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Codigo invalido');
    } finally {
      setLoading2fa(false);
    }
  };

  const handleDisable2fa = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Ingresa tu codigo 2FA para desactivar');
      return;
    }
    setLoading2fa(true);
    try {
      await disable2fa(verifyCode);
      setTwoFaStatus({ enabled: false });
      setVerifyCode('');
      toast.success('2FA desactivado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Codigo invalido');
    } finally {
      setLoading2fa(false);
    }
  };

  const copySecret = () => {
    if (twoFaSecret) {
      navigator.clipboard.writeText(twoFaSecret);
      toast.success('Secreto copiado');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Contrasena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Contrasena actual</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              placeholder="Tu contrasena actual"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contrasena</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Repite la contrasena"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !passwordForm.current || !passwordForm.newPass}
          >
            {changingPassword ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Cambiar contrasena
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          {twoFaStatus.enabled ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Autenticacion de dos factores (2FA)</CardTitle>
            <Badge variant={twoFaStatus.enabled ? 'default' : 'secondary'} className="text-xs">
              {twoFaStatus.enabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFaStatus.enabled && setupStep === 'idle' && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Agrega una capa extra de seguridad a tu cuenta. Necesitaras una
                aplicacion de autenticacion como Google Authenticator o Authy.
              </p>
              <Button onClick={handleGenerate2fa} disabled={loading2fa}>
                {loading2fa ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Habilitar 2FA
              </Button>
            </div>
          )}

          {setupStep === 'show-secret' && twoFaSecret && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Escanea este codigo QR en tu aplicacion de autenticacion, o ingresa el secreto manualmente:
              </p>
              <div className="rounded-md bg-muted p-4 text-center">
                {otpauthUrl && (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
                    alt="QR Code 2FA"
                    className="mx-auto mb-3"
                    width={200}
                    height={200}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Secreto manual</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={twoFaSecret} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="otp-code">Codigo de verificacion</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="otp-code"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="font-mono text-center text-lg tracking-widest"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleVerify2fa}
                    disabled={loading2fa || verifyCode.length !== 6}
                  >
                    {loading2fa ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Verificar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {twoFaStatus.enabled && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                2FA esta activo. Para desactivarlo, ingresa un codigo de tu aplicacion:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-lg tracking-widest max-w-[200px]"
                  maxLength={6}
                />
                <Button
                  variant="destructive"
                  onClick={handleDisable2fa}
                  disabled={loading2fa || verifyCode.length !== 6}
                >
                  {loading2fa ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldOff className="mr-2 h-4 w-4" />
                  )}
                  Desactivar 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
