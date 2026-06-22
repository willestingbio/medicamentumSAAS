# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-22 (migración a VPS)

---

## Resumen ejecutivo

| Fase | Estado |
|---|---|
| Fase 1 — Fundaciones | ✅ COMPLETA |
| Fase 2 — Landing + Auth | ✅ COMPLETA |
| Fase 2.5 — CI/CD + VPS | ~EN PROGRESO (CI local listo, falta VPS) |
| Fase 3 — Marketplace | ✅ COMPLETA |
| Fase 4-13 | ⬜ No iniciadas |

> **Nota v2.0:** se eliminaron todas las referencias a InsForge y Vercel. El stack de infraestructura es ahora VPS + Docker Compose + Postgres propio + Cloudflare R2. Ver `DEPLOY.md` para la guía completa.

---

## Fase 1 — Fundaciones ✅ COMPLETA

- [x] Setup Next.js App Router + Prisma + Postgres (Docker en VPS)
  - Next.js 15, React 19, TypeScript strict
  - Prisma 7.8 con `@prisma/adapter-pg` + `PrismaPg`
  - PostCSS + Tailwind CSS v4 + @tailwindcss/postcss
  - vanilla-cookieconsent v3.x con guiOptions
- [x] Schema Prisma + migraciones
  - 13 modelos en Postgres
  - Migraciones con `npx prisma migrate dev` (local) / `prisma migrate deploy` (VPS)
- [x] RLS multi-tenant activado (29 policies en 11 tablas)
  - Helpers: `public.get_user_org_id()`, `public.requesting_user_id()`
  - Grants para authenticated + anon
- [x] Better Auth 1.6.20: email+password + Google OAuth
- [x] Cuenta espejo automática en Moodle (hook after sign-up)
- [x] Banner de cookies + política de privacidad (Ley 1581)
- [x] Variables de entorno configuradas (local)
- [x] Moodle local de pruebas (Docker — `jhardison/moodle`)
- [x] Build verificado: `npm run build` sin errores
- [x] RLS cross-org isolation test pasado ✅ (7/7 verificaciones)

**Desviaciones conocidas:**
1. Moodle local: `jhardison/moodle` (Bitnami retiró imágenes de Docker Hub)
2. Migraciones: `prisma migrate dev/deploy` (no InsForge CLI — eliminado)
3. Prisma 7: requiere `@prisma/adapter-pg` + `PrismaPg`
4. Better Auth hooks: API de funciones en v1.6.20, always return `{}`
5. vanilla-cookieconsent: `guiOptions` para layout en v3.x

---

## Fase 2 — Landing y navegación + Autenticación ✅ COMPLETA

- [x] NavBar scroll-aware (píldora con blur + menú Sheet mobile)
- [x] DarkModeSwitcher + localStorage persistencia
- [x] Footer, Landing (Hero, Nosotros, Ejemplos, BlogCarousel con Embla)
- [x] Meta tags OG/Twitter Card + Schema.org
- [x] 404 y 500 con branding
- [x] Páginas de auth `/sign-in` y `/sign-up` (layout dos columnas)
- [x] AuthCarousel: carrusel pedagógico 3 pasos
- [x] Zod + React Hook Form + indicador de fortaleza (zxcvbn)
- [x] Better Auth: email+password + Google OAuth
- [x] Rate limiting (`lib/rate-limit.ts`)
- [x] Middleware RBAC (`middleware.ts`): rutas protegidas, org, admin
- [x] Página `/forgot-password`
- [x] Modelos `Organization`, `Plan`, `OrganizationInvitation`
- [x] Server Actions: `linkUserToOrganization`, `getOrgDetails`, `createInvitation`, `listOrgInvitations`, `deleteInvitation`, `getOrgInfo`, `listOrgMembers`
- [x] Página `/org/employees` (gestión de empleados — hospital_admin)
- [x] Sign-up con `?org_code=...` — badge de org, vinculación automática
- [x] Migración SQL: plans + organization_invitations + org_code + RLS
- [x] Animaciones Emil Kowalski + GSAP ScrollTrigger
- [x] Dark mode flash fix + hidratación

**Desviaciones conocidas:**
1. Rutas de auth: `/sign-in` y `/sign-up` (no `/login` y `/registro`)
2. Password strength: `zxcvbn` (funciona; `@zxcvbn-ts/core` es el upgrade recomendado)

---

## Fase 2.5 — CI/CD y Despliegue en VPS — EN PROGRESO

### Completado
- [x] Vitest configurado (jsdom, jest-dom, path aliases)
- [x] GitHub Actions CI: typecheck + lint + vitest + build
- [x] Playwright E2E: chromium, tests landing + auth + checkout
- [x] axe-core WCAG 2.1 AA en CI (4 páginas)
- [x] RLS isolation test automatizado en CI workflow
- [x] `.gitignore` revisado (incluye `.env*`, `docker/output/`, `.env.production`)

