-- Migration: add plans + organization_invitations tables
-- Phase 2: Marketplace y autenticación
-- Date: 2026-06-22

-- ===== Plans =====
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  recommended BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Organization Invitations =====
CREATE TABLE IF NOT EXISTS organization_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  org_code TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org_email
  ON organization_invitations(organization_id, email);

-- ===== Add orgCode to organizations =====
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS org_code TEXT UNIQUE;

-- ===== RLS policies for plans =====
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable"
  ON plans FOR SELECT
  USING (active = true);

CREATE POLICY "Super admin can manage plans"
  ON plans FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- ===== RLS policies for organization_invitations =====
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view own invitations"
  ON organization_invitations FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'hospital_admin'
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

CREATE POLICY "Org admins can create invitations"
  ON organization_invitations FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'hospital_admin'
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

CREATE POLICY "Org admins can delete own invitations"
  ON organization_invitations FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) = 'hospital_admin'
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- ===== Grants =====
GRANT SELECT ON plans TO authenticated;
GRANT SELECT, INSERT, DELETE ON organization_invitations TO authenticated;
GRANT SELECT ON plans TO anon;
