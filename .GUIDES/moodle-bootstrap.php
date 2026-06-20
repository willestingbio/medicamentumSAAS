<?php
/**
 * moodle-bootstrap.php — Provisioning automático de Moodle para el entorno
 * LOCAL de pruebas de Medicamentum360.
 *
 * Se ejecuta UNA VEZ (contenedor "moodle-bootstrap" del docker-compose.yml)
 * justo después de que bitnami/moodle termina su auto-instalación.
 *
 * Qué hace, en orden:
 *   1. Habilita Web Services + protocolo REST (set_config, equivalente a
 *      `admin/cli/cfg.php --name=enablewebservices --set=1`).
 *   2. Crea el external service "m360_api" con las funciones que el
 *      TRD.md/BACKEND.md de Medicamentum360 necesitan.
 *   3. Crea un usuario de servicio dedicado (ws_m360) y le genera un token
 *      permanente vía \core_external\util::generate_token() — la API
 *      moderna (Moodle 4.4+); la función legacy external_generate_token()
 *      está deprecated desde MDL-76583.
 *   4. Crea un curso demo con shortname fijo (M360-DEMO-001) para que tus
 *      pruebas de integración tengan un moodleCourseId predecible.
 *   5. Crea un estudiante de prueba y lo inscribe (enrol manual) en el
 *      curso demo.
 *   6. Escribe el resultado en /output/moodle-test-env.json y en
 *      /output/.env.moodle.local listo para copiar a tu .env.local de
 *      Next.js.
 *
 * Es idempotente: si vuelves a correr el contenedor, detecta lo que ya
 * existe y no duplica nada.
 *
 * NOTA SOBRE RUTAS: Moodle 5.x movió buena parte del código fuente a un
 * subdirectorio public/ dentro del repositorio oficial. No está confirmado
 * que la imagen bitnami/moodle:5.2 replique esa reestructuración dentro del
 * volumen /bitnami/moodle, así que este script autodetecta dónde vive
 * config.php en lugar de asumir una sola ruta. Si el log muestra que no lo
 * encuentra, inspecciona el contenedor con:
 *   docker compose exec moodle find /bitnami/moodle -maxdepth 2 -name config.php
 * y ajusta $configCandidates más abajo.
 */

define('CLI_SCRIPT', true);

function m360_log(string $msg): void {
    fwrite(STDOUT, '[m360-bootstrap] ' . $msg . "\n");
}

function m360_fail(string $msg): void {
    fwrite(STDERR, '[m360-bootstrap][ERROR] ' . $msg . "\n");
    exit(1);
}

$configCandidates = [
    '/bitnami/moodle/config.php',
    '/bitnami/moodle/public/config.php',
    __DIR__ . '/config.php',
    __DIR__ . '/public/config.php',
];

$loaded = false;
foreach ($configCandidates as $candidate) {
    if (file_exists($candidate)) {
        m360_log("Cargando config.php desde: $candidate");
        require($candidate);
        $loaded = true;
        break;
    }
}
if (!$loaded) {
    m360_fail('No se encontró config.php de Moodle en ninguna ruta conocida. Ver nota en cabecera del script.');
}

require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/webservice/lib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->libdir . '/enrollib.php');

global $DB;

// ---------------------------------------------------------------------
// 1. Habilitar Web Services + protocolo REST
// ---------------------------------------------------------------------
set_config('enablewebservices', 1);
set_config('webserviceprotocols', 'rest');
m360_log('Web services habilitados (protocolo REST).');

// ---------------------------------------------------------------------
// 2. Crear external service "m360_api"
// ---------------------------------------------------------------------
$shortname = 'm360_api';
$service = $DB->get_record('external_services', ['shortname' => $shortname]);

