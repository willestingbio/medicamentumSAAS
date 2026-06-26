-- ============================================================
-- RLS Phase 6.5: Vendor, Payout & Course Builder Policies
-- Medicamentum360
-- TRD.md §19–21, BACKEND.md §15–18
--
-- Prerequisites:
--   - Vendors / Payouts tables must exist (migration).
--   - Products table must have vendorId, reviewStatus columns.
--   - Helper functions requesting_user_id() / get_user_org_id()
--     must exist (idempotent CREATE OR REPLACE below).
--   - The application must call:
--       SELECT set_config('app.current_user_id', $1, true)
--     once per connection/session.
-- ============================================================

-- ============================================================
-- Helper Functions (idempotent)
-- These should already exist from prior RLS policies.
-- CREATE OR REPLACE ensures they are defined exactly once.
-- ============================================================

CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_user_id', true), '');
END;
$$;

COMMENT ON FUNCTION requesting_user_id()
  IS 'Returns the authenticated user UUID set by the application via set_config(''app.current_user_id'', ...)';

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_org_id', true), '');
END;
$$;

COMMENT ON FUNCTION get_user_org_id()
  IS 'Returns the current user''s organization UUID (optional, set by app). Used for organization-scoped checks.';

-- ============================================================
-- 1. VENDORS
-- TRD.md §20.2 · BACKEND.md §18
-- ============================================================

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;

-- 1a. SELECT: vendor sees their own record; super_admin sees all
CREATE POLICY "vendor_select" ON "vendors"
  FOR SELECT
  USING (
    "userId" = requesting_user_id()
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 1b. INSERT: authenticated user creates their own vendor profile
CREATE POLICY "vendor_insert" ON "vendors"
  FOR INSERT
  WITH CHECK (
    "userId" = requesting_user_id()
  );

-- 1c. UPDATE: vendor updates own record; super_admin updates any record
-- Column-level constraint (status): enforced by trigger trg_vendor_status_change below
CREATE POLICY "vendor_update_own" ON "vendors"
  FOR UPDATE
  USING ("userId" = requesting_user_id())
  WITH CHECK ("userId" = requesting_user_id());

CREATE POLICY "vendor_update_admin" ON "vendors"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 1d. DELETE: super_admin only
CREATE POLICY "vendor_delete" ON "vendors"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- Trigger: only super_admin may change vendor.status
CREATE OR REPLACE FUNCTION enforce_vendor_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD."status" IS DISTINCT FROM NEW."status" THEN
    IF NOT EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only super_admin can change vendor status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vendor_status_change ON "vendors";
CREATE TRIGGER trg_vendor_status_change
  BEFORE UPDATE ON "vendors"
  FOR EACH ROW
  WHEN (OLD."status" IS DISTINCT FROM NEW."status")
  EXECUTE FUNCTION enforce_vendor_status_change();

-- ============================================================
-- 2. PAYOUTS
-- TRD.md §20.3 · BACKEND.md §18
-- ============================================================

ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;

-- 2a. SELECT: vendor sees own payouts; super_admin sees all
CREATE POLICY "payout_select" ON "payouts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "vendors" v
      WHERE v.id = "payouts"."vendorId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 2b. INSERT: super_admin only
CREATE POLICY "payout_insert" ON "payouts"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 2c. UPDATE: super_admin only
CREATE POLICY "payout_update" ON "payouts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 2d. DELETE: super_admin only
CREATE POLICY "payout_delete" ON "payouts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- ============================================================
-- 3. COURSES
-- TRD.md §19.2 · BACKEND.md §15
-- Chain: Course → Product → Vendor (optional)
-- ============================================================

ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;

-- 3a. SELECT: public if product is published; owner (vendor/super_admin); super_admin
CREATE POLICY "course_select" ON "courses"
  FOR SELECT
  USING (
    -- Public: linked product is published
    EXISTS (
      SELECT 1 FROM "products" p
      WHERE p.id = "courses"."productId"
        AND p."published" = true
    )
    -- Owner: vendor who owns the linked product
    OR EXISTS (
      SELECT 1 FROM "products" p
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE p.id = "courses"."productId"
        AND v."userId" = requesting_user_id()
    )
    -- Platform: super_admin
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 3b. INSERT: super_admin or vendor who owns the linked product
CREATE POLICY "course_insert" ON "courses"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "products" p
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE p.id = "courses"."productId"
        AND v."userId" = requesting_user_id()
    )
  );

-- 3c. UPDATE: super_admin or vendor who owns the linked product
CREATE POLICY "course_update" ON "courses"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "products" p
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE p.id = "courses"."productId"
        AND v."userId" = requesting_user_id()
    )
  );

