# PLAN — Medicamentum360
**Plan de desarrollo fasado**
Versión: 1.1 · Fecha: 2026-06-21

> Este plan deriva directamente de PRD.md, TRD.md, UX_UI.md, FLUJOS.md y BACKEND.md. Si ya existe un `PHASE_PLAN.md` previo (jerarquía `MASTER_PROMPT.md > PHASE_PLAN.md > DESIGN.md > AGENTS.md`), este documento debe reconciliarse con él antes de alimentar a los agentes de codificación — úsalo como insumo de actualización, no como reemplazo automático, para no perder decisiones ya congeladas (color de marca, decisiones de RLS, Wompi de pago único, etc.).[cite: 2]

---

## Fase 1 — Fundaciones

**Objetivo:** base técnica segura y compliant antes de construir cualquier UI visible.[cite: 2]

- Setup Next.js App Router + Prisma + InsForge Postgres.[cite: 2]
- `schema.prisma` inicial (ver TRD.md §3) + migraciones.[cite: 2]
- RLS activado en todas las tablas con `userId`/`organizationId` (TRD.md §4 / BACKEND.md §3).[cite: 2]
- Better Auth: email+password + Google OAuth, modelo de sesión y roles (`super_admin`, `hospital_admin`, `student`).[cite: 2]
- Cuenta espejo automática en Moodle al registrar usuario (BACKEND.md §6).[cite: 2]
- Banner de cookies + política de privacidad (Ley 1581) — reutilizar `vanilla-cookieconsent` (ver FRONTEND_PATTERNS.md §5), no construir desde cero.[cite: 2]
- Variables de entorno y secretos (TRD.md §15).[cite: 2]
- **Levantar el Moodle local de pruebas** (`docker/docker-compose.yml`, ver TRD.md §17) para tener un `MOODLE_BASE_URL`/`MOODLE_WS_TOKEN` reales desde el primer día, sin esperar a que `lms.medicamentum360.com` esté listo.[cite: 2]

**Criterio de aceptación bloqueante:** test de aislamiento RLS cross-org pasando (PRD.md §9, TRD.md §4) antes de avanzar a Fase 4 (pagos).[cite: 2]

---

## Fase 2 — Landing y navegación

- Barra de navegación con comportamiento scroll-aware (visitante y autenticado) — implementar a partir del patrón verificado en `FRONTEND_PATTERNS.md §3` (no construir desde cero)[cite: 2]. Incluir correcciones para navegación mediante anclas locales con `scroll-behavior: smooth`.
- Landing completa: Hero, Nosotros, Ejemplos, Blog (carrusel), Footer[cite: 2]. Implementar el componente oficial de carrusel de ShadCN (basado en Embla) para asegurar interacciones de swipe y navegación por teclado[cite: 6].
- Meta tags OG/Twitter Card + Schema.org.[cite: 2]
- Dark/light mode persistente — usar el hook de `FRONTEND_PATTERNS.md §4`, luego extenderlo para sincronizar con `User.theme` en Fase 7.[cite: 2]
- Páginas 404/500 con branding propio.[cite: 2]
- **Páginas de Autenticación (`/login` y `/registro`):**
    - **Diseño y UX:** Implementar un layout de dos columnas que combine el formulario con un carrusel explicativo de reproducción automática y pausa al hover[cite: 6]. Para maximizar la retención, el carrusel debe seguir una secuencia pedagógica clara que dosifique la información paso a paso (ej. Paso 1: Misión de la plataforma, Paso 2: Funcionamiento del LMS, Paso 3: Certificaciones), reduciendo así la carga cognitiva del estudiante antes de registrarse. El formulario de login debe prever un layout reducido con "¿olvidaste tu contraseña?" y "recordar contraseña"[cite: 6].
    - **Técnicas y Seguridad:** Conectar la UI con `auth-client.ts`[cite: 3]. Aprovechando buenas prácticas de seguridad de la información, el registro debe contar con validación reactiva de formularios (ej. Zod + React Hook Form). Implementar un indicador visual de fortaleza de contraseña respaldado por algoritmos rigurosos de cálculo de entropía (como `zxcvbn`)[cite: 6], además de blindar las Server Actions de autenticación con rate limiting para evitar ataques de fuerza bruta.

