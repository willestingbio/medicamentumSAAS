# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-25 (Fase 4 — Carrito/Checkout completada; fixes de build/lint/test; ver Fase 6.5 — Course Builder & Marketplace Multi-Vendor en `PLAN.md` v4.0)

---

## Resumen ejecutivo

| Fase | Estado |
|---|---|
| Fase 1 — Fundaciones | ✅ COMPLETA |
| Fase 2 — Landing + Auth | ✅ COMPLETA |
| Fase 2.5 — CI/CD + VPS | ~EN PROGRESO (CI local listo, falta provisionar VPS real) |
| Fase 3 — Marketplace | ✅ COMPLETA |
| Fase 4 — Carrito + Checkout (Wompi) | ✅ COMPLETA |
| Fase 5 — Dashboard del Estudiante | ✅ COMPLETA (dashboard, configuracion, cursos, reproductor leccion, VR keys, 2FA, tests, Google Calendar OAuth, Course Builder models, lesson player, mis-cursos, moodle-sync) |
| Fase 6 — Integración Moodle (alcance reducido, ver `PLAN.md` Fase 6) | ✅ COMPLETA |
| Fase 6.5 — Course Builder & Marketplace Multi-Vendor (NUEVO) | ✅ COMPLETA |
| Fase 7-13 | ⬜ No iniciadas |

---

## Fase 1 — Fundaciones ✅ COMPLETA

- [x] Setup Next.js App Router + Prisma + Postgres (Docker en VPS)
- [x] Schema Prisma + migraciones (13 modelos)
- [x] RLS multi-tenant (29 policies en 11 tablas)
- [x] Better Auth 1.6.20: email+password + Google OAuth
- [x] Cuenta espejo en Moodle (hook after sign-up)
- [x] Banner cookies + política privacidad (Ley 1581)
- [x] Variables de entorno configuradas (local)
- [x] Moodle local Docker (jhardison/moodle)
- [x] Build verificado: `npm run build` sin errores
- [x] RLS cross-org isolation test pasado (7/7)

---

## Fase 2 — Landing + Auth ✅ COMPLETA

- [x] NavBar scroll-aware (píldora blur + Sheet mobile)
- [x] DarkModeSwitcher + localStorage
- [x] Footer, Landing (Hero, Nosotros, Ejemplos, BlogCarousel)
- [x] Meta tags OG/Twitter Card + Schema.org
- [x] 404 y 500 con branding
- [x] Auth pages `/sign-in` y `/sign-up` (layout 2 columnas)
- [x] AuthCarousel, Zod + React Hook Form + zxcvbn
- [x] Better Auth: email+password + Google OAuth
- [x] Rate limiting (`lib/rate-limit.ts`)
- [x] Middleware RBAC (`middleware.ts`)
- [x] Página `/forgot-password`
- [x] Modelos Organization, Plan, OrganizationInvitation
- [x] Server Actions: org, invitaciones, empleados
- [x] Página `/org/employees`
- [x] Sign-up con `?org_code=...`
- [x] Animaciones Emil Kowalski + GSAP ScrollTrigger
- [x] Dark mode flash fix

---

## Fase 2.5 — CI/CD y VPS — EN PROGRESO

### Completado
- [x] Vitest configurado (jsdom, jest-dom, path aliases)
- [x] GitHub Actions CI: typecheck + lint + vitest + build
- [x] Playwright E2E: chromium, tests landing + auth
- [x] axe-core WCAG 2.1 AA en CI (4 páginas)
- [x] RLS isolation test automatizado en CI
- [x] `.gitignore` revisado

### Pendiente — Limpieza (2026-06-22)
- [x] **Eliminar `vercel.json`** — config Vercel obsoleta ✅
- [x] **Eliminar `insforge.toml`** — config InsForge obsoleta ✅
- [x] **Eliminar `.insforge/`** — estado local InsForge obsoleto ✅
- [x] **Eliminar `.vercel/`** — estado local Vercel obsoleto ✅
- [x] **Eliminar `app/api/insforge-token/route.ts`** — bridge JWT obsoleto ✅
- [x] **Eliminar `app/api/debug/`** — directorio vacío ✅
- [x] **Limpiar `.env.local.example`** — eliminar refs InsForge ✅
- [x] **Limpiar referencia InsForge en `lib/auth.ts:91`** ✅
- [x] **Fix `lib/prisma.ts`** — `pg.Pool({ max: 10 })` + param queries ✅
- [x] **Fix `lib/rate-limit.ts`** — limpieza periódica de entries ✅
- [x] **Fix `app/api/test/rls-isolation/route.ts`** — eliminar refs InsForge ✅
- [x] **Fix `.github/workflows/rls-test.yml`** — reescribir para Postgres Docker ✅
- [x] **Regenerar `package-lock.json`** — sin `@insforge/sdk` ✅

