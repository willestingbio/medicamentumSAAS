# BACKEND — Medicamentum360
**Implementación de Server Actions, Route Handlers y lógica de negocio**
Versión: 1.0 · Fecha: 2026-06-22

> **Relación con otros documentos:** este documento detalla la implementación de la capa de servidor. La arquitectura general y el modelo de datos están en `TRD.md`. Los flujos de usuario están en `FLUJOS.md`. La especificación de pantallas está en `UX_UI.md`. El plan de desarrollo fasado está en `PLAN.md`.

> **Fuente de verdad del stack:** Next.js 15 + App Router, Server Actions, React 19. InsForge Postgres + Prisma 7 (con `@prisma/adapter-pg`). Better Auth 1.6.20. Las desviaciones de implementación conocidas respecto a la documentación estándar están en `PLAN.md §12`.

---

## 1. Convenciones generales

### 1.1 Estructura de directorios de server-side

```
lib/
  auth.ts                    — configuración de Better Auth
  prisma.ts                  — singleton de PrismaClient
  moodle/
    client.ts                — cliente HTTP wrapper de la API REST de Moodle
  storage/
    client.ts                — cliente de InsForge Storage
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
    webhooks/
      wompi/
        route.ts             — webhook de Wompi (HMAC + idempotencia)
    moodle/
      autologin/
        route.ts             — genera autologin token y redirige
    admin/
      upload/
        product-cover/
          route.ts           — upload de imagen de portada a InsForge Storage
        vr-asset/
          route.ts           — upload de modelo glTF/glb a InsForge Storage
    auth/
      [...all]/
        route.ts             — handler de Better Auth
```

### 1.2 Singleton de PrismaClient

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Por qué:** en entornos serverless (Vercel), cada función puede crear su propia instancia de Prisma sin el singleton. Esto agota el pool de conexiones de InsForge incluso con PgBouncer configurado. El singleton reutiliza la conexión entre invocaciones warm.

### 1.3 Patrón de RBAC en Server Actions

Cada Server Action que requiera autenticación o rol específico sigue este patrón:

```ts
// Patrón base
async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");
  return session;
}

async function requireRole(requiredRole: "hospital_admin" | "super_admin") {
  const session = await requireSession();
  const userRole = (session.user as any).role as string;
  const hierarchy: Record<string, number> = {
    super_admin: 3,
    hospital_admin: 2,
    student: 1,
  };
  if ((hierarchy[userRole] ?? 0) < hierarchy[requiredRole]) {
    throw new Error("No autorizado");
  }
  return session;
}
```

**Defensa en profundidad:** el middleware RBAC (`middleware.ts`) protege rutas a nivel HTTP. Los Server Actions validan el rol de nuevo porque pueden ser llamados desde cualquier client component, incluso fuera de la ruta protegida. RLS en Postgres es la tercera capa.

### 1.4 Manejo de errores en Server Actions

Las Server Actions devuelven un objeto tipado `{ success: boolean; data?: T; error?: string }` en lugar de lanzar excepciones hacia el cliente. Las excepciones internas se capturan con `try/catch` y se loguean:

```ts
export async function someAction(input: SomeInput): Promise<ActionResult<SomeData>> {
  try {
    await requireSession();
    // ... lógica
    return { success: true, data: result };
  } catch (error) {
    console.error("[someAction]", error);
    // No exponer mensajes internos al cliente
    return { success: false, error: "Ha ocurrido un error. Inténtalo de nuevo." };
  }
}
```

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
  baseURL: process.env.BETTER_AUTH_URL!, // URL real de Vercel, nunca localhost hardcodeado
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
  // Hook post-signup: crear cuenta espejo en Moodle
  hooks: {
    after: [
      {
        matcher: (context) => context.path === "/sign-up/email",
        handler: async (context) => {
          const user = context.response?.user;
          if (!user) return;
          try {
            const moodleUserId = await moodleClient.createUser({
              username: user.email.split("@")[0],
              email: user.email,
              firstname: user.name?.split(" ")[0] ?? "Usuario",
              lastname: user.name?.split(" ").slice(1).join(" ") ?? "",
              password: crypto.randomUUID(), // contraseña aleatoria — el acceso es por SSO
            });
            await prisma.user.update({
              where: { id: user.id },
              data: { moodleUserId },
            });
          } catch (error) {
            // No bloqueante — registrar y reintentar en background
            console.error("[post-signup] Fallo al crear cuenta Moodle:", error);
          }
        },
      },
    ],
  },
});
```

**Nota sobre `baseURL`:** si está hardcodeada como `http://localhost:3000` en producción, Better Auth genera cookies y redirects rotos. Usar `process.env.BETTER_AUTH_URL` con el dominio real de Vercel.

