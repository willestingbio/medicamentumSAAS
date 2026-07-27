# TRD — Medicamentum360
**Technical Requirements Document**
Versión: 3.1 · Fecha: 2026-06-26 · Añade modelo de compra corporativa (`EmployeeAssignment`), reembolsos y soporte (auditoría de huecos)
Stack actualizado a despliegue VPS auto-alojado — reemplaza referencias a Vercel e InsForge. Añade Course Builder propio y marketplace multi-vendor.

> **Cambio mayor v2.0:** la plataforma de hosting pasa de Vercel + InsForge a **VPS propio con Docker Compose**. La base de datos es ahora **Postgres gestionado en el mismo VPS** (o managed externo como Neon/Supabase si se prefiere). El storage de archivos es **Cloudflare R2 o MinIO**. Ver `DEPLOY.md` para la guía completa de infraestructura.

> **Cambio mayor v3.0:** se añade un **Course Builder propio** (§19) — instructores y `super_admin` crean cursos completos (módulos, lecciones, video, quizzes, recursos, certificación) directamente desde la plataforma, sin depender de la interfaz de administración de Moodle para el contenido. Se añade **Cloudflare Stream** (§19.4) como pieza de infraestructura para video protegido. Se añade el **Marketplace Multi-Vendor** (§20) — la plataforma se abre a instructores externos y estudios de VR que quieran vender sus propios cursos/experiencias, con comisión y payout (§20.3). Estos cambios son aditivos: no modifican el modelo de aislamiento RLS, la integración Wompi, ni el stack de hosting ya definidos en v2.0.

---

## 1. Arquitectura general

```
                     ┌─────────────────────────┐
                     │   medicamentum360.com    │
                     │  Next.js App Router (SSR/│
                     │  SSG público, RSC priv.) │
                     │  Docker — standalone mode│
                     │  + Course Builder (§19)  │
                     │  + Vendor Panel (§20)    │
                     └───────────┬──────────────┘
                                  │  Nginx (SSL, proxy, rate limit)
        ┌───────────────────────────────────────────────────┐
        │                          │                         │
┌───────▼────────┐       ┌─────────▼─────────┐    ┌────────▼───────────┐
│ Postgres        │       │  Server Actions /  │    │  Cloudflare R2     │
│ (Docker en VPS) │◄─────►│  Route Handlers    │───►│  (imágenes, PDFs,  │
│ Prisma ORM      │       │  (lógica de negocio│    │  certificados)     │
│ + Course/Module/│       │  + course-builder/  │    └────────────────────┘
│   Lesson/Quiz/  │       │    vendor actions)  │    ┌────────────────────┐
│   Vendor/Payout │       └─────────┬──────────┘    │  Cloudflare Stream  │
└─────────────────┘                 │                │  (video lecciones, │
                                     │                │   HLS firmado)     │
┌──────────────┬──────────────┬──────┴──────┬────────────┐ └─────────────────┘
│              │              │             │            │
┌──────▼──────┐ ┌──────▼──────┐ ┌───▼────┐ ┌───▼──────┐ ┌───▼────┐
│ Better Auth │ │  Wompi API  │ │ Moodle │ │Meili-    │ │ Brevo  │
│ (sesiones,  │ │  + Webhook  │ │ WS API │ │search    │ │ (email)│
│ Google OAuth)│ │  HMAC +    │ │ (solo  │ │(Docker)  │ │        │
│             │ │  payouts    │ │ enrol/ │ │          │ │        │
│             │ │  a vendors) │ │ SSO,   │ │          │ │        │
│             │ │             │ │ §19.1) │ │          │ │        │
└─────────────┘ └─────────────┘ └───┬────┘ └──────────┘ └────────┘
                                     │
                            ┌────────▼─────────┐
                            │ lms.medicamentum  │
                            │ 360.com (Moodle)  │
                            └───────────────────┘
```

### 1.1 Qué se despliega dónde

| Pieza | Dónde vive | Notas |
|---|---|---|
| Aplicación Next.js (páginas, Server Actions, Route Handlers, webhooks) | **VPS propio** — Docker container, modo standalone | Nginx como reverse proxy delante |
| Base de datos Postgres | **VPS propio** — Docker container con volumen persistente | O managed externo: Neon/Supabase/Railway |
| Storage (avatares, certificados, facturas, modelos VR) | **Cloudflare R2** (recomendado) o **MinIO** auto-alojado | API compatible con AWS S3 |
| Caché / rate limiting | **Redis** — Docker container | Rate limiting de Better Auth + caché de sesiones |
| Búsqueda | **Meilisearch** — Docker container | |
| Moodle (LMS) | `lms.medicamentum360.com` — VPS separado o mismo VPS con subdomain | Solo Docker local en desarrollo |

### 1.2 Por qué VPS en lugar de Vercel

- **Costo predecible:** VPS desde $5–20/mes vs. Vercel Pro con costos variables por función invocación
- **Sin límites de serverless:** Server Actions y webhooks corren como proceso Node.js persistente; no hay timeout de 10s ni cold starts
- **Control total:** logs, configuración de Nginx, firewall, backups propios
- **Sin vendor lock-in:** el código Next.js con `output: 'standalone'` corre en cualquier VPS
- **Postgres propio:** sin el modelo de InsForge (que no exponía conexión TCP directa y requería su propio SDK)

