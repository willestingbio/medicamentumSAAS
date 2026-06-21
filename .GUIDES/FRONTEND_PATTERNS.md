# FRONTEND_PATTERNS — Patrones extraídos de open-saas (wasp-lang)
**Fuente verificada: https://github.com/wasp-lang/open-saas (rama `main`, `template/app/`)**
Versión: 1.0 · Fecha: 2026-06-19

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

## 3. Barra de navegación — patrón real, adaptado a Next.js

Fuente: `template/app/src/client/components/NavBar/NavBar.tsx`. El comportamiento que pediste (full-width → píldora centrada con blur al hacer scroll) está implementado así en el original:

```tsx
// Lógica de scroll (original, framework-agnóstico)
const [isScrolled, setIsScrolled] = useState(false);

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

// Clases condicionales (original)
className={cn("transition-all duration-300", {
  "bg-background/90 border-border mx-4 rounded-full border pr-2 shadow-lg backdrop-blur-lg md:mx-20 lg:pr-0": isScrolled,
  "bg-background/80 border-border mx-0 border-b backdrop-blur-lg": !isScrolled,
})}
```

Esto es exactamente el patrón que pediste en UX_UI.md §2 (sticky, blur, mx-4 + rounded-full al hacer scroll, sombra suave). La función de throttle con "trailing invocation" (ejecuta inmediato la primera vez, y garantiza una última ejecución al final del scroll) viene de `template/app/src/shared/utils.ts` — cópiala igual, es una utilidad genérica de 35 líneas sin dependencias.

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

## 4. Selector de modo oscuro/claro

Fuente: `template/app/src/client/components/DarkModeSwitcher.tsx` + `useColorMode.ts`. Patrón: toggle tipo "switch" (no un botón con ícono que cambia), basado en checkbox oculto + `<span>` deslizante, persistido en `localStorage`.

```tsx
// hooks/useColorMode.ts (adaptado, sin la dependencia interna de wasp)
"use client";
import { useEffect, useState } from "react";

export function useColorMode() {
  const [colorMode, setColorModeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("color-theme");
    if (stored === "dark" || stored === "light") setColorModeState(stored);
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

> Nota de integración con tu PRD: en `/configuracion` pediste que el modo (claro/oscuro/sistema) sea una preferencia de cuenta. Patrón recomendado: este hook sigue gobernando la clase `dark` en `<html>` (fuente de verdad visual e instantánea, sin esperar a la red); al guardar la preferencia en `/configuracion`, además de `localStorage` persistes el valor en `User.theme` (ya está en tu `schema.prisma`, TRD.md §3) para que sincronice entre dispositivos la próxima vez que el usuario inicie sesión.

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

## 8. Animaciones — Patrones de Emil Kowalski (Design Engineering)

### 8.1 Easing custom (sobrescribir los built-in de CSS)

Los easings built-in de CSS son débiles. Usar estos custom curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

**Regla: nunca `ease-in` en UI.** Comienza lento, retrasando el momento que el usuario más observa.

### 8.2 Decision framework (preguntar antes de animar)

1. **¿Debería animar esto?** Frecuencia: 100+/día → NO. Decenas/día → reducir. Ocasional → estándar. Raro → delight.
2. **¿Cuál es el propósito?** Consistencia espacial, indicación de estado, feedback, explicación, evitar cambio brusco.
3. **¿Qué easing?** Entrando/saliendo → `ease-out`. Moviéndose en pantalla → `ease-in-out`. Hover → `ease`. Constante → `linear`.
4. **¿Qué duración?** Botón 100-160ms. Tooltip 125-200ms. Dropdown 150-250ms. Modal/drawer 200-500ms. **Máximo 300ms para UI.**

### 8.3 Patrones de componentes

| Elemento | Animación | Detalle |
|---|---|---|
| Botón (`:active`) | `scale(0.97)` + `transition 160ms ease-out` | Feedback táctil inmediato |
| Dropdown/popover | `scale(0.95)` + `opacity: 0` → `scale(1)` + `opacity: 1`, 150-250ms ease-out | `transform-origin` desde el trigger (no center) |
| Tooltip | 125-200ms ease-out, origin-aware, skip delay en hovers siguientes | Usar `data-instant` |
| Modal | Centrado, `transform-origin: center`, 200-500ms | Excepción: modales NO cambian origin |
| Drawer | `translateY(100%)` con `ease-out` 400ms o spring | Usar `--ease-drawer` para iOS-like |
| Stagger (grupos) | 30-80ms entre items, `translateY(8px)` + `opacity`, 300ms ease-out | No bloquear interacción |

### 8.4 Reglas de performance

- **Solo animar `transform` y `opacity`** — corren en GPU. `width`/`height`/`margin`/`padding`/`top`/`left` NO.
- **CSS transitions > keyframes** para UI dinámica (interrumpibles). Keyframes reinician desde cero.
- **`clip-path`** es animable y GPU-accelerado. Útil para reveals, overlays de hold-to-delete, pestañas.
- **WAAPI** para animaciones programáticas con rendimiento CSS.
- **Framer Motion shorthands** (`x`, `y`, `scale`) NO son hardware-accelerated. Usar `transform: "translateX()"`.

### 8.5 Accesibilidad

```css
@media (prefers-reduced-motion: reduce) {
  /* Mantener opacity/color, eliminar movement/position */
}

@media (hover: hover) and (pointer: fine) {
  /* Gatear hover animations — touch devices no deben trigger hover */
}
```

### 8.6 Asymmetric timing

Donde el usuario decide → lento (hold-to-delete: 2s). Donde el sistema responde → rápido (release: 200ms).

### 8.7 Verify checklist

| Issue | Fix |
|---|---|
| `transition: all` | Especificar propiedades exactas |
| `scale(0)` entry | `scale(0.95)` + `opacity: 0` |
| `ease-in` en UI | `ease-out` o custom curve |
| `transform-origin: center` en popover | Origin desde trigger (Radix: `var(--radix-popover-content-transform-origin)`) |
| Animación en keyboard action | Remover completamente |
| Duration > 300ms en UI | Reducir a 150-250ms |
| Hover sin media query | `@media (hover: hover) and (pointer: fine)` |
| Keyframes en elementos rápidos | CSS transitions |
| Misma velocidad enter/exit | Exit más rápido que enter |

### 8.8 CSS variables globales (agregar a globals.css)

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```