**Nota sobre `trustedOrigins`:** debe incluir el dominio de producción y, si se usan Vercel Preview Deployments para pruebas, también el patrón `*.vercel.app` o los dominios específicos de preview.

**Nota sobre RLS y Better Auth:** si RLS está activo en las tablas `User`, `Session`, `Account`, el rol de Postgres usado por Better Auth debe bypassar RLS o tener policies explícitas de `INSERT`/`SELECT` sin depender de `app.current_user_id` (que no existe en el momento del registro).

### 2.2 Route Handler de Better Auth

```ts
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## 3. Webhook de Wompi

```ts
// app/api/webhooks/wompi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moodleClient } from "@/lib/moodle/client";
import { sendPurchaseConfirmation } from "@/lib/email/brevo";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-event-checksum") ?? "";

  // 1. Validar firma HMAC-SHA256
  const expectedSignature = crypto
    .createHmac("sha256", process.env.WOMPI_EVENTS_SECRET!)
    .update(body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.error("[webhook/wompi] Firma inválida");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Solo procesar eventos de transacción aprobada
  if (event.event !== "transaction.updated") {
    return NextResponse.json({ received: true });
  }

  const transaction = event.data.transaction;
  if (transaction.status !== "APPROVED") {
    // Actualizar orden a failed si corresponde
    await prisma.order.updateMany({
      where: { wompiTransactionId: transaction.id, status: "pending" },
      data: { status: "failed" },
    });
    return NextResponse.json({ received: true });
  }

  // 2. Idempotencia: verificar si ya procesamos esta transacción
  const existingOrder = await prisma.order.findUnique({
    where: { wompiTransactionId: transaction.id },
    include: { items: { include: { product: true } }, user: true },
  });

  if (existingOrder?.status === "paid") {
    // Ya procesado — ignorar silenciosamente
    return NextResponse.json({ received: true });
  }

  if (!existingOrder) {
    console.error("[webhook/wompi] Orden no encontrada para transacción:", transaction.id);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // 3. Actualizar orden a paid
  const paidOrder = await prisma.order.update({
    where: { id: existingOrder.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      wompiTransactionId: transaction.id,
    },
    include: { items: { include: { product: true } }, user: true },
  });

  // 4. Procesar cada ítem
  for (const item of paidOrder.items) {
    if (item.product.type === "course" && item.product.moodleCourseId) {
      // 4a. Inscribir en Moodle
      try {
        const moodleEnrolId = await moodleClient.enrolUser({
          userId: paidOrder.user.moodleUserId!,
          courseId: item.product.moodleCourseId,
        });
        await prisma.enrollment.create({
          data: {
            userId: paidOrder.userId,
            productId: item.productId,
            moodleEnrolId,
            status: "not_started",
          },
        });
      } catch (error) {
        console.error("[webhook/wompi] Fallo inscripción Moodle:", error);
        // TODO: encolar para reintento (background job)
      }
    } else if (item.product.type === "vr_experience") {
      // 4b. Activar VR key (lógica separada — Fase 7)
      // TODO: asignar VR key disponible al usuario
    }
  }

  // 5. Enviar email de confirmación
  try {
    await sendPurchaseConfirmation({
      to: paidOrder.user.email,
      userName: paidOrder.user.name,
      items: paidOrder.items.map((i) => ({
        title: i.product.title,
        priceCents: i.priceCents,
      })),
      totalCents: paidOrder.totalCents,
    });
  } catch (error) {
    console.error("[webhook/wompi] Fallo email de confirmación:", error);
    // No bloqueante
  }

  return NextResponse.json({ received: true });
}
```

---

## 4. Cliente de Moodle

```ts
// lib/moodle/client.ts

const MOODLE_BASE_URL = process.env.MOODLE_BASE_URL!;
const MOODLE_WS_TOKEN = process.env.MOODLE_WS_TOKEN!;

async function callMoodleApi(wsfunction: string, params: Record<string, unknown>) {
  const url = new URL(`${MOODLE_BASE_URL}/webservice/rest/server.php`);
  url.searchParams.set("wstoken", MOODLE_WS_TOKEN);
  url.searchParams.set("wsfunction", wsfunction);
  url.searchParams.set("moodlewsrestformat", "json");

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
            body.append(`${key}[${index}][${k}]`, String(v));
          });
        } else {
          body.append(`${key}[${index}]`, String(item));
        }
      });
    } else {
      body.append(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Moodle API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.exception) {
    throw new Error(`Moodle exception: ${data.message} (${data.errorcode})`);
  }

  return data;
}