---

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 15 (App Router, standalone mode) | SSR/SSG público, Server Actions para mutaciones |
| DB | Postgres 16 (Docker en VPS) | Acceso vía Prisma ORM + conexión TCP directa |
| ORM | Prisma 7 (con `@prisma/adapter-pg`) | Migraciones con `prisma migrate deploy` |
| Seguridad de datos | Row Level Security (RLS) en Postgres | Aislamiento multi-tenant — obligatorio antes de pagos |
| Auth | Better Auth 1.6.20 | Email+password, Google OAuth, sesiones, roles |
| Caché / Rate Limit | Redis 7 (Docker) | Rate limiting de Better Auth, caché de sesiones |
| Pagos | Wompi | Webhook con validación HMAC-SHA256 |
| LMS | Moodle (headless) | `lms.medicamentum360.com`, API REST + SSO |
| Búsqueda | Meilisearch v1.13 (Docker) | Índice de catálogo de productos |
| Storage | Cloudflare R2 (o MinIO auto-alojado) | Avatares, portadas, certificados PDF, modelos glTF, recursos descargables |
| Video | Cloudflare Stream | Hosting, transcodificación adaptativa (HLS) y entrega protegida de video de lecciones — ver §19.4 |
| Email | Brevo | Transaccional |
| 3D/VR | React Three Fiber + Three.js + WebXR | Visor de preview |
| Reverse proxy | Nginx (Docker) | SSL, rate limiting, static files, streaming |
| SSL | Let's Encrypt + Certbot | Renovación automática vía Docker |
| Contenedores | Docker Compose | Orquestación en VPS único |
| CI/CD | GitHub Actions | Test + deploy automático via SSH al VPS |
| Analítica | GA4 / Posthog | A definir en Fase 10 |

---

## 3. Modelo de datos (Prisma — sin cambios respecto a v1.0)

El esquema Prisma es idéntico. La diferencia operativa es que las migraciones ahora corren con `npx prisma migrate deploy` directamente (Postgres expone conexión TCP estándar), sin necesidad del InsForge CLI.

```prisma
// datasource actualizado — conexión directa sin workarounds
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  directUrl         = env("DIRECT_URL")  // misma URL en VPS (sin pooler externo)
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

> El esquema completo de modelos (`User`, `Product`, `Order`, etc.) se mantiene igual que en TRD v1.0 §3. No se reproduce aquí para evitar divergencias — la fuente de verdad es `prisma/schema.prisma`.

### 3.1 `EmployeeAssignment` y el modelo de compra corporativa (B2B) — documentado por primera vez

> **Contexto de esta sección (auditoría 2026-06-26):** `EmployeeAssignment` ya existe como tabla en el schema Prisma real (creada en la Fase 4, ver `PROGRESS.md`), pero nunca tuvo una definición formal en este documento — TRD v1.0 nunca llegó a especificar el modelo de compra corporativa con el detalle suficiente. Esto generó un hueco real: no había ninguna Server Action, pantalla ni flujo que lo usara. Se documenta aquí el modelo conceptual correcto; **antes de migrar, compara esta definición contra el `EmployeeAssignment` real de `prisma/schema.prisma`** y señala cualquier diferencia — no asumas que coinciden campo a campo.

**El problema que resuelve:** un hospital (`Organization`) compra cupos de un curso para sus empleados — no es lo mismo que cada empleado comprando individualmente con su propia tarjeta. La compra la paga la organización (`Order.organizationId`, no solo `Order.userId`), pero el *acceso* se asigna a personas concretas.

```prisma
enum AssignmentStatus {
  active
  revoked   // el empleado fue removido de la organización, o el hospital_admin le quitó la asignación puntual
}

