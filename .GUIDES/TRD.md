# TRD — Medicamentum360
**Technical Requirements Document**
Versión: 1.0 · Fecha: 2026-06-19
Stack confirmado en sesiones previas — este documento detalla la implementación técnica de los requisitos del PRD.md.

---

## 1. Arquitectura general

```
                         ┌─────────────────────────┐
                         │   medicamentum360.com    │
                         │  Next.js App Router (SSR/│
                         │  SSG público, RSC priv.) │
                         └───────────┬──────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
┌───────▼────────┐         ┌─────────▼─────────┐        ┌─────────▼─────────┐
│ InsForge        │         │  Server Actions /  │        │  InsForge Storage  │
│ Postgres + RLS  │◄───────►│  Route Handlers    │───────►│  (imágenes, PDFs,  │
│ (Prisma ORM)    │         │  (lógica de negocio)│        │  certificados)     │
└─────────────────┘         └─────────┬──────────┘        └────────────────────┘
                                       │
       ┌───────────────────┬──────────┼───────────────┬────────────────┐
       │                   │          │                │                │
┌──────▼──────┐   ┌────────▼───┐ ┌────▼─────┐  ┌───────▼──────┐ ┌───────▼──────┐
│ Better Auth │   │  Wompi API │ │ Moodle   │  │ Meilisearch  │ │    Brevo     │
│ (sesiones,  │   │  + Webhook │ │ Web      │  │  (búsqueda   │ │ (email       │
│ Google OAuth)│  │  HMAC      │ │ Services │  │  marketplace)│ │ transaccional)│
└─────────────┘   └────────────┘ └────┬─────┘  └──────────────┘ └──────────────┘
                                       │
                              ┌────────▼─────────┐
                              │ lms.medicamentum  │
                              │ 360.com (Moodle)  │
                              └───────────────────┘
```

### 1.1 Qué se despliega dónde (aclaración explícita — fuente de confusión real ya detectada)

InsForge **no es una plataforma de hosting de aplicaciones**. No hay nada que "desplegar" ahí. Es exclusivamente un proveedor de infraestructura backend:

| Pieza | Dónde vive / se despliega | Qué NO es |
|---|---|---|
| Aplicación Next.js (páginas, Server Actions, Route Handlers, webhooks) | **Vercel** (o equivalente compatible con App Router) | No vive en InsForge. InsForge no ejecuta tu código de aplicación. |
| Base de datos Postgres + RLS | **InsForge** | Solo expone connection strings (`DATABASE_URL`/`DIRECT_URL`) que la app desplegada en Vercel consume desde afuera. |
| Storage (avatares, certificados, facturas) | **InsForge Storage** | Igual que la DB: la app en Vercel le habla por API/SDK, no "vive" dentro de InsForge. |
| Moodle | `lms.medicamentum360.com`, su propio servidor (o el contenedor Docker local en desarrollo) | Independiente de Vercel e InsForge por completo. |

La relación es siempre: **Vercel aloja y ejecuta la app → la app se conecta hacia afuera a InsForge (DB/Storage), Moodle, Wompi, Meilisearch y Brevo usando credenciales en variables de entorno.** Nunca al revés. Si en algún punto el flujo de trabajo intenta "desplegar en InsForge", es un error de modelo mental — no existe ese paso.

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js (App Router) | SSR/SSG público, Server Actions para mutaciones privadas |
| DB | InsForge Postgres | Acceso vía Prisma ORM |
| ORM | Prisma | Migraciones versionadas, `schema.prisma` como fuente de verdad |
| Seguridad de datos | Row Level Security (RLS) a nivel Postgres | Aislamiento multi-tenant obligatorio antes de pagos |
| Auth | Better Auth | Email+password, Google OAuth, sesiones, roles |
| Pagos | Wompi | Pago único MVP, webhook con validación HMAC-SHA256 |
| LMS | Moodle (headless) | Subdominio `lms.medicamentum360.com`, API REST + SSO |
| Búsqueda | Meilisearch | Índice de catálogo (productos) |
| Storage | InsForge Storage | Avatares, portadas de producto, certificados PDF, facturas |
| Email | Brevo | Transaccional (confirmación, recuperación, certificados) |
| 3D/VR | React Three Fiber + Three.js + WebXR | Visor de preview de experiencias VR |
| Analítica | GA4 / Posthog | A definir cuál se usa en Fase 8 |

## 3. Modelo de datos (Prisma — esquema de referencia)