### Pendiente — VPS Setup
- [x] **`output: 'standalone'`** en `next.config.ts` ✅
- [x] **Crear `app/api/health/route.ts`** ✅
- [x] **Crear `lib/storage/client.ts`** ✅
- [x] **Dockerfile multi-stage** (ver `DEPLOY.md§4`) ✅
- [x] **`docker-compose.yml` completo** — `docker-compose.prod.yml` (app+postgres+redis+meilisearch+nginx+certbot) ✅
- [x] **Nginx config** — `nginx/nginx.conf` + `nginx/conf.d/medicamentum.conf` ✅
- [x] **GitHub Actions deploy workflow** — `.github/workflows/deploy.yml` ✅
- [x] **Script de backups** — `scripts/backup-db.sh` ✅
- [x] **`.env.production.example`** — template con todas las variables ✅
- [x] **Instalar `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`** — fix TypeScript ✅
- [x] **Crear `.eslintrc.json`** + instalar `eslint` + `eslint-config-next` — fix lint ✅
- [x] **Fix `vitest.config.ts`** — `pool: 'threads'` para evitar timeout jsdom ✅
- [x] **Fix `NavBar.tsx`** — `<a>` → `<Link>` (error ESLint) ✅
- [ ] **Provisionar VPS** (Hetzner CX22 recomendado)
- [ ] **Setup VPS**: Docker, UFW, usuario deploy, SSH keys
- [ ] **Secrets en GitHub**: VPS_HOST, VPS_USER, VPS_SSH_KEY
- [ ] **`.env.production`** en VPS con todos los valores reales
- [ ] **SSL Let's Encrypt** (primer setup)
- [ ] **Migración inicial en VPS**: `npx prisma migrate deploy`
- [ ] **Configurar Cloudflare R2** (bucket, API keys)
- [ ] **Backups automáticos** de Postgres (cron en VPS)
- [ ] **UptimeRobot** → `https://medicamentum360.com/api/health`
- [ ] **Google Cloud Console** — redirect URI al dominio VPS
- [ ] **Verificar RSC streaming** — Nginx proxy_buffering off

---

## Fase 3 — Marketplace ✅ COMPLETA

*(sin cambios)*

---

## Fase 4 — Carrito + Checkout (Wompi) — ✅ COMPLETA

- [x] Schema Prisma: Order billing fields, Coupon, EmployeeAssignment, wompiReference (`prisma db push` applied)
- [x] Server Actions: `lib/actions/cart.ts` — addToCart, removeFromCart, clearCart, mergeGuestCart, getCart, getCartSummary
- [x] Server Actions: `lib/actions/checkout.ts` — createOrderFromCart, getCheckoutSummary, getOrderById, getOrderHistory, processWompiPayment
- [x] Componentes: `CartPopover`, `CartItemRow` — popover del carrito con items, totales, links a checkout
- [x] NavBar: integrado `CartPopover` (desktop + mobile)
- [x] ProductCard: botón "Agregar al carrito" funcionando con `addToCart`
- [x] ProductInfoPanel: "Comprar ahora" + "Agregar al carrito" funcionando
- [x] Página `/checkout`: formulario facturación → WompiWidget embebido (Checkout Brick)
- [x] Página `/checkout/success`: confirmación de compra con resumen
- [x] Página `/orders`: historial de compras del usuario
- [x] `lib/wompi.ts`: WompiClient con fetch directo, HMAC validation, generateOrderReference
- [x] `components/checkout/WompiWidget.tsx`: Widget embebido con Checkout Brick de Wompi
- [x] `app/api/wompi/acceptance-tokens/route.ts`: API para tokens de aceptación
- [x] Webhook `/api/webhooks/wompi`: HMAC + idempotencia + enrollment Moodle + email Brevo
- [x] `lib/email/brevo.ts`: sendOrderConfirmationEmail, sendWelcomeEmail
- [x] Componente `Badge` (ui) + Toaster (sonner) integrado en layout
- [x] `DEFAULT_TAX_RATE=0.19` configurable via env
- [x] Tests HMAC validation, reference generation, idempotency logic (10/10 PASS)

