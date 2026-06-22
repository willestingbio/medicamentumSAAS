# FRONTEND_PATTERNS — Patrones de implementación
**Fuente: wasp-lang/open-saas (adaptado a Next.js App Router)**
Versión: 1.1 · Fecha: 2026-06-22 · Actualizado con implementación real

---

## 0. Aclaración importante

Sí es Tailwind. El repo `wasp-lang/open-saas` usa **Tailwind CSS v4.1** + **ShadCN/ui** + **lucide-react**, con un sistema de theming basado en variables CSS en HSL (el mismo patrón que usa ShadCN por defecto). No es CSS plano ni styled-components. Verificado directamente en `template/app/package.json`:

```json
"clsx": "^2.1.1",
"tailwind-merge": "^2.2.1",
"tailwindcss": "^4.1.18",
"tailwindcss-animate": "^1.0.7",
"vanilla-cookieconsent": "^3.0.1",
"lucide-react": "^0.525.0"
```

El framework base es **Wasp** (React + Node + Prisma con su propio compilador/router), no Next.js. Todo lo de abajo está **adaptado a Next.js App Router** para que encaje con tu stack — las clases de Tailwind y la lógica de interacción se mantienen fieles al original; lo que cambia es la capa de routing (`wasp/client/router` → `next/navigation`, `react-router` `Link` → `next/link`).

---

## 1. Sistema de theming (variables CSS + Tailwind v4 `@theme`)

Archivo fuente: `template/app/src/client/Main.css`. Patrón: variables HSL en `:root`/`.dark`, mapeadas a tokens de Tailwind vía `@theme inline`.

```css
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
@plugin "tailwindcss-animate";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 210 100% 13%;        /* ← aquí va tu color de marca */
    --primary-foreground: 0 0% 98%;
    --secondary: 32 100% 37%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 33 74% 62%;
    --border: 0 0% 89.8%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 210 50% 5%;
    --foreground: 0 0% 98%;
    --primary: 31 57% 93%;
    /* ... */
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

### Adaptado a Medicamentum360

Tu color de marca `#8127cf` convertido a HSL (verificado por cómputo, no aproximado): **`272 68% 48%`**.

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 4%;
    --primary: 272 68% 48%;           /* #8127cf */
    --primary-foreground: 0 0% 100%;
    --secondary: 272 30% 96%;
    --secondary-foreground: 272 68% 20%;
    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 46%;
    --accent: 272 60% 92%;
    --accent-foreground: 272 68% 25%;
    --destructive: 0 84% 60%;
    --border: 240 6% 90%;
    --input: 240 6% 90%;
    --ring: 272 68% 48%;
    --radius: 0.75rem;
  }
  .dark {
    --background: 240 10% 6%;
    --foreground: 0 0% 98%;
    --primary: 272 75% 65%;           /* primary más claro en oscuro para contraste */
    --primary-foreground: 240 10% 6%;
    --secondary: 272 20% 16%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 6% 14%;
    --muted-foreground: 240 5% 65%;
    --accent: 272 30% 20%;
    --accent-foreground: 0 0% 98%;
    --border: 240 6% 18%;
    --input: 240 6% 18%;
    --ring: 272 75% 65%;
  }
}
```

> Nota: los tonos de `--secondary`/`--accent`/`--muted` exactos quedan como propuesta inicial — afínalos con tu equipo de diseño contra `DESIGN.md` si ya tienes paleta cerrada ahí.

## 2. Helper `cn()` (clsx + tailwind-merge)

Archivo fuente: `template/app/src/client/utils.ts`. Cópialo tal cual, es estándar en cualquier proyecto shadcn:

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## 3. Barra de navegación — implementación actual

**Archivo:** `components/layout/NavBar.tsx`. Envuelto en `memo()` para evitar re-renders.

```tsx
// Lógica de scroll (implementación real)
const [isScrolled, setIsScrolled] = useState(false);
const [isHidden, setIsHidden] = useState(false);
const prevScrollY = useRef(0);