```prisma
enum Role {
  super_admin
  hospital_admin
  student
}

enum ProductType {
  course
  vr_experience
  ai_automation
}

enum OrderStatus {
  pending
  paid
  failed
  refunded
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  nit       String?
  orgCode   String   @unique // código de invitación único por organización
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       User[]
  orders      Order[]
  invitations OrganizationInvitation[]

  @@map("organizations")
}

model Plan {
  id          String   @id @default(cuid())
  name        String
  description String
  priceCents  Int
  features    String[] // array de características incluidas
  recommended Boolean  @default(false)
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("plans")
}

model OrganizationInvitation {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email           String
  role            Role         @default(student)
  orgCode         String       @unique // código compartido para todos los invitados de esta org
  invitedByUserId String
  expiresAt       DateTime
  accepted        Boolean      @default(false)
  createdAt       DateTime     @default(now())

  @@index([organizationId, email])
  @@map("organization_invitations")
}

model User {
  id             String        @id @default(cuid())
  email          String        @unique
  name           String
  lastName       String?
  emailVerified  Boolean       @default(false)
  image          String?
  role           Role          @default(student)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  moodleUserId   Int?          @unique  // mapeo cuenta espejo en Moodle
  profilePicUrl  String?
  specialty      String?
  locale         String        @default("es")
  theme          String        @default("system")
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  enrollments    Enrollment[]
  orders         Order[]
  cartItems      CartItem[]
  certificates   Certificate[]
  reviews        Review[]
  calendarEvents CalendarEvent[]
  sessions       Session[]
  accounts       Account[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id                    String    @id @default(cuid())
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@map("account")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}

model Product {
  id             String      @id @default(cuid())
  type           ProductType
  title          String
  slug           String      @unique
  description    String
  priceCents     Int
  discountCents  Int?
  coverImageUrl  String?
  moodleCourseId Int?      // null si type = vr_experience o ai_automation
  vrAssetUrl     String?     // modelo/escena para preview R3F
  capacity       Int?        // cupo restante para cursos con plazas limitadas
  published      Boolean     @default(false)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  enrollments Enrollment[]
  orderItems  OrderItem[]
  reviews     Review[]

  @@map("products")
}

model Enrollment {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId      String
  product        Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  progressPct    Int       @default(0)
  status         String    @default("not_started") // not_started | in_progress | completed
  moodleEnrolId  Int?
  lastAccessedAt DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([userId, productId])
  @@map("enrollments")
}

model Cart {
  id         String     @id @default(cuid())
  userId     String?    @unique // null = invitado, identificado por cookie/session token
  guestToken String?    @unique
  items      CartItem[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  @@map("carts")
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  quantity  Int      @default(1)
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("cart_items")
}

model Order {
  id                 String        @id @default(cuid())
  userId             String
  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId     String?
  organization       Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  status             OrderStatus   @default(pending)
  subtotalCents      Int
  taxCents           Int
  totalCents         Int
  billingDocType     String      // NIT | CC
  billingDocId       String
  wompiTransactionId String?       @unique
  items              OrderItem[]
  createdAt          DateTime      @default(now())
  paidAt             DateTime?
  updatedAt          DateTime      @updatedAt

  @@map("orders")
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Restrict)
  priceCents Int
  quantity   Int      @default(1)
  createdAt  DateTime @default(now())

  @@map("order_items")
}

model Certificate {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId   String
  pdfUrl      String
  issuedAt    DateTime @default(now())
  linkedinUrl String?
  createdAt   DateTime @default(now())

  @@map("certificates")
}

model Review {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("reviews")
}

model CalendarEvent {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title         String
  startsAt      DateTime
  endsAt        DateTime?
  googleEventId String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("calendar_events")
}
```

> Nota: este esquema es de referencia. Antes de migrar, validar contra `MASTER_PROMPT.md` / `DESIGN.md` existentes para evitar divergencias con decisiones ya tomadas en sesiones previas.

## 4. RLS y seguridad multi-tenant

Reglas obligatorias por tabla con `organizationId` o `userId`:

- `User`: un `hospital_admin` solo puede leer/listar usuarios de su propia `organizationId`. `student` solo puede leer su propio registro. `super_admin` sin restricción.
- `Order` / `OrderItem`: visibles solo para el `userId` dueño o el `hospital_admin` de la misma `organizationId`.
- `Enrollment`: visible para el propio `userId`, o para `hospital_admin` de la misma organización en modo agregado (solo progreso, no contenido).
- `CalendarEvent`: estrictamente por `userId`, sin excepción de `hospital_admin`.

