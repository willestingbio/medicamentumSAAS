# AGENTS.md — Medicamentum360
**Instrucciones operativas para el agente OpenCode**
Versión: 3.0 (Creator Suite Edition) · Fecha: 2026-06-24

> **Cambio v2.0:** todas las referencias a InsForge (SDK, CLI, pooler, bridge JWT) y Vercel han sido eliminadas. El stack de infraestructura es ahora **VPS + Docker Compose + Postgres propio + Cloudflare R2**. Ver `DEPLOY.md` para la guía de infraestructura completa.

> **Cambio v3.0:** se añade la **Fase 6.5 — Course Builder & Multi-Vendor Marketplace** (ver `PLAN.md`): un creador de cursos completo (módulos, lecciones, video con Cloudflare Stream, quizzes propios, certificación) y la apertura del marketplace a vendedores externos (instructores y estudios VR) con su propio panel de creación, métricas y cobro de comisión. Se añade además la **§2.5 — Protocolo de variables de entorno**, de cumplimiento obligatorio: ningún archivo `.env*` se sobrescribe, trunca o regenera sin confirmación explícita del humano en esa misma sesión.

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

**Nota sobre el Course Builder (Fase 6.5):** todo lo referente al creador de cursos, la integración real (y limitada) con Moodle, y el marketplace multi-vendor vive primero en `TRD.md §19-21` y `BACKEND.md §15-18` (arquitectura/datos/lógica de negocio) y en `UX_UI.md §3.10-3.14` + `FLUJOS.md §13-18` (experiencia/flujos). Este archivo solo añade las reglas de *cómo trabajar* sobre esos documentos — no las repite.

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

## 2.5. Protocolo de variables de entorno — regla no negociable

> Esta sección existe porque ya ha pasado: un agente "limpiando" o "regenerando" el entorno sobrescribió un `.env.local` que tenía credenciales reales puestas a mano, y se perdieron sin commit ni backup. **No vuelve a pasar.**

### 2.5.1 Regla absoluta

**Nunca ejecutes una operación que trunque, sobrescriba o regenere por completo `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.production.example`, o cualquier archivo que matchee `.env*`, sin que el humano lo haya confirmado explícitamente en el turno actual de la conversación.** Esto incluye, sin limitarse a:
- `echo "..." > .env.local` o cualquier redirección `>` (truncante) sobre un archivo `.env*` existente.
- `cp .env.example .env.local` cuando `.env.local` ya existe.
- Borrar el archivo y recrearlo "limpio".
- Cualquier script de setup/scaffolding que regenere variables de entorno como efecto secundario (ej. `create-next-app`, codegen de un ORM, un wizard de Sentry/Stripe/etc.) ejecutado sobre un directorio donde ya existe un `.env*`.
- Pedirle a un comando de terceros (CLI de Prisma, Better Auth, Sentry wizard, etc.) que "inicialice" el proyecto si eso puede tocar el `.env`.

### 2.5.2 Qué hacer en su lugar

1. **Antes de tocar cualquier `.env*`:** ejecuta `cat .env.local` (o el archivo relevante) para ver qué hay. Si el archivo existe y tiene contenido, asume que es real y valioso hasta que se demuestre lo contrario.
2. **Si necesitas añadir una variable nueva** (por ejemplo, `CLOUDFLARE_STREAM_API_TOKEN` al integrar el Course Builder): usa `str_replace`/edición dirigida para **añadir la línea nueva al final o en la sección correspondiente**, nunca reescribas el archivo completo. Si la herramienta de edición no soporta "append" seguro, propón el diff exacto (qué línea se añade) y pide confirmación antes de aplicarlo.
3. **Si una variable ya existe pero con un valor placeholder/vacío:** señálalo al humano ("Veo que `STORAGE_BUCKET` está vacío, ¿la completas tú o quieres que ponga un valor de desarrollo?") — no lo sobrescribas por iniciativa propia.
4. **Si el cambio requiere reestructurar el archivo** (reordenar secciones, etc.): muestra el diff completo *antes* de aplicarlo y espera confirmación explícita. No asumas que "se ve mejor así" es suficiente justificación.
5. **`.env.local.example` y `.env.production.example` SÍ son seguros de regenerar** porque son plantillas sin secretos reales — pero incluso ahí, prefiere editar incrementalmente para no perder comentarios o variables que el equipo añadió manualmente y que tú no conoces el propósito de.
6. **Si detectas que el `.gitignore` no cubre algún `.env*` nuevo** (por ejemplo, si se añade `.env.staging`), añádelo al `.gitignore` pero nunca como excusa para tocar el contenido del `.env*` en sí.

