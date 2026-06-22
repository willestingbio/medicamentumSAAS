-- Migration: Add missing columns to `users` table
--
-- The Prisma `User` model (@@map("users")) declares email, name, lastName
-- as required fields. Better Auth writes these via prisma.user.create().
-- The cloud `users` table was missing these columns, causing writes to fail.
--
-- The orphaned `user` table (singular) exists from a previous migration but
-- is NOT used by Better Auth (which writes through Prisma to `users`).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastName" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS phone text;

-- Add unique constraint on email after ensuring no conflicts
-- (satisfies Prisma schema @unique in User model)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users (email);
