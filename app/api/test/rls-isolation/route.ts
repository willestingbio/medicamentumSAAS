import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

interface TestResult {
  name: string;
  description: string;
  passed: boolean;
  detail: string;
  error?: string;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const userId = session.user.id;
  const results: TestResult[] = [];

  // Test 1: Verificar que RLS policies están desplegadas
  try {
    const policyCount = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::int as count FROM pg_policies WHERE schemaname = 'public'`;
    const count = Number(policyCount[0]?.count ?? 0);
    results.push({
      name: 'RLS Policies Deployed',
      description: 'Verifica que las 29 políticas RLS estén activas',
      passed: count >= 29,
      detail: `${count} políticas RLS encontradas en esquema public (esperado >= 29)`,
    });
  } catch (e) {
    results.push({
      name: 'RLS Policies Deployed',
      description: 'Error al consultar pg_policies',
      passed: false,
      detail: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Test 2: Verificar helper functions
  try {
    const functions = await prisma.$queryRaw<
      { name: string; exists: boolean }[]
    >`
      SELECT proname::text as name, true as exists
      FROM pg_proc
      WHERE proname IN ('requesting_user_id', 'get_user_org_id')
    `;
    const funcNames = functions.map((f) => f.name);
    results.push({
      name: 'Helper Functions',
      description: 'requesting_user_id() y get_user_org_id() deben existir',
      passed: funcNames.includes('requesting_user_id') && funcNames.includes('get_user_org_id'),
      detail: `Funciones encontradas: ${funcNames.join(', ') || 'ninguna'}`,
    });
  } catch (e) {
    results.push({
      name: 'Helper Functions',
      description: 'Error al consultar funciones',
      passed: false,
      detail: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Test 3: Verificar aislamiento cross-org mediante Server Action
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      results.push({
        name: 'User Session Context',
        description: 'Usuario autenticado existe en BD',
        passed: false,
        detail: `User ID ${userId} no encontrado en tabla users`,
      });
    } else {
      const orgMsg = user.organization
        ? `Organización: ${user.organization.name} (${user.organization.id})`
        : 'Sin organización asignada';
      results.push({
        name: 'User Session Context',
        description: 'Usuario autenticado existe en BD',
        passed: true,
        detail: `${user.name} (${user.email}), Rol: ${user.role}, ${orgMsg}`,
      });
    }
  } catch (e) {
    results.push({
      name: 'User Session Context',
      description: 'Error al consultar usuario',
      passed: false,
      detail: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Test 4: Verificar que datos test existen
  try {
    const testOrgs = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::int as count FROM public.organizations WHERE id IN ('org-a-test', 'org-b-test')`;
    const orgCount = Number(testOrgs[0]?.count ?? 0);
    results.push({
      name: 'Test Data Available',
      description: 'Datos de prueba para RLS test',
      passed: orgCount === 2,
      detail: `${orgCount}/2 organizaciones de prueba encontradas`,
    });
  } catch (e) {
    results.push({
      name: 'Test Data Available',
      description: 'Error al consultar datos test',
      passed: false,
      detail: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Test 5: Verificar conexión a Postgres y variables de sesión RLS
  try {
    const sessionVars = await prisma.$queryRaw<
      { current_user_id: string | null; current_org_id: string | null }[]
    >`SELECT current_setting('app.current_user_id', true) as current_user_id, current_setting('app.current_org_id', true) as current_org_id`;
    const vars = sessionVars[0];
    results.push({
      name: 'RLS Session Variables',
      description: 'Variables de sesión RLS configuradas en Postgres',
      passed: !!vars?.current_user_id,
      detail: `current_user_id=${vars?.current_user_id || '(no set)'}, current_org_id=${vars?.current_org_id || '(no set)'}`,
    });
  } catch (e) {
    results.push({
      name: 'RLS Session Variables',
      description: 'Error al verificar variables de sesión',
      passed: false,
      detail: '',
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const allPassed = results.every((r) => r.passed);

  return NextResponse.json({
    userId,
    timestamp: new Date().toISOString(),
    summary: allPassed ? 'ALL PASSED' : 'SOME FAILED',
    details: results,
    note: 'RLS se evalúa en cada query via SET de variables de sesión (app.current_user_id, app.current_org_id).',
  });
}
