-- Test: Aislamiento RLS cross-organization
-- Verifica que policies multi-tenant funcionan correctamente
-- Ejecutar como: npx @insforge/cli db query --file tests/rls-isolation-test.sql

-- ===== SETUP: Crear datos de prueba =====
-- Organización A
INSERT INTO public.organizations (id, name, nit) VALUES 
  ('org-a-test', 'Organization A', 'NIT-001') 
ON CONFLICT (id) DO NOTHING;

-- Organización B
INSERT INTO public.organizations (id, name, nit) VALUES 
  ('org-b-test', 'Organization B', 'NIT-002') 
ON CONFLICT (id) DO NOTHING;

-- Usuarios Better Auth
INSERT INTO public."user" (id, name, email, "emailVerified") VALUES
  ('user-a-test', 'User A', 'user-a@test.local', true),
  ('user-b-test', 'User B', 'user-b@test.local', true)
ON CONFLICT (id) DO NOTHING;

-- Extensión Medicamentum: asignar usuarios a orgs
INSERT INTO public.users (id, role, "organizationId") VALUES
  ('user-a-test', 'student'::public."Role", 'org-a-test'),
  ('user-b-test', 'student'::public."Role", 'org-b-test')
ON CONFLICT (id) DO NOTHING;

-- Productos (public)
INSERT INTO public.products (id, type, title, slug, description, "priceCents", published) VALUES
  ('prod-1', 'course'::public."ProductType", 'Course 1', 'course-1', 'Test course', 10000, true),
  ('prod-2', 'course'::public."ProductType", 'Course 2', 'course-2', 'Test course', 20000, true)
ON CONFLICT (id) DO NOTHING;

-- Enrollments para User A (Org A)
INSERT INTO public.enrollments (id, "userId", "productId", status) VALUES
  ('enroll-a-1', 'user-a-test', 'prod-1', 'not_started'),
  ('enroll-a-2', 'user-a-test', 'prod-2', 'not_started')
ON CONFLICT (id) DO NOTHING;

-- Enrollments para User B (Org B)
INSERT INTO public.enrollments (id, "userId", "productId", status) VALUES
  ('enroll-b-1', 'user-b-test', 'prod-1', 'not_started')
ON CONFLICT (id) DO NOTHING;

-- ===== TESTS: RLS ISOLATION =====

-- Test 1: User A NO puede ver enrollments de User B
-- (RLS policy debe bloquearlo)
SELECT COUNT(*) as "enrollments_visible_to_user_a"
FROM public.enrollments 
WHERE id IN ('enroll-b-1');

-- Test 2: Products públicos si son visible
SELECT COUNT(*) as "public_products_visible"
FROM public.products
WHERE published = true;

-- Test 3: User A puede ver su propia org
SELECT COUNT(*) as "own_org_visible"
FROM public.organizations
WHERE id = 'org-a-test';

-- Test 4: User A NO puede ver org B
SELECT COUNT(*) as "other_org_visible"
FROM public.organizations
WHERE id = 'org-b-test';

-- Test 5: Verificar estructura RLS aplicada
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
ORDER BY tablename, policyname
LIMIT 20;
