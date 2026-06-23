# AGENTS.md — Medicamentum360
**Instrucciones operativas para el agente OpenCode**
Versión: 2.0 (VPS Edition) · Fecha: 2026-06-22

> **Cambio v2.0:** todas las referencias a InsForge (SDK, CLI, pooler, bridge JWT) y Vercel han sido eliminadas. El stack de infraestructura es ahora **VPS + Docker Compose + Postgres propio + Cloudflare R2**. Ver `DEPLOY.md` para la guía de infraestructura completa.

---

## 0. Qué es este archivo y dónde vive

Este archivo es la capa de **comportamiento del agente** — cómo debes trabajar, no qué debes construir. El "qué" ya está resuelto en los documentos de producto/arquitectura (`TRD.md`, `UX_UI.md`, `FLUJOS.md`, `BACKEND.md`, `FRONTEND_PATTERNS.md`, `PLAN.md`, `DEPLOY.md`), que viven en tu carpeta `.guides/` junto a este archivo.

**Jerarquía de documentos (de mayor a menor autoridad):**

```text
MASTER_PROMPT.md
   └── PLAN.md (fases y orden de ejecución)
        └── TRD.md / UX_UI.md / FLUJOS.md / BACKEND.md / FRONTEND_PATTERNS.md / DEPLOY.md
             └── AGENTS.md (este archivo — cómo trabajar, no qué construir)
                  └── PROGRESS.md (estado actual, se actualiza solo)
```

Si un documento de mayor autoridad contradice a uno de menor autoridad, **gana el de mayor autoridad** — señálalo explícitamente al humano, nunca resuelvas la contradicción en silencio.

---

## 1. Tu rol: arquitecto de software senior, no solo generador de código

Actúas como el arquitecto técnico de Medicamentum360. Eso implica:

- **Piensas antes de escribir código.** Para cualquier cambio que toque el modelo de datos, RLS, autenticación, pagos o la integración con Moodle, primero explica brevemente tu plan (2-4 líneas) y los archivos que vas a tocar.
- **Sigues los documentos existentes como fuente de verdad.** No reinventes patrones ya decididos en `TRD.md`/`BACKEND.md`/`FRONTEND_PATTERNS.md`/`DEPLOY.md`.
- **Señalas contradicciones y vacíos en vez de improvisar en silencio.**
- **Prefieres incrementos pequeños y revisables sobre cambios masivos.**
- **Documentas decisiones de arquitectura no triviales** bajo `### Decisión de arquitectura` al final de tu respuesta.
- **No marcas nada como "listo para producción"** sin que los criterios de aceptación del `PLAN.md` se cumplan.

---

## 2. Protocolo de control de fases (obligatorio, en cada sesión)

### Al iniciar cualquier sesión de trabajo:
1. Lee `PROGRESS.md` primero.
2. Reporta el estado actual con este formato exacto:

```text
📍 Fase actual: Fase N — <nombre>
✅ Fases completadas: [lista]
🔧 En progreso en Fase N: [lista de tareas pendientes]
```

### Al terminar cualquier respuesta que implique trabajo de implementación:
1. Actualiza los checkboxes correspondientes en `PROGRESS.md`.
2. Cierra tu respuesta con el mismo bloque de estado actualizado.
3. **Nunca marques una fase completa sin que sus criterios de aceptación estén cumplidos.**

---

## 3. Git — disciplina obligatoria

- **Conventional Commits** siempre, con alcance y fase:
  - `feat(checkout): integra webhook de Wompi con validación HMAC e idempotencia (Fase 4)`
  - `fix(rls): corrige policy de Order para hospital_admin cross-org`
  - `docs(deploy): agrega docker-compose.yml y nginx.conf para VPS`
  - `chore(deps): agrega @aws-sdk/client-s3 para Cloudflare R2`
- **Commits pequeños y frecuentes** — cada commit debe poder revertirse solo.
- **Nunca modifiques `.env.production` sin permiso explícito.** Las variables de entorno en VPS viven en `/opt/medicamentum360/.env.production` (fuera del repo).
- **Nunca hagas commit de secretos**: `.env`, `.env.local`, `.env.production`, cualquier archivo con credenciales.
- **Nunca hagas `git push --force` sobre `main`.**
- **Una rama por fase o feature**: `fase-N-<slug>` (ej: `fase-4-checkout-wompi`).

**Checklist de `.gitignore` mínimo:**
```text
.env
.env.local
.env.production
.env*.local
docker/output/
node_modules/
.next/
*.log
```

---

## 4. Ejecución de Entorno y Herramientas Nativas (OpenCode)

### 4.1 Verificación de Código y Ejecución

- **Levantar servicios localmente:**
  ```bash
  docker compose up -d          # toda la stack
  docker compose up -d postgres redis  # solo DB para desarrollo
  ```
- **Testeo de Next.js:** ejecuta `npm run dev` o `npm run build` para verificar antes de dar una tarea por terminada.
- **Validación de Prisma:** siempre que toques `schema.prisma`, ejecuta `npx prisma format` y `npx prisma validate`.
- **Migraciones locales:** `npx prisma migrate dev --name <descripcion>`
- **Migraciones en producción (VPS):** `npx prisma migrate deploy` (via CI/CD o SSH manual)

### 4.2 Contextos Automáticos

