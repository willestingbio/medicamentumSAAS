# DEPLOY.md — Medicamentum360
**Infraestructura VPS — Guía de despliegue y operaciones**
Versión: 1.0 · Fecha: 2026-06-22

> Este documento reemplaza toda referencia a Vercel e InsForge como plataforma de hosting.
> El stack de infraestructura es ahora: **VPS propio + Docker Compose + Nginx + Let's Encrypt + Postgres gestionado propio o managed (Neon/Supabase/Railway)**.

---

## 1. Arquitectura de producción en VPS

```
                          Internet
                              │
                    ┌─────────▼──────────┐
                    │     Nginx           │
                    │  (SSL, proxy,       │
                    │   rate limiting,    │
                    │   static files)     │
                    └────────┬───────────┘
                             │
              ┌──────────────┴───────────────┐
              │                              │
   ┌──────────▼──────────┐       ┌───────────▼──────────┐
   │  Next.js App         │       │  Moodle               │
   │  (Docker, standalone)│       │  (Docker, solo local/ │
   │  puerto 3000         │       │   staging; prod en    │
   └──────────┬───────────┘       │   su propio VPS)      │
              │                   └──────────────────────┘
   ┌──────────▼───────────────────────────────────────┐
   │              Servicios de soporte                 │
   │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
   │  │ Postgres │  │  Redis   │  │  Meilisearch   │  │
   │  │ (Docker) │  │ (Docker) │  │  (Docker)      │  │
   │  └──────────┘  └──────────┘  └────────────────┘  │
   └──────────────────────────────────────────────────┘
```

---

## 2. Requerimientos del VPS

| Recurso | Mínimo (MVP) | Recomendado (producción) |
|---|---|---|
| RAM | 2 GB | 4–8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Disco | 40 GB SSD | 80–160 GB SSD |
| OS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

**Proveedores recomendados (ordenados por relación precio/rendimiento):**
- **Hetzner** (CX22: 2 vCPU, 4 GB RAM, €5.77/mes) — mejor precio de Europa, datacenters en Alemania/Finlandia
- **Contabo** (VPS S: 4 vCPU, 8 GB RAM, ~$7/mes) — muy buena relación precio/recursos
- **DigitalOcean** (Droplet: $12–20/mes) — interfaz amigable, buen soporte
- **Vultr** (similar a DigitalOcean)
- **OVH** (opción latinoamericana con datacenter en Brasil)

---

## 3. Estructura de archivos del proyecto (en VPS)

```
/opt/medicamentum360/
├── docker-compose.yml          ← orquestación de todos los servicios
├── docker-compose.prod.yml     ← overrides de producción
├── .env.production             ← variables (NO en git)
├── nginx/
│   ├── nginx.conf              ← configuración principal
│   └── conf.d/
│       └── medicamentum.conf   ← virtual host
├── app/                        ← código de la app (git clone aquí)
│   ├── Dockerfile
│   └── ...
├── certbot/
│   ├── conf/                   ← certificados Let's Encrypt
│   └── www/                    ← challenge files
└── data/
    ├── postgres/               ← datos de Postgres (volumen Docker)
    ├── redis/                  ← datos de Redis
    └── meilisearch/            ← índices de Meilisearch
```

---

## 4. Dockerfile (Next.js — multi-stage standalone)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Etapa 1: instalar dependencias
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Etapa 2: build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de build (no secretos — solo públicas)
ARG NEXT_PUBLIC_BRAND_COLOR=#8127cf
ENV NEXT_PUBLIC_BRAND_COLOR=$NEXT_PUBLIC_BRAND_COLOR

RUN npx prisma generate
RUN npm run build

# Etapa 3: imagen de producción (mínima)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios del modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**next.config.js** — activar modo standalone:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // ← OBLIGATORIO para Docker en VPS
  // ...resto de tu config
};