### Pendiente — VPS Setup
- [ ] `output: 'standalone'` en `next.config.js`
- [ ] `Dockerfile` multi-stage (ver `DEPLOY.md §4`)
- [ ] `docker-compose.yml` completo (app + postgres + redis + meilisearch + nginx + certbot) — ver `DEPLOY.md §5`
- [ ] `nginx/conf.d/medicamentum.conf` con proxy_buffering off + rate limiting + SSL — ver `DEPLOY.md §6`
- [ ] `app/api/health/route.ts` — health check endpoint
- [ ] Provisionar VPS (recomendado: Hetzner CX22 — 2 vCPU, 4 GB, €5.77/mes)
- [ ] Setup VPS: Docker, UFW, usuario deploy, SSH keys — ver `DEPLOY.md §12`
- [ ] GitHub Actions deploy workflow (SSH) — ver `DEPLOY.md §8`
- [ ] Secrets en GitHub: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- [ ] `.env.production` en VPS con todos los valores reales
- [ ] SSL Let's Encrypt (primer setup) — ver `DEPLOY.md §11`
- [ ] Migración inicial en VPS: `npx prisma migrate deploy`
- [ ] Configurar Cloudflare R2 (crear bucket, API keys)
- [ ] `lib/storage/client.ts` con AWS S3 SDK — ver `BACKEND.md §10`
- [ ] Backups automáticos de Postgres — ver `DEPLOY.md §10`
- [ ] UptimeRobot apuntando a `https://medicamentum360.com/api/health`
- [ ] Google Cloud Console: redirect URI actualizado al dominio VPS
- [ ] Verificar RSC streaming (Nginx proxy_buffering off)
- [ ] Redeploy final verificando auth + DB + storage funcionan

---

## Fase 3 — Marketplace y Detalle de Producto ✅ COMPLETA

- [x] Página `/productos` con filtros, buscador, tabs de categoría
- [x] ProductCard con badge, rating, precio con descuento
- [x] SkeletonCard + SkeletonGrid
- [x] Página `/productos/[slug]` con layout 2 columnas
- [x] Breadcrumb, ProductInfoPanel sticky, ProductReviews, RelatedProducts
- [x] Server Actions: `getProducts`, `getProductBySlug`, `getRelatedProducts`
- [x] Meilisearch (`lib/meili.ts`) con fallback a DB
- [x] Infinite scroll (IntersectionObserver)
- [x] Visor 3D R3F (React Three Fiber + Drei + OrbitControls)
- [x] Search bar en NavBar para marketplace
- [x] Sort dropdown personalizado
- [x] Seed script con 9 productos de ejemplo

**Nota para VPS:** Meilisearch corre en Docker en el mismo VPS. `MEILI_HOST=http://meilisearch:7700` (red Docker interna).

---

## Fase 4 — Carrito y Checkout (Wompi)
- [ ] No iniciada (bloqueada por Fase 2.5 VPS)

## Fase 5 — Dashboard del Estudiante
- [ ] No iniciada

## Fase 6 — Integración Moodle
- [ ] No iniciada

## Fase 7 — Panel de Organización (hospital_admin)
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

## Hallazgos resueltos en migración a VPS (2026-06-22)

### Cambio de infraestructura: InsForge + Vercel → VPS propio

**Problema:** InsForge no exponía conexión TCP directa a Postgres (solo accesible desde red interna InsForge), requería su propio SDK para runtime, y su CLI para migraciones. Vercel añadía costos variables y limitaciones de serverless (timeouts, cold starts). El proyecto necesita control total de la infraestructura.

**Solución:** migración a stack completamente auto-alojado en VPS:

| Componente anterior | Reemplazo |
|---|---|
| Vercel (hosting Next.js) | VPS + Docker (Next.js standalone) + Nginx |
| InsForge Postgres | Postgres 16 en Docker (mismo VPS) |
| `@insforge/sdk` `createAdminClient` | Prisma 7 con `@prisma/adapter-pg` (TCP directo) |
| `npx @insforge/cli db query` (migraciones) | `npx prisma migrate deploy` |
| InsForge Storage | Cloudflare R2 (SDK AWS S3 compatible) |
| Bridge JWT `/api/insforge-token` | Eliminado (no necesario con Prisma + RLS directo) |
| Pooler InsForge PgBouncer | `pg.Pool` con `max: 10` en `lib/prisma.ts` |
| Vercel Preview Deployments | Branch deploys via GitHub Actions (staging en VPS) |
| Vercel env vars | `/opt/medicamentum360/.env.production` en VPS |

**Archivos actualizados:**
- `TRD.md` → v2.0 (arquitectura VPS)
- `BACKEND.md` → v2.0 (storage R2, health check, migraciones)
- `AGENTS.md` → v2.0 (contextos VPS, elimina InsForge)
- `PLAN.md` → v3.0 (Fase 2.5 VPS, desviaciones)
- `DEPLOY.md` → NUEVO (guía completa de infraestructura VPS)

**Código que debe actualizarse en el repo:**
1. `next.config.js` — agregar `output: 'standalone'`
2. Crear `Dockerfile` (multi-stage) y `docker-compose.yml`
3. Crear `nginx/conf.d/medicamentum.conf`
4. Crear `app/api/health/route.ts`
5. Crear `lib/storage/client.ts` (reemplaza InsForge Storage)
6. Actualizar route handlers de upload (`app/api/admin/upload/*/route.ts`) para usar `lib/storage/client.ts`
7. Crear `.github/workflows/deploy.yml` (SSH al VPS)
8. Eliminar bridge JWT route `/api/insforge-token` (ya no necesario)
9. `lib/prisma.ts` — ajustar `pg.Pool` config (max, idle timeout)
