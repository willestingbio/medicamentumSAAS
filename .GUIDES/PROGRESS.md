# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-21

---

## Fase 1 — Fundaciones
- [x] Setup Next.js App Router + Prisma + InsForge Postgres
  - Next.js 15, React 19, TypeScript strict
  - Prisma 7.8 con adapter-pg + PrismaPg
  - PostCSS + Tailwind CSS v4 + @tailwindcss/postcss
  - vanilla-cookieconsent v3.x con guiOptions
- [x] Schema + migraciones SQL (vía InsForge CLI, no Prisma migrate)
  - 13 modelos creados en InsForge PostgreSQL
  - Migraciones: `create-medicamentum-schema`, `enable-rls-multi-tenant`, `fix-calendar-events-rls`
- [x] RLS multi-tenant activado (29 policies en 11 tablas)
  - CalendarEvent estricto userId-only (sin hospital_admin por TRD.md §4)
  - Helpers: `public.get_user_org_id()`, `public.requesting_user_id()` (para compatibilidad Better Auth)
  - Grants para authenticated + anon
- [x] Bridge JWT route (`/api/insforge-token`) para autenticar InsForge API con sesión Better Auth
- [x] Better Auth 1.6.20: email+password + Google OAuth + Wompi
  - `lib/auth.ts` configurado con hook after post sign-up para Moodle
  - `lib/auth-client.ts` para cliente React
- [x] Cuenta espejo automática en Moodle
  - Hook after en auth.ts llama a `createMoodleUser()` post sign-up
  - Actualiza `moodleUserId` en BD
  - Name parsing robusto (soporta single-word names)
- [x] Sanitización de logs (AGENTS.md §5)
  - console.error sanitizado en moodle/client.ts
  - console.log de params removido
- [x] Banner de cookies + política de privacidad (Ley 1581)
  - Páginas `/privacidad` y `/terminos` creadas
- [x] Variables de entorno
  - `.env.local` con DATABASE_URL, BETTER_AUTH_SECRET, MOODLE_WS_TOKEN
  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (reales)
  - WOMPI_PUBLIC_KEY, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET (reales)
- [x] Moodle local de pruebas (Docker)
  - Moodle 4.0.5 (jhardison/moodle) corriendo en `http://localhost:8090`
  - API REST habilitada con token: m360_08f4ac5db2a6ad562e81684fb6c5dc
  - Curso demo: M360-DEMO-001 (id=2)
  - Estudiante demo: estudiante_demo / EstudianteDemo123!
  - Bootstrap completo: webservices, token, curso, usuario de prueba
- [x] Build verificado: `npm run build` compila sin errores
- [x] RLS isolation test SQL creado (`tests/rls-isolation-test.sql`)
  - Bloqueante antes de Fase 4 (pagos), no antes de Fase 2

**Estado: Fase 1 COMPLETA! ✅**

**Desviaciones conocidas (vs TRD.md / AGENTS.md):**
1. Moodle local: jhardison/moodle en lugar de bitnami/moodle (Bitnami retiró imágenes de Docker Hub)
2. Migraciones: SQL directo vía InsForge CLI en lugar de `npx prisma migrate dev` (InsForge no expone conexión TCP directa)
3. Prisma 7: requiere @prisma/adapter-pg + PrismaPg para conexión, no usa url en schema.prisma
4. Better Auth hooks: API de funciones en lugar de `{ matcher, handler }` en v1.6.20
5. vanilla-cookieconsent: guiOptions para layout/position en v3.x