module.exports = nextConfig;
```

---

## 5. docker-compose.yml (producción)

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: medicamentum_app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - DIRECT_URL=${DIRECT_URL}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=${BETTER_AUTH_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - WOMPI_PUBLIC_KEY=${WOMPI_PUBLIC_KEY}
      - WOMPI_PRIVATE_KEY=${WOMPI_PRIVATE_KEY}
      - WOMPI_EVENTS_SECRET=${WOMPI_EVENTS_SECRET}
      - MOODLE_BASE_URL=${MOODLE_BASE_URL}
      - MOODLE_WS_TOKEN=${MOODLE_WS_TOKEN}
      - MEILI_HOST=http://meilisearch:7700
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - REDIS_URL=redis://redis:6379
      - BREVO_API_KEY=${BREVO_API_KEY}
      - NEXT_PUBLIC_BRAND_COLOR=#8127cf
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      - app_cache:/app/.next/cache  # persistir caché ISR entre reinicios

  postgres:
    image: postgres:16-alpine
    container_name: medicamentum_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: medicamentum360
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./data/postgres/init:/docker-entrypoint-initdb.d  # scripts de init
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d medicamentum360"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: medicamentum_redis
    restart: unless-stopped
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.13
    container_name: medicamentum_meili
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
      MEILI_ENV: production
    volumes:
      - meilisearch_data:/meili_data
    networks:
      - app-network

  nginx:
    image: nginx:1.27-alpine
    container_name: medicamentum_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - app-network

  certbot:
    image: certbot/certbot:latest
    container_name: medicamentum_certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    # Solo se ejecuta manualmente para renovar: docker compose run certbot renew
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
  app_cache:
  nginx_logs:

networks:
  app-network:
    driver: bridge
```

---

## 6. Configuración de Nginx

```nginx
# nginx/conf.d/medicamentum.conf

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name medicamentum360.com www.medicamentum360.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS principal
server {
    listen 443 ssl;
    http2 on;
    server_name medicamentum360.com www.medicamentum360.com;

    # SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/medicamentum360.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/medicamentum360.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Seguridad
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Archivos estáticos — servidos directamente por Nginx (mucho más rápido)
    location /_next/static/ {
        alias /opt/medicamentum360/app/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public/ {
        alias /opt/medicamentum360/app/public/;
        expires 30d;
    }

    # Rate limiting en auth
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limiting en APIs generales
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # CRÍTICO: desactivar buffering para streaming de React Server Components
        proxy_buffering off;
        add_header X-Accel-Buffering "no";
    }

    # App principal
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Desactivar buffering para RSC streaming
        proxy_buffering off;
    }

    # Tamaño máximo de upload (imágenes de portada, modelos VR)
    client_max_body_size 50M;
}
```

---

## 7. Variables de entorno en VPS (.env.production)

```env
# Base de datos — Postgres local en Docker
DATABASE_URL=postgresql://medicamentum:${POSTGRES_PASSWORD}@postgres:5432/medicamentum360?sslmode=disable
# Para migraciones (conexión directa, sin pooler)
DIRECT_URL=postgresql://medicamentum:${POSTGRES_PASSWORD}@postgres:5432/medicamentum360?sslmode=disable

# Postgres
POSTGRES_USER=medicamentum
POSTGRES_PASSWORD=<genera-con-openssl-rand-base64-32>

# Better Auth
BETTER_AUTH_SECRET=<genera-con-openssl-rand-base64-32>
BETTER_AUTH_URL=https://medicamentum360.com  # dominio real, nunca localhost

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

# Redis
REDIS_PASSWORD=<genera-con-openssl-rand-base64-32>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# Meilisearch
MEILI_MASTER_KEY=<genera-con-openssl-rand-base64-32>

# Storage local (reemplaza InsForge Storage)
# Opción A: MinIO auto-alojado (ver §9)
STORAGE_ENDPOINT=https://storage.medicamentum360.com
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=medicamentum360

# Opción B: Cloudflare R2 (compatible S3, free tier generoso)
# STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
# STORAGE_ACCESS_KEY=...
# STORAGE_SECRET_KEY=...

# Email — Brevo (sin cambios)
BREVO_API_KEY=...

# Brand
NEXT_PUBLIC_BRAND_COLOR=#8127cf
```

