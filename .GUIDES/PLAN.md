# PLAN — Medicamentum360
**Plan de desarrollo fasado — v2.1**
Versión: 2.1 · Fecha: 2026-06-21 · Reemplaza la v1.0 (8 fases), la v1.4 (parche Fase 1-2) y la v1.1 (versión paralela generada por otra herramienta a partir de los docs viejos — ya fusionada aquí, no la sigas usando)

> Este documento fusiona: (1) el `PLAN.md` original de 8 fases derivado de PRD/TRD/UX_UI, (2) tu `PHASE_PLAN.md` real de 12 fases (Stitch, InsForge, RBAC, VR keys, admin, analítica, notificaciones), (3) el parche v1.4 (login/register, fixes de Fase 2, .gitignore, pooling Vercel/InsForge), y (4) el detalle de UX del carrusel de registro de la v1.1. **Este es el único `PLAN.md` que debes seguir de ahora en adelante** — si te aparece otra versión generada por otra herramienta, tráemela para fusionarla aquí, no la uses en paralelo.
>
> **v2.1 vs v2.0:** se agregó la secuencia pedagógica del carrusel de `/registro` (Fase 2) y se expandió Fase 2.5 con un checklist de diagnóstico explícito para "login funciona en local pero falla en Vercel contra InsForge" — el problema que estás teniendo ahora mismo. Ver la sección nueva "Diagnóstico rápido" dentro de Fase 2.5.

---

## §0. Qué cambié respecto al borrador v1.4 que me pasaste (y por qué)

1. **`.gitignore`: NO excluyas `AGENTS.md` ni `.guides/` de git, si tu repo es privado.** El borrador v1.4 lo pedía como "estrictamente obligatorio". Es un error de diseño para tu flujo: tu propio `AGENTS.md` asume que `CLAUDE.md` hace `@.guides/AGENTS.md` para que Claude Code lo lea — si ese archivo no está en el repo, deja de funcionar en cualquier máquina/CI que no sea la tuya, y pierdes el historial de decisiones de arquitectura en `git log`. El riesgo real que v1.4 estaba tratando de nombrar (que un repo público exponga tu estrategia interna, o que contenido no confiable dentro de esos archivos se interprete como instrucción) es real, pero la solución es: (a) mantener el repo **privado** mientras esos documentos vivan ahí, (b) si algún día abres parte del código como público, *entonces* mover `.guides/`/`AGENTS.md` fuera de ese repo específico, y (c) nunca pegar credenciales reales dentro de esos `.md` (ya lo cubre `BACKEND.md §8`). Lo único que **sí** debe estar siempre en `.gitignore` sin excepción son los secretos (`.env*`, `docker/output/`).
2. **Password strength meter:** v1.4 sugería `zxcvbn` (la librería original de Dropbox). Está sin mantenimiento desde hace años. Usa **`@zxcvbn-ts/core`**, el fork mantenido en TypeScript — misma API conceptual, instalación activa.
3. **Pooling de Vercel + InsForge:** el patrón `DATABASE_URL` (pooled, `pgbouncer=true`) + `DIRECT_URL` (directa, para migraciones) que describía v1.4 es correcto y es el estándar de la industria (lo usan Supabase, Neon, Prisma Postgres, etc. con esa misma forma). **No pude verificar el host/puerto exacto de InsForge** porque no aparece documentación pública indexada de InsForge con ese nivel de detalle — confirma esos dos valores contra el dashboard de InsForge antes de copiarlos a producción; la forma general (dos URLs, `?pgbouncer=true` en la de runtime) sí está verificada contra la documentación oficial de Prisma.
4. **Todo lo demás de v1.4 (anclas con scroll suave, dropdown-menu de ShadCN para el avatar, carousel de ShadCN/Embla para el blog, layout split-screen de login/register con Zod + React Hook Form + rate limiting) quedó incorporado tal cual, correcto.**
5. **Lo más importante que faltaba en v1.4:** solo tocaba Fases 1-2. Tu plan original tenía 8 fases más (Hospital/empleados/VR keys, Admin, Operaciones, Analítica, LMS avanzado, Notificaciones, CI/CD) que **no estaban en ningún lado del borrador v1.4**. Están todas recuperadas abajo.

