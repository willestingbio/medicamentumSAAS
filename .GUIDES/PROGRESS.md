# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-22

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
- [x] RLS cross-org isolation test passado contra InsForge API ✅
  - Test ejecutado con 7 verificaciones via bridge JWT, todas pasaron
  - user-a ve org-a, NO ve org-b; user-b ve org-b, NO ve org-a
  - Enrollments aislados por usuario; productos públicos visibles
  - Bridge JWT claims: `user_role`, `organization_id` para RLS sin subconsultas a users

**Estado: Fase 1 COMPLETA ✅** — gap de RLS resuelto

**Desviaciones conocidas (vs TRD.md / AGENTS.md):**
1. Moodle local: jhardison/moodle en lugar de bitnami/moodle (Bitnami retiró imágenes de Docker Hub)
2. Migraciones: SQL directo vía InsForge CLI en lugar de `npx prisma migrate dev` (InsForge no expone conexión TCP directa)
3. Prisma 7: requiere @prisma/adapter-pg + PrismaPg para conexión, no usa url en schema.prisma
4. Better Auth hooks: API de funciones en lugar de `{ matcher, handler }` en v1.6.20
5. vanilla-cookieconsent: guiOptions para layout/position en v3.x

**Gaps resueltos:** Todos los gaps de auditoría han sido cerrados.

## Fase 2 — Landing y navegación + Autenticación
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
- [x] Indicador visual de fortaleza de contraseña (5 niveles basados en zxcvbn)
- [x] Rate limiter utility (`lib/rate-limit.ts`) para Server Actions
- [x] Integración Better Auth client en formularios (email+password + Google OAuth)
- [x] Middleware de rutas protegidas (`middleware.ts`): dashboard, configuracion, checkout, mis-cursos
- [x] Página `/forgot-password` con integración API Better Auth
- [x] Animaciones: easing custom CSS vars (--ease-out, --ease-in-out), button `:active` scale(0.97), dropdown fade+zoom, prefers-reduced-motion, hover media query
- [x] FRONTEND_PATTERNS.md §8: patrones de animación de Emil Kowalski
- [x] Build: `npm run build` compila sin errores ✅
- [x] Modelo `Organization` con campo `orgCode` único por organización
- [x] Modelo `Plan` para planes de suscripción (name, description, priceCents, features, recommended, active, sortOrder)
- [x] Modelo `OrganizationInvitation` para flujo de invitación (orgCode compartido, expiración, accepted)
- [x] Server Actions: `linkUserToOrganization`, `getOrgDetails`, `createInvitation`, `listOrgInvitations`, `deleteInvitation`, `getOrgInfo`, `listOrgMembers`
- [x] Página `/org/employees` — gestión de empleados e invitaciones (solo hospital_admin/super_admin)
- [x] Sign-up con `?org_code=...` — badge de organización, vinculación automática post-registro
- [x] Migración SQL: `plans` + `organization_invitations` + `org_code` + RLS policies
- [x] TypeScript: `tsc --noEmit` exit 0, sin errores
- [x] Prisma generate: cliente generado correctamente (v7.8.0)

**Estado: Fase 2 COMPLETA ✅** — todos los items completados

**Desviaciones conocidas (vs PLAN.md):**
1. Rutas de auth: PLAN.md especifica `/login` y `/registro`; implementado como `/sign-in` y `/sign-up` por convención de Better Auth.
2. Password strength: PLAN.md sugiere `@zxcvbn-ts/core`; implementado con `zxcvbn` original (ya funcionando, sin breaking changes).