useEffect(() => {
  const throttled = throttleWithTrailingInvocation(() => {
    const currentY = window.scrollY;
    setIsScrolled(currentY > 0);
    // Scroll direction tracking (marketplace only)
    if (isMarketplace) {
      setIsHidden(currentY > prevScrollY.current && currentY > 80);
    }
    prevScrollY.current = currentY;
  }, 50);
  window.addEventListener("scroll", throttled);
  return () => {
    window.removeEventListener("scroll", throttled);
    throttled.cancel();
  };
}, [isMarketplace]);

// Clases — propiedades específicas, nunca transition-all
<header className={cn(
  "sticky top-0 z-50 transition-transform duration-300",
  isScrolled && "top-4",
  isHidden && "-translate-y-full"
)}>
  <div className={cn("transition-[background-color,border-color,box-shadow] duration-300", {
    "bg-background/90 border-border mx-4 rounded-full border pr-2 shadow-lg backdrop-blur-lg md:mx-20 lg:pr-0": isScrolled,
    "bg-background/80 border-border mx-0 border-b backdrop-blur-lg": !isScrolled,
  })}>
```

**Diferencias vs. el patrón original de open-saas:**
- `transition-all` → propiedades específicas (`transition-transform`, `transition-[background-color,...]`)
- `memo()` envuelve el componente para evitar re-renders
- Scroll direction tracking para marketplace (ocultar al bajar, mostrar al subir)
- Logo con `window.scrollTo({ top: 0, behavior: 'smooth' })`
- Search bar en marketplace: `w-[180px]` → `max-w-none` on `group-focus-within`

### Versión adaptada a Next.js App Router

```tsx
// components/NavBar/NavBar.tsx
"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DarkModeSwitcher } from "../DarkModeSwitcher";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { throttleWithTrailingInvocation } from "@/lib/throttle";

export interface NavigationItem {
  name: string;
  href: string;
}