**Generar secretos seguros:**
```bash
# En el VPS, genera cada secreto así:
openssl rand -base64 32
```

---

## 8. CI/CD con GitHub Actions → VPS

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/medicamentum360/app
            git pull origin main
            docker compose -f /opt/medicamentum360/docker-compose.yml build app --no-cache
            docker compose -f /opt/medicamentum360/docker-compose.yml up -d --no-deps app
            docker system prune -f
```

**Secretos requeridos en GitHub → Settings → Secrets:**
- `VPS_HOST`: IP o dominio del VPS
- `VPS_USER`: usuario SSH (no root)
- `VPS_SSH_KEY`: llave privada SSH

**Zero-downtime con health check:**
```yaml
# Añadir en el servicio `app` de docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

---

## 9. Storage de archivos — opciones (reemplaza InsForge Storage)

### Opción A: Cloudflare R2 (recomendada para empezar)
- Free tier: 10 GB/mes incluidos
- Compatible con AWS S3 SDK (sin cambios de código significativos)
- Sin egress fees

```ts
// lib/storage/client.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const storageClient = new S3Client({
  region: "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
});

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await storageClient.send(
    new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${process.env.STORAGE_PUBLIC_URL}/${key}`;
}
```

### Opción B: MinIO auto-alojado
Añadir al `docker-compose.yml`:
```yaml
minio:
  image: minio/minio:latest
  container_name: medicamentum_minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes:
    - minio_data:/data
  networks:
    - app-network
  # Exponer consola solo en localhost (no al exterior)
  # Acceder vía SSH tunnel: ssh -L 9001:localhost:9001 usuario@vps
```

---

## 10. Base de datos — Postgres en VPS vs. managed

### Opción A: Postgres en el mismo VPS (Docker)
- Más barato, todo en un servidor
- Requiere configurar backups manualmente
- Recomendado para MVP y proyectos pequeños

**Backup automático con cron:**
```bash
# /opt/medicamentum360/scripts/backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/medicamentum360/backups
mkdir -p $BACKUP_DIR

docker exec medicamentum_postgres pg_dump \
  -U medicamentum medicamentum360 \
  | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Opcional: copiar a S3/R2 para offsite backup
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://tu-bucket-backups/
```

```bash
# Agregar al crontab (cron diario a las 2am)
0 2 * * * /opt/medicamentum360/scripts/backup-db.sh >> /var/log/medicamentum-backup.log 2>&1
```

### Opción B: Managed Postgres (recomendado si el presupuesto lo permite)
- **Neon** (free tier generoso, serverless Postgres, branching)
- **Supabase** (gratis hasta 500 MB, incluye Storage y Auth — aunque tu proyecto ya usa Better Auth)
- **Railway** ($5/mes)

Con managed Postgres, `DATABASE_URL` apunta al host externo. El singleton de Prisma y el patrón de conexión son idénticos.

---

## 11. SSL con Let's Encrypt (primera vez)

```bash
# En el VPS, con Nginx corriendo (modo HTTP temporal):
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d medicamentum360.com \
  -d www.medicamentum360.com \
  --email admin@medicamentum360.com \
  --agree-tos \
  --no-eff-email

# Renovación automática ya configurada en docker-compose.yml (servicio certbot)
# Verificar que el cron de Nginx recargue la config después de renovar:
echo "0 3 * * * docker exec medicamentum_nginx nginx -s reload" | crontab -
```

---

## 12. Setup inicial del VPS (checklist)

```bash
# 1. Actualizar sistema
apt update && apt upgrade -y

# 2. Instalar Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER  # tu usuario no-root

