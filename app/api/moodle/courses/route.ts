import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCourses } from '@/lib/moodle/client';

/**
 * Moodle Course Catalog — GET /api/moodle/courses
 *
 * Returns the list of courses from Moodle LMS.
 * Protected: requires admin or hospital_admin role.
 *
 * Used by admin to link Moodle courses to products
 * (setting the moodleCourseId field on Product).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo admins pueden ver el catálogo de Moodle
    const userRole = (session.user as any).role;
    if (userRole !== 'super_admin' && userRole !== 'hospital_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const courses = await getCourses();

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('[Moodle Courses API] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener cursos de Moodle' },
      { status: 500 }
    );
  }
}