### 2.5.3 Al añadir una integración nueva (ej. Cloudflare Stream, nuevo proveedor de pagos)

Cuando una fase requiera una variable de entorno nueva:
1. Documenta la variable nueva en `BACKEND.md §11` / `TRD.md §15` / `DEPLOY.md §7` (referencia completa de env vars) — eso es lo que mantienes actualizado, no el `.env.local` real del humano.
2. En tu respuesta al humano, lista explícitamente qué variable(s) nueva(s) necesita añadir y dónde, por ejemplo:
   ```text
   ⚠️ Variable de entorno nueva requerida (no la añadí yo, agrégala tú):
   CLOUDFLARE_STREAM_API_TOKEN=...
   CLOUDFLARE_STREAM_ACCOUNT_ID=...
   ```
3. Solo si el humano responde explícitamente "agrégala tú" o equivalente, usas edición incremental (nunca sobrescritura) sobre el `.env.local` real.

---

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

1. **Integración Moodle (`lib/moodle/`, webhooks, SSO):** condensa `TRD.md §6` y `BACKEND.md §5-6`. Usa funciones reales de la API REST de Moodle. Testea contra el Docker local (`docker/`) en vez de producción. **Recuerda la limitación documentada en `TRD.md §19.1`: la Web Service API de Moodle no expone funciones core para crear secciones, recursos o quizzes dentro de un curso — solo crear/editar el curso en sí, categorías, usuarios e inscripciones.** Por eso el contenido del curso (módulos, lecciones, video, quizzes) vive en Postgres propio (`TRD.md §19`), y Moodle se usa solo como motor de inscripción/progreso/SSO. No intentes "resolver" esa limitación escribiendo un plugin de Moodle a menos que el humano lo pida explícitamente — está fuera de alcance de este proyecto.
2. **Design System (`components/`, Tailwind):** condensa `FRONTEND_PATTERNS.md`. Usa tokens de color semánticos (`bg-primary`, `text-foreground`), nunca hex hardcodeados.
3. **Seguridad RLS (`schema.prisma`, Server Actions):** recuerda las policies de `TRD.md §4` (29 + las nuevas de `TRD.md §19-20` para `Course`, `Module`, `Lesson`, `Quiz`, `VendorAccount`, `Payout`). Cualquier cambio de schema necesita su policy RLS correspondiente en el mismo commit.
4. **Infraestructura VPS (`DEPLOY.md`):** para cualquier cambio que afecte el despliegue (Dockerfile, docker-compose.yml, nginx.conf), consulta `DEPLOY.md` primero.
5. **Course Builder (`app/instructor/`, `lib/actions/course-builder.ts`, `lib/video/`):** condensa `TRD.md §19`, `BACKEND.md §15-17`, `UX_UI.md §3.11-3.12`, `FLUJOS.md §13-15`. Cualquier endpoint que reciba un upload de video debe usar el flujo de Cloudflare Stream Direct Upload (`BACKEND.md §16`) — nunca subir el archivo de video completo al propio servidor Next.js ni a R2 directamente (R2 sigue siendo para PDFs/imágenes/modelos 3D, no para video).
6. **Marketplace multi-vendor (`app/vender/`, `lib/actions/vendor.ts`):** condensa `TRD.md §20`, `BACKEND.md §18`, `FLUJOS.md §16-17`. Todo producto creado por un `vendor` externo (no `super_admin`) entra en estado `pending_review` y requiere aprobación antes de `published: true` — nunca publiques automáticamente contenido de terceros.