-- 3d. DELETE: super_admin or vendor who owns the linked product
CREATE POLICY "course_delete" ON "courses"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "products" p
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE p.id = "courses"."productId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 4. MODULES
-- Chain: Module → Course → Product → Vendor
-- ============================================================

ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_select" ON "modules"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "products" p
      WHERE p.id = (SELECT c."productId" FROM "courses" c WHERE c.id = "modules"."courseId")
        AND p."published" = true
    )
    OR EXISTS (
      SELECT 1 FROM "courses" c
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE c.id = "modules"."courseId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

CREATE POLICY "module_insert" ON "modules"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "courses" c
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE c.id = "modules"."courseId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "module_update" ON "modules"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "courses" c
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE c.id = "modules"."courseId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "module_delete" ON "modules"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "courses" c
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE c.id = "modules"."courseId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 5. LESSONS
-- Chain: Lesson → Module → Course → Product → Vendor
-- ============================================================

ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_select" ON "lessons"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "products" p
      JOIN "courses" c ON c."productId" = p.id
      JOIN "modules" m ON m."courseId" = c.id
      WHERE m.id = "lessons"."moduleId"
        AND p."published" = true
    )
    OR EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE m.id = "lessons"."moduleId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

CREATE POLICY "lesson_insert" ON "lessons"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE m.id = "lessons"."moduleId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "lesson_update" ON "lessons"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE m.id = "lessons"."moduleId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "lesson_delete" ON "lessons"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE m.id = "lessons"."moduleId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 6. QUIZZES
-- Chain: Quiz → Lesson → Module → Course → Product → Vendor
-- ============================================================

ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_select" ON "quizzes"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "products" p
      JOIN "courses" c ON c."productId" = p.id
      JOIN "modules" m ON m."courseId" = c.id
      JOIN "lessons" l ON l."moduleId" = m.id
      WHERE l.id = "quizzes"."lessonId"
        AND p."published" = true
    )
    OR EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE l.id = "quizzes"."lessonId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

CREATE POLICY "quiz_insert" ON "quizzes"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE l.id = "quizzes"."lessonId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_update" ON "quizzes"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE l.id = "quizzes"."lessonId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_delete" ON "quizzes"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE l.id = "quizzes"."lessonId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 7. QUIZ_QUESTIONS
-- Chain: QuizQuestion → Quiz → Lesson → Module → Course → Product → Vendor
-- ============================================================

ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_question_select" ON "quiz_questions"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "products" p
      JOIN "courses" c ON c."productId" = p.id
      JOIN "modules" m ON m."courseId" = c.id
      JOIN "lessons" l ON l."moduleId" = m.id
      JOIN "quizzes" q ON q."lessonId" = l.id
      WHERE q.id = "quiz_questions"."quizId"
        AND p."published" = true
    )
    OR EXISTS (
      SELECT 1 FROM "quizzes" q
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE q.id = "quiz_questions"."quizId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

CREATE POLICY "quiz_question_insert" ON "quiz_questions"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quizzes" q
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE q.id = "quiz_questions"."quizId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_question_update" ON "quiz_questions"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quizzes" q
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE q.id = "quiz_questions"."quizId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_question_delete" ON "quiz_questions"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quizzes" q
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE q.id = "quiz_questions"."quizId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 8. QUIZ_OPTIONS
-- Chain: QuizOption → QuizQuestion → Quiz → Lesson → Module → Course → Product → Vendor
-- ============================================================

ALTER TABLE "quiz_options" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_option_select" ON "quiz_options"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "products" p
      JOIN "courses" c ON c."productId" = p.id
      JOIN "modules" m ON m."courseId" = c.id
      JOIN "lessons" l ON l."moduleId" = m.id
      JOIN "quizzes" q ON q."lessonId" = l.id
      JOIN "quiz_questions" qq ON qq."quizId" = q.id
      WHERE qq.id = "quiz_options"."questionId"
        AND p."published" = true
    )
    OR EXISTS (
      SELECT 1 FROM "quiz_questions" qq
      JOIN "quizzes" q ON q.id = qq."quizId"
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE qq.id = "quiz_options"."questionId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

CREATE POLICY "quiz_option_insert" ON "quiz_options"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quiz_questions" qq
      JOIN "quizzes" q ON q.id = qq."quizId"
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE qq.id = "quiz_options"."questionId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_option_update" ON "quiz_options"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quiz_questions" qq
      JOIN "quizzes" q ON q.id = qq."quizId"
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE qq.id = "quiz_options"."questionId"
        AND v."userId" = requesting_user_id()
    )
  );

CREATE POLICY "quiz_option_delete" ON "quiz_options"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "quiz_questions" qq
      JOIN "quizzes" q ON q.id = qq."quizId"
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE qq.id = "quiz_options"."questionId"
        AND v."userId" = requesting_user_id()
    )
  );

-- ============================================================
-- 9. QUIZ_ATTEMPTS
-- TRD.md §19.5
-- ============================================================

ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;