---

## §1. Convenciones de este documento

- **"Stitch"** = las pantallas de diseño que ya generaste con la herramienta de diseño UI de Google (`medicamentum360_inicio`, `marketplace_salud_tech`, `detalle_de_simulacion_vr`, `panel_del_estudiante`, etc.). Son tu fuente visual real; `UX_UI.md`/`FRONTEND_PATTERNS.md` son el complemento de comportamiento/código — cuando haya conflicto entre lo que dice un documento y lo que muestra el diseño de Stitch, gana Stitch para visual, gana este plan para comportamiento/datos.
- Las fases están renumeradas de forma limpia y única — ya no hay dos "Fase 2" distintas compitiendo. `PROGRESS.md` debe usar esta misma numeración (ver §13).
- `[ ]` no iniciada · `[~]` en progreso · `[x]` completa y verificada contra su criterio de aceptación.

---

## Fase 1 — Fundaciones — ✅ COMPLETA

*(Sin cambios respecto a tu PROGRESS.md. Desviaciones ya documentadas y aceptadas — ver §12.)*

- [x] Next.js App Router + Prisma 7 (driver adapter `@prisma/adapter-pg`) + InsForge Postgres
- [x] Migraciones SQL vía InsForge CLI + RLS multi-tenant (29 policies / 11 tablas)
- [x] Better Auth (email+password, Google OAuth) + hook post sign-up → cuenta espejo en Moodle
- [x] `vanilla-cookieconsent` + páginas `/privacidad` y `/terminos`
- [x] Variables de entorno reales (Moodle, Wompi, Google OAuth)
- [x] Moodle local de pruebas en Docker (provisión automática: webservices, token, curso demo, estudiante demo)
- [x] `tests/rls-isolation-test.sql` creado (pendiente de automatizar en CI — ver Fase 2.5)

---

## Fase 2 — Landing, Navegación y Autenticación — ✅ COMPLETA

### Ya construido (de tu PROGRESS.md)
- [x] NavBar scroll-aware (píldora + blur), DarkModeSwitcher, Footer, Hero/Nosotros/Ejemplos/BlogCarousel, meta tags OG/Twitter/Schema.org, 404/500
- [x] AuthCarousel (carrusel pedagógico 3 pasos en `/sign-up`, simplificado en `/sign-in`)
- [x] Formularios `/sign-in` y `/sign-up` con Zod + React Hook Form + indicador de fortaleza zxcvbn
- [x] Google OAuth + rate limiting + forgot-password
- [x] Middleware RBAC (`middleware.ts`): rutas protegidas `/dashboard`, `/configuracion`, `/checkout`, `/mis-cursos`; rutas org `/org` (requiere `hospital_admin`); rutas admin `/admin` (requiere `super_admin`)
- [x] Modelo `Organization` con campo `orgCode` para invitaciones
- [x] Modelo `Plan` para planes de suscripción
- [x] Modelo `OrganizationInvitation` para flujo de invitación org_code
- [x] Server Actions: `linkUserToOrganization`, `getOrgDetails`, `createInvitation`, `listOrgInvitations`, `deleteInvitation`, `getOrgInfo`, `listOrgMembers`
- [x] Página `/org/employees` — gestión de empleados e invitaciones para `hospital_admin`
- [x] Sign-up con `?org_code=...` — badge de organización, vinculación automática post-registro
- [x] Migración SQL: `plans` + `organization_invitations` + `org_code` en organizations + RLS policies
- [x] NavBar dinámico por rol (autenticado ve "Mi Aprendizaje" + "Marketplace"; hospital_admin ve adicionalmente "/org/employees")
- [x] Animaciones Emil Kowalski: easing custom, button :active scale, dropdown fade+zoom, prefers-reduced-motion

**Criterio de aceptación de Fase 2:** CUMPLIDO — auth funcionando Better Auth real, RBAC middleware activo, sistema de invitaciones org_code completo, migración SQL creada.

---

## Fase 2.5 — CI/CD, Seguridad de Repositorio y Despliegue (transversal — ciérrala antes de Fase 4)

