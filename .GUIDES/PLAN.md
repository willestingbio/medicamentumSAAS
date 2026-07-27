# PLAN — Medicamentum360
**Plan de desarrollo fasado — v5.0 (Auditoría de Huecos Edition)**
Versión: 5.0 · Fecha: 2026-06-26 · Reemplaza v4.0

> **Cambio v5.0 vs v4.0:** auditoría completa de todos los documentos (TRD, BACKEND, UX_UI, FLUJOS, AGENTS) detectó y resolvió huecos reales de producto que existían desde antes de la v4.0: (1) ninguna forma de revocar acceso a un empleado de una organización; (2) `EmployeeAssignment` existía en el schema desde la Fase 4 sin ninguna pantalla ni lógica que lo usara — el modelo de compra corporativa en lote nunca se construyó; (3) la UI prometía "política de reembolso" desde el detalle de producto y checkout sin que existiera ningún flujo real; (4) no había canal de soporte para el estudiante, solo menciones sueltas de "contacta a soporte"; (5) dos contradicciones internas en `FLUJOS.md` quedaron de cuando se introdujo el Course Builder (v4.0) y no se propagaron a todas las secciones afectadas. Se añaden la **Fase 7 ampliada** (gestión real de organización) y la **Fase 7.1 — Reembolsos y Soporte** (nueva). Ver el detalle completo de cada hueco en las fases correspondientes y en `TRD.md §3.1` y `§21`.

> **Cambio v4.0 vs v3.0:** se añade la **Fase 6.5 — Course Builder & Marketplace Multi-Vendor**, entre la Fase 6 (Integración Moodle) y la Fase 7 (Panel de Organización). Esta fase introduce el creador de cursos propio (módulos, lecciones, video con Cloudflare Stream, quizzes, certificación automática) y la apertura del marketplace a vendedores externos (instructores y estudios VR) con revisión editorial y payouts. La Fase 6 se ajusta para reflejar que Moodle pasa a ser un motor de inscripción/SSO, no el lugar donde vive el contenido — ver `TRD.md §19.1` para el detalle de por qué. El resto de fases (1-5, 7-13) permanecen funcionalmente iguales a v3.0.

> **Cambio v3.0 vs v2.1:** se reemplaza toda la infraestructura de Vercel + InsForge por **VPS propio con Docker Compose**. Los cambios afectan principalmente la Fase 2.5 (CI/CD) y el §0. Las fases de producto (1–13) permanecen idénticas en funcionalidad. Ver `DEPLOY.md` para la guía completa de infraestructura VPS.

---

## §0. Cambios respecto a v3.0 (este documento) / v2.1 (heredados)

0. **Nuevo en v4.0 — Fase 6.5 (Course Builder & Marketplace Multi-Vendor):** ver la fase completa más abajo. Resumen: el contenido de los cursos (módulos/lecciones/video/quizzes) pasa a vivir en Postgres propio en vez de en Moodle, porque la Web Service API de Moodle no soporta crear ese contenido por API (`TRD.md §19.1` — verificado contra documentación oficial). El video usa Cloudflare Stream. El marketplace se abre a vendedores externos con comisión y payout.
1. **InsForge eliminado.** `@insforge/sdk`, `npx @insforge/cli`, y el pooler de InsForge ya no existen en este proyecto. Postgres corre en Docker en el VPS con acceso TCP directo. Storage es Cloudflare R2 (SDK S3-compatible). Ver `AGENTS.md §6.5` para la tabla de equivalencias completa.
2. **Vercel eliminado.** El despliegue es a VPS via GitHub Actions + SSH. El CI/CD de Fase 2.5 se actualizó en consecuencia.
3. **`next.config.js` requiere `output: 'standalone'`** para que el build Next.js funcione en Docker.
4. **Migraciones simplificadas.** Con Postgres propio y TCP directo, se usa `npx prisma migrate deploy` estándar — sin InsForge CLI.
5. **Nginx reemplaza Vercel Edge.** Rate limiting, streaming RSC, SSL y static files son responsabilidad de Nginx en el VPS. Configuración en `DEPLOY.md §6`.
6. **Todo lo demás (v2.1 §0 ítems 2-5) sigue aplicando.** `@zxcvbn-ts/core`, pooling de Prisma, ShadCN components, etc.

---

## §1. Convenciones de este documento