model EmployeeAssignment {
  id              String           @id @default(cuid())
  organizationId  String
  organization    Organization     @relation(fields: [organizationId], references: [id])
  userId          String
  user            User             @relation(fields: [userId], references: [id])
  courseId        String           // o productId, según cómo se modele en el schema real — verificar
  orderId         String           // la Order que pagó este cupo, para trazabilidad
  status          AssignmentStatus @default(active)
  assignedAt      DateTime         @default(now())
  assignedBy      String           // userId del hospital_admin que hizo la asignación
  revokedAt       DateTime?
  revokedBy       String?

  @@unique([organizationId, userId, courseId]) // un empleado no puede tener 2 asignaciones activas al mismo curso
  @@index([organizationId, status])
  @@index([userId])
}
```

**Flujo de negocio que esto habilita (ver `FLUJOS.md` para el detalle paso a paso):**
1. `hospital_admin` compra N cupos de un curso desde el marketplace — el checkout permite elegir cantidad y, en vez de `Order.userId` ser el único dueño del acceso, se crea una `Order` con `organizationId` y `quantity: N`.
2. Tras el pago, **no se crea automáticamente un `Enrollment` para nadie** — los N cupos quedan "sin asignar" hasta que el `hospital_admin` los reparte.
3. Desde `/org/employees`, el `hospital_admin` asigna cupos a empleados específicos → se crea un `EmployeeAssignment` + el `Enrollment` correspondiente para ese empleado.
4. Si quedan cupos sin asignar, se muestran como "N cupos disponibles sin asignar" en el panel — visibilidad explícita para que el hospital no pague por cupos que nunca usa.
5. Remover un empleado (`FLUJOS.md §10.1`) marca su `EmployeeAssignment` como `revoked`, liberando el cupo para reasignarlo a otra persona — **el cupo no se pierde**, solo cambia de dueño.

**RLS para `EmployeeAssignment`:** lectura/escritura restringida a `organizationId = get_user_org_id()` para `hospital_admin`, y a `super_admin` sin restricción — mismo patrón que el resto de tablas con `organizationId` (`TRD.md §4`).

> **Nota honesta:** este flujo de "comprar N cupos y asignarlos después" es el modelo correcto para B2B, pero **no estaba descrito así en ninguna versión anterior de `FLUJOS.md` §5 (compra) ni en el checkout actual** — el checkout documentado hoy asume una compra 1:1 (un usuario compra para sí mismo). Implementar la compra de cupos en lote para una organización es trabajo adicional real, no solo documentación — ver `PLAN.md` Fase 7 para dónde se prioriza este trabajo.

---

## 4. RLS y seguridad multi-tenant

Sin cambios respecto a TRD v1.0 §4. El aislamiento RLS funciona igual en Postgres propio.

**Cambio operativo:** con Postgres en Docker en el VPS, puedes conectarte directamente para verificar o correr tests RLS:
```bash
docker exec -it medicamentum_postgres psql -U medicamentum -d medicamentum360
```

Las 29 policies, los helpers `requesting_user_id()` y `get_user_org_id()`, y el bridge JWT de `PROGRESS.md` se mantienen sin cambios.

**Criterio de aceptación bloqueante:** igual que antes — test de aislamiento cross-org antes de habilitar pagos reales.

---

## 5. Autenticación y autorización

Sin cambios conceptuales. Ajuste de variables de entorno:

```ts
// lib/auth.ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL!, // https://medicamentum360.com
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  // ...
});
```

**`BETTER_AUTH_URL`** ahora apunta al dominio del VPS (`https://medicamentum360.com`), no a una URL de Vercel.

**Google OAuth:** en Google Cloud Console, el Authorized redirect URI debe ser `https://medicamentum360.com/api/auth/callback/google`.

---

## 6. Integración con Moodle

Sin cambios respecto a TRD v1.0 §6. El cliente `lib/moodle/client.ts` llama a `MOODLE_BASE_URL` desde Server Actions — eso funciona igual en VPS.

**En desarrollo local:** el Moodle Docker de `docker/` sigue siendo el entorno de prueba. La diferencia es que en producción no hay InsForge en medio — la app en el VPS llama directamente a `lms.medicamentum360.com`.

---

## 7. Integración con Wompi

Sin cambios respecto a TRD v1.0 §7. El webhook `POST /api/webhooks/wompi` funciona igual.

**Nota importante para VPS:** el webhook de Wompi necesita que el servidor sea públicamente accesible en HTTPS. Con VPS + Nginx + Let's Encrypt, esto se cumple. Asegúrate de que el dominio del webhook registrado en el dashboard de Wompi sea `https://medicamentum360.com/api/webhooks/wompi`.

---

## 8. Búsqueda (Meilisearch)

Meilisearch corre ahora en Docker en el mismo VPS. La URL de conexión desde la app es `http://meilisearch:7700` (nombre del servicio Docker, red interna).

```ts
// lib/meili.ts
import { MeiliSearch } from 'meilisearch';

export const meiliClient = new MeiliSearch({
  host: process.env.MEILI_HOST ?? 'http://meilisearch:7700',
  apiKey: process.env.MEILI_MASTER_KEY,
});
```

**No exponer Meilisearch al exterior.** No mapear el puerto 7700 en Nginx — solo la app interna lo consume.

---

## 9. Storage (Cloudflare R2 — reemplaza InsForge Storage)

```ts
// lib/storage/client.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT!, // https://<id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
});

const BUCKET = process.env.STORAGE_BUCKET!;
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL!; // dominio público del bucket

export async function uploadFile(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
```

**Buckets a crear en R2:** `product-covers`, `avatars`, `certificates`, `invoices`, `vr-assets`, `lesson-resources` (PDFs/descargables adjuntos a lecciones), `vendor-documents` (KYC/datos fiscales de vendedores, ver §20.2 — siempre privado, nunca público).
URLs públicas para `product-covers` y `avatars`; URLs firmadas con expiración para `certificates`, `invoices`, `lesson-resources` y `vendor-documents`.

**Importante:** el video de las lecciones **no vive en R2**. Vive en Cloudflare Stream (§19.4) — R2 es solo para archivos estáticos (imágenes, PDFs, modelos 3D). Mezclar ambos lleva a servir video como descarga directa sin protección ni adaptación de bitrate, que es exactamente lo que §19.4 evita.

---

## 10. Email transaccional (Brevo)

Sin cambios respecto a TRD v1.0 §10.

---

## 11. 3D / WebXR

Sin cambios respecto a TRD v1.0 §11.

---

## 12. Caching en VPS

Con Postgres propio y Redis en Docker:

- **Caché de sesiones:** Redis (Better Auth ya lo soporta como store)
- **Caché ISR de Next.js:** volumen Docker persistente montado en `.next/cache` — entre reinicios del contenedor, la caché se mantiene
- **Caché de resultados Meilisearch:** no necesaria (latencia < 5ms en red Docker interna)
- **Caché de datos Moodle:** tabla espejo en Postgres + cron job de sincronización (Fase 6)

---

## 13. SEO / Rendering

Sin cambios. La configuración de ISR/SSG funciona igual en modo standalone — el disco del VPS es el filesystem del contenedor.

---

## 14. Observabilidad

- **Logs estructurados:** `docker compose logs -f app` en el VPS
- **Error tracking:** Sentry (free tier, 5k errores/mes) — instalar `@sentry/nextjs`
- **Uptime monitoring:** UptimeRobot (gratuito) apuntando a `https://medicamentum360.com/api/health`
- **Analítica:** GA4 o Posthog (igual que antes)

---

## 15. Variables de entorno (referencia completa — VPS)

```env
# Postgres (Docker en VPS)
DATABASE_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360?sslmode=disable
DIRECT_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360?sslmode=disable
# (En VPS con Docker, DATABASE_URL y DIRECT_URL son la misma — no hay pooler externo)

POSTGRES_USER=medicamentum
POSTGRES_PASSWORD=<openssl rand -base64 32>

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://medicamentum360.com

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Wompi
WOMPI_PUBLIC_KEY=...
WOMPI_PRIVATE_KEY=...
WOMPI_EVENTS_SECRET=...

# Moodle
MOODLE_BASE_URL=https://lms.medicamentum360.com
MOODLE_WS_TOKEN=...

# Redis (Docker)
REDIS_PASSWORD=<openssl rand -base64 32>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Meilisearch (Docker)
MEILI_MASTER_KEY=<openssl rand -base64 32>
MEILI_HOST=http://meilisearch:7700

# Cloudflare R2 (Storage)
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=medicamentum360
STORAGE_PUBLIC_URL=https://storage.medicamentum360.com

# Brevo
BREVO_API_KEY=...

# Cloudflare Stream (video de lecciones — ver §19.4)
CLOUDFLARE_STREAM_ACCOUNT_ID=...
CLOUDFLARE_STREAM_API_TOKEN=...
CLOUDFLARE_STREAM_SIGNING_KEY_ID=...
CLOUDFLARE_STREAM_SIGNING_KEY_PEM=...

# Marketplace multi-vendor (ver §20.3)
MARKETPLACE_COMMISSION_PCT=20
WOMPI_VENDOR_PAYOUT_KEY=...

# Brand
NEXT_PUBLIC_BRAND_COLOR=#8127cf
```

> **Nota operativa (ver `AGENTS.md §2.5`):** estas variables son la *referencia* de qué debe existir en `.env.production`/`.env.local`. Cuando se añade una variable nueva a este documento, el agente nunca la escribe directamente sobre el `.env.local` real del desarrollador sin confirmación — la documenta aquí y se lo comunica al humano para que la añada él mismo, o confirme que el agente lo haga.

---

## 16. Requisitos críticos de testing

Sin cambios respecto a TRD v1.0 §16. Añadir:
- Test de que el webhook de Wompi es accesible públicamente desde HTTPS en el dominio real
- Verificar que Nginx no bufferiza las respuestas de RSC streaming (`proxy_buffering off`)

---

## 17. Entorno local de Moodle para pruebas (Docker)

Sin cambios respecto a TRD v1.0 §17. `docker/docker-compose.yml` con `jhardison/moodle` (no `bitnami/moodle`, que retiró sus imágenes).

---

## 18. Migraciones de base de datos (flujo actualizado)

Con Postgres propio en VPS, el flujo vuelve al estándar de Prisma:

```bash
# Desarrollo local
npx prisma migrate dev --name <descripcion>

# Producción (en CI/CD o manualmente en VPS)
npx prisma migrate deploy

# Migraciones SQL manuales (si se prefiere)
docker exec -i medicamentum_postgres psql -U medicamentum -d medicamentum360 < migrations/archivo.sql
```

**Ya no se usa InsForge CLI para migraciones.** El flujo `npx @insforge/cli db query` queda eliminado.

---

## 19. Course Builder propio — arquitectura

### 19.1 Arquitectura híbrida — Postgres como fuente de verdad, Moodle como espejo

**Decisión final (julio 2026):** después de evaluar la integración completa con Moodle, la arquitectura queda así:

```
Medicamentum360 (Course Builder)
  │  crea contenido rápido aquí
  │  drag & drop, video, quizzes, drip content
  │
  ├──► Postgres (FUENTE DE VERDAD)
  │     módulos, lecciones, quizzes, progreso instantáneo
  │     el estudiante consume desde el reproductor propio
  │
  └──► Moodle (ESPEJO de solo lectura)
        sync de estructura vía cron
        el shell del curso existe en Moodle
        inscripción automática post-pago
        SSO para quien prefiera la interfaz nativa
        NADIE edita contenido desde Moodle
```

**Por qué esta decisión (y no Moodle como fuente de verdad):**

