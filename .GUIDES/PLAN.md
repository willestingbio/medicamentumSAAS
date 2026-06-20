# PLAN — Medicamentum360
**Plan de desarrollo fasado**
Versión: 1.0 · Fecha: 2026-06-19

> Este plan deriva directamente de PRD.md, TRD.md, UX_UI.md, FLUJOS.md y BACKEND.md. Si ya existe un `PHASE_PLAN.md` previo (jerarquía `MASTER_PROMPT.md > PHASE_PLAN.md > DESIGN.md > AGENTS.md`), este documento debe reconciliarse con él antes de alimentar a los agentes de codificación — úsalo como insumo de actualización, no como reemplazo automático, para no perder decisiones ya congeladas (color de marca, decisiones de RLS, Wompi de pago único, etc.).

---

## Fase 1 — Fundaciones

**Objetivo:** base técnica segura y compliant antes de construir cualquier UI visible.

- Setup Next.js App Router + Prisma + InsForge Postgres.
- `schema.prisma` inicial (ver TRD.md §3) + migraciones.
- RLS activado en todas las tablas con `userId`/`organizationId` (TRD.md §4 / BACKEND.md §3).
- Better Auth: email+password + Google OAuth, modelo de sesión y roles (`super_admin`, `hospital_admin`, `student`).
- Cuenta espejo automática en Moodle al registrar usuario (BACKEND.md §6).
- Banner de cookies + política de privacidad (Ley 1581) — reutilizar `vanilla-cookieconsent` (ver FRONTEND_PATTERNS.md §5), no construir desde cero.
- Variables de entorno y secretos (TRD.md §15).
- **Levantar el Moodle local de pruebas** (`docker/docker-compose.yml`, ver TRD.md §17) para tener un `MOODLE_BASE_URL`/`MOODLE_WS_TOKEN` reales desde el primer día, sin esperar a que `lms.medicamentum360.com` esté listo.

**Criterio de aceptación bloqueante:** test de aislamiento RLS cross-org pasando (PRD.md §9, TRD.md §4) antes de avanzar a Fase 4 (pagos).

---

## Fase 2 — Landing y navegación

- Barra de navegación con comportamiento scroll-aware (visitante y autenticado) — implementar a partir del patrón verificado en `FRONTEND_PATTERNS.md §3` (no construir desde cero).
- Landing completa: Hero, Nosotros, Ejemplos, Blog (carrusel), Footer.
- Meta tags OG/Twitter Card + Schema.org.
- Dark/light mode persistente — usar el hook de `FRONTEND_PATTERNS.md §4`, luego extenderlo para sincronizar con `User.theme` en Fase 7.
- Páginas 404/500 con branding propio.

---

## Fase 3 — Marketplace y detalle de producto

- Listado de productos con filtros (categoría, precio, ordenamiento) y Meilisearch.
- Skeleton loaders, estado "sin resultados", paginación/infinite scroll.
- Página de detalle (2 columnas), visor 3D R3F para VR (preview, no contenido VR completo).
- Reseñas y rating.
- Breadcrumb, productos relacionados, compartir, indicador de cupo.

---

## Fase 4 — Carrito y checkout (Wompi)

- Carrito popover (persistencia guest + merge al login).
- Página de checkout con datos de facturación DIAN (NIT/CC).
- Integración Wompi (widget embebido + webhook con validación HMAC e idempotencia).
- Pantalla de éxito post-pago + email de confirmación (Brevo).

**Dependencia bloqueante:** Fase 1 completa (RLS validado), porque aquí se manejan datos de pago reales.

---

## Fase 5 — Integración Moodle (cursos)

- API REST Moodle: catálogo, progreso, calificaciones (lectura).
- Inscripción automática post-pago (`enrol_manual_enrol_users`) disparada desde el webhook de Wompi.
- SSO/autologin (Modo 2) para "Continuar curso".
- Caché de catálogo/progreso (DB propia o Redis).
- **Desarrollar y probar todo lo anterior contra el Moodle local de `docker/`** (TRD.md §17) antes de apuntar a `lms.medicamentum360.com`; usar el curso demo `M360-DEMO-001` y el estudiante `estudiante_demo` ya provisionados para validar el flujo completo de FLUJOS.md §3-4 de punta a punta.

---

## Fase 6 — Dashboard del estudiante

- Grid 2×2: Mis Cursos, Calendario (+ Google Calendar OAuth), Mis Certificados, Agenda del día.
- Generación de certificados (PDF) al completar curso + compartir LinkedIn.
- "Continúa donde lo dejaste".

---

## Fase 7 — Configuración, panel `hospital_admin` y facturación

- Configuración de cuenta: perfil, preferencias, eliminar cuenta (dos pasos), historial de compras/facturas.
- Panel mínimo `hospital_admin`: compra para organización, asignación de licencias, reporte agregado de progreso del equipo.
- Integraciones conectadas (Google Calendar/Account) con revocación.

---

## Fase 8 — Pulido, cumplimiento y post-MVP

- SEO/Lighthouse, accesibilidad WCAG AA, analítica (GA4/Posthog).
- 2FA TOTP para `hospital_admin`/`super_admin`.
- Verificación de email + CAPTCHA + rate limiting + bloqueo por intentos fallidos (si no se cubrió en Fase 1).
- PWA (evaluar para acceso offline en hospitales con baja conectividad).
- LTI 1.3 embebido (reemplaza SSO/redirect cuando la prioridad de UX lo justifique).
- Facturación electrónica DIAN automatizada.
- Backend funcional del producto de automatización con IA (especificación separada cuando el primer caso de uso esté validado comercialmente).

---

## Matriz de dependencias (resumen)

```
Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5 ──► Fase 6 ──► Fase 7 ──► Fase 8
   │                                │
   └── bloquea pagos reales ────────┘
        (RLS cross-org test)
```

## Próximo paso sugerido

1. Cotejar este `PLAN.md` contra tu `PHASE_PLAN.md` existente (14 fases vía graphviz-phases) para fusionar sin perder el detalle granular que ya tenías mapeado.
2. Actualizar `AGENTS.md` con referencias a los 5 documentos nuevos (PRD, TRD, UX_UI, FLUJOS, BACKEND) para que los agentes de codificación (OpenCode/Claude Code) los usen como contexto de cada fase.
3. Verificar el paquete sospechoso identificado previamente en el flujo de agentes antes de ejecutar cualquier fase con herramientas de terceros.