- Las fases están numeradas limpiamente. `PROGRESS.md` usa esta numeración.
- `[ ]` no iniciada · `[~]` en progreso · `[x]` completa y verificada.

---

## Fase 1 — Fundaciones — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md` para el detalle completo.)*

---

## Fase 2 — Landing, Navegación y Autenticación — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md` para el detalle completo.)*

---

## Fase 2.5 — CI/CD, Seguridad de Repositorio y Despliegue en VPS

**Estado actual:** parcialmente completado (CI local). Falta conectar con VPS real.

### Ya completado (de `PROGRESS.md`)
- [x] Vitest configurado + GitHub Actions CI (typecheck + lint + vitest + build)
- [x] Playwright E2E configurado
- [x] axe-core WCAG 2.1 AA en CI
- [x] RLS isolation test automatizado en CI
- [x] `.gitignore` revisado

### Pendiente (actualizado para VPS)

- [x] **Eliminar archivos obsoletos** — `vercel.json`, `insforge.toml`, `.insforge/`, `.vercel/`, `app/api/insforge-token/`, `app/api/debug/` ✅
- [x] **Limpiar `.env.local.example`** — eliminar referencias a InsForge ✅
- [x] **Fix `lib/prisma.ts`** — usar `pg.Pool({ max: 10 })` con param queries ✅
- [x] **Fix `lib/rate-limit.ts`** — limpieza periódica de entries expirados ✅
- [x] **Fix `app/api/test/rls-isolation/route.ts`** — eliminar refs a InsForge ✅
- [x] **Fix `.github/workflows/rls-test.yml`** — reescribir para Postgres Docker ✅
- [x] **Crear `app/api/health/route.ts`** — health check con DB verification ✅
- [x] **Crear `lib/storage/client.ts`** — Cloudflare R2 (S3-compatible) ✅
- [x] **`output: 'standalone'`** en `next.config.ts` ✅
- [ ] **Dockerfile multi-stage** (ver `DEPLOY.md §4`) — crear y probar localmente
- [ ] **`docker-compose.yml`** con todos los servicios (app, postgres, redis, meilisearch, nginx, certbot) — ver `DEPLOY.md §5`
- [ ] **Nginx config** con proxy_buffering off, rate limiting, SSL — ver `DEPLOY.md §6`
- [ ] **Provisionar VPS** (Hetzner / Contabo / DigitalOcean — mínimo 2 vCPU, 4 GB RAM, Ubuntu 24.04)
- [ ] **Setup inicial del VPS** (Docker, firewall UFW, usuario deploy, SSH keys) — ver `DEPLOY.md §12`
- [ ] **GitHub Actions deploy workflow** (SSH deploy) — ver `DEPLOY.md §8`
- [ ] **Secrets en GitHub repo:**
  - `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- [ ] **Variables de entorno en VPS** (`/opt/medicamentum360/.env.production`):
  - `DATABASE_URL`, `DIRECT_URL` (Postgres Docker)
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (dominio real VPS)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `MOODLE_WS_TOKEN`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`
  - `REDIS_PASSWORD`, `MEILI_MASTER_KEY`
  - `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` (Cloudflare R2)
  - `BREVO_API_KEY`
- [ ] **SSL con Let's Encrypt** (primer setup) — ver `DEPLOY.md §11`
- [ ] **Health check endpoint** `GET /api/health` — ver `BACKEND.md §3`
- [ ] **Backups de Postgres** (cron diario) — ver `DEPLOY.md §10`
- [ ] **UptimeRobot** apuntando a `https://medicamentum360.com/api/health`
- [ ] **Verificar `BETTER_AUTH_URL`** apunta al dominio VPS real
- [ ] **Google Cloud Console:** redirect URI = `https://<dominio-vps>/api/auth/callback/google`
- [ ] **Migración inicial en producción:** `npx prisma migrate deploy` (via SSH o CI/CD)
- [ ] **Verificar RSC streaming:** Nginx `proxy_buffering off` activo

### Diagnóstico rápido si el login falla en VPS pero funciona en local