1. **Velocidad de creación:** el Course Builder permite crear un curso completo (módulos, lecciones, quizzes) en minutos. Hacer lo mismo desde la UI de Moodle toma ~5x más tiempo y requiere navegar múltiples pantallas.

2. **Limitación técnica de Moodle:** la Web Service API no expone funciones para crear secciones, recursos ni quizzes dentro de un curso (`TRD.md §19.1 original`). Para tener integración bidireccional completa, se necesitaría un plugin de Moodle — evaluable a futuro si el negocio lo requiere.

3. **Independencia:** si Moodle está caído, los estudiantes pueden seguir consumiendo cursos desde Medicamentum360. Si Postgres está caído, nada funciona — pero eso es cierto para cualquier arquitectura.

4. **Features nativas:** drip content, certificación automática al 100%, auto-mark de video al 90%, quizzes con banco de preguntas — todas funcionan sin depender de la disponibilidad o capacidad de Moodle.

**Qué sí hace Moodle:**
- Recibe el shell de cada curso (`moodleCourseId`) al crearse en el Course Builder
- Inscribe estudiantes automáticamente post-pago (`enrol_manual_enrol_users`)
- Sirve como SSO para quien quiera ver el curso desde `lms.medicamentum360.com`
- Para cursos `moodle_legacy`, sigue siendo la fuente de verdad del progreso (sync vía cron)

**Roadmap futuro (no bloqueante):**
- **Fase 2:** Sincronizar módulos como topics en Moodle para visibilidad desde el LMS
- **Fase 3:** Plugin de Moodle que exponga `create_section`, `add_resource`, `add_quiz` como web services — esto habilitaría sincronización bidireccional completa si el negocio lo decide.

### 19.2 Modelo de datos — Course Builder

```prisma
enum ContentSource {
  native        // contenido vive en Postgres (Course Builder) — default para todo curso nuevo
  moodle_legacy // contenido vive en Moodle (cursos creados antes de v3.0, o vinculados a propósito)
}

enum LessonType {
  video
  text
  quiz
  resource // descargable (PDF, slides) sin progreso propio, marca "visto" al abrir
}

model Course {
  id              String   @id @default(cuid())
  productId       String   @unique
  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  contentSource   ContentSource @default(native)
  language        String   @default("es")
  estimatedHours  Float?
  passingScorePct Int      @default(70) // mínimo para aprobar quizzes y obtener certificado
  certificateEnabled Boolean @default(true)
  modules         Module[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([productId])
}

model Module {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  order       Int
  // Drip content: si releaseAfterDays no es null, el módulo se desbloquea
  // N días después de la fecha de inscripción del estudiante, no antes.
  releaseAfterDays Int?
  lessons     Lesson[]

  @@index([courseId, order])
}

model Lesson {
  id          String     @id @default(cuid())
  moduleId    String
  module      Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  type        LessonType
  title       String
  order       Int
  // Para type=video: id del video en Cloudflare Stream (ver §19.4), nunca una URL de R2.
  streamVideoId    String?
  videoDurationSec Int?
  // Para type=text: contenido enriquecido (Markdown/HTML saneado, nunca HTML crudo del cliente)
  textContent      String?  @db.Text
  // Para type=resource: referencia al archivo en R2 bucket lesson-resources/
  resourceKey      String?
  resourceLabel    String?
  // Para type=quiz: 1:1 con Quiz
  quiz             Quiz?
  isPreview        Boolean  @default(false) // visible sin comprar, para marketing del curso
  completions      LessonCompletion[]

  @@index([moduleId, order])
}

model Quiz {
  id              String   @id @default(cuid())
  lessonId        String   @unique
  lesson          Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  shuffleQuestions Boolean @default(true)
  maxAttempts     Int?     // null = ilimitado
  timeLimitSec    Int?     // null = sin límite
  questions       QuizQuestion[]
  attempts        QuizAttempt[]
}

enum QuestionType {
  single_choice
  multiple_choice
  true_false
}

model QuizQuestion {
  id          String       @id @default(cuid())
  quizId      String
  quiz        Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  type        QuestionType
  prompt      String       @db.Text
  order       Int
  options     QuizOption[]
  explanation String?      @db.Text // se muestra al estudiante tras responder, sea correcto o no
}

model QuizOption {
  id          String       @id @default(cuid())
  questionId  String
  question    QuizQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  label       String
  isCorrect   Boolean      @default(false)
  order       Int
}

model QuizAttempt {
  id          String   @id @default(cuid())
  quizId      String
  quiz        Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  userId      String
  scorePct    Float
  passed      Boolean
  answers     Json     // snapshot de respuestas dadas, para auditoría/disputas
  startedAt   DateTime @default(now())
  completedAt DateTime?

  @@index([quizId, userId])
}

model LessonCompletion {
  id          String   @id @default(cuid())
  lessonId    String
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  userId      String
  completedAt DateTime @default(now())

  @@unique([lessonId, userId])
  @@index([userId])
}
```

**Cálculo de progreso (`Enrollment.progressPct`) para `contentSource: native`:** `count(LessonCompletion del usuario) / count(Lesson del curso) * 100`, recalculado en la misma Server Action que marca una lección como completada — no requiere cron ni sync externo.