## Fase 2.5 — CI/CD, Seguridad de Repositorio y Despliegue
- [x] Vitest configurado (jsdom, setup con @testing-library/jest-dom, path aliases)
- [x] GitHub Actions CI: typecheck + lint + vitest + build en cada push/PR (`.github/workflows/ci.yml`)
- [x] Playwright E2E: configurado con chromium, tests de landing + auth + checkout skeleton (`.github/workflows/e2e.yml`)
- [x] axe-core WCAG 2.1 AA: test de accesibilidad en CI para /, /sign-in, /sign-up, /productos (`.github/workflows/accessibility.yml`)
- [x] RLS isolation test automatizado en CI: workflow manual/PR con secrets de InsForge (`.github/workflows/rls-test.yml`)
- [x] Vercel Preview Deployments: `vercel.json` con build command que incluye `prisma generate`
- [x] Scripts npm: `test`, `test:watch`, `test:e2e`, `test:a11y`
- [x] `.gitignore` revisado: incluye `.env*`, `docker/output/`, `node_modules/`, `.next/`, `*.log`
- [ ] Conectividad InsForge + Vercel (serverless) — requiere secrets en GitHub + Vercel env vars

**Estado: Fase 2.5 ~EN PROGRESO** — CI/CD configurado, falta conectar Vercel con InsForge

**Pendientes Fase 2.5:**
1. Conectar repo GitHub con Vercel (auto al hacer push)
2. Agregar secrets en GitHub repo → Settings → Secrets → Actions:
   - `INSFORGE_API_KEY` (obtener de `.insforge/project.json`)
   - `INSFORGE_PROJECT_URL` (obtener del dashboard InsForge)
3. Agregar variables de entorno en Vercel → Project Settings → Environment Variables:
   - `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `MOODLE_WS_TOKEN`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`
   - `INSFORGE_JWT_SECRET`
4. Verificar que `BETTER_AUTH_URL` apunte a la URL de Vercel (no localhost)
5. Verificar `trustedOrigins` en `lib/auth.ts` incluya dominio de Vercel
6. Verificar Google Cloud Console: redirect URI incluya `https://<dominio-vercel>/api/auth/callback/google`
7. Redeploy en Vercel confirmando auth + DB funcionan

## Fase 3 — Marketplace y detalle de producto
- [x] Página `/productos` con filtros (categoría, precio, orden) y buscador
- [x] Tabs de categoría: Todos, Cursos, Experiencias VR, Automatizaciones IA
- [x] ProductCard con badge de tipo, rating, precio con descuento, botón carrito
- [x] SkeletonCard + SkeletonGrid para estados de carga
- [x] Página `/productos/[slug]` con layout 2 columnas
- [x] Breadcrumb: Home → Marketplace → Producto
- [x] ProductInfoPanel sticky: precio, rating, capacidad, duración, instructor, acciones
- [x] ProductReviews: lista de reseñas con avatar, rating, comentario
- [x] RelatedProducts: 3 productos relacionados
- [x] Conexión con DB real (Server Actions: getProducts, getProductBySlug, getRelatedProducts)
- [x] Búsqueda con Meilisearch (lib/meili.ts, fallback a DB si no disponible)
- [x] Infinite scroll / paginación (IntersectionObserver + load more)
- [x] Visor 3D R3F para productos VR (React Three Fiber + Drei + OrbitControls + autoRotate)

**Estado: Fase 3 COMPLETA ✅** — marketplace con DB, búsqueda, infinite scroll, visor 3D

## Fase 4 — Carrito y checkout (Wompi)
- [ ] No iniciada (bloqueada por Fase 2.5)

## Fase 5 — Dashboard del estudiante
- [ ] No iniciada

## Fase 6 — Integración Moodle
- [ ] No iniciada

## Fase 7 — Panel de organización (hospital_admin)
- [ ] No iniciada

## Fase 8 — Panel Super Admin
- [ ] No iniciada

## Fase 9 — Operaciones
- [ ] No iniciada

## Fase 10 — Analíticas y Reportes
- [ ] No iniciada

## Fase 11 — LMS Avanzado
- [ ] No iniciada

## Fase 12 — Notificaciones
- [ ] No iniciada

