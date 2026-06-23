import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { database: 'ok' },
    });
  } catch {
    return Response.json(
      { status: 'error', timestamp: new Date().toISOString(), services: { database: 'error' } },
      { status: 503 }
    );
  }
}
