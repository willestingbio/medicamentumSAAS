# TRD — Medicamentum360
**Technical Requirements Document**
Versión: 2.0 · Fecha: 2026-06-22
Stack actualizado a despliegue VPS auto-alojado — reemplaza referencias a Vercel e InsForge.

> **Cambio mayor v2.0:** la plataforma de hosting pasa de Vercel + InsForge a **VPS propio con Docker Compose**. La base de datos es ahora **Postgres gestionado en el mismo VPS** (o managed externo como Neon/Supabase si se prefiere). El storage de archivos es **Cloudflare R2 o MinIO**. Ver `DEPLOY.md` para la guía completa de infraestructura.

---

## 1. Arquitectura general

```
                     ┌─────────────────────────┐
                     │   medicamentum360.com    │
                     │  Next.js App Router (SSR/│
                     │  SSG público, RSC priv.) │
                     │  Docker — standalone mode│
                     └───────────┬──────────────┘
                                  │  Nginx (SSL, proxy, rate limit)
        ┌───────────────────────────────────────────────────┐
        │                          │                         │
┌───────▼────────┐       ┌─────────▼─────────┐    ┌────────▼───────────┐
│ Postgres        │       │  Server Actions /  │    │  Cloudflare R2     │
│ (Docker en VPS) │◄─────►│  Route Handlers    │───►│  (imágenes, PDFs,  │
│ Prisma ORM      │       │  (lógica de negocio│    │  certificados)     │
└─────────────────┘       └─────────┬──────────┘    └────────────────────┘
                                     │
┌──────────────┬──────────────┬──────┴──────┬────────────┐
│              │              │             │            │
┌──────▼──────┐ ┌──────▼──────┐ ┌───▼────┐ ┌───▼──────┐ ┌───▼────┐
│ Better Auth │ │  Wompi API  │ │ Moodle │ │Meili-    │ │ Brevo  │
│ (sesiones,  │ │  + Webhook  │ │ WS API │ │search    │ │ (email)│
│ Google OAuth)│ │  HMAC      │ │ SSO    │ │(Docker)  │ │        │
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
| Storage | Cloudflare R2 (o MinIO auto-alojado) | Avatares, portadas, certificados PDF, modelos glTF |
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

**Buckets a crear en R2:** `product-covers`, `avatars`, `certificates`, `invoices`, `vr-assets`.
URLs públicas para `product-covers` y `avatars`; URLs firmadas con expiración para `certificates` e `invoices`.

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
DATABASE_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360
DIRECT_URL=postgresql://medicamentum:<password>@postgres:5432/medicamentum360
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

# Brand
NEXT_PUBLIC_BRAND_COLOR=#8127cf
```

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