Esto estaba en tu `PHASE_PLAN.md` original como "Fase 0.5" y se perdió en el camino — es la que evita que descubras en producción lo que deberías haber visto en un PR.

**Migración SQL para Fase 2 completada:** `migrations/20260622100000_add-plans-and-invitations.sql` — crea tablas `plans`, `organization_invitations`, agrega `org_code` a `organizations`, y define RLS policies para ambas tablas. Aplicar con `npx @insforge/cli db query --file migrations/20260622100000_add-plans-and-invitations.sql`.

- [ ] GitHub Actions: typecheck + lint + tests (Vitest) en cada push/PR.
- [ ] Playwright E2E del flujo de checkout completo (aunque Fase 4 aún no exista, deja el harness listo).
- [ ] Vercel Preview Deployments como entorno de staging por PR.
- [ ] `axe-core` en CI para verificar WCAG 2.1 AA automáticamente (no solo manualmente).
- [ ] **Automatizar `tests/rls-isolation-test.sql`** como step de CI — ya lo tienes escrito (Fase 1), solo falta que corra solo en cada PR y bloquee el merge si falla. Esto es lo que convierte el criterio bloqueante de `TRD.md §4` en algo que de verdad bloquea, no en una promesa.
- [ ] `.gitignore` mínimo (revisado, ver §0.1):
  ```
  .env
  .env.local
  .env*.local
  docker/output/
  node_modules/
  .next/
  *.log
  ```
- [ ] Conectividad InsForge + Vercel (serverless) — **lee esto completo antes de probar login en Vercel, no solo el resumen:**
  - **Modelo mental correcto, sin ambigüedad:** InsForge no es hosting de la app — es solo Postgres + Storage. La app se despliega en Vercel y se conecta hacia afuera a InsForge (ver `TRD.md §1.1`, sección añadida tras detectar que el agente lo estaba confundiendo). Si algo en el flujo de trabajo sugiere "desplegar en InsForge", ese paso está mal y hay que pararlo ahí.
  - `DATABASE_URL` → connection string **pooled** de InsForge (PgBouncer) + `?pgbouncer=true` si tu adapter lo requiere, para tráfico de runtime.
  - `DIRECT_URL` → connection string **directa** de InsForge, solo para `prisma migrate`/CLI.
  - Verifica los valores exactos (host/puerto) en el dashboard de InsForge — el patrón general está confirmado contra la documentación de Prisma, los valores específicos de tu proveedor no.
  - Singleton de `PrismaClient` (instánciado fuera del handler, reusado entre invocaciones warm) — si no lo haces, cada función serverless abre su propia conexión y agotas el pool aunque tengas pooling configurado.
  - **`BETTER_AUTH_URL` (o `baseURL` en `lib/auth.ts`) debe ser la URL real de Vercel**, no `http://localhost:3000`. Si está hardcodeada o falta, Better Auth genera cookies/redirects rotos en producción aunque localhost funcione perfecto. Usa `process.env.VERCEL_URL` o tu dominio fijo, nunca un valor quemado.
  - **`trustedOrigins` en `lib/auth.ts`** debe incluir el dominio de Vercel (y cada preview deployment si los usas para probar, o el dominio de producción fijo si solo pruebas ahí).
  - **OAuth de Google:** en Google Cloud Console, el *Authorized redirect URI* tiene que incluir exactamente `https://<tu-dominio-vercel>/api/auth/callback/google`. Si solo registraste el de `localhost`, el login con Google falla en Vercel con `redirect_uri_mismatch` aunque el login con email/password sí funcione — son fallos independientes, diagnostica cuál de los dos te está fallando primero.
  - **Variables de entorno EN VERCEL, no solo en `.env.local`:** `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MOODLE_WS_TOKEN`, etc. deben estar cargadas en Vercel → Project Settings → Environment Variables, con el scope correcto (Production/Preview/Development). Es el motivo nº1 de "funciona en mi máquina, no en Vercel".
  - **RLS bloqueando las propias tablas de Better Auth (`User`/`Session`/`Account`):** si activaste RLS "a lo ancho" sobre todo el esquema (TRD.md §4) sin una policy explícita que permita el `INSERT` de un usuario nuevo durante el registro (antes de que exista cualquier sesión que sete `app.current_user_id`), el registro/login puede fallar en silencio o con un error genérico de Postgres en vez de un error de auth. Verifica si tu conexión de Better Auth usa un rol de Postgres que **bypassa RLS** (lo más simple y lo recomendado: un rol de servicio separado para las tablas internas de Better Auth) o si necesita su propia policy de `INSERT`/`SELECT` sin depender de `app.current_user_id`.
  - Validación final: *redeploy* en Vercel confirmando que app + DB pooled + Better Auth funcionan antes de tocar Marketplace.

