# BACKEND — Medicamentum360
**Implementación de Server Actions, Route Handlers y lógica de negocio**
Versión: 2.0 · Fecha: 2026-06-22

> **Cambio v2.0:** se elimina toda referencia a InsForge SDK (`@insforge/sdk`), InsForge CLI y Vercel. La app corre en **VPS con Docker**. Postgres accesible vía TCP directo. Storage via **Cloudflare R2** (o MinIO). Ver `TRD.md §1-2` y `DEPLOY.md` para la arquitectura completa.

> **Fuente de verdad del stack:** Next.js 15 + App Router, Server Actions, React 19. Postgres 16 (Docker) + Prisma 7 (con `@prisma/adapter-pg`). Better Auth 1.6.20. Nginx como reverse proxy.

---

## 1. Convenciones generales

### 1.1 Estructura de directorios de server-side

```
lib/
  auth.ts                    — configuración de Better Auth
  prisma.ts                  — singleton de PrismaClient
  storage/
    client.ts                — cliente S3-compatible (Cloudflare R2 / MinIO)
  moodle/
    client.ts                — cliente HTTP wrapper de la API REST de Moodle
  actions/
    auth.ts                  — registro, vinculación org
    invitation.ts            — CRUD de invitaciones de organización
    organization.ts          — info y miembros de org
    products.ts              — CRUD de productos (público: búsqueda, detalle)
    admin/
      products.ts            — CRUD admin (solo super_admin)
      moodle.ts              — búsqueda y creación de cursos en Moodle
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
    moodle/
      autologin/
        route.ts             — genera autologin token y redirige
    admin/
      upload/
        product-cover/
          route.ts           — upload de imagen a Cloudflare R2
        vr-asset/
          route.ts           — upload de modelo glTF/glb a R2
    auth/
      [...all]/
        route.ts             — handler de Better Auth
```

### 1.2 Singleton de PrismaClient

Con Postgres en Docker (conexión TCP directa), el singleton es más simple que antes — no hay pooler externo ni InsForge SDK:

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,                  // máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // cerrar conexiones inactivas después de 30s
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

Sin cambios respecto a BACKEND v1.0 §4.

---

## 6. Route Handler de autologin SSO a Moodle

Sin cambios respecto a BACKEND v1.0 §5.

---

## 7. Server Actions — Gestión de invitaciones

Sin cambios respecto a BACKEND v1.0 §6.

---

## 8. Server Actions — Panel admin de productos

Sin cambios respecto a BACKEND v1.0 §7.

---

## 9. Server Actions — Moodle desde el panel admin

Sin cambios respecto a BACKEND v1.0 §8.

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
```

---

## 12. Seguridad — checklist pre-producción (adaptado a VPS)

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
