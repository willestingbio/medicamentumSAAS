# BACKEND — Medicamentum360
**Implementación de Server Actions, Route Handlers y lógica de negocio**
Versión: 3.0 · Fecha: 2026-06-24

> **Cambio v2.0:** se elimina toda referencia a InsForge SDK (`@insforge/sdk`), InsForge CLI y Vercel. La app corre en **VPS con Docker**. Postgres accesible vía TCP directo. Storage via **Cloudflare R2** (o MinIO). Ver `TRD.md §1-2` y `DEPLOY.md` para la arquitectura completa.

> **Cambio v3.0:** se añaden las Server Actions del **Course Builder** (§15-16) y del **Marketplace Multi-Vendor** (§17-18). Ver `TRD.md §19-20` para el modelo de datos y la justificación de arquitectura (en particular, por qué el contenido del curso vive en Postgres y no en Moodle — `TRD.md §19.1`).

> **Fuente de verdad del stack:** Next.js 15 + App Router, Server Actions, React 19. Postgres 16 (Docker) + Prisma 7 (con `@prisma/adapter-pg`). Better Auth 1.6.20. Nginx como reverse proxy. Cloudflare Stream para video (nuevo en v3.0).

---

## 1. Convenciones generales

### 1.1 Estructura de directorios de server-side

```
lib/
  auth.ts                    — configuración de Better Auth
  prisma.ts                  — singleton de PrismaClient
  storage/
    client.ts                — cliente S3-compatible (Cloudflare R2 / MinIO)
  video/
    stream-client.ts         — cliente Cloudflare Stream (direct upload, signed playback tokens)
  moodle/
    client.ts                — cliente HTTP wrapper de la API REST de Moodle (solo cursos/usuarios/inscripciones, ver TRD.md §19.1)
  actions/
    auth.ts                  — registro, vinculación org
    invitation.ts            — CRUD de invitaciones de organización
    organization.ts          — info y miembros de org
    products.ts              — CRUD de productos (público: búsqueda, detalle)
    admin/
      products.ts            — CRUD admin (solo super_admin)
      moodle.ts              — vinculación opcional con Moodle (legacy, ver TRD.md §19.1)
      review-queue.ts        — aprobación/rechazo de productos de vendors (TRD.md §20.4)
      payouts.ts             — revisión y disparo de lotes de payout a vendors
    course-builder/
      courses.ts             — CRUD de Course (crear, editar metadatos, publicar)
      modules.ts              — CRUD de Module + reordenar (drag & drop)
      lessons.ts               — CRUD de Lesson (video/texto/quiz/recurso) + reordenar
      quizzes.ts                — CRUD de Quiz/QuizQuestion/QuizOption
      video-upload.ts            — genera Direct Upload URL de Cloudflare Stream
      progress.ts                 — marcar lección completada, calcular progressPct, intentos de quiz
    vendor/
      onboarding.ts            — registro de Vendor, KYC, datos bancarios (cifrados)
      vendor-products.ts        — CRUD de productos propios del vendor (reutiliza products.ts con scoping)
      payouts.ts                — historial de payouts del propio vendor (solo lectura)
    cart.ts                  — carrito (agregar, eliminar, merge guest)
    checkout.ts              — creación de orden
    certificates.ts          — generación de certificados
    dashboard.ts             — datos del dashboard del estudiante
  email/
    brevo.ts                 — cliente Brevo y plantillas

app/
  api/
    health/
      route.ts               — health check endpoint (para Docker + UptimeRobot)
    webhooks/
      wompi/
        route.ts             — webhook de Wompi (HMAC + idempotencia)
      cloudflare-stream/
        route.ts             — webhook de Cloudflare Stream (video.ready, video.error)
    moodle/
      autologin/
        route.ts             — genera autologin token y redirige (solo contentSource=moodle_legacy)
    admin/
      upload/
        product-cover/
          route.ts           — upload de imagen a Cloudflare R2
        vr-asset/
          route.ts           — upload de modelo glTF/glb a R2
        lesson-resource/
          route.ts           — upload de PDF/descargable de lección a R2
    auth/
      [...all]/
        route.ts             — handler de Better Auth
```

### 1.2 Singleton de PrismaClient

Con Postgres en Docker (conexión TCP directa), el singleton usa `pg.Pool` para controlar el número de conexiones:

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Por qué el singleton sigue siendo necesario:** aunque Next.js en VPS corre como proceso Node.js persistente (no serverless), en desarrollo y en builds se pueden crear múltiples instancias. El singleton previene esto en todos los contextos.