export const moodleClient = {
  // Crear usuario en Moodle
  async createUser(user: {
    username: string;
    email: string;
    firstname: string;
    lastname: string;
    password: string;
  }): Promise<number> {
    const result = await callMoodleApi("core_user_create_users", {
      users: [user],
    });
    return result[0].id;
  },

  // Inscribir usuario en un curso
  async enrolUser(params: { userId: number; courseId: number }): Promise<void> {
    await callMoodleApi("enrol_manual_enrol_users", {
      enrolments: [{ roleid: 5, userid: params.userId, courseid: params.courseId }],
    });
  },

  // Obtener progreso del usuario en un curso
  async getCourseCompletion(params: { userId: number; courseId: number }) {
    return callMoodleApi("core_completion_get_activities_completion_status", {
      courseid: params.courseId,
      userid: params.userId,
    });
  },

  // Buscar cursos por nombre (para el panel admin)
  async searchCourses(query: string) {
    return callMoodleApi("core_course_get_courses_by_field", {
      field: "search",
      value: query,
    });
  },

  // Obtener categorías de Moodle (para el select del panel admin)
  async getCategories() {
    return callMoodleApi("core_course_get_categories", {});
  },

  // Crear un nuevo curso en Moodle
  async createCourse(params: { fullname: string; shortname: string; categoryid: number }) {
    const result = await callMoodleApi("core_course_create_courses", {
      courses: [params],
    });
    return result[0].id as number;
  },

  // Generar token de autologin (SSO)
  async generateAutologinToken(username: string): Promise<string> {
    const result = await callMoodleApi("auth_userkey_request_login_url", {
      user: { username },
    });
    return result.loginurl as string;
  },
};
```

**Seguridad:** `MOODLE_WS_TOKEN` solo existe en variables de entorno del servidor. Nunca se expone al cliente. Todas las llamadas se hacen desde Server Actions o Route Handlers.

---

## 5. Route Handler de autologin SSO a Moodle

```ts
// app/api/moodle/autologin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { moodleClient } from "@/lib/moodle/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { courseId } = await req.json();

  // Verificar que el usuario tiene acceso al curso (compra o inscripción)
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_productId: { userId: session.user.id, productId: courseId } },
    include: { product: true },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "No tienes acceso a este curso" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.moodleUserId) {
    return NextResponse.json({ error: "Cuenta de Moodle no encontrada" }, { status: 404 });
  }

  // Obtener el email del usuario para generar el token de Moodle
  const loginUrl = await moodleClient.generateAutologinToken(user.email);

  // Añadir wantsurl para ir directamente al curso
  const urlWithCourse = `${loginUrl}&wantsurl=${encodeURIComponent(
    `${process.env.MOODLE_BASE_URL}/course/view.php?id=${enrollment.product.moodleCourseId}`
  )}`;

  return NextResponse.json({ loginUrl: urlWithCourse });
}
```

---

## 6. Server Actions — Gestión de invitaciones

```ts
// lib/actions/invitation.ts
"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOrgAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");
  const role = (session.user as any).role;
  if (role !== "hospital_admin" && role !== "super_admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function getOrgDetails(orgCode: string) {
  const org = await prisma.organization.findUnique({ where: { orgCode } });
  if (!org) return { success: false as const, error: "Código de invitación inválido" };
  return { success: true as const, data: { name: org.name, id: org.id } };
}

export async function linkUserToOrganization(orgCode: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");

  const org = await prisma.organization.findUnique({ where: { orgCode } });
  if (!org) return { success: false as const, error: "Código inválido" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { organizationId: org.id },
  });

  // Marcar invitación individual como aceptada si existe
  await prisma.organizationInvitation.updateMany({
    where: {
      organizationId: org.id,
      email: session.user.email,
      accepted: false,
    },
    data: { accepted: true },
  });

  return { success: true as const };
}

export async function createInvitation(email: string) {
  const session = await requireOrgAdmin();
  const organizationId = (session.user as any).organizationId;
  if (!organizationId) throw new Error("No perteneces a ninguna organización");

  // Verificar si ya existe invitación pendiente
  const existing = await prisma.organizationInvitation.findFirst({
    where: { organizationId, email, accepted: false, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    return { success: false as const, error: "Ya existe una invitación pendiente para este correo" };
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });

  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId,
      email,
      orgCode: org!.orgCode,
      invitedByUserId: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    },
  });

  // Enviar email de invitación vía Brevo
  // await sendInvitationEmail({ to: email, orgName: org!.name, orgCode: org!.orgCode });

  return { success: true as const, data: invitation };
}

