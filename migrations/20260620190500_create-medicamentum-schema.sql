-- Migración: Crear schema completo de Medicamentum360
-- Traducción de prisma/schema.prisma a SQL puro
-- Medicamentum custom tables + tipos + indexes
-- Fecha: 2026-06-20

-- ===== ENUMS =====
CREATE TYPE public."Role" AS ENUM ('super_admin', 'hospital_admin', 'student');
CREATE TYPE public."ProductType" AS ENUM ('course', 'vr_experience', 'ai_automation');
CREATE TYPE public."OrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ===== MEDICAMENTUM CUSTOM TABLES =====
-- (Better Auth tables already created by Better Auth)

CREATE TABLE public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nit TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend Better Auth user table with Medicamentum fields
CREATE TABLE public.users (
  id TEXT PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  role public."Role" NOT NULL DEFAULT 'student',
  "organizationId" TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  "moodleUserId" INTEGER UNIQUE,
  "profilePicUrl" TEXT,
  specialty TEXT,
  locale TEXT NOT NULL DEFAULT 'es',
  theme TEXT NOT NULL DEFAULT 'system',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  type public."ProductType" NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "discountCents" INTEGER,
  "coverImageUrl" TEXT,
  "moodleCourseId" INTEGER,
  "vrAssetUrl" TEXT,
  capacity INTEGER,
  published BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.enrollments (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "progressPct" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started',
  "moodleEnrolId" INTEGER,
  "lastAccessedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "enrollments_userId_productId_key" UNIQUE ("userId", "productId")
);

CREATE TABLE public.carts (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  "guestToken" TEXT UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.cart_items (
  id TEXT PRIMARY KEY,
  "cartId" TEXT NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  "userId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "organizationId" TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  status public."OrderStatus" NOT NULL DEFAULT 'pending',
  "subtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "billingDocType" TEXT NOT NULL,
  "billingDocId" TEXT NOT NULL,
  "wompiTransactionId" TEXT UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "paidAt" TIMESTAMP WITH TIME ZONE,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  "priceCents" INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.certificates (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id),
  "pdfUrl" TEXT NOT NULL,
  "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "linkedinUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.reviews (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.calendar_events (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endsAt" TIMESTAMP WITH TIME ZONE,
  "googleEventId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ===== INDEXES =====
CREATE INDEX idx_users_organizationId ON public.users("organizationId");
CREATE INDEX idx_enrollments_userId ON public.enrollments("userId");
CREATE INDEX idx_enrollments_productId ON public.enrollments("productId");
CREATE INDEX idx_orders_userId ON public.orders("userId");
CREATE INDEX idx_orders_organizationId ON public.orders("organizationId");
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_cart_items_cartId ON public.cart_items("cartId");
CREATE INDEX idx_cart_items_userId ON public.cart_items("userId");
CREATE INDEX idx_certificates_userId ON public.certificates("userId");
CREATE INDEX idx_reviews_userId ON public.reviews("userId");
CREATE INDEX idx_reviews_productId ON public.reviews("productId");
CREATE INDEX idx_calendar_events_userId ON public.calendar_events("userId");