---

## 5. Seguridad y cumplimiento — no negociable

- **Nunca** loguees ni expongas: `MOODLE_WS_TOKEN`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `BETTER_AUTH_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MEILI_MASTER_KEY`, `STORAGE_SECRET_KEY`, `CLOUDFLARE_STREAM_API_TOKEN`, `WOMPI_VENDOR_PAYOUT_KEY`.
- **No se habilitan pagos reales** sin que el test de aislamiento RLS cross-org esté pasado y documentado en `PROGRESS.md`.
- Cualquier cambio a `schema.prisma` en una tabla con `userId`/`organizationId`/`vendorId` debe incluir su policy RLS en el mismo commit.
- **Ley 1581 / Habeas Data (Colombia):** nuevos campos de datos personales requieren verificar si la política de privacidad y el banner de cookies necesitan actualizarse. Esto aplica también a los datos fiscales/bancarios que un `vendor` sube en su onboarding (`TRD.md §20.2`).
- **Storage seguro:** URLs firmadas con expiración para `certificates/` e `invoices/`. URLs públicas solo para `product-covers/` y `avatars/`. **El video de las lecciones nunca se sirve como archivo descargable** — siempre vía manifiesto HLS firmado de Cloudflare Stream (`BACKEND.md §16`), con `requireSignedURLs: true` y `allowedOrigins` restringido al dominio de producción.
- **Multi-vendor:** ningún producto de un `vendor` externo se publica automáticamente. Pasa siempre por `pending_review` → revisión de `super_admin` → `published`. Ver `FLUJOS.md §16`.

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
- **Sobrescribir, truncar o regenerar cualquier archivo `.env*` existente** (ver §2.5 — esta es la regla más estricta del documento, no tiene excepciones implícitas).
- Cambiar el porcentaje de comisión del marketplace (`TRD.md §20.3`) o la lógica de cálculo de payouts a vendedores.
- Habilitar el primer payout real a un vendor antes de que el flujo de KYC/datos fiscales (`FLUJOS.md §16`) esté completo y probado.
- Aprobar/publicar automáticamente contenido de un `vendor` externo sin paso de revisión humana.

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

---

## Course Builder y Marketplace Multi-Vendor — NUEVO en v3.0

Esto **no** reemplaza nada existente — se añade encima del marketplace y la integración Moodle ya construidos. Resumen para orientarte rápido (el detalle completo vive en `TRD.md §19-21`, `BACKEND.md §15-18`, `UX_UI.md §3.10-3.14`, `FLUJOS.md §13-18`):

| Pieza | Qué es | Dónde está documentado |
|---|---|---|
| Panel de instructor (`/instructor`) | Crear/editar cursos: módulos, lecciones, video, quizzes, recursos descargables, certificación | `UX_UI.md §3.11` |
| Motor de quizzes propio | Vive en Postgres, NO en Moodle (la API de Moodle no soporta crear quizzes) | `TRD.md §19.1` |
| Video | Cloudflare Stream (no R2) — upload directo desde el navegador, HLS firmado | `BACKEND.md §16` |
| Marketplace multi-vendor (`/vender`) | Instructores y estudios VR externos pueden vender en el marketplace, con revisión previa | `TRD.md §20`, `FLUJOS.md §16` |
| Comisión y payouts | % de comisión configurable, payout vía Wompi a cuenta del vendor | `TRD.md §20.3`, `BACKEND.md §18` |

Si te piden trabajar en "el creador de cursos" o "que la gente venda en el marketplace", empieza por esos documentos — no improvises el modelo de datos ni la integración de video desde cero.
