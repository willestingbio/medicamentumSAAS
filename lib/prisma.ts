import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { rlsClaimsStore } from './rls-store';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const url = process.env.DATABASE_URL || '';

  const base = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const claims = rlsClaimsStore.getStore();
          if (claims?.sub) {
            // VPS Postgres: set session variables for RLS policies
            await base.$executeRawUnsafe(
              `SET app.current_user_id = '${claims.sub}'`,
            );
            if (claims.organization_id) {
              await base.$executeRawUnsafe(
                `SET app.current_org_id = '${claims.organization_id}'`,
              );
            }
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