---

## Fase 5-6 — ⬜ No iniciadas

### Fase 5 — Dashboard del Estudiante — ✅ COMPLETA

**Completado en sesiones anteriores:**
- [x] Fix Prisma schema: `Certificate` ahora tiene `@relation` a `Product` + `@@unique([userId, productId])`
- [x] Dependencias: `jspdf` (PDF generation), `@radix-ui/react-progress`, `@radix-ui/react-tabs`, `@radix-ui/react-separator`
- [x] ShadCN components: `skeleton.tsx`, `separator.tsx`, `progress.tsx`, `tabs.tsx`
- [x] Route group `(dashboard)` con layout protegido que valida sesion
- [x] Server Actions: `lib/actions/dashboard.ts`, `lib/actions/certificates.ts`, `lib/actions/profile.ts`, `lib/actions/vr-keys.ts`, `lib/actions/auth-settings.ts`
- [x] Pagina `/dashboard`: grid 2×3 con Mis Cursos (tabs: Todos/En progreso/Completados/No iniciados), Certificados, Calendario, Resumen
- [x] Pagina `/configuracion`: grid 2 columnas con Perfil, Preferencias (tema), Historial de compras, Zona de peligro
- [x] Componentes: `DashboardContent`, `DashboardSkeleton`, `CertificateCard`, `CalendarWidget`, `SettingsContent`, `SettingsSkeleton`
- [x] Certificate generation: PDF con jsPDF (diseño branded) + upload a R2 + LinkedIn share URL

