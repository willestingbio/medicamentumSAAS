# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-20

---

## Fase 1 — Fundaciones
- [x] Setup Next.js App Router + Prisma + InsForge Postgres
  - Next.js 15, React 19, TypeScript strict
  - Prisma 7.8 configurado (esquema sin url en schema.prisma, config en prisma.config.ts)
  - PostCSS + Tailwind CSS v4 con tokens de color (#8127cf)
- [x] `schema.prisma` inicial + migraciones SQL
  - 13 modelos completos: Organization, User, Product, Enrollment, Cart, CartItem, Order, OrderItem, Certificate, Review, CalendarEvent
  - Relaciones multi-tenant con `organizationId`
  - Migraciones SQL creadas: `20260620190500_create-medicamentum-schema.sql` + `20260620191327_enable-rls-multi-tenant.sql`
  - **En progreso:** Aplicar migraciones a InsForge (schema parcialmente existe, tipos en conflicto)
- [ ] RLS activado en todas las tablas
  - Políticas SQL implementadas para 11 tablas (organizations, users, products, enrollments, orders, etc.)
  - **Bloqueante de aplicación:** Conflicto de tipos existentes en DB, necesita investigación de esquema previo
- [x] Better Auth: email+password + Google OAuth, roles
  - `lib/auth.ts` configurado con email+password
  - Google OAuth ready (requiere GOOGLE_CLIENT_ID/SECRET en .env)
  - User model con campos `role`, `organizationId`, `moodleUserId`, `specialty`, `locale`, `theme`
  - Hooks de post sign-up para Moodle integration
- [ ] Cuenta espejo automática en Moodle
  - `lib/moodle/client.ts` implementado con `createMoodleUser()` + 11 funciones de API
  - **Pendiente:** Disparar desde Server Action post sign-up
- [x] Banner de cookies + política de privacidad (Ley 1581)
  - `vanilla-cookieconsent` v3 integrado
  - Componente `CookieConsentBanner` con config ES
- [x] Variables de entorno y secretos
  - `.env.local` creado con placeholders + DATABASE_URL válida para InsForge
  - `.gitignore` actualizado para proteger secretos
- [ ] Moodle local de pruebas (Docker)
  - **Bloqueante:** Docker no disponible en entorno WSL sin Docker Desktop integration
  - docker-compose.yml listo en `.GUIDES/`

**Próximos pasos en Fase 1:**
1. Investigar schema previo en InsForge (tablas existentes: hospital, license, product, session, user, account, verification)
2. Resolver conflicto de tipos y migrar schema correctamente a público
3. Aplicar migraciones RLS
4. Test de aislamiento RLS cross-org (bloqueante antes de Fase 4)
5. Implementar Server Action para crear cuenta Moodle post sign-up
6. (Docker) Levantar Moodle local si Docker Desktop está disponible

## Fase 2 — Landing y navegación
- [ ] No iniciada

## Fase 3 — Marketplace y detalle de producto
- [ ] No iniciada

## Fase 4 — Carrito y checkout (Wompi)
- [ ] No iniciada (bloqueada por Fase 1)

## Fase 5 — Integración Moodle (cursos)
- [ ] No iniciada

## Fase 6 — Dashboard del estudiante
- [ ] No iniciada

## Fase 7 — Configuración, panel hospital_admin y facturación
- [ ] No iniciada

## Fase 8 — Pulido, cumplimiento y post-MVP
- [ ] No iniciada