---

## Fase 3 — Marketplace y detalle de producto

- Listado de productos con filtros (categoría, precio, ordenamiento) y Meilisearch.[cite: 2]
- Skeleton loaders, estado "sin resultados", paginación/infinite scroll.[cite: 2]
- Página de detalle (2 columnas), visor 3D R3F para VR (preview, no contenido VR completo).[cite: 2]
- Reseñas y rating.[cite: 2]
- Breadcrumb, productos relacionados, compartir, indicador de cupo.[cite: 2]

---

## Fase 4 — Carrito y checkout (Wompi)

- Carrito popover (persistencia guest + merge al login).[cite: 2]
- Página de checkout con datos de facturación DIAN (NIT/CC).[cite: 2]
- Integración Wompi (widget embebido + webhook con validación HMAC e idempotencia).[cite: 2]
- Pantalla de éxito post-pago + email de confirmación (Brevo).[cite: 2]

**Dependencia bloqueante:** Fase 1 completa (RLS validado), porque aquí se manejan datos de pago reales.[cite: 2]

---

## Fase 5 — Integración Moodle (cursos)

- API REST Moodle: catálogo, progreso, calificaciones (lectura).[cite: 2]
- Inscripción automática post-pago (`enrol_manual_enrol_users`) disparada desde el webhook de Wompi.[cite: 2]
- SSO/autologin (Modo 2) para "Continuar curso".[cite: 2]
- Caché de catálogo/progreso (DB propia o Redis).[cite: 2]
- **Desarrollar y probar todo lo anterior contra el Moodle local de `docker/`** (TRD.md §17) antes de apuntar a `lms.medicamentum360.com`; usar el curso demo `M360-DEMO-001` y el estudiante `estudiante_demo` ya provisionados para validar el flujo completo de FLUJOS.md §3-4 de punta a punta.[cite: 2]

---

## Fase 6 — Dashboard del estudiante

- Grid 2×2: Mis Cursos, Calendario (+ Google Calendar OAuth), Mis Certificados, Agenda del día.[cite: 2]
- Generación de certificados (PDF) al completar curso + compartir LinkedIn.[cite: 2]
- "Continúa donde lo dejaste".[cite: 2]

---

## Fase 7 — Configuración, panel `hospital_admin` y facturación

- Configuración de cuenta: perfil, preferencias, eliminar cuenta (dos pasos), historial de compras/facturas.[cite: 2]
- Panel mínimo `hospital_admin`: compra para organización, asignación de licencias, reporte agregado de progreso del equipo.[cite: 2]
- Integraciones conectadas (Google Calendar/Account) con revocación.[cite: 2]

---

## Fase 8 — Pulido, cumplimiento y post-MVP

- SEO/Lighthouse, accesibilidad WCAG AA, analítica (GA4/Posthog).[cite: 2]
- 2FA TOTP para `hospital_admin`/`super_admin`.[cite: 2]
- Verificación de email + CAPTCHA + rate limiting + bloqueo por intentos fallidos (si no se cubrió en Fase 1).[cite: 2]
- PWA (evaluar para acceso offline en hospitales con baja conectividad).[cite: 2]
- LTI 1.3 embebido (reemplaza SSO/redirect cuando la prioridad de UX lo justifique).[cite: 2]
- Facturación electrónica DIAN automatizada.[cite: 2]
- Backend funcional del producto de automatización con IA (especificación separada cuando el primer caso de uso esté validado comercialmente).[cite: 2]

---

## Matriz de dependencias (resumen)