**Criterio de aceptación bloqueante:** antes de habilitar pagos reales en producción, ejecutar y documentar un **test de aislamiento cruzado**: un `hospital_admin` de la Organización A intenta leer datos de la Organización B vía API/Server Action y debe recibir 0 resultados o 403, en todas las tablas con RLS activo.

## 5. Autenticación y autorización

- Better Auth maneja sesión + Google OAuth. Rol (`Role`) se almacena en el modelo `User` y se inyecta en la sesión (JWT o cookie de sesión, según configuración de Better Auth).
- **Middleware RBAC** (`middleware.ts`): valida sesión + role a nivel de ruta antes de permitir acceso.
  - Rutas protegidas: `/dashboard`, `/configuracion`, `/checkout`, `/mis-cursos` — requieren sesión.
  - Rutas org: `/org` — requieren `hospital_admin` o superior.
  - Rutas admin: `/admin` — requieren `super_admin`.
  - Jerarquía de roles: `super_admin` (3) > `hospital_admin` (2) > `student` (1).
  - Unauthenticated → redirect a `/sign-in?redirect_to=...`.
  - Sin permiso → redirect a `/dashboard`.
- **Server Actions RBAC:** cada acción valida `role` explícitamente además de confiar en RLS (defensa en profundidad).
  - `lib/actions/invitation.ts`: `createInvitation`, `listOrgInvitations`, `deleteInvitation` — solo `hospital_admin`/`super_admin`.
  - `lib/actions/organization.ts`: `linkUserToOrganization` — cualquier usuario autenticado (se vincula post-registro).
- **Sistema de invitaciones:** `/sign-up?org_code=HOSP123` vincula automáticamente al usuario a la organización del código.
- **MVP adicional:** verificación de email, CAPTCHA en registro, rate limiting (ver BACKEND.md §8).
- **Backlog:** 2FA TOTP para `hospital_admin` y `super_admin`.

## 6. Integración con Moodle (detalle técnico)

### Modo 1 — API REST (MVP)
- Cliente server-side `lib/moodle/client.ts` que envuelve `core_course_get_courses`, `core_user_get_users`, `core_user_create_users`, `enrol_manual_enrol_users`, `core_completion_get_activities_completion_status`, `core_grades_get_grades`.
- Token de Web Services almacenado como `MOODLE_WS_TOKEN` (env var, server-only, nunca expuesto al cliente).
- Todas las llamadas se hacen desde Route Handlers o Server Actions, nunca desde el cliente.

### Modo 2 — SSO/Autologin (MVP)
- Endpoint propio `POST /api/moodle/autologin` genera token de un solo uso vía `auth_userkey` (o plugin equivalente de autologin) y retorna URL de redirección a Moodle.
- Token expira en segundos; uso único.

### Modo 3 — LTI 1.3 (post-MVP)
- Medicamentum360 = LTI Platform; Moodle = LTI Tool.
- Intercambio de identidad vía JWT firmado con RSA (par de llaves registrado en ambos sistemas).
- Servicio de calificaciones (Assignment and Grading Services) sincroniza progreso en tiempo real de vuelta a la DB propia.
- Requiere configurar `Content-Security-Policy: frame-ancestors` en Moodle para permitir embeber desde `medicamentum360.com`.

### Sincronización de usuarios
- Al registrarse en Medicamentum360, se crea automáticamente una cuenta espejo en Moodle (mismo correo) vía `core_user_create_users`. Se persiste `moodleUserId` en el modelo `User`.

## 7. Integración con Wompi

- Checkout embebe el widget Wompi (iframe con tokenización), sin manejar datos de tarjeta directamente.
- Webhook `POST /api/webhooks/wompi`:
  1. Verificar firma HMAC-SHA256 contra `WOMPI_EVENTS_SECRET`.
  2. Verificar idempotencia: si `wompiTransactionId` ya existe con `status = paid`, ignorar (evitar doble inscripción).
  3. Actualizar `Order.status`, `Order.paidAt`.
  4. Disparar inscripción Moodle (`enrol_manual_enrol_users`) por cada `OrderItem` de tipo `course`.
  5. Para `vr_experience`: generar código de redención (lógica separada, ver backlog VR).
  6. Disparar email de confirmación vía Brevo.
- **Backlog:** factura electrónica DIAN automatizada (evaluar proveedor: Siigo, Alegra, o integración directa DIAN).

## 8. Búsqueda (Meilisearch)