export async function listOrgInvitations() {
  const session = await requireOrgAdmin();
  const organizationId = (session.user as any).organizationId;

  return prisma.organizationInvitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteInvitation(invitationId: string) {
  const session = await requireOrgAdmin();
  const organizationId = (session.user as any).organizationId;

  // Verificar que la invitación pertenece a esta organización
  const inv = await prisma.organizationInvitation.findUnique({ where: { id: invitationId } });
  if (!inv || inv.organizationId !== organizationId) {
    throw new Error("No autorizado");
  }

  await prisma.organizationInvitation.delete({ where: { id: invitationId } });
  return { success: true as const };
}

export async function listOrgMembers() {
  const session = await requireOrgAdmin();
  const organizationId = (session.user as any).organizationId;

  return prisma.user.findMany({
    where: { organizationId },
    select: { id: true, name: true, email: true, role: true, image: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}
```

---

## 7. Server Actions — Panel admin de productos

```ts
// lib/actions/admin/products.ts
"use server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");
  if ((session.user as any).role !== "super_admin") throw new Error("No autorizado");
  return session;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function createProduct(data: {
  title: string;
  slug?: string;
  description: string;
  type: "course" | "vr_experience" | "ai_automation";
  priceCents: number;
  discountCents?: number;
  coverImageUrl?: string;
  moodleCourseId?: number;
  vrAssetUrl?: string;
  capacity?: number;
}) {
  await requireSuperAdmin();

  const slug = data.slug ?? generateSlug(data.title);

  // Verificar unicidad del slug
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return { success: false as const, error: "Este slug ya está en uso" };
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      slug,
      published: false,
    },
  });

  revalidatePath("/admin/products");
  return { success: true as const, data: product };
}

export async function updateProduct(
  id: string,
  data: Partial<{
    title: string;
    slug: string;
    description: string;
    priceCents: number;
    discountCents: number;
    coverImageUrl: string;
    moodleCourseId: number;
    vrAssetUrl: string;
    capacity: number;
  }>
) {
  await requireSuperAdmin();

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/products");
  revalidatePath(`/productos/${product.slug}`);
  return { success: true as const, data: product };
}

export async function publishProduct(id: string) {
  await requireSuperAdmin();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { success: false as const, error: "Producto no encontrado" };

  // Advertencia: curso sin Moodle
  if (product.type === "course" && !product.moodleCourseId) {
    // El frontend debe confirmar antes de llamar esta acción
    // Si llega aquí sin moodleCourseId, se publica con advertencia en el log
    console.warn(`[publishProduct] Producto curso publicado sin moodleCourseId: ${id}`);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { published: true },
  });

  // Indexar en Meilisearch
  // await meilisearchClient.index("products").addDocuments([formatForMeilisearch(updated)]);

  revalidatePath("/productos");
  revalidatePath(`/productos/${updated.slug}`);
  revalidatePath("/admin/products");

  return { success: true as const, data: updated };
}

export async function unpublishProduct(id: string) {
  await requireSuperAdmin();

  const updated = await prisma.product.update({
    where: { id },
    data: { published: false },
  });

  // Eliminar de Meilisearch
  // await meilisearchClient.index("products").deleteDocument(id);

  revalidatePath("/productos");
  revalidatePath("/admin/products");
  return { success: true as const };
}

export async function deleteProduct(id: string) {
  await requireSuperAdmin();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { success: false as const, error: "Producto no encontrado" };

  // No permitir eliminar si hay órdenes pagadas asociadas
  const paidOrderItems = await prisma.orderItem.count({
    where: { productId: id, order: { status: "paid" } },
  });
  if (paidOrderItems > 0) {
    return {
      success: false as const,
      error: "No se puede eliminar un producto con compras realizadas. Desactívalo en su lugar.",
    };
  }

  await prisma.product.delete({ where: { id } });

  // Eliminar de Meilisearch si estaba publicado
  // if (product.published) await meilisearchClient.index("products").deleteDocument(id);

  revalidatePath("/admin/products");
  return { success: true as const };
}
```

---

## 8. Server Actions — Moodle desde el panel admin

```ts
// lib/actions/admin/moodle.ts
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { moodleClient } from "@/lib/moodle/client";

async function requireSuperAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("No autenticado");
  if ((session.user as any).role !== "super_admin") throw new Error("No autorizado");
}

