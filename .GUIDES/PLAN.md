# PLAN — Medicamentum360
**Plan de desarrollo fasado — v3.0 (VPS Edition)**
Versión: 3.0 · Fecha: 2026-06-22 · Reemplaza v2.1

> **Cambio v3.0 vs v2.1:** se reemplaza toda la infraestructura de Vercel + InsForge por **VPS propio con Docker Compose**. Los cambios afectan principalmente la Fase 2.5 (CI/CD) y el §0. Las fases de producto (1–13) permanecen idénticas en funcionalidad. Ver `DEPLOY.md` para la guía completa de infraestructura VPS.

---

## §0. Cambios respecto a v2.1

1. **InsForge eliminado.** `@insforge/sdk`, `npx @insforge/cli`, y el pooler de InsForge ya no existen en este proyecto. Postgres corre en Docker en el VPS con acceso TCP directo. Storage es Cloudflare R2 (SDK S3-compatible). Ver `AGENTS.md §6.5` para la tabla de equivalencias completa.
2. **Vercel eliminado.** El despliegue es a VPS via GitHub Actions + SSH. El CI/CD de Fase 2.5 se actualizó en consecuencia.
3. **`next.config.js` requiere `output: 'standalone'`** para que el build Next.js funcione en Docker.
4. **Migraciones simplificadas.** Con Postgres propio y TCP directo, se usa `npx prisma migrate deploy` estándar — sin InsForge CLI.
5. **Nginx reemplaza Vercel Edge.** Rate limiting, streaming RSC, SSL y static files son responsabilidad de Nginx en el VPS. Configuración en `DEPLOY.md §6`.
6. **Todo lo demás (v2.1 §0 ítems 2-5) sigue aplicando.** `@zxcvbn-ts/core`, pooling de Prisma, ShadCN components, etc.

---

## §1. Convenciones de este documento


- Las fases están numeradas limpiamente. `PROGRESS.md` usa esta numeración.
- `[ ]` no iniciada · `[~]` en progreso · `[x]` completa y verificada.

---

## Fase 1 — Fundaciones — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md` para el detalle completo.)*

---

## Fase 2 — Landing, Navegación y Autenticación — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md` para el detalle completo.)*

---

## Fase 2.5 — CI/CD, Seguridad de Repositorio y Despliegue en VPS

**Estado actual:** parcialmente completado (CI local). Falta conectar con VPS real.

### Ya completado (de `PROGRESS.md`)
- [x] Vitest configurado + GitHub Actions CI (typecheck + lint + vitest + build)
- [x] Playwright E2E configurado
- [x] axe-core WCAG 2.1 AA en CI
- [x] RLS isolation test automatizado en CI
- [x] `.gitignore` revisado

### Pendiente (actualizado para VPS)

- [x] **Eliminar archivos obsoletos** — `vercel.json`, `insforge.toml`, `.insforge/`, `.vercel/`, `app/api/insforge-token/`, `app/api/debug/` ✅
- [x] **Limpiar `.env.local.example`** — eliminar referencias a InsForge ✅
- [x] **Fix `lib/prisma.ts`** — usar `pg.Pool({ max: 10 })` con param queries ✅
- [x] **Fix `lib/rate-limit.ts`** — limpieza periódica de entries expirados ✅
- [x] **Fix `app/api/test/rls-isolation/route.ts`** — eliminar refs a InsForge ✅
- [x] **Fix `.github/workflows/rls-test.yml`** — reescribir para Postgres Docker ✅
- [x] **Crear `app/api/health/route.ts`** — health check con DB verification ✅
- [x] **Crear `lib/storage/client.ts`** — Cloudflare R2 (S3-compatible) ✅
- [x] **`output: 'standalone'`** en `next.config.ts` ✅
- [ ] **Dockerfile multi-stage** (ver `DEPLOY.md §4`) — crear y probar localmente
- [ ] **`docker-compose.yml`** con todos los servicios (app, postgres, redis, meilisearch, nginx, certbot) — ver `DEPLOY.md §5`
- [ ] **Nginx config** con proxy_buffering off, rate limiting, SSL — ver `DEPLOY.md §6`
- [ ] **Provisionar VPS** (Hetzner / Contabo / DigitalOcean — mínimo 2 vCPU, 4 GB RAM, Ubuntu 24.04)
- [ ] **Setup inicial del VPS** (Docker, firewall UFW, usuario deploy, SSH keys) — ver `DEPLOY.md §12`
- [ ] **GitHub Actions deploy workflow** (SSH deploy) — ver `DEPLOY.md §8`
- [ ] **Secrets en GitHub repo:**
  - `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- [ ] **Variables de entorno en VPS** (`/opt/medicamentum360/.env.production`):
  - `DATABASE_URL`, `DIRECT_URL` (Postgres Docker)
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (dominio real VPS)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `MOODLE_WS_TOKEN`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`
  - `REDIS_PASSWORD`, `MEILI_MASTER_KEY`
  - `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` (Cloudflare R2)
  - `BREVO_API_KEY`
- [ ] **SSL con Let's Encrypt** (primer setup) — ver `DEPLOY.md §11`
- [ ] **Health check endpoint** `GET /api/health` — ver `BACKEND.md §3`
- [ ] **Backups de Postgres** (cron diario) — ver `DEPLOY.md §10`
- [ ] **UptimeRobot** apuntando a `https://medicamentum360.com/api/health`
- [ ] **Verificar `BETTER_AUTH_URL`** apunta al dominio VPS real
- [ ] **Google Cloud Console:** redirect URI = `https://<dominio-vps>/api/auth/callback/google`
- [ ] **Migración inicial en producción:** `npx prisma migrate deploy` (via SSH o CI/CD)
- [ ] **Verificar RSC streaming:** Nginx `proxy_buffering off` activo

