-- Test: Aislamiento RLS cross-organization
-- Verifica que policies multi-tenant funcionan correctamente
--
-- IMPORTANTE: NO ejecutar via CLI (`npx @insforge/cli db query`)
-- El CLI corre como admin/service_role y BYPASSES RLS.
--
-- Para ejecutar este test correctamente, necesitas:
--   1. Tener dos usuarios autenticados (Org A y Org B)
--   2. Hacer las queries desde su contexto (Server Action o API route con sesión)
--   3. Verificar que cada usuario solo ve sus propios datos
--
-- Alternativa temporal via psql con un JWT falso (solo desarrollo local):
--   SET LOCAL "request.jwt.claim.sub" TO 'user-a-test';
--   SET LOCAL "request.jwt.claim.organization_id" TO 'org-a-test';
--   SELECT ... (las queries de abajo)
--
-- ===== SETUP: Crear datos de prueba =====
INSERT INTO public.organizations (id, name, nit) VALUES
  ('org-a-test', 'Organization A', 'NIT-001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, nit) VALUES
  ('org-b-test', 'Organization B', 'NIT-002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."user" (id, name, email, "emailVerified", "updatedAt") VALUES
  ('user-a-test', 'User A', 'user-a@test.local', true, NOW()),
  ('user-b-test', 'User B', 'user-b@test.local', true, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, role, "organizationId") VALUES
  ('user-a-test', 'student'::public."Role", 'org-a-test'),
  ('user-b-test', 'student'::public."Role", 'org-b-test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, type, title, slug, description, "priceCents", published) VALUES
  ('prod-1', 'course'::public."ProductType", 'Course 1', 'course-1', 'Test course', 10000, true),
  ('prod-2', 'course'::public."ProductType", 'Course 2', 'course-2', 'Test course', 20000, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (id, "userId", "productId", status) VALUES
  ('enroll-a-1', 'user-a-test', 'prod-1', 'not_started'),
  ('enroll-a-2', 'user-a-test', 'prod-2', 'not_started')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.enrollments (id, "userId", "productId", status) VALUES
  ('enroll-b-1', 'user-b-test', 'prod-1', 'not_started')
ON CONFLICT (id) DO NOTHING;

-- ===== TESTS (ejecutar como 'user-a-test' con Org A) =====
-- Test 1: User A NO puede ver enrollments de User B (debe dar 0)
SELECT COUNT(*) as "enrollments_visible_to_user_a"
FROM public.enrollments
WHERE id IN ('enroll-b-1');

-- Test 2: Products públicos deben ser visibles (debe dar 2)
SELECT COUNT(*) as "public_products_visible"
FROM public.products
WHERE published = true;

-- Test 3: User A puede ver su propia org (debe dar 1)
SELECT COUNT(*) as "own_org_visible"
FROM public.organizations
WHERE id = 'org-a-test';

-- Test 4: User A NO puede ver org B (debe dar 0)
SELECT COUNT(*) as "other_org_visible"
FROM public.organizations
WHERE id = 'org-b-test';

-- Test 5: Verificar estructura RLS aplicada
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
ORDER BY tablename, policyname
LIMIT 30;