### 1.3 Patrón de RBAC en Server Actions

Sin cambios respecto a BACKEND v1.0 §1.3.

### 1.4 Manejo de errores en Server Actions

Sin cambios respecto a BACKEND v1.0 §1.4.

---

## 2. Autenticación y sesiones (Better Auth 1.6.20)

### 2.1 Configuración base

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL!, // https://medicamentum360.com — dominio VPS
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
  secret: process.env.BETTER_AUTH_SECRET!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // Rate limiting con Redis (más robusto que memory storage en producción)
  rateLimit: {
    window: 60,
    max: 10,
    storage: "memory", // cambiar a Redis cuando se implemente el plugin de rate-limit de Better Auth
  },
  hooks: {
    after: [
      {
        matcher: (context) => context.path === "/sign-up/email",
        handler: async (context) => {
          const user = context.response?.user;
          if (!user) return {};
          try {
            const moodleUserId = await moodleClient.createUser({
              username: user.email.split("@")[0],
              email: user.email,
              firstname: user.name?.split(" ")[0] ?? "Usuario",
              lastname: user.name?.split(" ").slice(1).join(" ") ?? "",
              password: crypto.randomUUID(),
            });
            await prisma.user.update({
              where: { id: user.id },
              data: { moodleUserId },
            });
          } catch (error) {
            console.error("[post-signup] Fallo al crear cuenta Moodle:", error);
          }
          return {}; // SIEMPRE retornar objeto para evitar crash en Better Auth 1.6.20
        },
      },
    ],
  },
});
```

**Nota sobre `BETTER_AUTH_URL`:** en VPS, apunta al dominio real `https://medicamentum360.com`. En desarrollo local, usa `http://localhost:3000`. Usa variables de entorno, nunca hardcodes.

### 2.2 Route Handler de Better Auth

Sin cambios respecto a BACKEND v1.0 §2.2.

---

## 3. Health check endpoint

```ts
// app/api/health/route.ts
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Verificar conexión a Postgres
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: { database: "ok" },
    });
  } catch (error) {
    return Response.json(
      { status: "error", services: { database: "error" } },
      { status: 503 }
    );
  }
}
```

Este endpoint es usado por Docker healthcheck (`DEPLOY.md §8`) y UptimeRobot.

---

## 4. Webhook de Wompi

Sin cambios respecto a BACKEND v1.0 §3.

**Nota para VPS:** el webhook funciona exactamente igual. Wompi llama a `https://medicamentum360.com/api/webhooks/wompi` — el dominio del VPS con SSL de Let's Encrypt.

---

## 5. Cliente de Moodle

Sin cambios respecto a BACKEND v1.0 §4 — **con una precisión importante en v3.0:** el cliente (`lib/moodle/client.ts`) solo se usa para: crear cuenta espejo de usuario (`core_user_create_users`), inscribir tras el pago (`enrol_manual_enrol_users`), y, solo para cursos `contentSource: moodle_legacy`, autologin SSO y sync de progreso. **No** se usa, porque no existe función core para ello, para crear secciones, recursos o quizzes dentro de un curso — ver `TRD.md §19.1` para el detalle de esta limitación de la API de Moodle y por qué el Course Builder vive en Postgres.

---

## 6. Route Handler de autologin SSO a Moodle

Sin cambios respecto a BACKEND v1.0 §5. **Aplica solo a cursos con `Course.contentSource = 'moodle_legacy'`** — los cursos creados desde el Course Builder nuevo (`contentSource: 'native'`, default) no necesitan autologin porque el contenido se sirve directamente desde `/dashboard/cursos/[slug]` con el reproductor propio (`BACKEND.md §16`).

---

## 7. Server Actions — Gestión de invitaciones

Sin cambios respecto a BACKEND v1.0 §6.

---

## 8. Server Actions — Panel admin de productos

Sin cambios respecto a BACKEND v1.0 §7. **Extensión en v3.0:** ver §17 para las Server Actions equivalentes cuando el producto lo crea un `vendor` externo en vez del `super_admin` — la lógica de CRUD es la misma, pero con scoping adicional (`vendorId = session.user.vendorId`) y el campo `reviewStatus` en vez de publicación directa.

---

## 9. Server Actions — Moodle desde el panel admin