export async function searchMoodleCourses(query: string) {
  await requireSuperAdmin();
  try {
    const courses = await moodleClient.searchCourses(query);
    return {
      success: true as const,
      data: courses.map((c: any) => ({ id: c.id, fullname: c.fullname, shortname: c.shortname })),
    };
  } catch (error) {
    console.error("[searchMoodleCourses]", error);
    return { success: false as const, error: "No se pudo conectar con Moodle" };
  }
}

export async function getMoodleCategories() {
  await requireSuperAdmin();
  try {
    const categories = await moodleClient.getCategories();
    return {
      success: true as const,
      data: categories.map((c: any) => ({ id: c.id, name: c.name })),
    };
  } catch (error) {
    console.error("[getMoodleCategories]", error);
    return { success: false as const, error: "No se pudo obtener las categorías de Moodle" };
  }
}

export async function createMoodleCourse(params: {
  fullname: string;
  shortname: string;
  categoryid: number;
}): Promise<{ success: boolean; data?: { moodleCourseId: number }; error?: string }> {
  await requireSuperAdmin();
  try {
    const moodleCourseId = await moodleClient.createCourse(params);
    return { success: true, data: { moodleCourseId } };
  } catch (error) {
    console.error("[createMoodleCourse]", error);
    return { success: false, error: "No se pudo crear el curso en Moodle" };
  }
}
```

---

## 9. Route Handlers de upload

```ts
// app/api/admin/upload/product-cover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
  const filename = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-]/gi, "_")}`;

  // Subir a InsForge Storage (bucket product-covers/)
  // const url = await storageClient.upload(`product-covers/${filename}`, buffer, file.type);
  // return NextResponse.json({ url });

  // Placeholder hasta implementar storageClient:
  return NextResponse.json({ url: `/uploads/product-covers/${filename}` });
}
```

---

## 10. Variables de entorno (referencia completa)

```env
# Base de datos (InsForge)
DATABASE_URL=postgresql://...?pgbouncer=true    # pooled — runtime
DIRECT_URL=postgresql://...                     # directa — solo migraciones

# Better Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://tu-dominio.vercel.app   # NUNCA localhost hardcodeado en producción

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Wompi
WOMPI_PUBLIC_KEY=...
WOMPI_PRIVATE_KEY=...
WOMPI_EVENTS_SECRET=...

# Moodle
MOODLE_BASE_URL=https://lms.medicamentum360.com
MOODLE_WS_TOKEN=...                             # NUNCA exponer al cliente

# Meilisearch
MEILISEARCH_HOST=...
MEILISEARCH_API_KEY=...

# InsForge Storage
INSFORGE_STORAGE_URL=...
INSFORGE_STORAGE_KEY=...

# Brevo
BREVO_API_KEY=...

# Brand
NEXT_PUBLIC_BRAND_COLOR=#8127cf
```

---

## 11. Seguridad — checklist pre-producción

- [ ] RLS cross-org test (`tests/rls-isolation-test.sql`) pasa en CI — ver `PLAN.md §Fase 2.5`.
- [ ] Webhook de Wompi: test de idempotencia (mismo evento dos veces no duplica inscripción ni orden).
- [ ] Test de autologin token: expira en segundos, uso único, no reutilizable.
- [ ] `MOODLE_WS_TOKEN` solo en variables de servidor — nunca en `NEXT_PUBLIC_*` ni en client components.
- [ ] `BETTER_AUTH_URL` apunta al dominio real, no a `localhost`.
- [ ] `trustedOrigins` en Better Auth incluye el dominio de producción.
- [ ] Google OAuth: `Authorized redirect URI` incluye `https://<dominio>/api/auth/callback/google`.
- [ ] Rate limiting activo en `/api/auth/sign-up` y `/api/auth/sign-in` (middleware o librería).
- [ ] Singleton de PrismaClient activo — no instanciar `new PrismaClient()` dentro de handlers.
- [ ] URLs firmadas con expiración corta para `certificates/` e `invoices/` en Storage.

---

## 12. Logging y observabilidad

- Server Actions críticos (pago, inscripción Moodle, creación de usuario espejo, generación de certificado) deben emitir logs estructurados con `console.error` + contexto suficiente para debuggear en Vercel Runtime Logs.
- Formato sugerido: `[nombre-acción] mensaje: ${JSON.stringify({ userId, productId, error })}`.
- En producción: evaluar Sentry para error tracking automático (decisión pendiente, ver `PLAN.md §Fase 13`).
- Eventos de analítica clave a implementar en GA4/Posthog: `add_to_cart`, `begin_checkout`, `purchase`, `course_started`, `course_completed`.
