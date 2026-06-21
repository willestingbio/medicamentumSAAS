-- Migration: Integrar Better Auth con RLS
-- Reemplaza auth.uid()::text por requesting_user_id() para compatibilidad
-- con el bridge JWT de Better Auth (IDs string, no UUID)
-- TRD.md §4, insforge-integrations/references/better-auth.md

-- ===== 1. HELPER: requesting_user_id() =====
-- Lee el claim 'sub' del JWT firmado por el bridge route
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::text
$$;

-- ===== 2. HELPER: get_user_org_id() actualizado =====
-- Usa requesting_user_id() en el fallback
CREATE OR REPLACE FUNCTION public.get_user_org_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'organization_id')::text,
    (SELECT "organizationId" FROM public.users WHERE id = public.requesting_user_id() LIMIT 1)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ===== 3. DROP ALL EXISTING POLICIES =====
-- Usamos DROP IF EXISTS para ser idempotentes
-- ===== ORGANIZATIONS =====
DROP POLICY IF EXISTS "organizations_select_own_org" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_own_org" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_super_admin_only" ON public.organizations;

-- ===== USERS =====
DROP POLICY IF EXISTS "users_select_own_or_org" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_org" ON public.users;

-- ===== PRODUCTS =====
DROP POLICY IF EXISTS "products_select_published" ON public.products;
DROP POLICY IF EXISTS "products_write_super_admin_only" ON public.products;
DROP POLICY IF EXISTS "products_update_super_admin_only" ON public.products;
DROP POLICY IF EXISTS "products_delete_super_admin_only" ON public.products;

-- ===== ENROLLMENTS =====
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_own_or_admin" ON public.enrollments;

-- ===== ORDERS =====
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;

-- ===== ORDER_ITEMS =====
DROP POLICY IF EXISTS "order_items_select" ON public.order_items;

-- ===== CERTIFICATES =====
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;

-- ===== REVIEWS =====
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;

-- ===== CARTS =====
DROP POLICY IF EXISTS "carts_select" ON public.carts;
DROP POLICY IF EXISTS "carts_update" ON public.carts;

-- ===== CART_ITEMS =====
DROP POLICY IF EXISTS "cart_items_select" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_insert" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_update" ON public.cart_items;

-- ===== CALENDAR_EVENTS =====
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON public.calendar_events;

-- ===== 4. RECREATE ALL POLICIES CON requestING_USER_ID() =====

-- ===== ORGANIZATIONS =====
CREATE POLICY "organizations_select_own_org" ON public.organizations
  FOR SELECT USING (
    id = public.get_user_org_id() OR 
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_update_own_org" ON public.organizations
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_insert_super_admin_only" ON public.organizations
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

-- ===== USERS =====
CREATE POLICY "users_select_own_or_org" ON public.users
  FOR SELECT USING (
    id = public.requesting_user_id() OR
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = public.requesting_user_id())
  WITH CHECK (id = public.requesting_user_id());

CREATE POLICY "users_insert_own_org" ON public.users
  FOR INSERT WITH CHECK (
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

-- ===== PRODUCTS =====
CREATE POLICY "products_select_published" ON public.products
  FOR SELECT USING (
    published = true OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_write_super_admin_only" ON public.products
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_update_super_admin_only" ON public.products
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_delete_super_admin_only" ON public.products
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

-- ===== ENROLLMENTS =====
CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "enrollments_insert_own" ON public.enrollments
  FOR INSERT WITH CHECK (
    "userId" = public.requesting_user_id() AND
    (SELECT "organizationId" FROM public.users WHERE id = public.requesting_user_id()) = public.get_user_org_id()
  );

CREATE POLICY "enrollments_update_own_or_admin" ON public.enrollments
  FOR UPDATE USING (
    "userId" = public.requesting_user_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role" OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'hospital_admin'::"Role"
  );

-- ===== ORDERS =====
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    "organizationId" = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    "userId" = public.requesting_user_id() AND
    "organizationId" = public.get_user_org_id()
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    "userId" = public.requesting_user_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role" OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'hospital_admin'::"Role"
  );

-- ===== ORDER_ITEMS =====
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    (SELECT "userId" FROM public.orders WHERE id = "orderId") = public.requesting_user_id() OR
    (SELECT "organizationId" FROM public.orders WHERE id = "orderId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

-- ===== CERTIFICATES =====
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

-- ===== REVIEWS =====
CREATE POLICY "reviews_select_all" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK ("userId" = public.requesting_user_id());

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING ("userId" = public.requesting_user_id())
  WITH CHECK ("userId" = public.requesting_user_id());

-- ===== CARTS =====
CREATE POLICY "carts_select" ON public.carts
  FOR SELECT USING ("userId" = public.requesting_user_id() OR "guestToken" IS NOT NULL);

CREATE POLICY "carts_update" ON public.carts
  FOR UPDATE USING ("userId" = public.requesting_user_id());

-- ===== CART_ITEMS =====
CREATE POLICY "cart_items_select" ON public.cart_items
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = public.requesting_user_id()
  );

CREATE POLICY "cart_items_insert" ON public.cart_items
  FOR INSERT WITH CHECK (
    "userId" = public.requesting_user_id() OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = public.requesting_user_id()
  );

CREATE POLICY "cart_items_update" ON public.cart_items
  FOR UPDATE USING (
    "userId" = public.requesting_user_id() OR
    (SELECT "userId" FROM public.carts WHERE id = "cartId") = public.requesting_user_id()
  );

-- ===== CALENDAR_EVENTS =====
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    (SELECT role FROM public.users WHERE id = public.requesting_user_id()) = 'super_admin'::"Role"
  );

CREATE POLICY "calendar_events_insert_own" ON public.calendar_events
  FOR INSERT WITH CHECK ("userId" = public.requesting_user_id());

CREATE POLICY "calendar_events_update_own" ON public.calendar_events
  FOR UPDATE USING ("userId" = public.requesting_user_id())
  WITH CHECK ("userId" = public.requesting_user_id());
