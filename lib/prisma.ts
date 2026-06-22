import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { rlsClaimsStore } from './rls-store';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const base = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const claims = rlsClaimsStore.getStore();
          if (claims) {
            await base.$executeRawUnsafe(
              `SET LOCAL request.jwt.claims = '${JSON.stringify(claims)}'`,
            );
          }
          return query(args);
        },
      },
    },
  });

  return extended as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