**Drip content (`Module.releaseAfterDays`):** un módulo con `releaseAfterDays: 7` se muestra bloqueado (con fecha de desbloqueo visible) hasta que `Enrollment.createdAt + 7 días` haya pasado. Igual que el patrón estándar de la industria (Kajabi, Teachable, LearnDash) — confirmado como expectativa básica de cualquier plataforma de cursos en 2026.

### 19.3 RLS — nuevas policies requeridas

Toda tabla nueva con relación directa o indirecta a `userId` necesita policy. Como mínimo:
- `QuizAttempt`: un usuario solo ve/crea sus propios intentos (`userId = requesting_user_id()`); `super_admin` e instructor propietario del curso pueden leer todos los intentos de su curso (para analítica).
- `LessonCompletion`: mismo patrón.
- `Course`/`Module`/`Lesson`/`Quiz`/`QuizQuestion`/`QuizOption`: de **escritura** solo para el `vendor`/`super_admin` propietario del `Product` asociado; de **lectura** pública si el `Product.published = true`, o restringida al propietario si está en borrador.

Documenta el conteo final de policies nuevas en `PROGRESS.md` cuando se implementen — no asumas un número fijo aquí, **cuéntalas en el momento de escribir las migraciones**.

### 19.4 Video — Cloudflare Stream (reemplaza cualquier intento de servir video desde R2)

**Por qué no R2 para video:** R2 es storage de objetos plano — serviría el archivo `.mp4` completo como descarga directa, sin adaptar la calidad a la conexión del estudiante y, más importante, sin ninguna protección real contra descarga/redistribución. Para un catálogo de cursos pagos esto es inaceptable: cualquiera con el enlace firmado podría descargar el máster completo.

**Cloudflare Stream** (mismo proveedor que ya usamos para R2, una sola cuenta) resuelve esto de forma nativa:
- Transcodifica automáticamente a HLS adaptativo (varias calidades, el reproductor elige según el ancho de banda).
- Entrega mediante **signed URLs** (tokens RS256 con expiración) — el manifiesto y los segmentos de video solo se sirven con un token válido, nunca como archivo descargable directo.
- `requireSignedURLs: true` + `allowedOrigins: ["medicamentum360.com"]` bloquea hotlinking y reproducción fuera del dominio.
- Soporta upload directo desde el navegador del instructor (Direct Creator Upload) — el archivo de video nunca pasa por el servidor Next.js, evitando timeouts y uso de memoria en uploads de varios GB.

```ts
// lib/video/stream-client.ts
const CF_API = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream`;