**Completado en esta sesión (2026-06-25):**
- [x] Fix Prisma schema: modelo `VrKey` (unique per user+product, indexed apiKey) + campos `twoFactorEnabled`/`twoFactorSecret`/`vrKeys` en User + `VrKey[]` en Product
- [x] Dependencias adicionales: `qrcode`, `otpauth`, `jspdf`, `hls.js`
- [x] `SecuritySettings` component — cambio de contraseña + 2FA TOTP (generar secret, verificar código, activar/desactivar)
- [x] `VrKeysCard` component — visualizar llaves VR con reveal/copy/revoke
- [x] `SecuritySettings` integrado en `/configuracion` page
- [x] `VrKeysCard` integrado en dashboard page (props desde `getVrKeys()`)
- [x] Fix `lib/actions/auth-settings.ts`: `verifyPassword`/`hashPassword` de `better-auth/crypto` (no `verify`/`hash`)
- [x] Tests de la Fase 5: `tests/phase5.test.ts` — 21/21 PASS (VR key gen, QR payload, cert layout, 2FA TOTP, password validation, enrollment progress, product type display)
- [x] **Prisma schema: modelos Course Builder** — `Course`, `Module`, `Lesson`, `Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `LessonCompletion` + enums `ContentSource`, `LessonType`, `QuestionType` (TRD.md §19.2) — `prisma db push` aplicado
- [x] **Página `/dashboard/cursos/[slug]/[leccionId]`** — reproductor de lección con HLS.js, outline del curso (sidebar sticky), navegación prev/next, barra de progreso, breadcrumb
- [x] **Componente `HlsPlayer`** — wrapper de hls.js con soporte nativo Safari, callbacks de `onProgress` y `onEnded`
- [x] **Componente `CourseOutline`** — temario sticky con módulos colapsables, estados (✓ completada, ● actual, · pendiente, 🔒 bloqueada por drip), links a lecciones
- [x] **Componente `LessonPlayerContent`** — layout 2 columnas (contenido + sidebar), responsive con Sheet mobile para temario
- [x] **Server Actions: `lib/actions/course-progress.ts`** — `getCourseForPlayer`, `getLessonById`, `markLessonComplete` (con recálculo de `Enrollment.progressPct`), `getMyEnrollments`
- [x] **Página `/mis-cursos`** — vista dedicada de cursos inscritos con tarjetas, progreso, tipo, badge de estado
- [x] **Componente `MyCoursesContent`** — grid responsive de cursos con Progress bar, empty state con link al marketplace
- [x] **Auto-marcar lección al 90% del video** — `HlsPlayer` llama `onProgress` → `LessonPlayerContent` detecta ≥90% → `markLessonComplete` → recalcula progreso
- [x] **Server Actions: `lib/actions/moodle-sync.ts`** — `syncMoodleProgress` (una inscripción), `syncAllMoodleProgress` (bulk) — solo para `contentSource: moodle_legacy`
- [x] Componente `ScrollArea` (ShadCN) — para sidebar del temario
- [x] Middleware actualizado: `/mis-cursos` ya estaba protegido
- [x] TypeScript: 0 errores | ESLint: 0 warnings
- [x] **Google Calendar OAuth completo** — `app/api/auth/calendar/route.ts` (OAuth initiation), `app/api/auth/calendar/callback/route.ts` (token exchange + store), `lib/actions/calendar.ts` (`getGoogleCalendarEvents`, `getCalendarConnectionStatus`, `disconnectCalendar`), `CalendarWidget.tsx` actualizado con eventos de Google Calendar + botón conectar/desconectar + badge "Google"
- [x] **Prisma: modelo `CalendarConnection`** — `userId` unique, `accessToken`, `refreshToken`, `calendarId`, `calendarName`, `connectedAt`; `db push` aplicado; `prisma generate` regenerado
- [x] **`getDashboardData` ampliado** — retorna `userId` y `calendarConnected` (boolean) desde `CalendarConnection`
- [x] **DashboardContent** — links de cursos apuntan a `/dashboard/cursos/[slug]` (reproductor) para cursos nativos; CalendarWidget recibe `userId` y `googleConnected` props
- [x] TypeScript: 0 errores | ESLint: 0 warnings (re-verificado tras cambios)

**Pendiente (para completar la fase):**
- [x] ~~Generar migración de Prisma formal~~ — COMPLETADO: `prisma/migrations/20250101000000_init/migration.sql` (613 líneas, todas las tablas/indices/FK/enums); marcada como aplicada en DB (`npx prisma migrate status` → "Database schema is up to date!")

---

## Fase 6 — Integración Moodle ✅ COMPLETA

- [x] **Webhook de Wompi modificado** — se añade comprobación para que solo se inscriba a Moodle si `contentSource === 'moodle_legacy'`
- [x] **SSO Route Handler (`/api/moodle/autologin`)** — gestiona el redireccionamiento seguro a Moodle usando el token de autologin o el fallback de login manual
- [x] **Continuar Curso Button** — DashboardContent y MyCoursesContent ahora redirigen automáticamente a la sesión externa de Moodle para cursos legacy
- [x] **Cron de sincronización de progreso (`/api/cron/moodle-sync`)** — endpoint seguro protegido por `CRON_SECRET` para sincronizar en masa el estado del estudiante
- [x] **Moodle Course Catalog API (`/api/moodle/courses`)** — endpoint seguro para administradores para visualizar y enlazar cursos de Moodle
- [x] **Pruebas de Integración** — `tests/phase6-moodle.test.ts` con 20/20 casos de prueba pasando (auth de cron, redireccionamiento, lógica de sincronización, etc.)
- [x] **TypeScript & ESLint** — 100% libre de errores

---

## Fase 6.5 — Course Builder & Marketplace Multi-Vendor — ✅ COMPLETA
**Bloqueante:** Fase 4 (checkout) y Fase 5 (dashboard del estudiante) completas. No depende de la Fase 6 (Moodle) — puede desarrollarse en paralelo.

> Ver `PLAN.md` Fase 6.5 para el detalle completo de tareas. Resumen de bloques principales para seguimiento rápido:

- [x] Schema Prisma: enums `VendorStatus`, `ReviewStatus`, `PayoutStatus` + modelos `Vendor`, `Payout` + campos `vendorId`/`reviewStatus` en `Product` — `prisma db push` aplicado
- [x] RLS policies para `vendors`, `payouts`, `courses`, `modules`, `lessons`, `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `lesson_completions`, `products` (update reviewStatus/publish) — `prisma/rls-phase6_5.sql` (869 líneas)
- [x] `lib/video/stream-client.ts` — Cloudflare Stream: Direct Upload, delete, status, signed playback (RS256 JWT con fallback dev)
- [x] `lib/crypto/vendor-bank.ts` — AES-256-GCM cifrado/descifrado de datos bancarios de vendor
- [x] `lib/actions/course-builder/courses.ts` — assertCourseOwner, getMyCourses, getCourseForEditor, updateCourseSettings, submitCourseForReview, publishCourse
- [x] `lib/actions/course-builder/modules.ts` — assertModuleOwner, createModule, updateModuleTitle, setModuleDripDelay, reorderModules, deleteModule, getModulesWithLessons
- [x] `lib/actions/course-builder/lessons.ts` — assertLessonOwner, createLesson (con Quiz en transacción si type=quiz), updateLessonContent, reorderLessons, deleteLesson (cleanup Cloudflare), getLessonForEditor
- [x] `lib/actions/course-builder/quizzes.ts` — assertQuizOwner, addQuizQuestion, updateQuizQuestion, deleteQuizQuestion, addQuizOption, updateQuizOption, deleteQuizOption, reorderQuestions, reorderOptions, updateQuizSettings
- [x] `lib/actions/course-builder/video-upload.ts` — getVideoUploadUrl, checkVideoStatus, replaceVideo
- [x] `lib/actions/vendor/onboarding.ts` — registerAsVendor, getMyVendorProfile, submitVendorKyc, assertOwnVendorProfile
- [x] `lib/actions/vendor/vendor-products.ts` — createVendorProduct (crea Product + Course vacío), getMyVendorProducts, updateVendorProduct, submitProductForReview, getVendorPublicProfile
- [x] `lib/actions/vendor/payouts.ts` — getMyPayoutHistory
- [x] `lib/actions/admin/review-queue.ts` — getReviewQueue, approveProduct, rejectProduct, getVendorsPendingReview, approveVendor, rejectVendor, getVendorList
- [x] `lib/actions/admin/payouts.ts` — generateMonthlyPayoutBatch, getPendingPayouts, approveAndSendPayout, rejectPayout
- [x] `lib/actions/admin/course-admin.ts` — adminGetAllCourses, adminUpdateVendorCommission, adminSuspendVendor, adminReactivateVendor
- [x] `app/api/webhooks/cloudflare-stream/route.ts` — webhook POST para procesamiento de video
- [x] Panel `/instructor` — listado de cursos (`page.tsx`), layout protegido con redirect a `/vender` para vendors pendientes, editor 3 columnas (`courses/[id]`)
- [x] Componentes instructor: `module-tree.tsx`, `lesson-editor.tsx`, `course-settings.tsx`
- [x] Onboarding vendor `/vender` — Step 1 (register), Step 2 (KYC/bank), Step 3 (pending review), estados active/suspended
- [x] Bandeja `/admin/review-queue` — pestañas productos/vendors pendientes con aprobar/rechazar + diálogo de motivo
- [x] Panel `/admin/payouts` — generación de lote mensual, tabla de payouts pendientes, aprobar/rechazar
- [x] Layout `/admin` protegido con verificación super_admin
- [x] Página pública `/marketplace/creador/[slug]` — perfil de vendor con bio + catálogo de productos
- [x] Middleware actualizado: `/instructor` añadido a rutas protegidas
- [x] Componentes admin: `review-product-card.tsx`, `review-vendor-card.tsx`, `reject-dialog.tsx`, `payout-row.tsx`
- [x] Tests Fase 6.5: `tests/phase6_5.test.ts` — 70/70 PASS (cifrado bancario, cálculo payout, review status, ownership, quizzes, progreso, video URL, comisión, idempotencia)
- [x] TypeScript: 0 errores de compilación
---

