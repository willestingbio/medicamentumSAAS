-- 2026-06-21-fix-rls-insert-policy.sql
-- Permite anonymous sign-up en la tabla users (Better Auth crea el usuario
-- sin JWT de InsForge — requesting_user_id() es NULL durante sign-up)

DROP POLICY IF EXISTS users_insert_own_org ON "users";

CREATE POLICY users_insert ON "users"
FOR INSERT
WITH CHECK (
  (requesting_user_id() IS NULL)        -- anonymous sign-up (Better Auth flow)
  OR
  ("organizationId" = get_user_org_id()) -- org member creating user
  OR
  (get_user_role() = 'super_admin')     -- super_admin creating any user
);