Sin cambios respecto a BACKEND v1.0 §8. **Vigente solo como opción "Vincular curso legacy a Moodle" — ya no es el flujo principal de creación de contenido.** El flujo principal para crear un curso nuevo es el Course Builder (§15).

---

## 10. Route Handlers de upload (actualizado para Cloudflare R2)

```ts
// app/api/admin/upload/product-cover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { uploadFile } from "@/lib/storage/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as any).role !== "super_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera el tamaño máximo de 2 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1];
  const filename = `product-covers/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const url = await uploadFile(filename, buffer, file.type);
  return NextResponse.json({ url });
}
```

```ts
// lib/storage/client.ts — Cloudflare R2 (compatible S3)
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
});

const BUCKET = process.env.STORAGE_BUCKET!;

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${process.env.STORAGE_PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}
```

**Instalar dependencias:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## 11. Variables de entorno (referencia completa — VPS)

```env
# Postgres (Docker en VPS, acceso TCP directo)
DATABASE_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360
DIRECT_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360
# En VPS con Docker, ambas son iguales — no hay pooler PgBouncer externo

# Postgres credentials (para docker-compose.yml)
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

# Storage — Cloudflare R2
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=medicamentum360
STORAGE_PUBLIC_URL=https://storage.medicamentum360.com

# Brevo
BREVO_API_KEY=...

# Brand
NEXT_PUBLIC_BRAND_COLOR=#8127cf

# Cloudflare Stream — video de lecciones (Course Builder, ver §16)
CLOUDFLARE_STREAM_ACCOUNT_ID=...
CLOUDFLARE_STREAM_API_TOKEN=...
CLOUDFLARE_STREAM_SIGNING_KEY_ID=...
CLOUDFLARE_STREAM_SIGNING_KEY_PEM=...

# Marketplace multi-vendor (ver §17-18)
MARKETPLACE_COMMISSION_PCT=20
WOMPI_VENDOR_PAYOUT_KEY=...
VENDOR_BANK_ENCRYPTION_KEY=<openssl rand -base64 32 — DISTINTA de BETTER_AUTH_SECRET>
```

> **Recordatorio (`AGENTS.md §2.5`):** estas son variables de *referencia*. Nunca se escriben directamente sobre el `.env.local` real sin confirmación explícita del humano — se documentan aquí y se comunican, y el humano decide quién las añade.

---

## 12. Seguridad — checklist pre-producción (adaptado a VPS)

- [ ] Archivos obsoletos eliminados: `vercel.json`, `insforge.toml`, `.insforge/`, `app/api/insforge-token/`
- [ ] RLS cross-org test (`tests/rls-isolation-test.sql`) pasa — ejecutar con `docker exec -i medicamentum_postgres psql -U medicamentum -d medicamentum360 < tests/rls-isolation-test.sql`
- [ ] Webhook de Wompi: test de idempotencia (mismo evento dos veces no duplica inscripción ni orden)
- [ ] Test de autologin token: expira en segundos, uso único
- [ ] `MOODLE_WS_TOKEN` solo en variables de servidor — nunca en `NEXT_PUBLIC_*`
- [ ] `BETTER_AUTH_URL` apunta al dominio real VPS, no a localhost
- [ ] `trustedOrigins` incluye el dominio de producción
- [ ] Google OAuth: Authorized redirect URI = `https://medicamentum360.com/api/auth/callback/google`
- [ ] Nginx con rate limiting activo en `/api/auth/`
- [ ] Singleton de PrismaClient activo — no instanciar `new PrismaClient()` dentro de handlers
- [ ] URLs firmadas con expiración para `certificates/` e `invoices/` en Cloudflare R2
- [ ] Firewall UFW activo (solo puertos 22, 80, 443)
- [ ] Nginx NO expone Meilisearch (7700) ni Postgres (5432) al exterior
- [ ] Backups automáticos de Postgres configurados (ver `DEPLOY.md §10`)
- [ ] Webhook de Cloudflare Stream: verificar firma antes de marcar una lección como `ready` (§16)
- [ ] Video de lecciones nunca expuesto vía URL pública directa — solo manifiesto HLS firmado con `requireSignedURLs: true` (§16)
- [ ] `bankAccountInfo` de `Vendor` cifrado en reposo con `VENDOR_BANK_ENCRYPTION_KEY` (AES-256-GCM) — nunca en texto plano ni siquiera para `super_admin` (§18.1)
- [ ] Ningún producto de un `vendor` externo pasa a `published: true` sin `reviewStatus: approved` (§17.3)
- [ ] Primer lote de payouts a vendors revisado y aprobado manualmente por `super_admin` antes de disparar el pago real (§18.2)

