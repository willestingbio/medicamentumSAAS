import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Moodle SSO Autologin — GET /api/moodle/autologin?courseId=123
 *
 * Flujo:
 * 1. Valida sesión del usuario
 * 2. Verifica que el usuario tiene moodleUserId
 * 3. Obtiene la URL de autologin de Moodle
 * 4. Redirige al usuario a Moodle (SSO)
 *
 * Requiere el plugin auth_userkey_request_login_url en Moodle.
 * Si no está disponible, redirige al login de Moodle manual.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // Buscar el moodleUserId del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { moodleUserId: true, email: true },
    });

    if (!user?.moodleUserId) {
      // No tiene cuenta en Moodle — redirigir al dashboard con error
      return NextResponse.redirect(
        new URL('/dashboard?error=moodle_not_linked', req.url)
      );
    }

    // Intentar obtener URL de autologin
    const MOODLE_BASE_URL = process.env.MOODLE_BASE_URL || 'http://localhost:8090';

    try {
      const { getAutologinUrl } = await import('@/lib/moodle/client');
      const loginUrl = await getAutologinUrl(user.moodleUserId);
      return NextResponse.redirect(loginUrl);
    } catch {
      // Plugin de autologin no disponible — fallback a login manual
      const courseId = req.nextUrl.searchParams.get('courseId');
      const fallbackUrl = courseId
        ? `${MOODLE_BASE_URL}/login/index.php?username=${encodeURIComponent(user.email)}&moodle_course=${courseId}`
        : `${MOODLE_BASE_URL}/login/`;
      return NextResponse.redirect(fallbackUrl);
    }
  } catch (error) {
    console.error('[Moodle Autologin] Error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=moodle_sso_failed', req.url));
  }
}
