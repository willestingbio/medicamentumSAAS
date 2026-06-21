'use client';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { authClient, signOut } from '@/lib/auth-client';
import { throttleWithTrailingInvocation } from '@/lib/throttle';
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
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function UserAvatar({ user }: { user: { name: string; image?: string | null } }) {
  return (
    <Avatar className="size-8">
      <AvatarImage src={user.image ?? undefined} />
      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
        {getInitials(user.name ?? 'U')}
      </AvatarFallback>
    </Avatar>
  );
}

export function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    const throttled = throttleWithTrailingInvocation(() => {
      setIsScrolled(window.scrollY > 0);
    }, 50);
    window.addEventListener('scroll', throttled);
    return () => {
      window.removeEventListener('scroll', throttled);
      throttled.cancel();
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    }
  }, []);

  const handleNavClick = useCallback((item: NavigationItem) => {
    setMobileOpen(false);
    if (item.sectionId && pathname === '/') {
      scrollToSection(item.sectionId);
    }
  }, [pathname, scrollToSection]);

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
            "text-sm font-normal transition-colors hover:text-primary cursor-pointer",
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
        isScrolled
          ? "bg-background/90 border rounded-full shadow-lg backdrop-blur-lg mx-4 md:mx-20"
          : "bg-background/80 border-b backdrop-blur-lg"
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
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-accent rounded-full p-1 transition-colors"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <UserAvatar user={session.user} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover shadow-lg z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium truncate">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        Mi dashboard
                      </Link>
                      <Link
                        href="/configuracion"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        Configuración
                      </Link>
                      <button
                        onClick={() => { signOut(); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Entrar</Link>
              </Button>
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
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          Mi dashboard
                        </Link>
                        <button
                          onClick={() => { signOut(); setMobileOpen(false); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-2 space-y-2">
                        <Button size="sm" className="w-full" asChild>
                          <Link href="/sign-up" onClick={() => setMobileOpen(false)}>Registro gratis</Link>
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          ¿Ya tienes cuenta?{' '}
                          <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="text-primary hover:underline">
                            Inicia sesión
                          </Link>
                        </p>
                      </div>
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