### Diagnóstico rápido si el login falla en Vercel pero funciona en local

No adivines — identifica primero cuál de estos cuatro está fallando, son causas independientes:

1. **¿Error visible en los logs de Vercel (Runtime Logs del deployment)?** Si dice algo de `too many connections` o timeout de conexión → es el pooling (`DATABASE_URL` apuntando a la conexión directa en vez de la pooled, o falta el singleton de Prisma).
2. **¿El error aparece solo con Google OAuth, pero email/password funciona?** → `redirect_uri_mismatch`, revisa Google Cloud Console.
3. **¿Las variables de entorno están realmente en Vercel?** → `vercel env ls` desde tu terminal, o revisa Project Settings → Environment Variables. Si solo están en `.env.local`, Vercel nunca las ve.
4. **¿El error es un 500 genérico de Postgres al crear el usuario, sin mensaje claro de Better Auth?** → sospecha de RLS bloqueando el `INSERT` en `User`/`Session`/`Account`.

Dime cuál de los cuatro síntomas tienes (o pega el mensaje de error exacto de los Runtime Logs de Vercel) y te doy el fix puntual en vez de la lista completa.

---

## Fase 3 — Marketplace y Detalle de Producto

- [ ] Listado con filtros (categoría, precio, orden) + Meilisearch.
- [ ] Skeleton loaders, "sin resultados", paginación/infinite scroll.
- [ ] Detalle de producto (2 columnas), visor 3D R3F para VR.
- [ ] Reseñas, rating, breadcrumb, productos relacionados, compartir, indicador de cupo.
- [ ] Página de Planes/Pricing (de tu plan original — no estaba en el de 8 fases).
- [ ] Diseño: pantallas Stitch `marketplace_salud_tech` y `detalle_de_simulacion_vr`.

---

## Fase 4 — Carrito, Checkout y Órdenes (Wompi)

**Bloqueante:** Fase 2.5 completa (RLS validado en CI, no solo localmente).

- [ ] Carrito popover (persistencia guest + merge al login).
- [ ] Checkout con datos DIAN (NIT/CC), widget Wompi embebido, webhook con HMAC + idempotencia.
- [ ] Pantalla de éxito + email de confirmación (Brevo).
- [ ] Cupones/descuentos (de tu plan original).
- [ ] Tabla `employee_assignments` — rastrea qué producto fue comprado/asignado a qué empleado por un `hospital_admin` (necesaria para Fase 7).
- [ ] Historial de órdenes (`/orders`), separado del resumen simple de "compras" que ya estaba en `UX_UI.md §3.8`.

---

## Fase 5 — Dashboard del Estudiante

- [ ] Grid: Mis Cursos, Calendario (+Google Calendar OAuth), Mis Certificados, Agenda del día (`UX_UI.md §3.7`).
- [ ] **Mis Experiencias VR** — lanzar experiencia + estado de "key activa" (de tu plan original; mi versión anterior no detallaba la redención de VR, esto la reemplaza).
- [ ] Librería de automatizaciones (vista del producto de automatización con IA que el usuario compró).
- [ ] Generación de certificados (PDF) + compartir LinkedIn + "continúa donde lo dejaste".
- [ ] Perfil/Configuración: contraseña, **2FA** (muévelo aquí en vez de dejarlo solo para Fase final — tu plan original lo pedía ya en esta fase para todos los roles, no solo `hospital_admin`/`super_admin`).
- [ ] Diseño: pantalla Stitch `panel_del_estudiante` y `automatizaciones_y_certificados`.

---

## Fase 6 — Integración Moodle