## Fase 2 — Landing y navegación
- [x] NavBar scroll-aware (píldora con blur + menú Sheet mobile) con `throttleWithTrailingInvocation`
- [x] DarkModeSwitcher con `useColorMode` + localStorage persistencia
- [x] Footer con branding, links y legal (privacidad/terminos)
- [x] Landing: Hero, Nosotros, Ejemplos, Blog (carrusel con Embla)
- [x] Meta tags OG/Twitter Card + Schema.org metadata
- [x] 404 (not-found.tsx) con branding
- [x] 500 (error.tsx) con retry
- [x] UI components: Button, Card, Avatar, Sheet, Input, Label (sin DropdownMenu Radix)
- [x] tsconfig.json paths: agregado `@/hooks/*` y corregido `@/*`
- [x] NavBar: dropdown state-based (funciona en mobile/touch), scroll suave a secciones con `scrollIntoView`
- [x] BlogCarousel: reconstruido con `embla-carousel-react` (auto-play 4s, pausa al hover, flechas teclado, swipe táctil, loop)
- [x] Páginas de autenticación: `/sign-in` y `/sign-up` con layout dos columnas
- [x] AuthCarousel: carrusel pedagógico 3 pasos (Misión, LMS, Certificaciones) con Embla + auto-play
- [x] Zod + React Hook Form con validación reactiva en ambos formularios
- [x] Indicador visual de fortaleza de contraseña (5 niveles basados en heurística)
- [x] Rate limiter utility (`lib/rate-limit.ts`) para Server Actions
- [x] Integración Better Auth client en formularios (email+password + Google OAuth)
- [x] Middleware de rutas protegidas (`middleware.ts`): dashboard, configuracion, checkout, mis-cursos
- [x] Página `/forgot-password` con integración API Better Auth
- [x] Animaciones: easing custom CSS vars (--ease-out, --ease-in-out), button `:active` scale(0.97), dropdown fade+zoom, prefers-reduced-motion, hover media query
- [x] FRONTEND_PATTERNS.md §8: patrones de animación de Emil Kowalski
- [x] Build: `npm run build` compila sin errores ✅

**Estado: Fase 2 COMPLETA! ✅**

## Fase 3 — Marketplace y detalle de producto
- [ ] No iniciada

## Fase 4 — Carrito y checkout (Wompi)
- [ ] No iniciada (bloqueada por Fase 1)

## Fase 5 — Integración Moodle (cursos)
- [ ] No iniciada

## Fase 6 — Dashboard del estudiante
- [ ] No iniciada

## Fase 7 — Configuración, panel hospital_admin y facturación
- [ ] No iniciada

## Fase 8 — Pulido, cumplimiento y post-MVP
- [ ] No iniciada

---

## Hallazgos resueltos en sesión 2026-06-21

### Hallazgo #1 — RLS cross-org test ✅
- Setup SQL ejecutado (data test con org-a/org-b, users, products, enrollments)
- Nueva función `public.requesting_user_id()` que lee `auth.jwt() ->> 'sub'`
- `get_user_org_id()` actualizado para usar `requesting_user_id()`
- 29 políticas RLS migradas de `auth.uid()::text` → `requesting_user_id()`
- Bridge route `/api/insforge-token` firma HS256 JWT con InsForge secret
- Test endpoint `/api/test/rls-isolation` verifica policies, helpers y datos test
- **Prisma bypasses RLS** (service_role connection); test RLS real requiere InsForge SDK + bridge JWT en client-side

### Hallazgo #2 — NavBar hidden-on-scroll-down en marketplace ✅
- Scroll direction tracking via `useRef(prevScrollY)` + throttle
- `isHidden` state en `/productos`: scrolling down → `-translate-y-full`, scrolling up → `translate-y-0`
- Misma lógica throttled (50ms), respeta Emil Kowalski animation patterns

### Hallazgo #3 — Verificación de email en Better Auth ✅
- `emailVerification.sendOnSignUp: true`, `autoSignInAfterVerification: true`
- `sendVerificationEmail` callback configurado (usa Brevo)
- **Requiere `BREVO_API_KEY` real en `.env.local`** para funcionar

### Hallazgo #4 — Brevo transactional email ✅
- `lib/email.ts`: cliente API v3 de Brevo (POST /v3/smtp/email)
- Wireado a password reset y email verification en `lib/auth.ts`
- **Requiere `BREVO_API_KEY` real en `.env.local`** para funcionar

### Hallazgo #5 — Hero animated gradient ✅
- CSS-only `@keyframes gradient-shift` (background-position 0%→100%→0%, 8s)
- `motion-safe:animate-gradient-shift`: solo anima si usuario no prefiere reduced-motion
- Sin JavaScript, sin librerías externas (Lighthouse-safe)