## Fase 7 — Panel de Organización (gestión real) — ⬜ No iniciada (alcance nuevo, auditoría 2026-06-26)

> Ver `PLAN.md` Fase 7 para el detalle completo. Resumen:

- [ ] `updateEmployeeRole` / `removeEmployeeFromOrganization` (Server Actions) con protección "nunca sin admin"
- [ ] UI: dropdown de rol + remover empleado en `/org/employees`, con diálogo de confirmación explícito
- [ ] Compra corporativa en lote: toggle en checkout, `createBulkOrderForOrganization`, `assignCourseToEmployee`
- [ ] UI: banner de cupos sin asignar + asignación por empleado
- [ ] `getOrganizationProgressReport` + pantalla `/org/reports` con exportación CSV
- [ ] Decisión pendiente con negocio: estrategia de atribución de cupos a múltiples órdenes (FIFO sugerido)
---

## Fase 7.1 — Reembolsos y Soporte — ⬜ No iniciada (NUEVO, auditoría 2026-06-26)

> Hueco crítico: la UI promete "política de reembolso" desde el día 1 sin que exista el flujo. Ver `PLAN.md` Fase 7.1.

- [ ] Modelo Prisma `RefundRequest` + `SupportTicket` + policies RLS
- [ ] `lib/refunds/policy.ts` — política de elegibilidad (7 días / 20% progreso, **a confirmar con negocio antes de fijar el valor final**)
- [ ] `requestRefund`, `processRefund` + integración con reembolsos de Wompi (confirmar que el plan actual de Wompi los soporta)
- [ ] UI: botón en `/orders`, bandeja `/admin/refunds`
- [ ] `createSupportTicket` + pantalla `/soporte` + enlace en footer/menú de usuario
---

