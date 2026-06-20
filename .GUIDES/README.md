# Moodle local para pruebas — Medicamentum360

Entorno desechable de Moodle en Docker, **100% auto-provisionado**: un solo comando deja Moodle instalado, con Web Services REST habilitados, un curso demo y un token listo para que tu app Next.js empiece a probar la integración (TRD.md §6, FLUJOS.md §3-4).

> Solo para desarrollo/pruebas locales. No usar esta configuración (passwords de ejemplo, `ALLOW_EMPTY_PASSWORD=yes`) en ningún ambiente expuesto a internet.

## Requisitos

- Docker + Docker Compose v2.
- Puertos libres en el host: `8090` (Moodle HTTP), `8453` (Moodle HTTPS).

## Uso

```bash
cd docker
docker compose up -d

# Ver progreso del provisioning (tarda 1–3 min: bitnami instala Moodle,
# luego el contenedor moodle-bootstrap crea el servicio/token/curso demo)
docker compose logs -f moodle-bootstrap
```

Cuando el log de `moodle-bootstrap` termine con `Provisioning completo.`, revisa:

```bash
cat output/.env.moodle.local
```

Vas a obtener algo así:

```
MOODLE_BASE_URL=http://localhost:8090
MOODLE_WS_TOKEN=3f9a1c...   (32 caracteres hex)

# Curso demo: M360-DEMO-001 (moodleCourseId=2)
# Estudiante demo: estudiante_demo / EstudianteDemo123!
# Admin Moodle: admin / Adm1nM360Test#2026
```

Copia `MOODLE_BASE_URL` y `MOODLE_WS_TOKEN` directo a tu `.env.local` de Next.js (ver TRD.md §15: `MOODLE_BASE_URL`, `MOODLE_WS_TOKEN`).

## Qué se crea automáticamente

| Recurso | Detalle |
|---|---|
| External service | `m360_api`, con las funciones de TRD.md §6 (creación/lectura de usuarios, cursos, inscripción manual, progreso, calificaciones) |
| Usuario de servicio | `ws_m360`, autorizado y con token permanente |
| Curso demo | shortname fijo `M360-DEMO-001`, para que tu `moodleCourseId` de prueba sea predecible entre reinicios |
| Estudiante demo | `estudiante_demo` / `EstudianteDemo123!`, ya inscrito en el curso demo (manual enrolment) |
| Admin | `admin` / contraseña definida en `docker-compose.yml` (`MOODLE_PASSWORD`) |

El script `moodle-bootstrap.php` es **idempotente**: si reinicias el contenedor `moodle-bootstrap` (o todo el stack con los volúmenes ya creados), detecta lo que ya existe y no duplica nada.

## Probar manualmente la API REST

```bash
curl "http://localhost:8090/webservice/rest/server.php" \
  --data-urlencode "wstoken=TU_TOKEN" \
  --data-urlencode "wsfunction=core_course_get_courses" \
  --data-urlencode "moodlewsrestformat=json"
```

## SSO / Autologin (Modo 2, opcional)

El Modo 2 de integración (FLUJOS.md §4) requiere el plugin de terceros [`catalyst/moodle-auth_userkey`](https://github.com/catalyst/moodle-auth_userkey), que **no viene incluido en Moodle core** ni en la imagen de bitnami. Instalación manual (no automatizada en el `docker-compose.yml` por seguridad/estabilidad — instalar plugins de terceros vía git clone dentro de un job automático es frágil entre versiones de Moodle):

```bash
# 1. Clonar el plugin dentro del volumen de Moodle
docker compose exec -u root moodle bash -c "
  cd /bitnami/moodle/auth &&
  git clone https://github.com/catalyst/moodle-auth_userkey.git userkey &&
  chown -R daemon:daemon userkey
"

# 2. Completar la instalación del plugin
docker compose exec moodle php admin/cli/upgrade.php --non-interactive

# 3. Habilitar el plugin de autenticación "userkey"
docker compose exec moodle php admin/cli/cfg.php --name=auth --set="manual,userkey"
```

Después de esto, vuelve a correr `moodle-bootstrap.php` (`docker compose run --rm moodle-bootstrap`) para que la función `auth_userkey_request_login_url` se añada al servicio `m360_api` (el script ya lo intenta automáticamente, solo fallaba antes silenciosamente porque el plugin no existía).

> Verifica la rama/versión del plugin contra tu versión real de Moodle antes de usarlo en algo más que pruebas locales — el repositorio mantiene varias ramas `MOODLE_XX_STABLE`.

## Resetear todo desde cero

```bash
docker compose down -v   # borra también los volúmenes (DB y Moodle data)
docker compose up -d
```

## Notas técnicas

- Imagen base: `bitnami/moodle:5.2` (verificar si hay una versión más reciente al momento de usar esto — `docker pull bitnami/moodle:latest` y ajustar el tag si aplica).
- El contenedor `moodle-bootstrap` reutiliza la **misma imagen** que `moodle`, comparte sus volúmenes (`moodle_data`, `moodledata_data`), pero sobreescribe el `entrypoint` para correr el script PHP en vez de levantar Apache — es un patrón estándar de "job container" en docker-compose.
- `moodle-bootstrap.php` autodetecta la ruta de `config.php` porque Moodle 5.x reestructuró parte del código fuente bajo `public/`; si tu imagen difiere, ajusta `$configCandidates` al inicio del script.
- Todas las funciones y firmas usadas en `moodle-bootstrap.php` (`webservice::add_external_service()`, `webservice::add_external_function_to_service()`, `\core_external\util::generate_token()`, `create_course()`, `user_create_user()`, `enrol_plugin::enrol_user()`) fueron verificadas contra el código fuente oficial de [moodle/moodle](https://github.com/moodle/moodle) antes de escribir este script.