1. **¿Error en logs del contenedor?** `docker compose logs -f app` — buscar timeout de DB o conexión rechazada → verificar `DATABASE_URL` apunta a `postgres:5432` (nombre del servicio Docker), no a `localhost`.
2. **¿Solo falla Google OAuth?** → `redirect_uri_mismatch`, verificar Google Cloud Console con el dominio VPS real.
3. **¿Las variables están en `.env.production`?** → `cat /opt/medicamentum360/.env.production` (en VPS) y verificar que el contenedor las está leyendo: `docker compose run --rm app env | grep BETTER_AUTH`.
4. **¿Error 500 al crear usuario?** → sospecha de RLS bloqueando INSERT en `users`/`session`/`account` — conectar al Postgres directamente: `docker exec -it medicamentum_postgres psql -U medicamentum -d medicamentum360`.
5. **¿RSC no hace streaming?** → verificar `proxy_buffering off` en Nginx: `docker exec medicamentum_nginx nginx -T | grep buffering`.

---

## Fase 3 — Marketplace y Detalle de Producto — ✅ COMPLETA

*(Sin cambios. Ver `PROGRESS.md`.)*

---

## Fase 4 — Carrito, Checkout y Órdenes (Wompi) — ✅ COMPLETA

> **Nota de orden (señalada, no resuelta en silencio):** esta fase se completó en desarrollo local antes de que la Fase 2.5 terminara su parte de VPS real (provisión del servidor, SSL, secrets en GitHub siguen pendientes — ver `PROGRESS.md` Fase 2.5). No bloquea el trabajo de código, pero el webhook de Wompi con HMAC+idempotencia solo puede probarse de extremo a extremo, con tráfico público real, una vez el VPS esté provisionado y el dominio tenga HTTPS. Hasta entonces, lo construido se valida con los 10/10 tests unitarios reportados en `PROGRESS.md`, no con un webhook real recibido desde Wompi.

*(Detalle completo de lo implementado en `PROGRESS.md` Fase 4.)*

- [x] Carrito popover (persistencia guest + merge al login).
- [x] Checkout con datos DIAN (NIT/CC), widget Wompi embebido (Checkout Brick).
- [x] Webhook con HMAC + idempotencia (`/api/webhooks/wompi`) — validado con tests unitarios, pendiente de validación end-to-end contra Wompi real en producción.
  - **Nota VPS:** registrar el webhook en Wompi con el dominio real del VPS: `https://medicamentum360.com/api/webhooks/wompi` — pendiente hasta que el VPS esté provisionado.
- [x] Pantalla de éxito + email de confirmación (Brevo).
- [x] Tabla `employee_assignments` (schema Prisma).
- [x] Historial de órdenes (`/orders`).
- [ ] Cupones/descuentos — modelo `Coupon` ya está en el schema Prisma (ver `PROGRESS.md` Fase 4), pero la UI/lógica de aplicar un cupón en checkout no se reportó como implementada; verificar antes de marcar este ítem.

---

## Fase 5 — Dashboard del Estudiante

- [ ] Grid: Mis Cursos, Calendario (+Google Calendar OAuth), Mis Certificados, Agenda del día.
- [ ] Mis Experiencias VR — lanzar experiencia + estado de "key activa".
- [ ] Generación de certificados (PDF) + compartir LinkedIn.
  - **Nota VPS:** los certificados PDF se suben a Cloudflare R2 bucket `certificates/` con URL firmada (no InsForge Storage).
- [ ] Perfil/Configuración: contraseña, 2FA.

---

## Fase 6 — Integración Moodle

> **Alcance ajustado en v4.0:** la API REST de Moodle no soporta crear secciones/recursos/quizzes por webservice (`TRD.md §19.1`). Esta fase se limita a lo que la API sí soporta: inscripción, SSO y sync de notas para cursos legacy. La creación de contenido pedagógico vive en la Fase 6.5 (Course Builder propio), que es independiente de Moodle.

- [ ] API REST: catálogo (solo metadatos de curso), progreso/calificaciones de cursos `contentSource: moodle_legacy`.
- [ ] Inscripción automática post-pago vía webhook de Wompi (`enrol_manual_enrol_users`) — aplica a todo curso, sea `native` o `moodle_legacy`.
- [ ] SSO/autologin para "Continuar curso" — solo para cursos `contentSource: moodle_legacy`.
- [ ] Sync de notas vía cron (Inngest o cron job Docker) — solo para cursos `contentSource: moodle_legacy`.
- [ ] Desarrollar/probar todo contra Moodle local de `docker/`.

---

