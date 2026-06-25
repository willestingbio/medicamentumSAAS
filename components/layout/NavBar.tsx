'use client';
import { Menu, Building2, Shield, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  showOn?: 'always' | 'landing' | 'authenticated' | 'hospital_admin' | 'super_admin';
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

function UserAvatar({ user }: { user: { name: string; image?: string | null } }) {
  return (
    <Avatar className="size-8 transition-transform duration-200 ease-out hover:scale-105">
      <AvatarImage src={user.image ?? undefined} />
      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
        {getInitials(user.name ?? 'U')}
      </AvatarFallback>
    </Avatar>
  );
}

interface NavBarProps {
  navigationItems: NavigationItem[];
}

export const NavBar = memo(function NavBar({ navigationItems }: NavBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevScrollY = useRef(0);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLanding = pathname === '/';
  const isMarketplace = pathname.startsWith('/productos');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const { data: session } = authClient.useSession();

  const userRole = (session?.user as any)?.role;
  const isHospitalAdmin = userRole === 'hospital_admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';

  useEffect(() => {
    const throttled = throttleWithTrailingInvocation(() => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 0);
      if (isMarketplace) {
        const scrollingDown = currentY > prevScrollY.current;
        const atTop = currentY <= 0;
        if (atTop) {
          setIsHidden(false);
        } else if (scrollingDown) {
          setIsHidden(true);
        } else {
          setIsHidden(false);
        }
        prevScrollY.current = currentY;
      }
    }, 50);
    window.addEventListener('scroll', throttled);
    return () => {
      window.removeEventListener('scroll', throttled);
      throttled.cancel();
    };
  }, [isMarketplace]);

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
    if (item.sectionId && isLanding) {
      scrollToSection(item.sectionId);
    }
  }, [isLanding, scrollToSection]);

  const visibleItems = navigationItems.filter((item) => {
    if (!item.showOn || item.showOn === 'always') return true;
    if (item.showOn === 'landing') return isLanding;
    if (item.showOn === 'authenticated') return !!session?.user;
    if (item.showOn === 'hospital_admin') return isHospitalAdmin;
    if (item.showOn === 'super_admin') return isSuperAdmin;
    return true;
  });

  const renderNavLink = (item: NavigationItem) => {
    const isActive = pathname === item.href;
    const isLandingSection = item.sectionId && isLanding;

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
            "text-sm font-normal transition-colors duration-200 ease-out hover:text-primary cursor-pointer relative group px-2 py-1",
            isActive ? "text-primary font-medium" : "text-foreground"
          )}
        >
          {item.name}
          <span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-primary scale-x-0 transition-transform duration-300 ease-out origin-left group-hover:scale-x-100" />
        </a>
      </li>
    );
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 transition-transform duration-300",
      isScrolled && "top-3",
      isHidden && "-translate-y-full"
    )}>
      <div className={cn(
        "transition-[background-color,border-radius,box-shadow,border,margin,padding] duration-300",
        isScrolled
          ? "bg-background/90 border rounded-full shadow-lg backdrop-blur-lg mx-6 md:mx-[12%] xl:mx-[16%]"
          : "bg-background/80 border-b backdrop-blur-lg"
      )}>
        <nav className={cn("flex items-center transition-[padding] duration-300",
          isScrolled ? "p-2.5 lg:px-5" : "p-5 lg:px-8"
        )} aria-label="Global">

          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2 hover:text-primary transition-colors duration-200 ease-out group shrink-0 mr-8"
          >
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-200 ease-out">
              <span className="text-primary-foreground font-bold text-sm">M3</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">Medicamentum360</span>
          </Link>

          {/* Desktop Nav Links — left aligned */}
          <ul className="hidden lg:flex items-center gap-1">
            {visibleItems.map(renderNavLink)}
          </ul>

          {/* Search bar — only on marketplace, expands on hover */}
          {isMarketplace && (
            <div className="hidden lg:flex items-center mx-4 flex-1 group/search">
              <div className="relative flex items-center w-full max-w-[180px] group-focus-within/search:max-w-none transition-all duration-300 ease-out">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const params = new URLSearchParams(searchParams.toString());
                      if (searchQuery) {
                        params.set('search', searchQuery);
                      } else {
                        params.delete('search');
                      }
                      router.push(`/productos?${params.toString()}`);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-full border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all duration-300 ease-out placeholder-transparent focus:placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop User Area */}
          <div className="hidden lg:flex items-center gap-3">
            <DarkModeSwitcher />

            {session?.user ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:bg-accent rounded-full p-1 transition-transform duration-200 ease-out active:scale-95"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  <UserAvatar user={session.user} />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-md border bg-popover shadow-lg z-50 origin-top-right"
                    style={{
                      animation: 'dropdown-in 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards',
                    }}
                  >
                    <div className="px-3 py-2 border-b">
                      <p className="text-sm font-medium truncate">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                      {userRole && (
                        <p className="text-xs text-primary mt-0.5">
                          {userRole === 'super_admin' ? 'Super Administrador' : userRole === 'hospital_admin' ? 'Administrador' : 'Estudiante'}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors duration-150 ease-out"
                      >
                        Mi dashboard
                      </Link>
                      {isHospitalAdmin && (
                        <Link
                          href="/org/employees"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors duration-150 ease-out"
                        >
                          <Building2 className="size-4" />
                          Empleados
                        </Link>
                      )}
                      {isSuperAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors duration-150 ease-out"
                        >
                          <Shield className="size-4" />
                          Administración
                        </Link>
                      )}
                      <Link
                        href="/configuracion"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-3 py-1.5 text-sm hover:bg-accent transition-colors duration-150 ease-out"
                      >
                        Configuración
                      </Link>
                      <button
                        onClick={() => { signOut(); setDropdownOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors duration-150 ease-out"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="sm" asChild className="active:scale-95 transition-transform duration-150">
                <Link href="/sign-in">Entrar</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex lg:hidden items-center gap-2">
            <DarkModeSwitcher />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground p-2 transition-colors duration-200 ease-out active:scale-95">
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
                    {visibleItems.map((item, i) => (
                      <li
                        key={item.name}
                        className="transition-all duration-300 ease-out"
                        style={{
                          transitionDelay: `${i * 50}ms`,
                          opacity: mobileOpen ? 1 : 0,
                          transform: mobileOpen ? 'translateX(0)' : 'translateX(16px)',
                        }}
                      >
                        <a
                          href={item.sectionId && isLanding ? `#${item.sectionId}` : item.href}
                          onClick={(e) => {
                            if (item.sectionId && isLanding) {
                              e.preventDefault();
                              handleNavClick(item);
                            } else {
                              setMobileOpen(false);
                            }
                          }}
                          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors duration-150 ease-out"
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
                          {userRole && (
                            <p className="text-xs text-primary mt-0.5">
                              {userRole === 'super_admin' ? 'Super Administrador' : userRole === 'hospital_admin' ? 'Administrador' : 'Estudiante'}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors duration-150 ease-out"
                        >
                          Mi dashboard
                        </Link>
                        {isHospitalAdmin && (
                          <Link
                            href="/org/employees"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors duration-150 ease-out"
                          >
                            <Building2 className="size-4" />
                            Empleados
                          </Link>
                        )}
                        {isSuperAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors duration-150 ease-out"
                          >
                            <Shield className="size-4" />
                            Administración
                          </Link>
                        )}
                        <button
                          onClick={() => { signOut(); setMobileOpen(false); }}
                          className="w-full text-left rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors duration-150 ease-out"
                        >
                          Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <div className="px-3 py-2 space-y-2">
                        <Button size="sm" className="w-full transition-transform duration-200 ease-out active:scale-95" asChild>
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
});