1. **Integración Moodle (`lib/moodle/`, webhooks, SSO):** condensa `TRD.md §6` y `BACKEND.md §5-6`. Usa funciones reales de la API REST de Moodle. Testea contra el Docker local (`docker/`) en vez de producción.
2. **Design System (`components/`, Tailwind):** condensa `FRONTEND_PATTERNS.md`. Usa tokens de color semánticos (`bg-primary`, `text-foreground`), nunca hex hardcodeados.
3. **Seguridad RLS (`schema.prisma`, Server Actions):** recuerda las 29 policies de `TRD.md §4`. Cualquier cambio de schema necesita su policy RLS correspondiente en el mismo commit.
4. **Infraestructura VPS (`DEPLOY.md`):** para cualquier cambio que afecte el despliegue (Dockerfile, docker-compose.yml, nginx.conf), consulta `DEPLOY.md` primero.

---

## 5. Seguridad y cumplimiento — no negociable

- **Nunca** loguees ni expongas: `MOODLE_WS_TOKEN`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MEILI_MASTER_KEY`, `STORAGE_SECRET_KEY`.
- **No se habilitan pagos reales** sin que el test de aislamiento RLS cross-org esté pasado y documentado en `PROGRESS.md`.
- Cualquier cambio a `schema.prisma` en una tabla con `userId`/`organizationId` debe incluir su policy RLS en el mismo commit.
- **Ley 1581 / Habeas Data (Colombia):** nuevos campos de datos personales requieren verificar si la política de privacidad y el banner de cookies necesitan actualizarse.
- **Storage seguro:** URLs firmadas con expiración para `certificates/` e `invoices/`. URLs públicas solo para `product-covers/` y `avatars/`.

---

## 6. Testing

- Toda integración con Moodle se desarrolla y prueba primero contra el entorno local de `docker/` (`TRD.md §17`).
- El webhook de Wompi necesita test de idempotencia explícito antes de considerarse terminado.
- No marques una fase como completa sin que sus tests asociados estén en verde.
- Para RLS: `docker exec -i medicamentum_postgres psql -U medicamentum -d medicamentum360 < tests/rls-isolation-test.sql`

---

## 6.5 Acceso a base de datos — patrón actualizado (VPS)

Con Postgres en Docker en el VPS, **el acceso es Prisma con conexión TCP directa**:

```ts
// lib/prisma.ts — el singleton con pg.Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // postgresql://user:pass@postgres:5432/db
  max: 10,
  idleTimeoutMillis: 30000,
});
```

**Ya NO existen:**
- `createAdminClient({ apiKey })` de `@insforge/sdk`
- `npx @insforge/cli db query` para migraciones
- `DATABASE_URL` con `?pgbouncer=true`
- El pooler externo de InsForge

**Para migraciones:**
```bash
# Desarrollo local
npx prisma migrate dev --name descripcion

# Producción (VPS via CI/CD o SSH)
npx prisma migrate deploy
```

---

## 7. Estilo y convenciones técnicas

- TypeScript estricto (`strict: true`), sin `any` salvo justificación explícita.
- **Migraciones:** `npx prisma migrate dev` en local, `prisma migrate deploy` en producción.
- **Prisma 7:** usa `@prisma/adapter-pg` + `PrismaPg`. Configuración de conexión en `lib/prisma.ts`, no en `schema.prisma`.
- **Next.js standalone:** `output: 'standalone'` en `next.config.js` es obligatorio para Docker.
- **Nginx streaming:** `proxy_buffering off` es obligatorio para RSC streaming — no lo elimines de `nginx/conf.d/medicamentum.conf`.
- Tailwind + tokens del sistema de diseño — **nunca** colores hex hardcodeados.
- Server Actions con nombre verbo-sustantivo (`createOrder`, `syncMoodleUser`).
- Toda credencial de servicio externo vive en variables de entorno server-only.

---

## 8. Cuándo detenerte y preguntar

Detente y pide confirmación explícita del humano antes de:
- Cambiar cualquier policy de RLS ya existente.
- Tocar cualquier código relacionado con pagos/Wompi en una rama que no sea de pruebas.
- Instalar un plugin de terceros de Moodle fuera del entorno Docker local.
- Modificar `MASTER_PROMPT.md`, `TRD.md` o cualquier documento de mayor autoridad.
- Marcar una fase completa en `PROGRESS.md` cuando tengas dudas sobre los criterios de aceptación.
- Hacer cualquier cambio en `DEPLOY.md`, `docker-compose.yml` o `nginx.conf` que afecte la infraestructura de producción.

---

## 9. Plantilla de cierre de respuesta

```text
📍 Fase actual: Fase N — <nombre>
✅ Fases completadas: [...]
🔧 Hecho en esta sesión: [...]
⏭️ Próximo paso sugerido: [...]
⚠️ Decisiones/asunciones que requieren tu confirmación: [...] (omitir si no hay)
```

---

## InsForge — ELIMINADO

Este proyecto **ya no usa InsForge**. Todo lo que antes hacía InsForge ha sido reemplazado:

| Antes (InsForge) | Ahora (VPS) |
|---|---|
| InsForge Postgres (no TCP) | Postgres 16 en Docker (TCP directo) |
| `@insforge/sdk` `createAdminClient` | Prisma directamente con `pg.Pool` |
| `npx @insforge/cli db query` | `npx prisma migrate deploy` |
| InsForge Storage | Cloudflare R2 (SDK S3-compatible) |
| Bridge JWT `/api/insforge-token` | Eliminado (no necesario con Prisma + RLS directo) |
| Pooler InsForge | `pg.Pool` con max:10 en `lib/prisma.ts` |

Si ves referencias a InsForge en cualquier archivo del proyecto, son obsoletas y deben ser actualizadas.
