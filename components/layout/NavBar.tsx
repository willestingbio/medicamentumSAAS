'use client';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { DarkModeSwitcher } from './DarkModeSwitcher';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface NavigationItem {
  name: string;
  href: string;
}

export function NavBar({
  navigationItems,
  user,
}: {
  navigationItems: NavigationItem[];
  user: { name: string; avatarUrl?: string } | null;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 transition-all duration-300", isScrolled && "top-4")}>
      <div className={cn(
        "transition-all duration-300",
        isScrolled ? "bg-background/90 border rounded-full shadow-lg backdrop-blur-lg mx-4 md:mx-20 lg:pr-0" : "bg-background/80 border-b backdrop-blur-lg"
      )}>
        <nav className={cn("flex items-center justify-between transition-all duration-300",
          isScrolled ? "p-3 lg:px-6" : "p-6 lg:px-8"
        )} aria-label="Global">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:text-primary transition-colors">
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M3</span>
              </div>
              <span className="font-semibold text-foreground hidden sm:block">Medicamentum360</span>
            </Link>
            <ul className="hidden lg:flex items-center gap-6">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className={cn(
                    "text-sm font-normal transition-colors hover:text-primary",
                    pathname === item.href ? "text-primary font-medium" : "text-foreground"
                  )}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop User Area */}
          <div className="hidden lg:flex items-center justify-end gap-3">
            <DarkModeSwitcher />
            {user ? (
              <span className="text-sm font-medium">{user.name}</span>
            ) : (
              <Link href="/sign-in" className="ml-3 text-sm font-semibold hover:text-primary transition-colors">
                Entrar
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex lg:hidden">
            <Sheet>
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
                  <ul className="space-y-2 py-6">
                    {navigationItems.map((item) => (
                      <li key={item.name}>
                        <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="py-6 border-t mt-4">
                    <DarkModeSwitcher />
                    {!user ? (
                      <Link href="/sign-in" className="block mt-2 font-medium">Entrar</Link>
                    ) : (
                      <span className="text-sm">{user.name}</span>
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