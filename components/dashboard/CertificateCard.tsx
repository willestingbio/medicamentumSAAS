'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getCertificateDownloadUrl } from '@/lib/actions/certificates';

type Certificate = {
  id: string;
  pdfUrl: string;
  issuedAt: Date;
  linkedinUrl: string | null;
  product: {
    id: string;
    title: string;
    slug: string;
  };
};

export function CertificateCard({ certificates }: { certificates: Certificate[] }) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      const url = await getCertificateDownloadUrl(cert.id);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al descargar el certificado');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-primary" />
          Mis Certificados
        </CardTitle>
        {certificates.length > 0 && (
          <span className="text-xs text-muted-foreground">{certificates.length}</span>
        )}
      </CardHeader>
      <CardContent>
        {certificates.length === 0 ? (
          <div className="py-6 text-center">
            <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              Completa un curso para obtener tu certificado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.slice(0, 5).map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between gap-2 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cert.product.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cert.issuedAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(cert)}
                    disabled={downloading === cert.id}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {cert.linkedinUrl && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={cert.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