if (!$service) {
    $webservicemanager = new webservice();

    $newservice = new stdClass();
    $newservice->name = 'Medicamentum360 API';
    $newservice->shortname = $shortname;
    $newservice->enabled = 1;
    $newservice->restrictedusers = 1; // solo el usuario que autoricemos abajo puede usarlo
    $newservice->downloadfiles = 0;
    $newservice->uploadfiles = 0;
    $newserviceid = $webservicemanager->add_external_service($newservice);

    // Funciones usadas por TRD.md §6 / BACKEND.md §6.
    // auth_userkey_request_login_url solo existe si instalaste el plugin
    // de terceros catalyst/moodle-auth_userkey (ver README.md del docker/).
    // Por eso va envuelta en try/catch: si no existe, se omite sin romper
    // el resto del provisioning.
    $functions = [
        'core_user_create_users',
        'core_user_get_users',
        'core_user_get_users_by_field',
        'core_course_get_courses',
        'core_course_get_courses_by_field',
        'enrol_manual_enrol_users',
        'core_enrol_get_enrolled_users',
        'core_completion_get_activities_completion_status',
        'core_completion_get_course_completion_status',
        'core_grades_get_grades',
        'auth_userkey_request_login_url',
    ];

    foreach ($functions as $fn) {
        try {
            $webservicemanager->add_external_function_to_service($fn, $newserviceid);
        } catch (Throwable $e) {
            m360_log("Aviso: no se pudo añadir la función '$fn' (probablemente no instalada): " . $e->getMessage());
        }
    }

    $service = $DB->get_record('external_services', ['id' => $newserviceid]);
    m360_log("External service '$shortname' creado (id={$service->id}).");
} else {
    m360_log("External service '$shortname' ya existía (id={$service->id}), reutilizando.");
}

// ---------------------------------------------------------------------
// 3. Usuario de servicio + token permanente
// ---------------------------------------------------------------------
$wsuser = $DB->get_record('user', ['username' => 'ws_m360', 'deleted' => 0]);

if (!$wsuser) {
    $newuser = new stdClass();
    $newuser->username = 'ws_m360';
    $newuser->password = 'M360WsTest_' . substr(md5(uniqid('', true)), 0, 10) . '!1';
    $newuser->firstname = 'Medicamentum360';
    $newuser->lastname = 'Web Service';
    $newuser->email = 'ws@medicamentum360.local';
    $newuser->auth = 'manual';
    $newuser->confirmed = 1;
    $newuser->mnethostid = $CFG->mnet_localhost_id;
    $wsuserid = user_create_user($newuser, false, false);
    $wsuser = $DB->get_record('user', ['id' => $wsuserid]);
    m360_log("Usuario de servicio 'ws_m360' creado (id={$wsuser->id}).");
} else {
    m360_log("Usuario de servicio 'ws_m360' ya existía (id={$wsuser->id}).");
}

// Autorizar al usuario en el servicio restringido (external_services_users).
if (!$DB->record_exists('external_services_users', ['externalserviceid' => $service->id, 'userid' => $wsuser->id])) {
    $DB->insert_record('external_services_users', (object) [
        'externalserviceid' => $service->id,
        'userid' => $wsuser->id,
        'timecreated' => time(),
    ]);
    m360_log('Usuario de servicio autorizado en el external service.');
}

// Generar (o reutilizar) un token permanente.
$existingtoken = $DB->get_record('external_tokens', [
    'externalserviceid' => $service->id,
    'userid' => $wsuser->id,
]);

if (!$existingtoken) {
    $context = context_system::instance();
    // API moderna confirmada contra el código fuente de Moodle
    // (lib/external/classes/util.php::generate_token), válida desde 4.4+.
    $token = \core_external\util::generate_token(
        EXTERNAL_TOKEN_PERMANENT,
        $service,
        $wsuser->id,
        $context,
        0,
        '',
        'm360-local-test'
    );
    m360_log('Token de Web Services generado.');
} else {
    $token = $existingtoken->token;
    m360_log('Token ya existía, reutilizando.');
}

// ---------------------------------------------------------------------
// 4. Curso demo con shortname predecible
// ---------------------------------------------------------------------
$courseShortname = 'M360-DEMO-001';
$course = $DB->get_record('course', ['shortname' => $courseShortname]);