- [ ] API REST: catálogo, progreso, calificaciones (`TRD.md §6`).
- [ ] Inscripción automática post-pago (`enrol_manual_enrol_users`) vía webhook de Wompi.
- [ ] SSO/autologin (Modo 2) para "Continuar curso".
- [ ] **Sync de notas vía cron (Inngest)** — de tu plan original: tablas `course_grades` y `moodle_sync_log`, job periódico en vez de solo lectura on-demand (mejora lo que TRD.md §12 dejaba como "caché genérica").
- [ ] Formulario de conexión Moodle por hospital (si en el futuro cada hospital puede tener su propia instancia, no solo `lms.medicamentum360.com` central — confirma con el humano si esto sigue siendo parte del alcance antes de construirlo, no estaba en PRD.md original).
- [ ] Desarrollar/probar todo contra el Moodle local de `docker/` (`TRD.md §17`).

---

## Fase 7 — Panel de Organización (`hospital_admin`)

- [ ] Dashboard de organización (`/org/dashboard`).
- [ ] Lista de empleados + invitar (usa el `org_code` de Fase 2) + remover (`/org/employees`).
- [ ] Progreso detallado por empleado (`/org/employees/[id]`).
- [ ] Asignar productos a empleados (compra en bulk, usa `employee_assignments` de Fase 4) (`/org/assignments`).
- [ ] Panel de llaves VR: asignar/revocar acceso por empleado (`/org/vr-keys`).
- [ ] Configuración de la organización (logo, NIT/RFC, datos de facturación).
- [ ] Spike técnico: WebXR + React Three Fiber probado en un Meta Quest físico (validar que el visor de preview y el flujo de redención de VR funcionan fuera del navegador de escritorio).
- [ ] Diseño: ninguna pantalla Stitch específica listada todavía — créala o reutiliza patrones de `panel_del_estudiante` adaptados a vista de administrador.

---

## Fase 8 — Panel Super Admin

- [ ] Centro de mando `super_admin` (`/admin`) — diseño Stitch `centro_de_mando_superadmin`.
- [ ] CRUD de productos: crear curso, subir modelo 3D, fijar precio (`/admin/products`).
  - Checklist de optimización glTF/Draco antes de aceptar la subida de un modelo 3D (evita VR previews que tardan 30s en cargar).
- [ ] Gestión de hospitales/organizaciones (`/admin/orgs`).
- [ ] Panel de seguridad — diseño Stitch `panel_de_seguridad_e_infosec`.
- [ ] Gestión de API y Webhooks — diseño Stitch `centro_de_comando_api_webhooks`.
- [ ] Audit log de actividad administrativa.

---

## Fase 9 — Operaciones

- [ ] Facturación en PDF (el PDF que ya genera Wompi es suficiente para el MVP, no construyas un motor propio todavía).
- [ ] Onboarding wizard para un hospital nuevo.
- [ ] Centro de ayuda / FAQ (`/help`).
- [ ] Medidor de "AI credits" por organización (tope mensual, si el producto de automatización con IA ya tiene uso real medible — confirma con PRD.md/negocio antes de construir el límite, no solo el contador).
- [ ] Panel de consumo de InsForge (DB/Storage) con alerta al 80% de uso.
- [ ] Gestión institucional y licencias — diseño Stitch `gestion_institucional_y_licencias`.

---

## Fase 10 — Analíticas y Reportes

- [ ] Dashboard gerencial (vista `hospital_admin` y vista `super_admin`, datos distintos por rol).
- [ ] Progreso por empleado: cursos completados, horas de VR.
- [ ] Horas de capacitación acumuladas, cursos completados vs. vencidos.
- [ ] Exportar reportes a Excel/PDF.

---

## Fase 11 — LMS Avanzado

- [ ] Learning paths (rutas de aprendizaje con varios cursos encadenados).
- [ ] Prerrequisitos entre cursos.
- [ ] Evaluaciones/exámenes (dentro de Moodle, no reconstruir un motor de exámenes propio).
- [ ] Banco de preguntas, intentos máximos.
- [ ] Gamificación (streaks, insignias).
  - **Nota de reconciliación:** `PRD.md §11` había marcado la gamificación como "fuera de alcance" del MVP. Tu plan original sí la contempla, aquí, en una fase avanzada — no hay contradicción real, solo confírmalo: gamificación queda para Fase 11, no para el MVP inicial.