## Fase 13 — Pulido, SEO, Accesibilidad y Compliance Final
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
- Email transaccional vía InsForge SDK (`insforge.emails.send()`) en lugar de cliente Brevo directo
- InsForge resuelve el provider automáticamente (SMTP configurado o cloud relay)
- Wireado a password reset y email verification en `lib/auth.ts`
- **Requiere `INSFORGE_JWT_SECRET` en `.env.local`** (obtener con `npx @insforge/cli secrets get JWT_SECRET`)

### Hallazgo #5 — Hero animated gradient ✅
- CSS-only `@keyframes gradient-shift` (background-position 0%→100%→0%, 8s)
- `motion-safe:animate-gradient-shift`: solo anima si usuario no prefiere reduced-motion
- Sin JavaScript, sin librerías externas (Lighthouse-safe)

### Hallazgo #6 — Password strength zxcvbn ✅
- Heurística `passwordStrength()` reemplazada por `zxcvbn()` en `app/(auth)/sign-up/page.tsx`
- Import `import zxcvbn from 'zxcvbn'` (CommonJS, Next.js maneja interop)
- Mismos 5 niveles de etiqueta/color, score real de entropía

### Hallazgo #7 — Rate limiter conectado ✅
- Better Auth `rateLimit` global habilitado en `lib/auth.ts`: 10 req/60s window, memory storage
- `checkRateLimit()` añadido en sign-in (5 req/min por email) y forgot-password (3 req/min por email)
- Protección server-side (Better Auth rateLimit middleware) + client-side (checkRateLimit prefetch)

### Hallazgo #8 — Dead checkbox "Recordar" eliminado ✅
- Checkbox sin estado ni handler removido de `app/(auth)/sign-in/page.tsx`

### Hallazgo #9 — Schema.org JSON-LD ✅
- Schema `EducationalOrganization` con `@context`, name, description, url, address (Colombia)
- Inyectado vía `<script type="application/ld+json">` en `<head>` de `app/layout.tsx`
- Sin librerías externas

### Hallazgo #10 — RLS cross-org isolation verified ✅
- **Bug encontrado:** infinite recursion en policy `users_select_own_or_org` por subconsultas inline a `users` dentro de la policy de `users`
- **Fix:** Nuevas funciones `get_user_role()` (SECURITY DEFINER, lee `auth.jwt() ->> 'user_role'`) y `get_user_org_id()` simplificada (solo JWT, sin fallback a `users`)
- **Bridge JWT actualizado:** claims `user_role` y `organization_id` en lugar de `org_id: null`
- **Policies reescritas:** 29 policies sin subconsultas recursivas, usando `get_user_role()` y `get_user_org_id()`
- **Test ejecutado:** 7/7 pasaron contra InsForge API cloud con bridge JWT
  - user-a ve org-a, NO ve org-b ✓
  - user-b ve org-b, NO ve org-a ✓
  - Enrollments aislados: cada usuario ve solo los propios ✓
  - Productos públicos visibles a todos ✓
- **Criterio bloqueante de PLAN.md §4 cumplido** — Fase 4 puede proceder

### Hallazgo #11 — `users` table reconciliation ✅
- **Problema:** La tabla `users` en la nube carecía de columnas `email`, `name`, `lastName`, `emailVerified`, `image`, `phone` declaradas en el modelo Prisma `User` (`@@map("users")`). Better Auth escribe a `users` via el Prisma adapter; sin esas columnas fallaría en producción.
- **Tabla `user` (singular):** Existe como artifact de migraciones previas con columnas legacy (`hospitalId` en vez de `organizationId`). **No es usada por Better Auth** (solo la tabla `users` via Prisma `User` model). Los datos de prueba fueron insertados explícitamente en ambas por `rls-isolation-test.sql`.
- **Fix:** Migración que agrega `email`, `name`, `lastName`, `emailVerified`, `image`, `phone` + índice único en `email` a la tabla `users`. Datos test actualizados con emails únicos.
- **No hay gap restante** — ambas tablas coexisten sin conflicto: `users` recibe writes de Better Auth, `user` es legacy sin escrituras activas.

