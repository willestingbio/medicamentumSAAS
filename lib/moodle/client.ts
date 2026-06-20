/**
 * Moodle API REST Client
 * 
 * Capa de abstracción para la integración con Moodle LMS.
 * Server-only: NUNCA usar en componentes cliente (MOODLE_WS_TOKEN no debe exponerse).
 * 
 * Funciones usadas (TRD.md §6):
 * - core_user_create_users
 * - core_user_get_users
 * - core_user_get_users_by_field
 * - core_course_get_courses
 * - core_course_get_courses_by_field
 * - enrol_manual_enrol_users
 * - core_enrol_get_enrolled_users
 * - core_completion_get_activities_completion_status
 * - core_completion_get_course_completion_status
 * - core_grades_get_grades
 * - auth_userkey_request_login_url (opcional, requiere plugin de terceros)
 * 
 * Referencia: https://docs.moodle.org/dev/Web_services
 */

const MOODLE_BASE_URL = process.env.MOODLE_BASE_URL || 'http://localhost:8090';
const MOODLE_WS_TOKEN = process.env.MOODLE_WS_TOKEN || '';

interface MoodleUserData {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  password?: string;
  auth?: string;
}

interface MoodleEnrollmentData {
  roleid: number;
  userid: number;
  courseid: number;
}

/**
 * Hacer una llamada a la API REST de Moodle.
 * 
 * @param wsfunction - Nombre de la función a llamar (ej: 'core_user_create_users')
 * @param params - Parámetros de la función
 * @returns Respuesta de Moodle
 */
async function callMoodleAPI(
  wsfunction: string,
  params: Record<string, any> = {}
) {
  if (!MOODLE_BASE_URL || !MOODLE_WS_TOKEN) {
    throw new Error(
      'Moodle not configured. Set MOODLE_BASE_URL and MOODLE_WS_TOKEN in .env.local'
    );
  }

  const url = new URL(`${MOODLE_BASE_URL}/webservice/rest/server.php`);
  url.searchParams.set('wstoken', MOODLE_WS_TOKEN);
  url.searchParams.set('wsfunction', wsfunction);
  url.searchParams.set('moodlewsrestformat', 'json');

  // Flatten nested params (Moodle REST uses array syntax)
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subkey, subvalue], i) => {
        url.searchParams.set(`${key}[${i}][${subkey}]`, String(subvalue));
      });
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  console.log(`[Moodle] Calling ${wsfunction}`, params);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    throw new Error(`Moodle API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.exception) {
    throw new Error(`Moodle error: ${data.message || data.exception}`);
  }

  return data;
}

/**
 * Crear usuario en Moodle.
 * Dispara automáticamente al registrar usuario en Medicamentum360.
 * 
 * @param userData - Datos del usuario
 * @returns ID del usuario creado en Moodle (moodleUserId)
 */
export async function createMoodleUser(userData: MoodleUserData): Promise<number> {
  try {
    const result = await callMoodleAPI('core_user_create_users', {
      users: {
        username: userData.username,
        email: userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
        password: userData.password || 'TempPass123!',
        auth: userData.auth || 'manual',
      },
    });

    if (!result || !result[0]) {
      throw new Error('Failed to create Moodle user');
    }

    const moodleUserId = result[0].id;
    console.log(`[Moodle] User created: ID ${moodleUserId}`);

    return moodleUserId;
  } catch (error) {
    console.error('[Moodle] Error creating user:', error);
    throw error;
  }
}

/**
 * Obtener usuario de Moodle por email.
 * 
 * @param email - Email del usuario
 * @returns Datos del usuario o null
 */
export async function getMoodleUserByEmail(email: string): Promise<any> {
  try {
    const result = await callMoodleAPI('core_user_get_users_by_field', {
      field: 'email',
      values: email,
    });

    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('[Moodle] Error getting user:', error);
    throw error;
  }
}

/**
 * Inscribir usuario en un curso (Manual enrolment).
 * Se dispara desde el webhook de Wompi post-pago.
 * 
 * @param moodleUserId - ID del usuario en Moodle
 * @param moodleCourseId - ID del curso en Moodle
 * @param roleid - ID del rol (por defecto 5 = Student)
 */
export async function enrollUserInCourse(
  moodleUserId: number,
  moodleCourseId: number,
  roleid: number = 5
): Promise<void> {
  try {
    await callMoodleAPI('enrol_manual_enrol_users', {
      enrolments: {
        roleid,
        userid: moodleUserId,
        courseid: moodleCourseId,
      },
    });

    console.log(
      `[Moodle] User ${moodleUserId} enrolled in course ${moodleCourseId}`
    );
  } catch (error) {
    console.error('[Moodle] Error enrolling user:', error);
    throw error;
  }
}

/**
 * Obtener estado de finalización de un curso para un usuario.
 * 
 * @param moodleUserId - ID del usuario
 * @param moodleCourseId - ID del curso
 * @returns Datos de progreso/finalización
 */
export async function getCourseCompletion(
  moodleUserId: number,
  moodleCourseId: number
): Promise<any> {
  try {
    const result = await callMoodleAPI('core_completion_get_course_completion_status', {
      courseid: moodleCourseId,
      userid: moodleUserId,
    });

    return result;
  } catch (error) {
    console.error('[Moodle] Error getting course completion:', error);
    throw error;
  }
}

/**
 * Obtener calificaciones de un usuario en un curso.
 * 
 * @param moodleUserId - ID del usuario
 * @param moodleCourseId - ID del curso
 * @returns Array de calificaciones
 */
export async function getCourseGrades(
  moodleUserId: number,
  moodleCourseId: number
): Promise<any> {
  try {
    const result = await callMoodleAPI('core_grades_get_grades', {
      courseid: moodleCourseId,
      userids: moodleUserId,
    });

    return result;
  } catch (error) {
    console.error('[Moodle] Error getting grades:', error);
    throw error;
  }
}

/**
 * Obtener lista de cursos disponibles.
 * (Opcional: implementar caché en fase posterior)
 */
export async function getCourses(): Promise<any> {
  try {
    const result = await callMoodleAPI('core_course_get_courses');
    return result;
  } catch (error) {
    console.error('[Moodle] Error getting courses:', error);
    throw error;
  }
}

/**
 * Obtener URL de autologin (SSO Modo 2).
 * Requiere plugin `auth_userkey` instalado en Moodle.
 * 
 * @param moodleUserId - ID del usuario
 * @returns URL de autologin o error si el plugin no está instalado
 */
export async function getAutologinUrl(moodleUserId: number): Promise<string> {
  try {
    const result = await callMoodleAPI('auth_userkey_request_login_url', {
      userid: moodleUserId,
    });

    if (result && result.loginurl) {
      return result.loginurl;
    }

    throw new Error('Autologin URL not returned');
  } catch (error) {
    console.error('[Moodle] Error getting autologin URL (plugin might not be installed):', error);
    throw error;
  }
}