## Fase 6.5 — Course Builder & Motor de Sync Moodle & Marketplace Multi-Vendor (NUEVO en v4.0, revisado julio 2026)

**Arquitectura híbrida (julio 2026):** Postgres es la fuente de verdad del contenido. El Course Builder crea cursos rápido (drag & drop, video, quizzes). Moodle recibe un espejo del shell del curso + inscripciones automáticas. El estudiante consume desde el reproductor de Medicamentum360. Ver `TRD.md §19.1`.

**Bloqueante:** ✅ Fase 4 completa (ver `PROGRESS.md`) · Fase 5 completa (dashboard del estudiante, donde vive el reproductor de lección) — **único bloqueante restante**. El Course Builder en sí (creación de cursos, módulos, lecciones) no depende de Fase 5; lo que sí depende es el flujo de consumo del estudiante (§3.10 de `UX_UI.md`), porque vive dentro del dashboard. Si se quiere, el equipo puede empezar el Course Builder (creación) en paralelo a la Fase 5, y dejar el reproductor de lección para cuando ambas converjan.

**Por qué esta fase importa para el negocio:** hoy la plataforma depende de que alguien cree el contenido manualmente dentro de Moodle, fuera de Medicamentum360. Eso no escala si la idea es que muchas personas — instructores médicos, hospitales aliados, estudios de VR — puedan publicar contenido propio. Esta fase resuelve ambos problemas a la vez: da una herramienta de creación de cursos completa dentro de la propia plataforma, y abre la puerta a que terceros vendan en el marketplace, con Medicamentum360 cobrando una comisión por cada venta — un segundo motor de ingresos además de la venta directa.