if (!$course) {
    $coursedata = new stdClass();
    $coursedata->fullname = 'Curso Demo — Medicamentum360';
    $coursedata->shortname = $courseShortname;
    $coursedata->category = 1; // categoría "Miscellaneous" por defecto
    $coursedata->summary = 'Curso generado automáticamente para validar la integración Medicamentum360 ↔ Moodle (API REST + SSO).';
    $coursedata->visible = 1;
    $coursedata->format = 'topics';
    $course = create_course($coursedata);
    m360_log("Curso demo creado (id={$course->id}, shortname={$courseShortname}).");
} else {
    m360_log("Curso demo ya existía (id={$course->id}).");
}

// ---------------------------------------------------------------------
// 5. Estudiante de prueba + inscripción manual
// ---------------------------------------------------------------------
$studentUser = $DB->get_record('user', ['username' => 'estudiante_demo', 'deleted' => 0]);

if (!$studentUser) {
    $newstudent = new stdClass();
    $newstudent->username = 'estudiante_demo';
    $newstudent->password = 'EstudianteDemo123!';
    $newstudent->firstname = 'Estudiante';
    $newstudent->lastname = 'Demo';
    $newstudent->email = 'estudiante.demo@medicamentum360.local';
    $newstudent->auth = 'manual';
    $newstudent->confirmed = 1;
    $newstudent->mnethostid = $CFG->mnet_localhost_id;
    $studentid = user_create_user($newstudent, true, false);
    $studentUser = $DB->get_record('user', ['id' => $studentid]);
    m360_log("Estudiante de prueba creado (id={$studentUser->id}).");
} else {
    m360_log("Estudiante de prueba ya existía (id={$studentUser->id}).");
}

$manual = enrol_get_plugin('manual');
$instances = enrol_get_instances($course->id, true);
$manualinstance = null;
foreach ($instances as $instance) {
    if ($instance->enrol === 'manual') {
        $manualinstance = $instance;
        break;
    }
}
$studentrole = $DB->get_record('role', ['shortname' => 'student']);

if ($manualinstance && $studentrole) {
    $alreadyEnrolled = $DB->record_exists('user_enrolments', [
        'enrolid' => $manualinstance->id,
        'userid' => $studentUser->id,
    ]);
    if (!$alreadyEnrolled) {
        $manual->enrol_user($manualinstance, $studentUser->id, $studentrole->id);
        m360_log('Estudiante de prueba inscrito en el curso demo.');
    } else {
        m360_log('Estudiante de prueba ya estaba inscrito.');
    }
} else {
    m360_log('Aviso: no se encontró instancia de inscripción manual o el rol student; revisa manualmente.');
}

// ---------------------------------------------------------------------
// 6. Volcar resultado para que Next.js lo consuma directo
// ---------------------------------------------------------------------
$result = [
    'moodle_base_url'        => $CFG->wwwroot,
    'moodle_ws_token'        => $token,
    'moodle_ws_username'     => 'ws_m360',
    'moodle_external_service'=> $shortname,
    'demo_course_id'         => (int) $course->id,
    'demo_course_shortname'  => $courseShortname,
    'demo_student_username'  => 'estudiante_demo',
    'demo_student_password'  => 'EstudianteDemo123!',
    'admin_username'         => 'admin',
    'generated_at'           => date('c'),
];

@mkdir('/output', 0777, true);
file_put_contents('/output/moodle-test-env.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

$envLines = [
    '# Generado automáticamente por moodle-bootstrap.php — entorno LOCAL únicamente',
    "MOODLE_BASE_URL={$result['moodle_base_url']}",
    "MOODLE_WS_TOKEN={$result['moodle_ws_token']}",
    '',
    "# Curso demo: {$result['demo_course_shortname']} (moodleCourseId={$result['demo_course_id']})",
    "# Estudiante demo: {$result['demo_student_username']} / {$result['demo_student_password']}",
    "# Admin Moodle: {$result['admin_username']} / (ver MOODLE_PASSWORD en docker-compose.yml)",
];
file_put_contents('/output/.env.moodle.local', implode("\n", $envLines) . "\n");

m360_log('Provisioning completo.');
m360_log('Resultado: /output/moodle-test-env.json y /output/.env.moodle.local');
m360_log("Token: {$token}");
m360_log("URL admin: {$CFG->wwwroot}/login (admin / ver docker-compose.yml)");
