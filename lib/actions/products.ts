'use server';

import { prisma } from '@/lib/prisma';

export interface ProductListItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  discountCents: number | null;
  coverImageUrl: string | null;
  capacity: number | null;
  published: boolean;
  rating: number;
  reviewCount: number;
}

export interface ProductDetail extends ProductListItem {
  moodleCourseId: number | null;
  vrAssetUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { name: string; image: string | null };
  }[];
  _count: { reviews: number; enrollments: number };
}

function computeRating(reviews: { rating: number }[]): { rating: number; reviewCount: number } {
  if (reviews.length === 0) return { rating: 0, reviewCount: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / reviews.length) * 10) / 10, reviewCount: reviews.length };
}

export async function getProducts(params: {
  type?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<{ products: ProductListItem[]; total: number; hasMore: boolean }> {
  const { type, search, sort = 'popular', page = 1, limit = 12 } = params;
  const skip = (page - 1) * limit;

  const where: any = { published: true };
  if (type && type !== 'all') where.type = type;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = (() => {
    switch (sort) {
      case 'price-asc': return { priceCents: 'asc' as const };
      case 'price-desc': return { priceCents: 'desc' as const };
      case 'rating': return { reviews: { _count: 'desc' as const } };
      default: return { createdAt: 'desc' as const };
    }
  })();

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        reviews: { select: { rating: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = products.map((p) => {
    const { rating, reviewCount } = computeRating(p.reviews);
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      discountCents: p.discountCents,
      coverImageUrl: p.coverImageUrl,
      capacity: p.capacity,
      published: p.published,
      rating,
      reviewCount,
    };
  });

  return { products: enriched, total, hasMore: skip + limit < total };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { reviews: true, enrollments: true } },
    },
  });

  if (!product) return null;

  const { rating, reviewCount } = computeRating(product.reviews);

  return {
    id: product.id,
    type: product.type,
    title: product.title,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    discountCents: product.discountCents,
    coverImageUrl: product.coverImageUrl,
    capacity: product.capacity,
    published: product.published,
    moodleCourseId: product.moodleCourseId,
    vrAssetUrl: product.vrAssetUrl,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    rating,
    reviewCount,
    reviews: product.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: r.user,
    })),
    _count: product._count,
  };
}

export async function getRelatedProducts(slug: string, limit = 3): Promise<ProductListItem[]> {
  const product = await prisma.product.findUnique({ where: { slug }, select: { type: true } });
  if (!product) return [];

  const products = await prisma.product.findMany({
    where: { published: true, type: product.type, slug: { not: slug } },
    take: limit,
    include: { reviews: { select: { rating: true } } },
  });

  return products.map((p) => {
    const { rating, reviewCount } = computeRating(p.reviews);
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      discountCents: p.discountCents,
      coverImageUrl: p.coverImageUrl,
      capacity: p.capacity,
      published: p.published,
      rating,
      reviewCount,
    };
  });
}