### Modelo de datos y arquitectura (ver `TRD.md §19-20` para el detalle completo)
- [ ] Migración Prisma: `Course`, `Module`, `Lesson`, `Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `LessonCompletion`.
- [ ] Migración Prisma: `Vendor`, `Payout`; campos nuevos en `Product` (`vendorId`, `reviewStatus`); campo nuevo en `Course`/`Product` (`contentSource`).
- [ ] Policies RLS para cada tabla nueva (`TRD.md §19.3`) — contar y documentar el total en `PROGRESS.md` al implementarlas.
- [ ] Cuenta de Cloudflare Stream creada, variables de entorno documentadas (`DEPLOY.md §16.4`) — **recordar siempre añadirlas vía append, nunca sobrescribiendo `.env.production`** (`AGENTS.md §2.5`, `DEPLOY.md §16`).

### Course Builder — creación de contenido
- [ ] Panel `/instructor` — listado de cursos propios con estado (borrador/publicado/en revisión).
- [ ] Editor de curso `/instructor/courses/[id]` — layout de 3 columnas (`UX_UI.md §3.11`).
- [ ] CRUD de módulos con reordenamiento drag & drop accesible por teclado (`FRONTEND_PATTERNS.md §10.1`).
- [ ] CRUD de lecciones (video/texto/quiz/recurso) con reordenamiento.
- [ ] Drip content por módulo (`releaseAfterDays`).
- [ ] Subida de video vía Cloudflare Stream Direct Upload (`BACKEND.md §16`) + webhook de confirmación.
- [ ] Editor de quiz: preguntas de opción única/múltiple/verdadero-falso, explicación post-respuesta, configuración de intentos/tiempo límite.
- [ ] Lecciones marcables como "vista previa" (`isPreview`) — visibles gratis en el detalle de producto.
- [ ] Validaciones bloqueantes antes de publicar/enviar a revisión (módulo vacío, video no listo, quiz sin pregunta correcta).

### Consumo del curso — estudiante
- [ ] Reproductor de lección (`/dashboard/cursos/[slug]/[leccionId]`) con reproducción HLS firmada (`hls.js`).
- [ ] Marcado de lección completada (automático al 90% del video, o manual para texto/recurso).
- [ ] Cálculo de `Enrollment.progressPct` en tiempo real, sin cron.
- [ ] Componente de Quiz para el estudiante + pantalla de resultado con revisión por pregunta.
- [ ] Certificación automática al completar el curso (reutiliza `lib/actions/certificates.ts` ya existente, sin esperar sync con Moodle).

### Marketplace Multi-Vendor
- [ ] Onboarding de vendor (`/vender`) — registro, KYC, datos bancarios cifrados (`BACKEND.md §18.1`).
- [ ] Aprobación de vendor por `super_admin`.
- [ ] Creación de producto (curso o VR) por vendor, con scoping automático a su `vendorId`.
- [ ] Flujo de envío a revisión (`reviewStatus: pending_review`) en vez de publicación directa.
- [ ] Bandeja `/admin/review-queue` — aprobar/rechazar productos de vendor con vista previa real y motivo de rechazo obligatorio.
- [ ] Atribución de vendor en marketplace (`VendorBadge`, página `/marketplace/creador/[vendorSlug]`).
- [ ] Cron de generación de payouts mensuales (`generateMonthlyPayoutBatch`).
- [ ] Panel `/admin/payouts` — revisión y aprobación manual del lote antes de disparar transferencias reales (punto de parada obligatorio, `AGENTS.md §8`).
- [ ] Historial de payouts para el propio vendor (solo lectura).
- [ ] Flujo de suspensión de vendor (despublicación automática de su catálogo, acceso ya comprado se mantiene).

### Testing específico de esta fase
- [ ] Test de que un `vendor` no puede editar el `Course` de otro `vendor` (ownership, no solo rol).
- [ ] Test de que ningún producto de `vendor` llega a `published: true` sin `reviewStatus: approved`.
- [ ] Test de idempotencia del webhook de Cloudflare Stream (mismo evento dos veces no duplica el estado de la lección).
- [ ] Test de que `bankAccountInfo` nunca se devuelve en texto plano desde ninguna Server Action de lectura.
- [ ] Test de cálculo de payout: bruto - comisión = neto, con casos de comisión personalizada por vendor.
- [ ] Test E2E (Playwright): flujo completo crear curso → publicar → comprar → consumir lección → aprobar quiz → obtener certificado.

### Criterios de aceptación para marcar esta fase completa
- Un `super_admin` puede crear un curso completo (mínimo 1 módulo, 1 lección de video, 1 quiz) sin tocar Moodle en ningún paso.
- Un usuario puede registrarse como vendor, ser aprobado, crear un producto, enviarlo a revisión, y verlo publicado tras aprobación — flujo completo de punta a punta.
- El video se reproduce solo con token firmado vigente; un intento de acceder al manifiesto HLS sin token válido falla.
- El payout de un periodo de prueba calcula correctamente bruto/comisión/neto y queda en estado `pending` hasta aprobación manual — ninguna transferencia real se dispara automáticamente.

---

## Fase 7 — Panel de Organización (hospital_admin) — alcance real (auditoría 2026-06-26)

> Esta fase decía "sin cambios respecto a v2.1" sin que v2.1 nunca hubiera detallado su contenido real en los documentos que tengo. Auditoría de 2026-06-26 encontró que `EmployeeAssignment` ya existe en el schema (Fase 4) sin ninguna pantalla ni Server Action que lo use, y que no existía forma de revocar acceso a un empleado. Se documenta aquí el alcance completo. Ver `TRD.md §3.1`, `BACKEND.md §7` y `§19`, `UX_UI.md §3.6.1-3.6.2` y `§3.18`, `FLUJOS.md §5.1` y `§10.1-10.2`.

### Gestión de empleados (resuelve hueco crítico)
- [ ] `updateEmployeeRole` — cambiar rol estudiante↔administrador, con protección de "nunca dejar la organización sin admin".
- [ ] `removeEmployeeFromOrganization` — revoca `EmployeeAssignment`, preserva `Enrollment`/certificados ya emitidos.
- [ ] UI: dropdown de rol + menú `⋮` con "Remover de la organización" + diálogo de confirmación explícito sobre el alcance exacto.
- [ ] Test: intentar remover/descender al único admin de una organización debe fallar siempre.

### Compra corporativa en lote (resuelve hueco crítico — `EmployeeAssignment` huérfano desde Fase 4)
- [ ] Extensión de checkout: toggle "Comprar para mi organización" + cantidad de cupos, visible solo para `hospital_admin`.
- [ ] `createBulkOrderForOrganization`, `getUnassignedSeats`, `assignCourseToEmployee`.
- [ ] UI: banner de cupos sin asignar + acción de asignar por empleado en `/org/employees`.
- [ ] Decisión pendiente de confirmar con negocio: estrategia de atribución de cupos a múltiples órdenes (FIFO sugerido, no decidido).

### Reportes de progreso (resuelve hueco de `ProgressBar` sin pantalla)
- [ ] `getOrganizationProgressReport` + pantalla `/org/reports` con exportación CSV.

### Criterios de aceptación para marcar esta fase completa
- Un `hospital_admin` puede remover a un empleado y verificar que pierde acceso inmediato al contenido de la organización, sin perder certificados ya obtenidos.
- Una organización compra 5 cupos, los asigna a 3 empleados, y el panel muestra correctamente "2 cupos sin asignar".
- Intentar dejar una organización sin administrador (por cambio de rol o remoción) falla con un mensaje claro, en todos los casos probados.

---

## Fase 7.1 — Reembolsos y Soporte (NUEVO, auditoría 2026-06-26)

**Bloqueante:** Fase 4 completa (✅ ya lo está). Independiente de la Fase 6.5 — puede hacerse en paralelo o incluso antes, dado que resuelve una promesa de UI (`UX_UI.md §3.4`, `§3.9`) que ya está visible hoy sin estar implementada.

> Hueco crítico detectado en auditoría: la plataforma muestra "política de reembolso" en el detalle de producto y el checkout desde el inicio, sin que existiera ningún flujo, Server Action, ni pantalla que lo ejecutara. Ver `TRD.md §21`, `BACKEND.md §20-21`, `UX_UI.md §3.15-3.17`, `FLUJOS.md §19-20`.

### Reembolsos
- [ ] Modelo Prisma `RefundRequest` + policy RLS.
- [ ] `lib/refunds/policy.ts` — política de elegibilidad centralizada (7 días / 20% progreso, a confirmar con negocio antes de codificar el valor final).
- [ ] `requestRefund`, `processRefund` (Server Actions).
- [ ] Integración con la API de reembolsos de Wompi (confirmar que el plan de Wompi de Medicamentum360 soporta reversar transacciones, no asumirlo).
- [ ] UI: botón de solicitud en `/orders` (§3.15), bandeja `/admin/refunds` (§3.16).
- [ ] Revocación automática de `Enrollment`/`EmployeeAssignment` al procesar un reembolso aprobado.

### Soporte
- [ ] Modelo Prisma `SupportTicket`.
- [ ] `createSupportTicket` (Server Action) + email de notificación al equipo.
- [ ] Pantalla `/soporte` (§3.17), accesible con o sin sesión.
- [ ] Enlace en footer y menú de usuario.

### Criterios de aceptación
- Un estudiante con un curso comprado hace menos de 7 días y con menos de 20% de progreso puede solicitar y recibir un reembolso de punta a punta, incluyendo la pérdida verificada de acceso al curso.
- Un estudiante fuera de la política puede igual enviar la solicitud y un `super_admin` puede aprobarla manualmente si decide que el caso lo justifica.
- Cualquier usuario, autenticado o no, puede enviar un ticket de soporte y el equipo recibe el email con todo el contexto necesario.

---

## Fase 8 — Panel Super Admin

- [ ] CRUD de productos: crear curso, subir modelo 3D (upload a Cloudflare R2 `vr-assets/`).
- [ ] Gestión de hospitales/organizaciones.
- [ ] Gestión de vendors: aprobación de KYC, suspensión, ajuste de comisión individual (extiende la Fase 6.5).
- [ ] Panel de seguridad.
- [ ] Audit log de actividad administrativa — incluye aprobaciones/rechazos de productos de vendor y lotes de payout aprobados.

---

## Fase 9 — Operaciones

*(Sin cambios.)*

---

## Fase 10 — Analíticas y Reportes

*(Sin cambios.)*

---

## Fase 11 — LMS Avanzado

*(Sin cambios.)*

---

## Fase 12 — Notificaciones

*(Sin cambios.)*

---

## Fase 13 — Pulido, SEO, Accesibilidad y Compliance Final

- [ ] Auditoría SEO/Lighthouse.
- [ ] WCAG AA final.
- [ ] PWA (offline para hospitales con baja conectividad) — en VPS, el service worker funciona igual.
- [ ] LTI 1.3 embebido.
- [ ] Facturación electrónica DIAN.
- [ ] **Escalar VPS si es necesario** — evaluar Redis Cluster o mover a k8s si el tráfico lo justifica.

---

## §12. Desviaciones de implementación vs. documentos previos

Añadir a las desviaciones ya documentadas en v2.1 §12:

6. **InsForge eliminado:** todo el código que usaba `@insforge/sdk` debe actualizarse a Prisma directo o `@aws-sdk` para storage. Ver `AGENTS.md §6.5` para la tabla de equivalencias.
7. **Vercel eliminado:** CI/CD ya no deploy a Vercel. GitHub Actions hace SSH deploy al VPS.
8. **`output: 'standalone'`** agregado a `next.config.js` — requerido para Docker.
9. **`DATABASE_URL` sin `?pgbouncer=true`** — con Postgres propio en Docker, la conexión es TCP directa.
10. **Bridge JWT `/api/insforge-token` eliminado** — ya no necesario.
11. **Archivos obsoletos eliminados del repo:** `vercel.json`, `insforge.toml`, `.insforge/`, `.vercel/`, `app/api/debug/`.
12. **`lib/prisma.ts` usa `pg.Pool({ max: 10 })`** — control explícito de conexiones a Postgres.
13. **Moodle deja de ser el motor de contenido del curso (v4.0):** la Web Service API no soporta crear secciones/recursos/quizzes por API (verificado, ver `TRD.md §19.1`). El contenido vive en Postgres propio desde la Fase 6.5; Moodle queda como motor de inscripción/SSO para cursos legacy.
14. **El marketplace deja de ser de un solo vendedor (v4.0):** `Product` gana `vendorId` opcional y `reviewStatus`. Todo producto de terceros pasa por revisión editorial antes de publicarse — ver `TRD.md §20.4`.
15. **Auditoría 2026-06-26 — huecos críticos detectados y resueltos en documentación (Fase 7 y 7.1 nuevas):** `EmployeeAssignment` existía en el schema desde la Fase 4 sin ninguna Server Action/pantalla; no había forma de revocar acceso a un empleado; la UI prometía "política de reembolso" sin flujo real detrás; no existía canal de soporte. Ver el detalle completo en cada fase. Dos contradicciones internas también se corrigieron: el trigger de certificado en `FLUJOS.md §9` seguía asumiendo sync con Moodle para todos los cursos, y la validación de `moodleCourseId` en `FLUJOS.md §11` se aplicaba indistintamente a cursos `native` y `moodle_legacy`.

---

## Matriz de dependencias

```
Fase 1✅ ──► Fase 2✅ ──► Fase 2.5~ (VPS, falta provisión real) ──► Fase 3✅ ──► Fase 4✅ ──► Fase 5 ──┬─► Fase 6
                          │                              │                │
                          │ (bloquea pagos reales)       │                ▼
                          └──────────────────────────────┘            Fase 6.5 (Course Builder
                                                                        + Marketplace Multi-Vendor)
                                                                              │
                                                                              ▼
                                                                          Fase 7 ──► Fase 8 ──► ... ──► Fase 13
                                                                              │
                                                                              ▼
                                                                          Fase 7.1 (Reembolsos
                                                                          + Soporte — independiente,
                                                                          puede ir en paralelo)
```

**Estado real (2026-06-26, ver `PROGRESS.md`):** Fases 1-4 completas en desarrollo local. Fase 2.5 sigue `~EN PROGRESO` porque el VPS real (provisión, SSL, secrets de GitHub) no se ha hecho aún — esto es una desviación de orden aceptada, no bloqueante para seguir codificando, pero **sí bloqueante para cualquier prueba de pagos reales o webhook de Wompi recibido desde producción** (ver nota en la Fase 4 más arriba). Próximo paso lógico: Fase 5 (Dashboard del Estudiante), que desbloquea por completo la Fase 6.5. **La Fase 7.1 (Reembolsos y Soporte) no depende de Fase 5/6/6.5 — es candidata a priorizarse antes si el equipo de negocio considera que la promesa de reembolso ya visible en producción es un riesgo de cara al usuario real.**

**Nota:** la Fase 6.5 depende de Fase 4 (✅ ya completa) y Fase 5 (no de la Fase 6 de Moodle) — puede desarrollarse en paralelo a la Fase 6 si el equipo lo prefiere, ya que el Course Builder es independiente de la integración con Moodle por diseño.

---

## §13. Desviaciones adicionales (VPS)

Ver desviaciones en §0 y en `PROGRESS.md` por fase.