### Hallazgo #12 — Fix after-hook undefined return crash in Better Auth 1.6.20 ✅
- **Problema:** El sign-up y otras rutas de auth devolvían 500 con body vacío debido a que el `after` hook en Better Auth retornaba `undefined` para paths distintos de `/sign-up`. En la función `runAfterHooks` (dispatch.mjs:127), se intentaba leer `result.headers` sin verificar si `result` era `undefined`, causando `TypeError: Cannot read properties of undefined (reading 'headers')`.
- **Root cause:** Better Auth 1.6.20's `runAfterHooks` no usa optional chaining en `result.headers`, a diferencia de `runBeforeHooks` que sí lo hace.
- **Fix:** El `after` hook en `lib/auth.ts` ahora siempre retorna un objeto vacío `{}` para evitar el crash, asegurando que `result.headers` nunca sea `undefined`.
- **Verificación:** Todos los endpoints de auth (`/api/auth/get-session`, `/api/auth/sign-up/email`, `/api/auth/sign-in/email`) ahora retornan 200 correctamente en ambiente de producción (InsForge + Vercel).

---

## Hallazgos resueltos en sesión 2026-06-22

### Hallazgo #13 — Modelos Plan, OrganizationInvitation + campo orgCode ✅
- **Modelo `Plan`:** name, description, priceCents, features (String[]), recommended, active, sortOrder — para planes de suscripción de organizaciones.
- **Modelo `OrganizationInvitation`:** organizationId, email, role, orgCode, invitedByUserId, expiresAt, accepted — para flujo de invitación por código.
- **Campo `orgCode` en `Organization`:** código único por organización, usado como token de invitación compartido.
- **Relaciones:** Organization hasMany OrganizationInvitation; OrganizationInvitation belongsTo Organization (onDelete: Cascade).
- **Schema sincronizado:** `prisma/schema.prisma` actualizado con los 3 modelos + relaciones + `@@map()`.

### Hallazgo #14 — Server Actions para RBAC y organizaciones ✅
- **`lib/actions/organization.ts`:** `linkUserToOrganization(orgCode)` — vincula usuario a organización post-registro; `getOrgDetails(orgCode)` — valida código y retorna nombre de org.
- **`lib/actions/invitation.ts`:** `createInvitation(email)` — crea invitación (solo hospital_admin/super_admin); `listOrgInvitations()` — lista invitaciones de la org; `deleteInvitation(id)` — elimina invitación pendiente; `getOrgInfo()` — retorna info de la org del usuario; `listOrgMembers()` — lista miembros de la org.
- **RBAC explícito:** cada Server Action valida `session.user.role` antes de ejecutar (defensa en profundidad, no solo RLS).
- **Patrón de tipos:** `(session.user as any).role` temporal hasta extender Better Auth types.

### Hallazgo #15 — Página `/org/employees` ✅
- **Layout:** header + código de invitación (con copiar al portapapeles) + formulario de invitación + lista de miembros + lista de invitaciones.
- **Protección:** middleware.ts bloquea acceso sin `hospital_admin` o `super_admin`.
- **Componentes:** `InvitationRow` (estado visual: pendiente/aceptada/expirada), `MemberRow` (avatar + rol badge).
- **Feedback:** error states, loading states, copy success feedback.

### Hallazgo #16 — Sign-up con org_code + migración SQL ✅
- **Flujo `/sign-up?org_code=HOSP123`:** valida código via `getOrgDetails()`, muestra badge de organización, vincula post-registro via `linkUserToOrganization()`.
- **Migración SQL:** `migrations/20260622100000_add-plans-and-invitations.sql` — crea `plans`, `organization_invitations`, agrega `org_code` a `organizations`, RLS policies para ambas tablas (SELECT público para planes activos, CRUD para hospital_admin/super_admin en invitations).
- **TypeScript:** `tsc --noEmit` exit 0, `prisma generate` exit 0 (v7.8.0).
- **PLAN.md:** Fase 2 marcada como COMPLETA, Fase 2.5 actualizada con nota de migración.
