

-- ===== HELPER FUNCTION: Get current user's organization ID =====
-- Reads from JWT claim 'organization_id' set by Better Auth
CREATE OR REPLACE FUNCTION auth.get_org_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'organization_id')::text,
    (SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1)
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ===== POLICY: ORGANIZATIONS =====
-- - super_admin: reads/writes all orgs
-- - hospital_admin/student: reads own org only
CREATE POLICY "organizations_select_own_org" ON public.organizations
  FOR SELECT USING (
    id = auth.get_org_id() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_update_own_org" ON public.organizations
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "organizations_insert_super_admin_only" ON public.organizations
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: USERS =====
-- - Each user can read/update themselves
-- - hospital_admin can read all users in their org
-- - super_admin can read all users everywhere
CREATE POLICY "users_select_own_user" ON public.users
  FOR SELECT USING (
    id = auth.uid() OR
    organization_id = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "users_update_own_user" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own_org" ON public.users
  FOR INSERT WITH CHECK (
    organization_id = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: PRODUCTS =====
-- - Everyone can read published products
-- - super_admin can read/write all products
CREATE POLICY "products_select_published" ON public.products
  FOR SELECT USING (
    published = true OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_insert_update_super_admin_only" ON public.products
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_update_super_admin_only" ON public.products
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "products_delete_super_admin_only" ON public.products
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: ENROLLMENTS =====
-- - Users can read their own enrollments
-- - hospital_admin can read all enrollments in their org
-- - super_admin can read all enrollments
-- - Users can create enrollments for themselves only
CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (
    user_id = auth.uid() OR
    (SELECT organization_id FROM public.users WHERE id = user_id) = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "enrollments_insert_own_user" ON public.enrollments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (SELECT organization_id FROM public.users WHERE id = auth.uid()) = auth.get_org_id()
  );

CREATE POLICY "enrollments_update_own_user" ON public.enrollments
  FOR UPDATE USING (
    user_id = auth.uid() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: ORDERS =====
-- - Users can read their own orders
-- - hospital_admin can read orders from users in their org
-- - super_admin can read all orders
-- - Orders must belong to the user's organization
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    organization_id = auth.get_org_id()
  );

CREATE POLICY "orders_update_own_user" ON public.orders
  FOR UPDATE USING (
    user_id = auth.uid() OR
    (SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1) IN ('super_admin', 'hospital_admin')::"Role"
  );

-- ===== POLICY: ORDER_ITEMS =====
-- - Users can read order items from their orders only
-- - hospital_admin can read order items from orders in their org
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    (SELECT user_id FROM public.orders WHERE id = order_id) = auth.uid() OR
    (SELECT organization_id FROM public.orders WHERE id = order_id) = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: CERTIFICATES =====
-- - Users can read their own certificates only
-- - hospital_admin can read certificates from users in their org
-- - super_admin can read all certificates
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT USING (
    user_id = auth.uid() OR
    (SELECT organization_id FROM public.users WHERE id = user_id) = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

-- ===== POLICY: REVIEWS =====
-- - Everyone can read reviews
-- - Users can create/update their own reviews only
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own_review" ON public.reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_update_own_review" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===== POLICY: CARTS =====
-- - Users can read/update their own cart
CREATE POLICY "carts_select_own_cart" ON public.carts
  FOR SELECT USING (user_id = auth.uid() OR guest_token IS NOT NULL);

CREATE POLICY "carts_update_own_cart" ON public.carts
  FOR UPDATE USING (user_id = auth.uid());

-- ===== POLICY: CART_ITEMS =====
-- - Users can read/write items in their own cart
CREATE POLICY "cart_items_select_own_cart" ON public.cart_items
  FOR SELECT USING (
    (SELECT user_id FROM public.carts WHERE id = cart_id) = auth.uid() OR
    user_id = auth.uid()
  );

CREATE POLICY "cart_items_insert_own_cart" ON public.cart_items
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    (SELECT user_id FROM public.carts WHERE id = cart_id) = auth.uid()
  );

CREATE POLICY "cart_items_update_own_cart" ON public.cart_items
  FOR UPDATE USING (
    user_id = auth.uid() OR
    (SELECT user_id FROM public.carts WHERE id = cart_id) = auth.uid()
  );

-- ===== POLICY: CALENDAR_EVENTS =====
-- - Users can read their own calendar events
-- - hospital_admin can read events from users in their org
-- - super_admin can read all events
CREATE POLICY "calendar_events_select" ON public.calendar_events
  FOR SELECT USING (
    user_id = auth.uid() OR
    (SELECT organization_id FROM public.users WHERE id = user_id) = auth.get_org_id() OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'::"Role"
  );

CREATE POLICY "calendar_events_insert_own_user" ON public.calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "calendar_events_update_own_user" ON public.calendar_events
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===== SET DEFAULT GRANTS =====
-- Ensure runtime role has access (policies decide row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