### Diagnóstico rápido si el login falla en VPS pero funciona en local

1. **¿Error en logs del contenedor?** `docker compose logs -f app` — buscar timeout de DB o conexión rechazada → verificar `DATABASE_URL` apunta a `postgres:5432` (nombre del servicio Docker), no a `localhost`.
2. **¿Solo falla Google OAuth?** → `redirect_uri_mismatch`, verificar Google Cloud Console con el dominio VPS real.
3. **¿Las variables están en `.env.production`?** → `cat /opt/medicamentum360/.env.production` (en VPS) y verificar que el contenedor las está leyendo: `docker compose run --rm app env | grep BETTER_AUTH`.
4. **¿Error 500 al crear usuario?** → sospecha de RLS bloqueando INSERT en `users`/`session`/`account` — conectar al Postgres directamente: `docker exec -it medicamentum_postgres psql -U medicamentum -d medicamentum360`.
5. **¿RSC no hace streaming?** → verificar `proxy_buffering off` en Nginx: `docker exec medicamentum_nginx nginx -T | grep buffering`.

---

## Fase 3 — Marketplace y Detalle de Producto — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md`.)*

---

## Fase 4 — Carrito, Checkout y Órdenes (Wompi)

**Bloqueante:** Fase 2.5 completa (VPS funcionando con RLS validado en CI).

- [ ] Carrito popover (persistencia guest + merge al login).
- [ ] Checkout con datos DIAN (NIT/CC), widget Wompi embebido.
- [ ] Webhook con HMAC + idempotencia (`/api/webhooks/wompi`).
  - **Nota VPS:** registrar el webhook en Wompi con el dominio real del VPS: `https://medicamentum360.com/api/webhooks/wompi`
- [ ] Pantalla de éxito + email de confirmación (Brevo).
- [ ] Cupones/descuentos.
- [ ] Tabla `employee_assignments`.
- [ ] Historial de órdenes (`/orders`).

---

## Fase 5 — Dashboard del Estudiante

- [ ] Grid: Mis Cursos, Calendario (+Google Calendar OAuth), Mis Certificados, Agenda del día.
- [ ] Mis Experiencias VR — lanzar experiencia + estado de "key activa".
- [ ] Generación de certificados (PDF) + compartir LinkedIn.
  - **Nota VPS:** los certificados PDF se suben a Cloudflare R2 bucket `certificates/` con URL firmada (no InsForge Storage).
- [ ] Perfil/Configuración: contraseña, 2FA.

---

## Fase 6 — Integración Moodle

- [ ] API REST: catálogo, progreso, calificaciones.
- [ ] Inscripción automática post-pago vía webhook de Wompi.
- [ ] SSO/autologin para "Continuar curso".
- [ ] Sync de notas vía cron (Inngest o cron job Docker).
- [ ] Desarrollar/probar todo contra Moodle local de `docker/`.

---

## Fase 7 — Panel de Organización (hospital_admin)

*(Sin cambios de funcionalidad respecto a v2.1.)*

---

## Fase 8 — Panel Super Admin

- [ ] CRUD de productos: crear curso, subir modelo 3D (upload a Cloudflare R2 `vr-assets/`).
- [ ] Gestión de hospitales/organizaciones.
- [ ] Panel de seguridad.
- [ ] Audit log de actividad administrativa.

---

## Fase 9 — Operaciones

*(Sin cambios.)*

---

## Fase 10 — Analíticas y Reportes

*(Sin cambios.)*

---

## Fase 11 — LMS Avanzado

*(Sin cambios.)*

---

## Fase 12 — Notificaciones

*(Sin cambios.)*

---

## Fase 13 — Pulido, SEO, Accesibilidad y Compliance Final

- [ ] Auditoría SEO/Lighthouse.
- [ ] WCAG AA final.
- [ ] PWA (offline para hospitales con baja conectividad) — en VPS, el service worker funciona igual.
- [ ] LTI 1.3 embebido.
- [ ] Facturación electrónica DIAN.
- [ ] **Escalar VPS si es necesario** — evaluar Redis Cluster o mover a k8s si el tráfico lo justifica.

---

## §12. Desviaciones de implementación vs. documentos previos

Añadir a las desviaciones ya documentadas en v2.1 §12:

6. **InsForge eliminado:** todo el código que usaba `@insforge/sdk` debe actualizarse a Prisma directo o `@aws-sdk` para storage. Ver `AGENTS.md §6.5` para la tabla de equivalencias.
7. **Vercel eliminado:** CI/CD ya no deploy a Vercel. GitHub Actions hace SSH deploy al VPS.
8. **`output: 'standalone'`** agregado a `next.config.js` — requerido para Docker.
9. **`DATABASE_URL` sin `?pgbouncer=true`** — con Postgres propio en Docker, la conexión es TCP directa.
10. **Bridge JWT `/api/insforge-token` eliminado** — ya no necesario.
11. **Archivos obsoletos eliminados del repo:** `vercel.json`, `insforge.toml`, `.insforge/`, `.vercel/`, `app/api/debug/`.
12. **`lib/prisma.ts` usa `pg.Pool({ max: 10 })`** — control explícito de conexiones a Postgres.

---

## Matriz de dependencias

```
Fase 1 ──► Fase 2 ──► Fase 2.5 (VPS) ──► Fase 3 ──► Fase 4 ──► Fase 5 ──┬─► Fase 6
                          │                              │                │
                          │ (bloquea pagos reales)       │                ▼
                          └──────────────────────────────┘            Fase 7 ──► Fase 8 ──► ... ──► Fase 13
```

---

## §13. Desviaciones adicionales (VPS)

Ver desviaciones en §0 y en `PROGRESS.md` por fase.