export async function createDirectUploadUrl(maxDurationSeconds = 3600) {
  const res = await fetch(`${CF_API}/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: true,
      allowedOrigins: [new URL(process.env.BETTER_AUTH_URL!).hostname],
    }),
  });
  const data = await res.json();
  // data.result.uploadURL → el navegador del instructor sube el archivo directo aquí
  // data.result.uid → streamVideoId, se persiste en Lesson.streamVideoId
  return data.result as { uploadURL: string; uid: string };
}

export async function getSignedPlaybackToken(streamVideoId: string, expiresInSeconds = 3600) {
  // Firma con la signing key propia (RS256) — no requiere llamada de red, más rápido
  // Implementación real usa una librería JWT con CLOUDFLARE_STREAM_SIGNING_KEY_PEM
  // y CLOUDFLARE_STREAM_SIGNING_KEY_ID como `kid` del header.
}
```

**Flujo de upload desde el Course Builder (ver `BACKEND.md §16` para el detalle de Server Actions):**
1. Instructor arrastra el archivo de video en el editor de lección.
2. El cliente pide a una Server Action `getVideoUploadUrl()` la URL de Direct Upload.
3. El navegador sube el archivo **directo a Cloudflare**, con barra de progreso real (no a través de Next.js).
4. Cloudflare notifica vía webhook (`POST /api/webhooks/cloudflare-stream`) cuando termina de transcodificar.
4. `Lesson.streamVideoId` se persiste; el estado de la lección pasa de `processing` a `ready`.
5. Si el video tarda en procesar, la UI muestra "Procesando video..." con polling — mismo patrón ya usado para el acceso post-pago (`FLUJOS.md §6`).

**Costo aproximado de referencia (verificado, junio 2026):** Cloudflare Stream cobra ~$5 por cada 1.000 minutos almacenados y ~$1 por cada 1.000 minutos entregados — sin fees de egress separados. Para un catálogo de cursos médicos de duración moderada esto es predecible y barato comparado con montar un pipeline propio de FFmpeg + S3 + CloudFront.

---

## 20. Marketplace Multi-Vendor

### 20.1 Qué cambia respecto al marketplace actual

Hasta ahora todos los productos del marketplace los crea el `super_admin` de Medicamentum360. La v3.0 abre la plataforma para que **terceros** — instructores médicos independientes, estudios de VR, organizaciones aliadas — puedan crear y vender sus propios productos (cursos y/o experiencias VR) en el mismo marketplace, bajo revisión editorial y reteniendo Medicamentum360 una comisión por venta.

Esto sigue el patrón estándar de plataformas como Udemy/Skillshare (marketplace abierto con revisión) en vez del patrón Teachable/Kajabi (cada creador con su propio sitio aislado) — decisión consciente porque el valor de Medicamentum360 está en ser **el** lugar donde hospitales y profesionales de salud en Colombia buscan formación, no en que cada instructor tenga su micrositio.

### 20.2 Modelo de datos — Vendor

```prisma
enum VendorStatus {
  pending_kyc     // se registró, falta completar datos fiscales/bancarios
  pending_review  // datos completos, esperando aprobación de super_admin
  active          // aprobado, puede publicar productos
  suspended       // pausado por incumplimiento o a petición propia
}

model Vendor {
  id              String       @id @default(cuid())
  userId          String       @unique
  user            User         @relation(fields: [userId], references: [id])
  displayName     String       // nombre público en el marketplace (puede no ser el nombre legal)
  bio             String?      @db.Text
  status          VendorStatus @default(pending_kyc)
  // Datos fiscales — SIEMPRE en vendor-documents/ (R2, privado, nunca público)
  taxIdType       String?      // NIT, CC, pasaporte si es extranjero
  taxIdNumber     String?
  taxDocumentKey  String?      // certificado bancario / RUT subido, key en R2
  bankAccountInfo Json?        // cifrado a nivel de aplicación antes de persistir — ver BACKEND.md §18.1
  commissionPct   Float        @default(20) // hereda MARKETPLACE_COMMISSION_PCT, puede negociarse por vendor
  approvedAt      DateTime?
  approvedBy      String?      // userId del super_admin que aprobó
  products        Product[]
  payouts         Payout[]
  createdAt       DateTime     @default(now())

  @@index([status])
}

model Payout {
  id          String       @id @default(cuid())
  vendorId    String
  vendor      Vendor       @relation(fields: [vendorId], references: [id])
  periodStart DateTime
  periodEnd   DateTime
  grossAmount Int          // en centavos COP, suma de ventas del periodo
  commissionAmount Int     // lo que retiene Medicamentum360
  netAmount   Int          // lo que se paga al vendor
  status      PayoutStatus @default(pending)
  wompiPayoutRef String?
  paidAt      DateTime?
  createdAt   DateTime     @default(now())

  @@index([vendorId, status])
}

enum PayoutStatus {
  pending
  processing
  paid
  failed
}
```

`Product` gana dos campos nuevos: `vendorId String?` (null = producto propio de Medicamentum360, igual que hoy) y `reviewStatus` (`enum: 'draft' | 'pending_review' | 'approved' | 'rejected'`) — independiente de `published`, porque un producto puede estar `approved` pero el vendor todavía no decide publicarlo.

**Por qué el cifrado de `bankAccountInfo` es a nivel de aplicación y no solo RLS:** RLS protege contra otros *usuarios* leyendo la fila vía Postgres, pero no contra un acceso directo a la base de datos (backup filtrado, dump, admin malicioso). Datos bancarios son sensibles incluso para el `super_admin` casual — solo el flujo de payout automatizado necesita desencriptarlos, nunca una pantalla de admin los muestra en claro. Ver `BACKEND.md §18.1` para la implementación con una librería de cifrado simétrico (AES-256-GCM) con la clave en variable de entorno separada (`VENDOR_BANK_ENCRYPTION_KEY`, nunca la misma que `BETTER_AUTH_SECRET`).

### 20.3 Comisión y payouts

- `MARKETPLACE_COMMISSION_PCT` (env, default 20%) es el valor por defecto al crear un `Vendor`; `Vendor.commissionPct` permite excepciones negociadas (ej. un estudio VR grande con volumen, 15%).
- El payout es **mensual por defecto** (`periodStart`/`periodEnd` de 1 mes), calculado por un cron job que suma `Order.status = paid` del periodo para productos de ese vendor, resta la comisión, y crea el registro `Payout` en `pending`.
- El `super_admin` revisa y aprueba el lote de payouts antes de que se dispare el pago real — **nunca automático en el primer ciclo de vida del feature** (ver `AGENTS.md §8`, este es uno de los puntos de parada obligatorios).
- Pago real vía transferencia Wompi a la cuenta bancaria del vendor, usando `WOMPI_VENDOR_PAYOUT_KEY` (credencial separada de la de cobro a estudiantes).

### 20.4 Flujo editorial — revisión antes de publicar

Ningún producto de un `vendorId` no nulo llega a `published: true` sin pasar por `reviewStatus: approved`. El panel de `super_admin` gana una bandeja `/admin/review-queue` (ver `UX_UI.md §3.14`) donde se revisa: calidad del contenido, que el video efectivamente cargue, que el quiz tenga al menos una pregunta con respuesta correcta marcada, y que la información de precio/cupo sea coherente. Ver `FLUJOS.md §16` para el flujo completo paso a paso.

---

## 21. Reembolsos y soporte — modelo de datos (NUEVO)

> Documentado por primera vez tras auditoría de 2026-06-26 — ver `FLUJOS.md §19-20` para el flujo completo paso a paso. Hasta ahora la UI prometía "política de reembolso" sin que existiera ningún modelo ni lógica detrás.

```prisma
enum RefundStatus {
  pending
  approved
  rejected
  processed   // dinero efectivamente devuelto vía Wompi
}

model RefundRequest {
  id          String       @id @default(cuid())
  orderId     String
  order       Order        @relation(fields: [orderId], references: [id])
  requestedBy String        // userId — para Order.organizationId, debe ser el hospital_admin, no un empleado
  reason      String        // categoría: "not_as_expected" | "technical_issue" | "duplicate_purchase" | "other"
  details     String?       @db.Text
  status      RefundStatus  @default(pending)
  reviewedBy  String?       // userId del super_admin que aprobó/rechazó
  rejectionReason String?   @db.Text
  wompiRefundRef  String?
  createdAt   DateTime      @default(now())
  resolvedAt  DateTime?

  @@index([orderId])
  @@index([status])
}

enum SupportTicketCategory {
  payment_issue
  technical_issue
  certificate_question
  other
}

model SupportTicket {
  id          String                 @id @default(cuid())
  userId      String?                // null si el usuario no estaba autenticado al crear el ticket
  email       String                 // siempre presente, autenticado o no
  category    SupportTicketCategory
  subject     String
  description String                 @db.Text
  relatedOrderId   String?
  relatedCourseId  String?
  status      String                 @default("open") // "open" | "closed" — gestión simple, sin estados intermedios en esta fase
  createdAt   DateTime               @default(now())

  @@index([status])
  @@index([userId])
}
```

**Política de elegibilidad de reembolso (constante de aplicación, no hardcodeada en el componente de UI):**
```ts
// lib/refunds/policy.ts
export const REFUND_WINDOW_DAYS = 7;
export const REFUND_MAX_PROGRESS_PCT = 20; // por encima de esto, requiere revisión manual obligatoria, no autoaprobable

export function isRefundEligible(order: { createdAt: Date }, progressPct: number): boolean {
  const daysSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSincePurchase <= REFUND_WINDOW_DAYS && progressPct <= REFUND_MAX_PROGRESS_PCT;
}
```
Centralizar la política en una sola función evita el riesgo de que la validación del botón (cliente) y la validación de la Server Action (servidor) diverjan con el tiempo — ambas importan la misma constante y función.

**RLS:** `RefundRequest` — lectura/escritura para `requestedBy` (su propio request) y `super_admin`; nunca visible para otros estudiantes. `SupportTicket` — mismo patrón.

---

## 22. Roadmap de mejoras identificadas (no bloqueantes, para evaluar por fase)

Estas son mejoras que la investigación de mercado (Kajabi, Teachable, Podia, LearnDash, Moodle — junio 2026) sugiere como expectativa estándar de la industria de e-learning, que **no están en el alcance mínimo de la Fase 6.5** pero vale la pena dejar registradas para no perderlas de vista en fases posteriores:

- **Subtítulos automáticos/traducción de video:** varios competidores (Teachable) ofrecen subtítulos auto-generados en decenas de idiomas. Cloudflare Stream no lo incluye nativamente — evaluaría un paso adicional de transcripción (ej. Whisper local o API externa) si el catálogo crece a audiencia bilingüe/internacional.
- **Banco de preguntas reutilizable entre quizzes:** hoy `QuizQuestion` pertenece a un único `Quiz`. Si varios cursos comparten temario base (ej. distintos módulos de farmacología), un banco de preguntas compartido evitaría reescribir contenido.
- **Cohortes con fecha de inicio fija** (vs. self-paced): Kajabi y Podia distinguen "Evergreen" de "Cohort Courses" con sesiones en vivo programadas. Útil si Medicamentum360 quiere ofrecer programas con interacción en vivo (webinars vía Zoom/Meet embebido) además del contenido grabado.
- **Vista previa gratuita del curso (`Lesson.isPreview`):** ya está en el modelo de datos de §19.2 porque es trivial de incluir desde el inicio, pero la UI de marketplace (mostrar 1-2 lecciones gratis antes de comprar) es trabajo de UX pendiente — ver `UX_UI.md §3.4`.
- **Afiliados/referidos para instructores:** Teachable y Kajabi incluyen programas de afiliados nativos. Quedaría como extensión natural del modelo `Vendor` si se decide impulsar el crecimiento por recomendación.
- **App móvil dedicada / PWA reforzada:** ya está contemplado parcialmente en `PLAN.md` Fase 13 (PWA offline para hospitales con baja conectividad) — el roadmap de mercado confirma que es una expectativa creciente, no un nice-to-have marginal.
- **Reembolsos parciales por cupo en compras en lote** (ver `§3.1` y `FLUJOS.md §19`): hoy el reembolso es de la orden completa o nada. Si el negocio reporta que los hospitales piden reembolsos parciales de cupos sin asignar, esto se vuelve prioritario.
- **Expiración de cupos sin asignar** (ver `§3.1`): hoy un cupo comprado por una organización y nunca asignado no caduca. Si se vuelve un problema de "cupos zombie" acumulados, conviene una política de expiración (ej. 1 año) con aviso previo al hospital.
- **Sistema de tickets de soporte más robusto** (ver `§21`): el modelo actual es deliberadamente simple (sin estados intermedios, sin bandeja in-app de respuestas). Si el volumen de soporte crece, esto merece su propia fase con un sistema más completo (Zendesk, Intercom, o un panel propio con conversación in-app).
