-- Migración: Habilitar RLS multi-tenant en todas las tablas
-- TRD.md §4: Aislamiento de datos cross-organization
-- Fecha: 2026-06-20

-- ===== ENABLE RLS ON ALL TABLES =====
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ===== HELPER FUNCTION: Get current user's organization ID =====
CREATE OR REPLACE FUNCTION public.get_user_org_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'organization_id')::text,
    (SELECT "organizationId" FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ===== POLICY: ORGANIZATIONS =====
CREATE POLICY "organizations_select_own_org" ON public.organizations
  FOR SELECT USING (
    id = public.get_user_org_id() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_update_own_org" ON public.organizations
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_insert_super_admin_only" ON public.organizations
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

-- ===== POLICY: USERS =====
CREATE POLICY "users_select_own_or_org" ON public.users
  FOR SELECT USING (
    id = auth.uid()::text OR
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "users_insert_own_org" ON public.users
  FOR INSERT WITH CHECK (
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

-- ===== POLICY: PRODUCTS =====
CREATE POLICY "products_select_published" ON public.products
  FOR SELECT USING (
    published = true OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "products_write_super_admin_only" ON public.products
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "products_update_super_admin_only" ON public.products
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "products_delete_super_admin_only" ON public.products
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

-- ===== POLICY: ENROLLMENTS =====
CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "enrollments_insert_own" ON public.enrollments
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()::text AND
    (SELECT "organizationId" FROM public.users WHERE id = auth.uid()::text) = public.get_user_org_id()
  );

CREATE POLICY "enrollments_update_own_or_admin" ON public.enrollments
  FOR UPDATE USING (
    "userId" = auth.uid()::text OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role" OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'hospital_admin'::"Role"
  );

-- ===== POLICY: ORDERS =====
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()::text AND
    "organizationId" = public.get_user_org_id()
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    "userId" = auth.uid()::text OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role" OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'hospital_admin'::"Role"
  );

-- ===== POLICY: ORDER_ITEMS =====
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    (SELECT "userId" FROM public.orders WHERE id = "orderId") = auth.uid()::text OR
    (SELECT "organizationId" FROM public.orders WHERE id = "orderId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

-- ===== POLICY: CERTIFICATES =====
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

-- ===== POLICY: REVIEWS =====
CREATE POLICY "reviews_select_all" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- ===== POLICY: CARTS =====
CREATE POLICY "carts_select" ON public.carts
  FOR SELECT USING ("userId" = auth.uid()::text OR "guestToken" IS NOT NULL);

CREATE POLICY "carts_update" ON public.carts
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- ===== POLICY: CART_ITEMS =====
CREATE POLICY "cart_items_select" ON public.cart_items
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = auth.uid()::text
  );

CREATE POLICY "cart_items_insert" ON public.cart_items
  FOR INSERT WITH CHECK (
    "userId" = auth.uid()::text OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = auth.uid()::text
  );

CREATE POLICY "cart_items_update" ON public.cart_items
  FOR UPDATE USING (
    "userId" = auth.uid()::text OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = auth.uid()::text
  );

-- ===== POLICY: CALENDAR_EVENTS =====
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (
    "userId" = auth.uid()::text OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'super_admin'::"Role"
  );

CREATE POLICY "calendar_events_insert_own" ON public.calendar_events
  FOR INSERT WITH CHECK ("userId" = auth.uid()::text);

CREATE POLICY "calendar_events_update_own" ON public.calendar_events
  FOR UPDATE USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- ===== SET DEFAULT GRANTS =====
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
