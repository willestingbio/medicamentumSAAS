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
 * - core_course_create_courses       ← Crear curso en Moodle desde Course Builder
 * - core_course_get_courses
 * - core_course_get_courses_by_field
 * - core_course_get_categories       ← Obtener categorías de Moodle
 * - core_course_delete_courses       ← Eliminar curso en Moodle
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

  console.log(`[Moodle] Calling ${wsfunction}`);

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
    console.error(`[Moodle] Error creating user: ${error instanceof Error ? error.message : 'unknown'}`);
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
    console.error('[Moodle] Error getting user:', error instanceof Error ? error.message : 'unknown');
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
    console.error('[Moodle] Error enrolling user:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

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
    console.error('[Moodle] Error getting course completion:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

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
    console.error('[Moodle] Error getting grades:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

export async function getCourses(): Promise<any> {
  try {
    const result = await callMoodleAPI('core_course_get_courses');
    return result;
  } catch (error) {
    console.error('[Moodle] Error getting courses:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

export async function getMoodleCategories(): Promise<any> {
  try {
    return await callMoodleAPI('core_course_get_categories');
  } catch (error) {
    console.error('[Moodle] Error getting categories:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

/**
 * Crear un curso vacío en Moodle.
 * Se llama desde el Course Builder para sincronizar el curso con Moodle.
 *
 * @param data - Datos del curso
 * @returns ID del curso creado en Moodle
 */
export async function createMoodleCourse(data: {
  fullname: string;
  shortname: string;
  categoryid?: number;
  summary?: string;
}): Promise<number> {
  try {
    const result = await callMoodleAPI('core_course_create_courses', {
      courses: {
        fullname: data.fullname,
        shortname: data.shortname,
        categoryid: data.categoryid ?? 1,
        ...(data.summary && { summary: data.summary }),
        visible: 1,
      },
    });

    if (!result || !result[0]) {
      throw new Error('Failed to create Moodle course');
    }

    const moodleCourseId = result[0].id;
    console.log(`[Moodle] Course created in Moodle: ID ${moodleCourseId} — "${data.fullname}"`);

    return moodleCourseId;
  } catch (error) {
    console.error('[Moodle] Error creating course:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

/**
 * Eliminar un curso de Moodle.
 * Se llama cuando se elimina un producto vinculado.
 *
 * @param moodleCourseId - ID del curso en Moodle
 */
export async function deleteMoodleCourse(moodleCourseId: number): Promise<void> {
  try {
    await callMoodleAPI('core_course_delete_courses', {
      courseids: moodleCourseId,
    });
    console.log(`[Moodle] Course ${moodleCourseId} deleted from Moodle`);
  } catch (error) {
    console.error('[Moodle] Error deleting course:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}

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
    console.error('[Moodle] Error getting autologin URL:', error instanceof Error ? error.message : 'unknown');
    throw error;
  }
}
