'use client';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { authClient, signOut } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import { DarkModeSwitcher } from './DarkModeSwitcher';

export interface NavigationItem {
  name: string;
  href: string;
  sectionId?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  const onScroll = useCallback(() => setIsScrolled(window.scrollY > 0), []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const handleNavClick = (item: NavigationItem) => {
    setMobileOpen(false);
    if (item.sectionId && pathname === '/') {
      const el = document.getElementById(item.sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const renderNavLink = (item: NavigationItem) => {
    const isActive = pathname === item.href;
    const isLandingSection = item.sectionId && pathname === '/';

    return (
      <li key={item.name}>
        <a
          href={isLandingSection ? `#${item.sectionId}` : item.href}
          onClick={(e) => {
            if (isLandingSection) {
              e.preventDefault();
              handleNavClick(item);
            }
          }}
          className={cn(
            "text-sm font-normal transition-colors hover:text-primary",
            isActive ? "text-primary font-medium" : "text-foreground"
          )}
        >
          {item.name}
        </a>
      </li>
    );
  };

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", isScrolled && "top-4")}>
      <div className={cn(
        "transition-all duration-300",
        isScrolled ? "bg-background/90 border rounded-full shadow-lg backdrop-blur-lg mx-4 md:mx-20 lg:pr-0" : "bg-background/80 border-b backdrop-blur-lg"
      )}>
        <nav className={cn("flex items-center justify-between transition-all duration-300",
          isScrolled ? "p-3 lg:px-6" : "p-6 lg:px-8"
        )} aria-label="Global">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 hover:text-primary transition-colors">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M3</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">Medicamentum360</span>
          </a>

          {/* Desktop Nav Links */}
          <ul className="hidden lg:flex items-center gap-6">
            {navigationItems.map(renderNavLink)}
          </ul>

          {/* Desktop User Area */}
          <div className="hidden lg:flex items-center justify-end gap-3">
            <DarkModeSwitcher />

            {session?.user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 hover:bg-accent rounded-full p-1 transition-colors">
                  <Avatar className="size-8">
                    <AvatarImage src={session.user.image ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(session.user.name ?? 'U')}
                    </AvatarFallback>
                  </Avatar>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                  </div>
                  <div className="py-1">
                    <a href="/dashboard" className="block px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                      Mi dashboard
                    </a>
                    <a href="/configuracion" className="block px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                      Configuración
                    </a>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sign-in">Entrar</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/sign-up">Registro</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <DarkModeSwitcher />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground p-2">
                  <span className="sr-only">Abrir menú</span>
                  <Menu className="size-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Medicamentum360</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flow-root">
                  <ul className="space-y-1 py-4 border-t">
                    {navigationItems.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.sectionId && pathname === '/' ? `#${item.sectionId}` : item.href}
                          onClick={(e) => {
                            if (item.sectionId && pathname === '/') {
                              e.preventDefault();
                              handleNavClick(item);
                            } else {
                              setMobileOpen(false);
                            }
                          }}
                          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="py-4 border-t space-y-1">
                    {session?.user ? (
                      <>
                        <div className="px-3 py-2">
                          <p className="text-sm font-medium">{session.user.name}</p>
                          <p className="text-xs text-muted-foreground">{session.user.email}</p>
                        </div>
                        <a href="/dashboard" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
                          Mi dashboard
                        </a>
                        <button
                          onClick={() => { signOut(); setMobileOpen(false); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="px-3 py-2">
                          <Button size="sm" className="w-full mb-2" asChild>
                            <Link href="/sign-up" onClick={() => setMobileOpen(false)}>Registro gratis</Link>
                          </Button>
                          <p className="text-xs text-center text-muted-foreground">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="text-primary hover:underline">
                              Inicia sesión
                            </Link>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
}