---

## 13. Logging y observabilidad

- Server Actions críticos emiten logs estructurados con `console.error` + contexto suficiente
- Formato: `[nombre-acción] mensaje: ${JSON.stringify({ userId, productId, error })}`
- En producción (VPS): `docker compose logs -f app` para ver logs en tiempo real
- Sentry para error tracking automático: `npm install @sentry/nextjs` + `npx @sentry/wizard@latest -i nextjs`
- Eventos de analítica: `add_to_cart`, `begin_checkout`, `purchase`, `course_started`, `course_completed`

---

## 14. Eliminado respecto a BACKEND v1.0

Los siguientes patrones de BACKEND v1.0 ya NO aplican:

- `createAdminClient({ apiKey })` de `@insforge/sdk` — eliminado; usar Prisma directamente
- `npx @insforge/cli db query` para migraciones — eliminado; usar `prisma migrate deploy`
- `DATABASE_URL` con `?pgbouncer=true` — no necesario; Postgres en Docker es acceso TCP directo
- `pooler.<appkey>.us-east.insforge.app` — no aplica; Postgres está en `postgres:5432` (Docker network)
- Bridge JWT route `/api/insforge-token` — ya no necesario (el RLS funciona con la conexión directa de Prisma y el JWT de Better Auth en las policies)

---

## 15. Server Actions — Course Builder (crear/editar contenido del curso)

Todas las Server Actions de `lib/actions/course-builder/` siguen el patrón RBAC estándar (`FRONTEND_PATTERNS.md §8.3`): validan sesión, validan que el usuario sea `super_admin` o el `vendor` propietario del `Product` asociado al `Course`, y delegan el resto a RLS como defensa en profundidad.

```ts
// lib/actions/course-builder/courses.ts
"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function assertCourseOwner(courseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { product: { include: { vendor: true } } },
  });
  if (!course) throw new Error("Curso no encontrado");

  const role = (session.user as any).role;
  const isOwnerVendor = course.product.vendor?.userId === session.user.id;
  if (role !== "super_admin" && !isOwnerVendor) {
    throw new Error("No autorizado para editar este curso");
  }
  return { session, course };
}

export async function createCourse(productId: string) {
  // crea Course con valores por defecto (contentSource: 'native')
  // — el productId ya debe existir y pertenecer al usuario actual (super_admin o vendor)
}

export async function updateCourseSettings(courseId: string, data: {
  estimatedHours?: number;
  passingScorePct?: number;
  certificateEnabled?: boolean;
}) {
  await assertCourseOwner(courseId);
  return prisma.course.update({ where: { id: courseId }, data });
}
```

```ts
// lib/actions/course-builder/modules.ts
export async function createModule(courseId: string, title: string) {
  await assertCourseOwner(courseId);
  const count = await prisma.module.count({ where: { courseId } });
  return prisma.module.create({ data: { courseId, title, order: count } });
}

export async function reorderModules(courseId: string, orderedModuleIds: string[]) {
  await assertCourseOwner(courseId);
  // Transacción: actualiza el campo `order` de cada módulo según su posición en el array
  await prisma.$transaction(
    orderedModuleIds.map((id, index) =>
      prisma.module.update({ where: { id }, data: { order: index } })
    )
  );
}

export async function setModuleDripDelay(moduleId: string, releaseAfterDays: number | null) {
  // valida ownership vía courseId del module, igual patrón que arriba
}
```

```ts
// lib/actions/course-builder/lessons.ts
export async function createLesson(moduleId: string, type: "video" | "text" | "quiz" | "resource", title: string) {
  // crea Lesson; si type === 'quiz', crea también el Quiz vacío en la misma transacción
}

export async function reorderLessons(moduleId: string, orderedLessonIds: string[]) {
  // mismo patrón de transacción que reorderModules
}

export async function updateLessonContent(lessonId: string, data: {
  textContent?: string;   // sanea con una librería tipo `sanitize-html` antes de persistir — nunca HTML crudo sin sanear
  isPreview?: boolean;
}) {
  // ...
}

export async function deleteLesson(lessonId: string) {
  // si type === 'video', dispara también el borrado del video en Cloudflare Stream
  // (DELETE /accounts/{account_id}/stream/{video_uid}) para no acumular costo de storage huérfano
}
```