---

## Fase 12 — Notificaciones

- [ ] Email (Brevo): bienvenida al registrarse, curso asignado, certificado generado, certificado próximo a vencer.
- [ ] Push: cursos pendientes / recordatorios (requiere PWA o un service worker — ver Fase 13).

---

## Fase 13 — Pulido, SEO, Accesibilidad y Compliance Final

- [ ] Auditoría SEO/Lighthouse final, accesibilidad WCAG AA final (más allá del `axe-core` automático de CI — revisión manual).
- [ ] Verificación de email + CAPTCHA en registro (si no quedó cerrado ya en Fase 2).
- [ ] PWA (acceso offline a cursos en zonas hospitalarias de baja conectividad).
- [ ] LTI 1.3 embebido (reemplaza el SSO/redirect de Fase 6 cuando la prioridad de UX lo justifique).
- [ ] Facturación electrónica DIAN automatizada.
- [ ] Backend funcional real del producto de automatización con IA (más allá de venderlo como producto — esto solo si el negocio ya validó el primer caso de uso).

---

## §12. Desviaciones de implementación vs. TRD.md (documentadas, no pendientes)

Estas ya están aceptadas y en producción local — quedan aquí para que cuando actualices `TRD.md` formalmente, no se te olvide ninguna:

1. Moodle local: `jhardison/moodle` en vez de `bitnami/moodle` (Bitnami retiró sus imágenes de Docker Hub) — actualiza `docker/docker-compose.yml` y `TRD.md §17` para reflejarlo.
2. Migraciones: SQL directo vía InsForge CLI en vez de `npx prisma migrate dev` (InsForge no expone conexión TCP directa para ese flujo) — actualiza `TRD.md §3`/`BACKEND.md`.
3. Prisma 7 requiere `@prisma/adapter-pg` + `PrismaPg`, no usa `url` directo en `schema.prisma` — actualiza el esqueleto de `TRD.md §3`.
4. Better Auth 1.6.20: API de hooks por funciones, no `{ matcher, handler }` — si `BACKEND.md` documentaba el patrón viejo, corrígelo.
5. `vanilla-cookieconsent` v3.x: usa `guiOptions` para layout/posición — ajusta el snippet de `FRONTEND_PATTERNS.md §5` si difiere.

**Recomendación:** abre una tarea de "house-keeping" antes de Fase 3 para propagar estas 5 correcciones a `TRD.md`/`BACKEND.md`/`FRONTEND_PATTERNS.md` — evita que un agente nuevo lea la versión vieja y reintroduzca el bug ya resuelto.

---

## §13. Reconciliación con `PROGRESS.md`

Tu `PROGRESS.md` actual numera "Fase 2" como solo "Landing y navegación". En este plan, **Fase 2 ahora también incluye Auth** (login/register/RBAC/invitaciones) — no es una fase nueva, es la misma Fase 2 extendida. Actualízalo así:
- Deja a Fase 1 igual (ya está completa y bien documentada).
- En Fase 2, agrega los checkboxes pendientes de la sección correspondiente de este plan (los 3 bugs + login/register + RBAC + invitaciones).
- Inserta una entrada **Fase 2.5** nueva (CI/CD) entre Fase 2 y Fase 3.
- A partir de ahí, tu Fase 3 sigue siendo Fase 3 — pero todo lo que tenías como "no iniciada" para Fases 4-8 ahora se reparte en las Fases 4-13 de este documento (más granulares). Si quieres, dime y te dejo el `PROGRESS.md` completo ya remapeado a esta numeración en un próximo mensaje.

---

## Matriz de dependencias

```
Fase 1 ──► Fase 2 ──► Fase 2.5 ──► Fase 3 ──► Fase 4 ──► Fase 5 ──┬─► Fase 6
                          │                       │                │
                          │ (bloquea pagos reales) │                ▼
                          └───────────────────────┘            Fase 7 ──► Fase 8 ──► Fase 9 ──► Fase 10 ──► Fase 11 ──► Fase 12 ──► Fase 13
```
