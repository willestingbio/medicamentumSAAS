'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Glasses,
  QrCode,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { revokeVrKey, type getVrKeys } from '@/lib/actions/vr-keys';

type VrKeyData = Awaited<ReturnType<typeof getVrKeys>>[number];

export function VrKeysCard({ vrKeys }: { vrKeys: VrKeyData[] }) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await revokeVrKey(keyId);
      toast.success('Llave revocada');
    } catch {
      toast.error('Error al revocar llave');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Glasses className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Mis Experiencias VR</CardTitle>
      </CardHeader>
      <CardContent>
        {vrKeys.length === 0 ? (
          <div className="py-6 text-center">
            <Glasses className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No tienes experiencias VR activas.
            </p>
            <p className="text-xs text-muted-foreground">
              Compra una experiencia VR para generar tu llave de acceso.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vrKeys.map((vr) => (
              <div
                key={vr.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {vr.product.coverImageUrl ? (
                      <img
                        src={vr.product.coverImageUrl}
                        alt={vr.product.title}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        <Glasses className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{vr.product.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={vr.active ? 'default' : 'destructive'} className="text-xs">
                          {vr.active ? 'Activa' : 'Revocada'}
                        </Badge>
                        {vr.lastUsedAt && (
                          <span className="text-xs text-muted-foreground">
                            Ultimo uso: {new Date(vr.lastUsedAt).toLocaleDateString('es-CO')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleReveal(vr.id)}
                    >
                      {revealedKeys.has(vr.id) ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {vr.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRevoke(vr.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {revealedKeys.has(vr.id) && vr.active && (
                  <div className="space-y-2 rounded-md bg-muted/50 p-3">
                    <Label className="text-xs text-muted-foreground">Llave de API</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={vr.apiKey}
                        className="font-mono text-xs h-8"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => copyToClipboard(vr.apiKey)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Escanea el QR en tu dispositivo VR para acceder
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