## Archivos eliminados en esta sesión (cleanup)

| Archivo | Razón |
|---|---|
| `vercel.json` | Vercel eliminado del stack |
| `insforge.toml` | InsForge eliminado del stack |
| `.insforge/` | Estado local InsForge |
| `.vercel/` | Estado local Vercel |
| `app/api/insforge-token/route.ts` | Bridge JWT obsoleto |
| `app/api/debug/` | Directorio vacío |
 
---

## Desviaciones conocidas

1. Moodle local: `jhardison/moodle` (Bitnami retiró imágenes)
2. Prisma 7: requiere `@prisma/adapter-pg` + `PrismaPg` con `pg.Pool`
3. Better Auth hooks: API de funciones en v1.6.20, always return `{}`
4. vanilla-cookieconsent: `guiOptions` para layout en v3.x
5. `lib/rate-limit.ts`: in-memory, solo para Server Actions no-auth
6. Better Auth rate limit: `storage: "memory"` (pendiente migrar a Redis en Fase 2.5 VPS)
7. **Moodle Web Service API — estrategia revisada julio 2026:** la API de Moodle **sí** permite crear el shell del curso (`core_course_create_courses`) pero **no** secciones/recursos/quizzes. Estrategia actual: (a) El shell del curso se crea en Moodle automáticamente al crear el producto en el Course Builder, vinculando `moodleCourseId`. (b) El contenido rico (lecciones, quizzes, video) vive en Postgres y se consume desde Medicamentum360. (c) Para integración completa bidireccional futura, se necesita un plugin de Moodle que exponga `create_section`, `add_resource`, `add_quiz` como web services. Ver `TRD.md §19.1`. Fase 1 (Bridge Shell) ya implementada; Fase 2 (sync estructura) y Fase 3 (plugin) pendientes.
8. Video de lecciones vía Cloudflare Stream, no R2 — R2 queda reservado a archivos estáticos (imágenes, PDFs, modelos 3D). Ver `TRD.md §19.4`.
9. `vitest.config.ts` requiere `pool: 'threads'` explícito — el pool por defecto causaba timeout en entorno jsdom.
10. **Auditoría 2026-06-26 — huecos de producto encontrados y resueltos en documentación** (no en código, que no estaba disponible para revisar en esta sesión): gestión de empleados sin revocación de acceso, `EmployeeAssignment` huérfano desde la Fase 4, ausencia de flujo de reembolso real pese a estar prometido en la UI desde el inicio, ausencia de canal de soporte. Ver `PLAN.md` Fase 7 y 7.1.
11. **Dos contradicciones internas corregidas en `FLUJOS.md`:** el trigger de certificado (§9) asumía sync con Moodle incluso para cursos `native`, y la validación de `moodleCourseId` (§11) se aplicaba indistintamente sin distinguir `contentSource`. Ambas quedaron desalineadas tras introducir la Fase 6.5 (v4.0) y no se propagaron a todas las secciones afectadas en su momento — corregido ahora.
12. **CustomSession plugin implementado (julio 2026):** los `(session.user as any)` fueron reemplazados por tipos tipados vía `AppUser` + `customSession` de Better Auth. `vendorStatus` ahora se inyecta en la sesión sin query extra a la DB. Redis `secondaryStorage` queda pendiente para Fase 2.5 (VPS). Ver `lib/auth-types.ts` y `lib/auth.ts`.