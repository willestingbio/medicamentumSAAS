import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M3</span>
              </div>
              <span className="font-semibold text-foreground">Medicamentum360</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Plataforma educativa médica SaaS para hospitales. Cursos, experiencias VR y automatización con IA para la formación del personal de salud.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Plataforma</h3>
            <ul className="space-y-2">
              {['Nosotros', 'Cursos', ' Marketplace', 'Blog'].map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              {[
                { label: 'Política de Privacidad', href: '/privacidad' },
                { label: 'Términos y Condiciones', href: '/terminos' },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Medicamentum360. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Colombia</span>
            <span>·</span>
            <span>Ley 1581 / Habeas Data</span>
          </div>
        </div>
      </div>
    </footer>
  );
}