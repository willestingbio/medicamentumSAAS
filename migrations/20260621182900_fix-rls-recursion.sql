-- Migration: Fix RLS infinite recursion in policies
--
-- Root cause: policies on 'users' and other tables used inline subqueries
-- like (SELECT role FROM users WHERE ...) which triggered RLS on 'users' again.
--
-- Fix:
--   1. New function get_user_role() reads role from JWT claim (SECURITY DEFINER, no RLS)
--   2. get_user_org_id() simplified to read from JWT claim only (no fallback to users table)
--   3. All policies rewritten to use these functions instead of inline subqueries
--   4. Bridge JWT now includes role and organization_id as custom claims

-- ===== 1. NEW HELPER: get_user_role() =====
-- Reads 'role' from the JWT signed by the bridge route.
-- SECURITY DEFINER so it executes with owner privileges and bypasses RLS.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'user_role', '')::text
$$;

-- ===== 2. SIMPLIFY: get_user_org_id() =====
-- Reads 'organization_id' from JWT only (no fallback query to users table).
-- The bridge route now includes organization_id in the JWT claims.
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(auth.jwt() ->> 'organization_id', '')::text
$$;

-- ===== 3. DROP ALL POLICIES THAT SUBSELECT ON users =====
DROP POLICY IF EXISTS "users_select_own_or_org" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_org" ON public.users;

DROP POLICY IF EXISTS "organizations_select_own_org" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_own_org" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_super_admin_only" ON public.organizations;

DROP POLICY IF EXISTS "products_select_published" ON public.products;
DROP POLICY IF EXISTS "products_write_super_admin_only" ON public.products;
DROP POLICY IF EXISTS "products_update_super_admin_only" ON public.products;
DROP POLICY IF EXISTS "products_delete_super_admin_only" ON public.products;

DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_own_or_admin" ON public.enrollments;

DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;

DROP POLICY IF EXISTS "certificates_select" ON public.certificates;

DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;

DROP POLICY IF EXISTS "carts_select" ON public.carts;
DROP POLICY IF EXISTS "carts_update" ON public.carts;

DROP POLICY IF EXISTS "cart_items_select" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_insert" ON public.cart_items;
DROP POLICY IF EXISTS "cart_items_update" ON public.cart_items;

DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON public.calendar_events;

-- ===== 4. RECREATE POLICIES WITH FUNCTION CALLS (no recursion) =====

-- ===== USERS =====
CREATE POLICY "users_select_own_or_org" ON public.users
  FOR SELECT USING (
    id = public.requesting_user_id() OR
    "organizationId" = public.get_user_org_id() OR
      public.get_user_role() = 'super_admin'
    );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = public.requesting_user_id())
  WITH CHECK (id = public.requesting_user_id());

CREATE POLICY "users_insert_own_org" ON public.users
  FOR INSERT WITH CHECK (
    "organizationId" = public.get_user_org_id() OR
    public.get_user_role() = 'super_admin'
  );

-- ===== ORGANIZATIONS =====
CREATE POLICY "organizations_select_own_org" ON public.organizations
  FOR SELECT USING (
    id = public.get_user_org_id() OR
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "organizations_update_own_org" ON public.organizations
  FOR UPDATE USING (
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "organizations_insert_super_admin_only" ON public.organizations
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'super_admin'
  );

-- ===== PRODUCTS =====
CREATE POLICY "products_select_published" ON public.products
  FOR SELECT USING (
    published = true OR
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "products_write_super_admin_only" ON public.products
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "products_update_super_admin_only" ON public.products
  FOR UPDATE USING (
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "products_delete_super_admin_only" ON public.products
  FOR DELETE USING (
    public.get_user_role() = 'super_admin'
  );

-- ===== ENROLLMENTS =====
CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    (SELECT "organizationId" FROM public.users WHERE id = "userId") = public.get_user_org_id() OR
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "enrollments_insert_own" ON public.enrollments
  FOR INSERT WITH CHECK (
    "userId" = public.requesting_user_id() AND
    public.get_user_role() IN ('student', 'hospital_admin')
  );

CREATE POLICY "enrollments_update_own_or_admin" ON public.enrollments
  FOR UPDATE USING (
    "userId" = public.requesting_user_id() OR
    public.get_user_role() IN ('super_admin', 'hospital_admin')
  );

-- ===== ORDERS =====
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    "organizationId" = public.get_user_org_id() OR
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    "userId" = public.requesting_user_id() AND
    "organizationId" = public.get_user_org_id()
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    "userId" = public.requesting_user_id() OR
    public.get_user_role() IN ('super_admin', 'hospital_admin')
  );

-- ===== ORDER_ITEMS =====
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    (SELECT "userId" FROM public.orders WHERE id = "orderId") = public.requesting_user_id() OR
    (SELECT "organizationId" FROM public.orders WHERE id = "orderId") = public.get_user_org_id() OR
    public.get_user_role() = 'super_admin'
  );

-- ===== CERTIFICATES =====
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    "userId" = public.requesting_user_id() OR
    public.get_user_role() IN ('super_admin', 'hospital_admin')
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
    public.get_user_role() = 'super_admin'
  );

CREATE POLICY "calendar_events_insert_own" ON public.calendar_events
  FOR INSERT WITH CHECK ("userId" = public.requesting_user_id());

CREATE POLICY "calendar_events_update_own" ON public.calendar_events
  FOR UPDATE USING ("userId" = public.requesting_user_id())
  WITH CHECK ("userId" = public.requesting_user_id());
