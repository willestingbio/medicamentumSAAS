# PROGRESS — Medicamentum360
**Estado actual del plan de desarrollo**
Actualizado: 2026-06-20

---

## Fase 1 — Fundaciones
- [x] Setup Next.js App Router + Prisma + InsForge Postgres
  - Next.js 15, React 19, TypeScript strict
  - Prisma 7.8 configurado
  - PostCSS + Tailwind CSS v4 con tokens de color (#8127cf)
- [x] Schema + migraciones SQL
  - 13 modelos creados en InsForge PostgreSQL via migraciones
  - Migraciones: `create-medicamentum-schema` + `enable-rls-multi-tenant`
- [x] RLS multi-tenant activado (29 policies en 11 tablas)
  - Organizaciones, usuarios, productos, órdenes, enrollments, etc.
  - Helper function: `public.get_user_org_id()`
  - Grants para authenticated + anon
- [x] Better Auth: email+password + Google OAuth, roles
  - `lib/auth.ts` configurado con hook post sign-up para cuenta Moodle
- [x] Cuenta espejo automática en Moodle
  - Hook en auth.ts llama a `createMoodleUser()` post sign-up
  - Actualiza `moodleUserId` en BD
- [x] Banner de cookies + política de privacidad (Ley 1581)
- [x] Variables de entorno
  - `.env.local` con DATABASE_URL, BETTER_AUTH_SECRET, MOODLE_WS_TOKEN
  - `.env.local.example` documentado
- [x] Moodle local de pruebas (Docker)
  - Moodle 4.0.5 corriendo en `http://localhost:8090`
  - API REST habilitada con token: 91c2cc395d7065e7986950998ee4045a
  - Curso demo: M360-DEMO-001 (id=2)
  - Estudiante demo: estudiante_demo / EstudianteDemo123!
  - Bootstrap completo: webservices, token, curso, usuario de prueba
  - (Moodle depende de Docker Desktop en WSL2)

**Estado: Fase 1 COMPLETA! ✅**

**Próximos pasos (Fase 2):**
1. Landing page + navegación principal
2. Sistema de diseño base (navbar, footer, layouts)
3. Páginas de autenticación (sign-in, sign-up)
4. Integración de Better Auth client en UI

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