-- 9a. SELECT: own attempts; course vendor for analytics; super_admin
CREATE POLICY "quiz_attempt_select" ON "quiz_attempts"
  FOR SELECT
  USING (
    "userId" = requesting_user_id()
    OR EXISTS (
      SELECT 1 FROM "quizzes" q
      JOIN "lessons" l ON l.id = q."lessonId"
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE q.id = "quiz_attempts"."quizId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 9b. INSERT: own attempts only
CREATE POLICY "quiz_attempt_insert" ON "quiz_attempts"
  FOR INSERT
  WITH CHECK ("userId" = requesting_user_id());

-- 9c. UPDATE: super_admin only
CREATE POLICY "quiz_attempt_update" ON "quiz_attempts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 9d. DELETE: super_admin only
CREATE POLICY "quiz_attempt_delete" ON "quiz_attempts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- ============================================================
-- 10. LESSON_COMPLETIONS
-- TRD.md §19.5
-- ============================================================

ALTER TABLE "lesson_completions" ENABLE ROW LEVEL SECURITY;

-- 10a. SELECT: own completions; course vendor for analytics; super_admin
CREATE POLICY "lesson_completion_select" ON "lesson_completions"
  FOR SELECT
  USING (
    "userId" = requesting_user_id()
    OR EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l."moduleId"
      JOIN "courses" c ON c.id = m."courseId"
      JOIN "products" p ON p.id = c."productId"
      JOIN "vendors" v ON v.id = p."vendorId"
      WHERE l.id = "lesson_completions"."lessonId"
        AND v."userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 10b. INSERT: own completions only
CREATE POLICY "lesson_completion_insert" ON "lesson_completions"
  FOR INSERT
  WITH CHECK ("userId" = requesting_user_id());

-- 10c. DELETE: super_admin only
CREATE POLICY "lesson_completion_delete" ON "lesson_completions"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- ============================================================
-- 11. PRODUCTS (vendor-related policies)
-- TRD.md §20.1 · BACKEND.md §18
--
-- Note: If prior phases already defined product policies for
-- SELECT/DELETE, those remain in effect. This section adds
-- and refines the vendor-aware WRITE policies.
-- ============================================================

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;

-- 11a. SELECT: public (published) or owner or super_admin
CREATE POLICY "product_select" ON "products"
  FOR SELECT
  USING (
    "published" = true
    OR EXISTS (
      SELECT 1 FROM "vendors" WHERE id = "products"."vendorId" AND "userId" = requesting_user_id()
    )
    OR EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
  );

-- 11b. INSERT: super_admin or vendor (vendorId auto-set to own vendor.id)
CREATE POLICY "product_insert" ON "products"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR (
      requesting_user_id() IS NOT NULL
      AND requesting_user_id() <> ''
    )
  );

-- 11c. UPDATE: super_admin or vendor who owns the product
-- Column-level constraints (reviewStatus, published): enforced by triggers below
CREATE POLICY "product_update" ON "products"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "vendors" WHERE id = "products"."vendorId" AND "userId" = requesting_user_id()
    )
  );

-- 11d. DELETE: super_admin or vendor who owns the product
CREATE POLICY "product_delete" ON "products"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM "vendors" WHERE id = "products"."vendorId" AND "userId" = requesting_user_id()
    )
  );

-- Trigger: only super_admin may change product.reviewStatus
CREATE OR REPLACE FUNCTION enforce_product_review_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD."reviewStatus" IS DISTINCT FROM NEW."reviewStatus" THEN
    IF NOT EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Only super_admin can change product reviewStatus';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_review_status_change ON "products";
CREATE TRIGGER trg_product_review_status_change
  BEFORE UPDATE ON "products"
  FOR EACH ROW
  WHEN (OLD."reviewStatus" IS DISTINCT FROM NEW."reviewStatus")
  EXECUTE FUNCTION enforce_product_review_status_change();

-- Trigger: vendor can only publish if reviewStatus = 'approved';
-- super_admin can always publish/unpublish.
CREATE OR REPLACE FUNCTION enforce_product_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD."published" IS DISTINCT FROM NEW."published" AND NEW."published" = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM "users" WHERE id = requesting_user_id() AND "role" = 'super_admin'
    ) THEN
      IF NEW."reviewStatus" <> 'approved'::"ReviewStatus" THEN
        RAISE EXCEPTION 'Product must be approved before publishing';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_publish ON "products";
CREATE TRIGGER trg_product_publish
  BEFORE UPDATE ON "products"
  FOR EACH ROW
  WHEN (OLD."published" IS DISTINCT FROM NEW."published")
  EXECUTE FUNCTION enforce_product_publish();

-- ============================================================
-- ENABLE RLS ON REMAINING COURSE BUILDER TABLES (if not yet enabled)
-- These are guaranteed by individual ALTER TABLE ... ENABLE above.
-- ============================================================