**Patrón de reordenamiento (drag & drop):** el cliente envía el array completo de IDs en el nuevo orden tras soltar el elemento (optimistic UI ya aplicado en el cliente); el servidor solo persiste el orden final en una transacción — nunca incrementa/decrementa índices uno a uno, que es propenso a colisiones con ediciones concurrentes.

---

## 16. Video — Cloudflare Stream (upload, webhook, reproducción)

Ver `TRD.md §19.4` para la justificación de por qué video va a Cloudflare Stream y no a R2.

```ts
// lib/video/stream-client.ts
const ACCOUNT_ID = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID!;
const API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN!;
const CF_API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;

export async function createDirectUploadUrl(maxDurationSeconds = 3600) {
  const res = await fetch(`${CF_API}/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: true,
      allowedOrigins: [new URL(process.env.BETTER_AUTH_URL!).hostname],
    }),
  });
  if (!res.ok) throw new Error(`Cloudflare Stream error: ${res.status}`);
  const { result } = await res.json();
  return result as { uploadURL: string; uid: string };
}

export async function deleteStreamVideo(uid: string) {
  await fetch(`${CF_API}/${uid}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
}

export async function getVideoStatus(uid: string) {
  const res = await fetch(`${CF_API}/${uid}`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const { result } = await res.json();
  return result.status?.state as "pendingupload" | "downloading" | "queued" | "inprogress" | "ready" | "error";
}
```

```ts
// lib/actions/course-builder/video-upload.ts
"use server";
import { createDirectUploadUrl } from "@/lib/video/stream-client";

export async function getVideoUploadUrl(lessonId: string, maxDurationSeconds: number) {
  await assertLessonOwner(lessonId); // mismo patrón que assertCourseOwner, vía moduleId → courseId
  const { uploadURL, uid } = await createDirectUploadUrl(maxDurationSeconds);
  await prisma.lesson.update({ where: { id: lessonId }, data: { streamVideoId: uid } });
  return { uploadURL }; // el navegador del instructor hace el POST del archivo directo a esta URL
}
```

```ts
// app/api/webhooks/cloudflare-stream/route.ts
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  // Cloudflare firma el body — verificar contra CLOUDFLARE_STREAM_WEBHOOK_SECRET
  // (header `webhook-signature`) antes de procesar, igual de estricto que el webhook de Wompi.
  const body = await req.json();
  const { uid, status } = body;

  if (status?.state === "ready") {
    await prisma.lesson.updateMany({
      where: { streamVideoId: uid },
      data: { videoDurationSec: Math.round(body.duration ?? 0) },
    });
  }
  if (status?.state === "error") {
    console.error(`[cloudflare-stream] Fallo al procesar video ${uid}: ${status.errorReasonText}`);
    // notificar al instructor (Brevo) que el video falló y debe re-subirlo
  }

  return Response.json({ received: true });
}
```

**Reproducción en el dashboard del estudiante:** el componente de video del cliente nunca recibe la URL HLS directamente desde la base de datos — siempre pide un token firmado fresco a una Server Action (`getSignedPlaybackToken(lessonId)`), que valida que el usuario tenga `Enrollment` activo para ese curso antes de firmar. Esto evita que un usuario comparta un enlace de video persistente con alguien sin acceso.

---

## 17. Server Actions — Vendor onboarding y productos de vendor

```ts
// lib/actions/vendor/onboarding.ts
"use server";
import { encryptBankInfo } from "@/lib/crypto/vendor-bank"; // ver §18.1

export async function registerAsVendor(displayName: string, bio: string) {
  const session = await getSession();
  if (!session?.user) throw new Error("No autenticado");

  const existing = await prisma.vendor.findUnique({ where: { userId: session.user.id } });
  if (existing) throw new Error("Ya tienes un perfil de vendor");

  return prisma.vendor.create({
    data: {
      userId: session.user.id,
      displayName,
      bio,
      status: "pending_kyc",
      commissionPct: Number(process.env.MARKETPLACE_COMMISSION_PCT ?? 20),
    },
  });
}

export async function submitVendorKyc(vendorId: string, data: {
  taxIdType: string;
  taxIdNumber: string;
  taxDocumentKey: string;     // ya subido a R2 vendor-documents/ por el route handler de upload
  bankAccountInfo: { bankName: string; accountType: string; accountNumber: string };
}) {
  await assertOwnVendorProfile(vendorId);
  const encrypted = encryptBankInfo(data.bankAccountInfo);
  return prisma.vendor.update({
    where: { id: vendorId },
    data: {
      taxIdType: data.taxIdType,
      taxIdNumber: data.taxIdNumber,
      taxDocumentKey: data.taxDocumentKey,
      bankAccountInfo: encrypted,
      status: "pending_review", // pasa a cola de revisión de super_admin
    },
  });
}

export async function approveVendor(vendorId: string) {
  const session = await getSession();
  if ((session?.user as any)?.role !== "super_admin") throw new Error("No autorizado");
  return prisma.vendor.update({
    where: { id: vendorId },
    data: { status: "active", approvedAt: new Date(), approvedBy: session!.user.id },
  });
}
```

**Server Actions de productos de vendor (`lib/actions/vendor/vendor-products.ts`):** reutilizan la misma lógica de `lib/actions/admin/products.ts` (crear, editar, configurar precio/cupo, vincular video y quizzes vía Course Builder) pero con dos diferencias: (1) el `vendorId` se asigna automáticamente al `Vendor.id` de la sesión actual, nunca lo elige el formulario; (2) en vez de `publishProduct()` directo, la acción equivalente es `submitProductForReview()`, que pone `reviewStatus: 'pending_review'` y notifica (Brevo) al equipo editorial — nunca indexa en Meilisearch ni pone `published: true` por sí misma.

---

## 18. Comisión y payouts a vendors

### 18.1 Cifrado de datos bancarios

```ts
// lib/crypto/vendor-bank.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.VENDOR_BANK_ENCRYPTION_KEY!, "base64"); // 32 bytes

export function encryptBankInfo(data: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Empaquetado: iv + authTag + ciphertext, todo en base64 para guardarlo en el campo Json como string
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptBankInfo(packed: string): object {
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}
```

`VENDOR_BANK_ENCRYPTION_KEY` es una variable de entorno **distinta** de `BETTER_AUTH_SECRET` — nunca reutilizar secretos entre dominios de seguridad distintos. Solo el código de generación de payout (§18.2) llama a `decryptBankInfo`; ninguna pantalla de admin la expone en claro.

### 18.2 Cálculo y aprobación de payouts

```ts
// lib/actions/admin/payouts.ts
"use server";

export async function generateMonthlyPayoutBatch(periodStart: Date, periodEnd: Date) {
  await assertSuperAdmin();

  const vendors = await prisma.vendor.findMany({ where: { status: "active" } });
  const created = [];

  for (const vendor of vendors) {
    const orders = await prisma.order.findMany({
      where: {
        status: "paid",
        createdAt: { gte: periodStart, lte: periodEnd },
        items: { some: { product: { vendorId: vendor.id } } },
      },
      include: { items: { include: { product: true } } },
    });

    const grossAmount = orders
      .flatMap((o) => o.items.filter((i) => i.product.vendorId === vendor.id))
      .reduce((sum, item) => sum + item.priceAtPurchase, 0);

    if (grossAmount === 0) continue;

    const commissionAmount = Math.round(grossAmount * (vendor.commissionPct / 100));
    const netAmount = grossAmount - commissionAmount;

    created.push(
      await prisma.payout.create({
        data: { vendorId: vendor.id, periodStart, periodEnd, grossAmount, commissionAmount, netAmount, status: "pending" },
      })
    );
  }

  return created; // queda en 'pending' — requiere aprobación manual antes de disparar el pago real, ver §18.3
}
```

### 18.3 Disparo del pago real — punto de parada obligatorio

**No se implementa el disparo automático de transferencias bancarias reales en la primera versión de este feature** (ver `AGENTS.md §8`). El flujo correcto:
1. `generateMonthlyPayoutBatch()` corre por cron, deja los `Payout` en `pending`.
2. `super_admin` revisa el lote en `/admin/payouts` (ver `UX_UI.md §3.14`), puede ajustar o marcar un payout como `failed` si hay disputa.
3. Solo entonces, una acción explícita `approveAndSendPayout(payoutId)` desencripta los datos bancarios del vendor, llama a la API de transferencias de Wompi con `WOMPI_VENDOR_PAYOUT_KEY`, y actualiza `Payout.status = 'processing'` → `'paid'` al confirmar.
4. Cualquier fallo en el paso 3 deja el `Payout` en `failed` con el motivo registrado — nunca se reintenta automáticamente sin que un humano lo revise.