- Índice `products`: `title`, `description`, `type`, `priceCents`, `rating`, `categoryTags`.
- Sincronización: hook post-`create`/`update`/`delete` de `Product` en Prisma → reindexar documento en Meilisearch (síncrono en MVP; cola en fases posteriores si el catálogo crece).
- Buscador del marketplace consulta Meilisearch directamente (no Postgres) para baja latencia y typo-tolerance.

## 9. Almacenamiento (InsForge Storage)

- Buckets sugeridos: `avatars/`, `product-covers/`, `certificates/`, `invoices/`, `vr-assets/`.
- URLs firmadas con expiración corta para `certificates/` e `invoices/` (documentos sensibles); URLs públicas para `product-covers/` y `avatars/`.

## 10. Email transaccional (Brevo)

Eventos mínimos del MVP:
- Verificación de cuenta (doble opt-in).
- Recuperación de contraseña.
- Confirmación de compra (con resumen + acceso).
- Notificación de inscripción exitosa en curso.
- Alerta de bloqueo temporal de cuenta (tras N intentos fallidos).

## 11. 3D / WebXR (React Three Fiber)

- Preview de experiencias VR en la página de detalle: escena ligera (low-poly o glTF comprimido), carga lazy (`dynamic import`, `ssr: false`).
- Controles: rotación orbital + zoom, sin requerir hardware VR para el preview web.
- El contenido VR completo (Meta Quest) se redime fuera de la plataforma web (código de redención / enlace a app de Quest); el visor R3F es solo demostrativo.

## 12. Caching

- Catálogo de cursos y progreso de Moodle: cacheados en DB propia (tabla espejo) o Redis, con invalidación al recibir webhook de Moodle o en refresh programado (cron cada N minutos).
- Resultado de Meilisearch: no requiere caché adicional (ya es de baja latencia).

## 13. SEO / Rendering

- Landing y marketplace: SSG/ISR donde el catálogo lo permita; revalidación incremental al publicar/editar producto.
- Detalle de producto: SSR para datos de precio/disponibilidad en tiempo real, con metadata dinámica (`generateMetadata`) para Open Graph/Twitter Card.
- `/dashboard`, `/configuracion`, `/checkout`: rutas privadas, sin indexar (`robots: noindex`).

## 14. Observabilidad

- Logging estructurado de Server Actions críticas (pago, inscripción Moodle, creación de usuario espejo).
- Error tracking recomendado (Sentry o equivalente) — decisión pendiente, no bloqueante para MVP.
- Analítica de producto: GA4 o Posthog, eventos clave: `add_to_cart`, `begin_checkout`, `purchase`, `course_started`, `course_completed`.

## 15. Variables de entorno (mínimo)

```
DATABASE_URL=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_EVENTS_SECRET=
MOODLE_BASE_URL=
MOODLE_WS_TOKEN=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
INSFORGE_STORAGE_URL=
INSFORGE_STORAGE_KEY=
BREVO_API_KEY=
NEXT_PUBLIC_BRAND_COLOR=#8127cf
```

## 16. Requisitos críticos de testing

- **Bloqueante antes de producción:** test de aislamiento RLS cross-org (ver §4).
- Test de idempotencia del webhook de Wompi (envío duplicado del mismo evento no debe duplicar inscripción ni orden).
- Test del flujo completo "pago → inscripción Moodle → acceso SSO" en ambiente de staging con cuenta de prueba de Wompi.
- Test de expiración/un solo uso del token de autologin Moodle.

## 17. Entorno local de Moodle para pruebas (Docker)

Para desarrollar y probar la integración Moodle (§6) sin depender de `lms.medicamentum360.com`, existe un entorno Docker auto-provisionado en `docker/` (ver `docker/README.md`):

- `docker/docker-compose.yml` — MariaDB + Moodle (`bitnami/moodle:5.2`, auto-instalado por variables de entorno) + un contenedor "job" (`moodle-bootstrap`) de un solo uso.
- `docker/moodle-bootstrap.php` — habilita Web Services + REST, crea el external service `m360_api` con las funciones de §6, genera un token permanente, crea un curso demo (`M360-DEMO-001`) y un estudiante de prueba ya inscrito. Idempotente.
- Salida en `docker/output/.env.moodle.local` con `MOODLE_BASE_URL` y `MOODLE_WS_TOKEN` listos para copiar a tu `.env.local`.

Con `docker compose up -d` dentro de `docker/` tienes en 1–3 minutos un Moodle real contra el cual correr los tests de §16 relacionados con la integración (sin tocar producción ni staging).