# 3. Crear usuario no-root para deploys
adduser deploy
usermod -aG docker deploy

# 4. Configurar SSH key para GitHub Actions
su - deploy
mkdir ~/.ssh && chmod 700 ~/.ssh
# Pegar llave pública del par que configurarás en GitHub Secrets
nano ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 5. Configurar firewall (UFW)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 6. Clonar repo y crear estructura
mkdir -p /opt/medicamentum360/{data,nginx/conf.d,certbot/{conf,www},scripts,backups}
git clone <tu-repo> /opt/medicamentum360/app
cp /opt/medicamentum360/app/.env.example /opt/medicamentum360/.env.production
# Editar .env.production con valores reales

# 7. Primera ejecución
cd /opt/medicamentum360
docker compose up -d postgres redis
# Esperar a que Postgres esté listo, luego aplicar migraciones:
docker compose run --rm app npx prisma migrate deploy
# Levantar todo
docker compose up -d
```

---

## 13. Monitoring y observabilidad

### Uptime monitoring (gratuito)
- **UptimeRobot** o **Better Uptime** — alertas por email/Telegram cuando el sitio cae
- URL a monitorear: `https://medicamentum360.com/api/health`

### Logs
```bash
# Ver logs en tiempo real
docker compose logs -f app
docker compose logs -f nginx

# Logs de Nginx (acceso y errores)
docker exec medicamentum_nginx tail -f /var/log/nginx/access.log
docker exec medicamentum_nginx tail -f /var/log/nginx/error.log
```

### Métricas (opcional, para más madurez)
- **Grafana + Prometheus** (auto-alojado en el mismo VPS si tiene RAM suficiente)
- **Sentry** (free tier para error tracking — 5k errores/mes)

```ts
// Añadir Sentry al proyecto:
// npm install @sentry/nextjs
// npx @sentry/wizard@latest -i nextjs
```

---

## 14. Migraciones en producción

Con Postgres propio (sin InsForge CLI), las migraciones vuelven al flujo estándar de Prisma:

```bash
# Opción A: Prisma migrate deploy (recomendado en CI/CD)
docker compose run --rm app npx prisma migrate deploy

# Opción B: SQL directo (para migraciones manuales o scripts complejos)
docker exec -i medicamentum_postgres psql -U medicamentum -d medicamentum360 < migrations/20260622100000_add-plans-and-invitations.sql
```

**En GitHub Actions, añadir step de migración antes de restart:**
```yaml
- name: Run migrations
  uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      cd /opt/medicamentum360
      docker compose run --rm app npx prisma migrate deploy
```

---

## 15. Checklist pre-producción (adaptado a VPS)

- [ ] `output: 'standalone'` en `next.config.js`
- [ ] Dockerfile multi-stage probado localmente (`docker build -t app . && docker run -p 3000:3000 app`)
- [ ] Nginx con `proxy_buffering off` para RSC streaming
- [ ] SSL instalado y HTTPS funcionando
- [ ] HTTP → HTTPS redirect activo
- [ ] Rate limiting en `/api/auth/` y `/api/`
- [ ] `BETTER_AUTH_URL` apunta al dominio real (no localhost)
- [ ] `trustedOrigins` en `lib/auth.ts` incluye el dominio de producción
- [ ] Google OAuth: redirect URI registrado en Google Cloud Console con el dominio real
- [ ] Variables de entorno en `/opt/medicamentum360/.env.production` (no en el repo)
- [ ] Backups automáticos configurados (cron)
- [ ] UptimeRobot apuntando a `/api/health`
- [ ] Firewall UFW activo (solo 22, 80, 443)
- [ ] Usuario de deploy sin sudo (acceso mínimo necesario)
- [ ] RLS isolation test pasado (ver `tests/rls-isolation-test.sql`)
- [ ] Test de idempotencia webhook Wompi pasado
- [ ] `MOODLE_WS_TOKEN` solo en variables de servidor (no en `NEXT_PUBLIC_*`)