export function NavBar({
  navigationItems,
  user, // null si no autenticado; pásalo desde un Server Component padre o un hook de Better Auth
}: {
  navigationItems: NavigationItem[];
  user: { name: string; avatarUrl?: string } | null;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  useEffect(() => {
    const throttled = throttleWithTrailingInvocation(() => {
      setIsScrolled(window.scrollY > 0);
    }, 50);
    window.addEventListener("scroll", throttled);
    return () => {
      window.removeEventListener("scroll", throttled);
      throttled.cancel();
    };
  }, []);

  return (
    <header
      className={cn("sticky top-0 z-50 transition-all duration-300", isScrolled && "top-4")}
    >
      <div
        className={cn("transition-all duration-300", {
          "bg-background/90 border-border mx-4 rounded-full border pr-2 shadow-lg backdrop-blur-lg md:mx-20 lg:pr-0":
            isScrolled,
          "bg-background/80 border-border mx-0 border-b backdrop-blur-lg": !isScrolled,
        })}
      >
        <nav
          className={cn("flex items-center justify-between transition-all duration-300", {
            "p-3 lg:px-6": isScrolled,
            "p-6 lg:px-8": !isScrolled,
          })}
          aria-label="Global"
        >
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out"
            >
              <NavLogo isScrolled={isScrolled} />
              <span
                className={cn("text-foreground font-semibold leading-6 transition-all duration-300", {
                  "ml-2 text-sm": !isScrolled,
                  "ml-2 text-xs": isScrolled,
                })}
              >
                Medicamentum360
              </span>
            </Link>

            <ul className="ml-4 hidden items-center gap-6 lg:flex">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm font-normal leading-6 text-foreground duration-300 ease-in-out hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <NavBarMobileMenu navigationItems={navigationItems} user={user} />
          <NavBarDesktopUserArea isScrolled={isScrolled} user={user} />
        </nav>
      </div>
    </header>
  );
}

function NavBarDesktopUserArea({
  isScrolled,
  user,
}: {
  isScrolled: boolean;
  user: { name: string; avatarUrl?: string } | null;
}) {
  return (
    <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
      <DarkModeSwitcher />
      {!user ? (
        <Link
          href="/login"
          className={cn("ml-3 font-semibold leading-6 transition-all duration-300", {
            "text-sm": !isScrolled,
            "text-xs": isScrolled,
          })}
        >
          Entrar
        </Link>
      ) : (
        <div className="ml-3 flex items-center gap-2">
          {/* tu UserDropdown propio (avatar + nombre + "Cerrar sesión") */}
          <span className="text-sm font-medium">{user.name}</span>
        </div>
      )}
    </div>
  );
}

function NavBarMobileMenu({
  navigationItems,
  user,
}: {
  navigationItems: NavigationItem[];
  user: { name: string } | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-muted hover:bg-accent inline-flex items-center justify-center rounded-md transition-colors"
          >
            <span className="sr-only">Abrir menú</span>
            <Menu className="size-8 p-1" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Medicamentum360</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flow-root">
            <ul className="space-y-2 py-6">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium leading-7 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="py-6">
              {!user ? (
                <Link href="/login" onClick={() => setOpen(false)}>
                  Entrar
                </Link>
              ) : (
                <span>{user.name}</span>
              )}
            </div>
            <div className="py-6">
              <DarkModeSwitcher />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavLogo({ isScrolled }: { isScrolled: boolean }) {
  return (
    <img
      className={cn("transition-all duration-500", { "size-8": !isScrolled, "size-7": isScrolled })}
      src="/logo.svg"
      alt="Medicamentum360"
    />
  );
}
```

**Diferencias clave respecto al original (por qué):**
- `wasp/client/router` `Link` → `next/link` `Link`. `useLocation()` de react-router → `usePathname()` de `next/navigation`.
- El original consulta `useAuth()` de Wasp; en tu stack eso lo resuelve Better Auth (server-side via Server Component padre que pasa `user` como prop, o un hook cliente si lo prefieres).
- El comportamiento de **ocultar/mostrar al hacer scroll en el marketplace** (`/productos`, UX_UI.md §3.3) **no está en el NavBar original** de open-saas (su navbar solo cambia de forma, no se oculta) — eso es un requisito propio de tu PRD que debes añadir como una variante: un segundo `useEffect` que compare `window.scrollY` contra el valor anterior y aplique `translate-y-[-100%]`/`translate-y-0` con la misma `cn()` + `transition-all`.

## 4. Selector de modo oscuro/claro — implementación actual

**Archivos:** `hooks/useColorMode.ts` + `components/layout/DarkModeSwitcher.tsx` + script inline en `app/layout.tsx`.

```tsx
// hooks/useColorMode.ts (implementación real)
"use client";
import { useEffect, useState } from "react";

export function useColorMode() {
  const [colorMode, setColorModeState] = useState<"light" | "dark">("light");

  // Read from localStorage only after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("color-theme");
    if (stored === "dark") {
      setColorModeState("dark");
    } else if (!stored) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) setColorModeState("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorMode === "dark");
  }, [colorMode]);

  const setColorMode = (mode: "light" | "dark") => {
    localStorage.setItem("color-theme", mode);
    setColorModeState(mode);
  };

  return [colorMode, setColorMode] as const;
}
```

**Fix de hidratación (3 partes):**
1. Script inline en `<head>` de `layout.tsx`: lee `localStorage` y aplica `dark` antes de hidratación.
2. `useColorMode`: inicializa con `'light'`, sincroniza desde `localStorage` en `useEffect`.
3. `DarkModeSwitcher`: renderiza placeholder hasta `mounted=true`.

## 5. Banner de consentimiento de cookies (Ley 1581 / Habeas Data)

El proyecto **ya resuelve este requisito de tu PRD §7.2 con una librería real**, no hace falta construirlo a mano: usa [`vanilla-cookieconsent`](https://www.npmjs.com/package/vanilla-cookieconsent) (`^3.0.1`).

```tsx
// components/cookie-consent/CookieConsentBanner.tsx
"use client";
import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { getConfig } from "./config";

export function CookieConsentBanner() {
  useEffect(() => {
    CookieConsent.run(getConfig());
  }, []);
  return <div id="cookieconsent" />;
}
```

La config original (`Config.ts`) ya trae: modo opt-in, categorías `necessary` (no desactivable) y `analytics` con auto-limpieza de cookies `_ga`/`_gid` al rechazar, posición `bottom right`, y textos en inglés que debes traducir/adaptar a español + enlazar tu Política de Privacidad real:

```ts
language: {
  default: "es",
  translations: {
    es: {
      consentModal: {
        title: "Usamos cookies",
        description:
          "Usamos cookies para analítica y mejorar tu experiencia. Puedes aceptar todas o solo las necesarias.",
        acceptAllBtn: "Aceptar todas",
        acceptNecessaryBtn: "Rechazar todas",
        footer: `
          <a href="/privacidad" target="_blank">Política de Privacidad</a>
          <a href="/terminos" target="_blank">Términos y Condiciones</a>
        `,
      },
    },
  },
},
```

Esto cubre directamente el requisito "banner de consentimiento de cookies" de PRD.md §7.2 sin reinventar la rueda.

## 6. Componentes ShadCN ya usados en el repo (referencia de inventario)

El repo trae estos componentes ShadCN preinstalados en `template/app/src/client/components/ui/`: `accordion`, `alert`, `avatar`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `progress`, `select`, `separator`, `sheet`, `switch`, `textarea`, `toast`/`toaster`.

Mapeo directo a tu UX_UI.md:
- `dialog` → modal de preview de certificado (UX_UI.md §3.7).
- `sheet` → carrito en móvil como bottom sheet (UX_UI.md §3.5) y menú hamburguesa.
- `progress` → barra de progreso de "Mis Cursos".
- `dropdown-menu` → menú del avatar ("Cerrar sesión").
- `toast`/`toaster` → confirmaciones (producto agregado al carrito, pago exitoso, error de checkout).

Instálalos con el CLI estándar de shadcn (`npx shadcn@latest add dialog sheet progress dropdown-menu toast`) apuntando tu `components.json` al `--color` que generes desde la paleta de §1.

## 7. Resumen de paquetes a instalar

```bash
npm install clsx tailwind-merge tailwindcss-animate lucide-react vanilla-cookieconsent
npm install -D tailwindcss@^4 @tailwindcss/forms @tailwindcss/typography
npx shadcn@latest init
npx shadcn@latest add button dialog sheet progress dropdown-menu toast avatar card input label select checkbox switch separator
```

---

## 8. RBAC Middleware y NavBar dinámico por rol

### 8.1 Middleware de Next.js (RBAC a nivel de ruta)

Patrón implementado en `middleware.ts` — valida sesión + role antes de permitir acceso a rutas protegidas:

```ts
// middleware.ts
const protectedRoutes = ['/dashboard', '/configuracion', '/checkout', '/mis-cursos'];
const orgRoutes = ['/org'];         // requiere hospital_admin o superior
const adminRoutes = ['/admin'];     // requiere super_admin

type Role = 'super_admin' | 'hospital_admin' | 'student';

const roleHierarchy: Record<Role, number> = {
  super_admin: 3,
  hospital_admin: 2,
  student: 1,
};

function hasRequiredRole(userRole: Role | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

**Flujo:**
1. Extrae cookie `better-auth.session_token` del request.
2. Si no existe → redirect a `/sign-in?redirect_to=...`.
3. Para rutas admin/org, hace fetch a `/api/auth/get-session` con las cookies del request para obtener el rol.
4. Valida jerarquía de roles: `super_admin` > `hospital_admin` > `student`.
5. Si no tiene permiso → redirect a `/dashboard`.

**Matcher:** `/dashboard/:path*`, `/configuracion/:path*`, `/checkout/:path*`, `/mis-cursos/:path*`, `/org/:path*`, `/admin/:path*`.

### 8.2 NavBar dinámico por rol

El NavBar muestra diferentes elementos según el estado de autenticación y el rol del usuario:

```tsx
// Patrón de items condicionales
const navigationItems = [
  { name: 'Nosotros', href: '/#nosotros', showOn: 'always' },
  { name: 'Ejemplos', href: '/#ejemplos', showOn: 'always' },
  { name: 'Blog', href: '/#blog', showOn: 'always' },
  { name: 'Productos', href: '/productos', showOn: 'always' },
  { name: 'Mi Aprendizaje', href: '/dashboard', showOn: 'authenticated' },
  { name: 'Empleados', href: '/org/employees', showOn: 'hospital_admin' },
];
```

**Estados del NavBar:**
| Estado | Elementos visibles |
|---|---|
| Visitante | Logo, Nosotros, Ejemplos, Blog, Productos, [Tema], Entrar |
| Autenticado (student) | Logo, Mi Aprendizaje, Marketplace, [Tema], [Avatar ▾] |
| Autenticado (hospital_admin) | Logo, Mi Aprendizaje, Marketplace, Empleados, [Tema], [Avatar ▾] |
| Autenticado (super_admin) | Logo, Mi Aprendizaje, Marketplace, Empleados, Admin, [Tema], [Avatar ▾] |

**En `/productos`** (marketplace):搜索 bar visible en NavBar (`w-[180px]`, expande a `max-w-none` on `group-focus-within`, transición 300ms). Se sincroniza con `?search=` query param.

**Comportamiento scroll:**
- Landing: full-width → píldora centrada con blur al hacer scroll.
- Marketplace: se oculta al bajar y reaparece al subir (scroll direction tracking).
- Logo: `window.scrollTo({ top: 0, behavior: 'smooth' })` al hacer click.
- `memo()` envuelve NavBar para evitar re-renders innecesarios.

**Transiciones:** propiedades específicas (`transition-transform duration-300`, `transition-[padding]`) — no `transition-all`.

### 8.3 Server Actions con RBAC

Cada Server Action valida el rol explícitamente además de confiar en RLS (defensa en profundidad):

```ts
// Patrón en lib/actions/invitation.ts
async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function createInvitation(email: string) {
  const session = await getSession();
  if (!session?.user) throw new Error('No autenticado');

  const userRole = (session.user as any).role;
  if (userRole !== 'hospital_admin' && userRole !== 'super_admin') {
    throw new Error('No autorizado para invitar usuarios');
  }
  // ... lógica de invitación
}
```

**Nota sobre tipos:** Better Auth no infiere los campos adicionales (`role`, `organizationId`) en el tipo de sesión. Se usa `(session.user as any).role` como patrón temporal hasta que se extienda el tipo de Better Auth o se use un tipo custom.

---

## 9. Animaciones — Implementación actual

### 9.1 Easing custom (globals.css)

```css
@theme inline {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

**Regla: nunca `ease-in` en UI.** Comienza lento, retrasando el momento que el usuario más observa.

### 9.2 Decision framework

1. **¿Debería animar esto?** Frecuencia: 100+/día → NO. Decenas/día → reducir. Ocasional → estándar. Raro → delight.
2. **¿Cuál es el propósito?** Consistencia espacial, indicación de estado, feedback, explicación, evitar cambio brusco.
3. **¿Qué easing?** Entrando/saliendo → `ease-out`. Moviéndose en pantalla → `ease-in-out`. Hover → `ease`. Constante → `linear`.
4. **¿Qué duración?** Botón 100-160ms. Tooltip 125-200ms. Dropdown 150-250ms. Modal/drawer 200-500ms. **Máximo 300ms para UI.**

### 9.3 Animaciones CSS (globals.css)

| Keyframe | Duración | Easing | Uso |
|---|---|---|---|
| `reveal-up` | 350ms | `--ease-out` | ScrollReveal, landing sections |
| `fade-in` | 300ms | `--ease-out` | Elementos que aparecen |
| `page-enter` | 300ms | `--ease-out` | PageTransition enter |
| `scale-in` | 180ms | `--ease-out` | Modals, toasts |
| `gradient-shift` | 8s | `--ease-in-out` | Hero background |
| `dropdown-in` | 150ms | ease-out | Dropdowns/popovers |
| `slide-in-left/right` | — | — | Content transitions |

**PageTransition:** exit 150ms `opacity-0 translate-y-1` → enter 250ms `opacity-100 translate-y-0`. Easing: `cubic-bezier(0.23, 1, 0.32, 1)`.

### 9.4 GSAP ScrollTrigger (Landing)

Usado para animaciones complejas de scroll que CSS no puede lograr (parallax, stagger con dirección, scrub).

**Componente:** `components/landing/LandingAnimations.tsx` — `useEffect` único, `gsap.context()`, `once: true` en todos los triggers.

| Elemento | Animación | Trigger | Detalle |
|---|---|---|---|
| Hero content | `y: -30`, `opacity: 0.7` | scrub: 1s, `start: 'top top'` | Parallax suave al hacer scroll |
| Nosotros icons | `scale 0→1`, `rotation -10→0` | `start: 'top 88%'` | `back.out(1.5)`, stagger 80ms |
| Ejemplos title | `opacity 0→1`, `y: 30→0` | `start: 'top 88%'` | 500ms, `power2.out` |
| Ejemplos cards | `opacity 0→1`, `y: 50→0`, `scale 0.96→1` | `start: 'top 80%'` | 550ms, stagger 100ms |
| Blog title | `opacity 0→1`, `y: 30→0` | `start: 'top 88%'` | 500ms, `power2.out` |
| Blog cards | `opacity 0→1`, `y: 40→0`, `scale 0.97→1` | `start: 'top 80%'` | 500ms, stagger 80ms |

**data-anim attributes:** `hero-content`, `nosotros-icon`, `ejemplos-title`, `ejemplo-card`, `blog-title`, `blog-card`.

### 9.5 Patrones de componentes (ShadCN)

| Elemento | Animación | Detalle |
|---|---|---|
| Botón (`:active`) | `scale(0.97)` + `transition 160ms ease-out` | `.btn-press` |
| Card hover | `translateY(-2px)` + shadow | `.card-hover`, `@media (hover)` |
| Nav link underline | `width 0→100%` | `.nav-link-underline::after`, 250ms |
| Dropdown/popover | `scale(0.95)` + `opacity: 0` → `scale(1)` + `opacity: 1` | 150-250ms, origin-aware |

### 9.6 Reglas de performance

- **Solo animar `transform` y `opacity`** — corren en GPU. `width`/`height`/`margin`/`padding`/`top`/`left` NO.
- **CSS transitions > keyframes** para UI dinámica (interrumpibles). Keyframes reinician desde cero.
- **GSAP solo para landing** — no usar en UI interactiva (dashboard, marketplace). CSS basta.
- **prefers-reduced-motion:** `animation-duration: 0.01ms !important` en CSS global. GSAP no lo respeta por defecto — si se necesita, verificar `window.matchMedia('(prefers-reduced-motion: reduce)')` antes de registrar ScrollTriggers.

### 9.7 Dark mode — fix de hidratación

**Problema:** `useColorMode` inicializaba `'light'` en servidor, `'dark'` en cliente → flash al cargar.

**Solución (3 partes):**
1. **Script inline en `<head>`** (`app/layout.tsx`): lee `localStorage` y aplica clase `dark` antes de hidratación.
2. **`useColorMode`:** `getInitialMode()` lee `localStorage` + `prefers-color-scheme` (no inicializa con valor hardcodeado).
3. **`DarkModeSwitcher`:** renderiza placeholder hasta `mounted=true`, luego ícono correcto.

### 9.8 Accesibilidad

```css
@media (prefers-reduced-motion: reduce) {
  /* Mantener opacity/color, eliminar movement/position */
}

@media (hover: hover) and (pointer: fine) {
  /* Gatear hover animations — touch devices no deben trigger hover */
}
```

### 9.9 Asymmetric timing

Donde el usuario decide → lento (hold-to-delete: 2s). Donde el sistema responde → rápido (release: 200ms).

### 9.10 Verify checklist

| Issue | Fix |
|---|---|
| `transition: all` | Especificar propiedades exactas |
| `scale(0)` entry | `scale(0.95)` + `opacity: 0` |
| `ease-in` en UI | `ease-out` o custom curve |
| `transform-origin: center` en popover | Origin desde trigger |
| Animación en keyboard action | Remover completamente |
| Duration > 300ms en UI | Reducir a 150-250ms |
| Hover sin media query | `@media (hover: hover) and (pointer: fine)` |
| Keyframes en elementos rápidos | CSS transitions |
| Misma velocidad enter/exit | Exit más rápido que enter |
