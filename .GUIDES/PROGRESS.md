# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-22 (post-limpieza InsForge/Vercel)

---

## Resumen ejecutivo

| Fase | Estado |
|---|---|
| Fase 1 — Fundaciones | ✅ COMPLETA |
| Fase 2 — Landing + Auth | ✅ COMPLETA |
| Fase 2.5 — CI/CD + VPS | ~EN PROGRESO (CI local listo, limpieza pendiente) |
| Fase 3 — Marketplace | ✅ COMPLETA |
| Fase 4-13 | ⬜ No iniciadas |

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

## Fase 4 — Carrito + Checkout (Wompi) — ⬜ No iniciada
**Bloqueante:** Fase 2.5 completa (VPS + RLS validado)

- [ ] Carrito popover (persistencia guest + merge al login)
- [ ] Checkout con datos DIAN, widget Wompi
- [ ] Webhook HMAC + idempotencia (`/api/webhooks/wompi`)
- [ ] Pantalla éxito + email confirmación (Brevo)
- [ ] Cupones/descuentos
- [ ] Tabla `employee_assignments`
- [ ] Historial de órdenes

---

## Fase 5-13 — ⬜ No iniciadas

*(sin cambios respecto al PLAN.md actual)*

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
