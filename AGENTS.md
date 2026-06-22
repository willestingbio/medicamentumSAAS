# AGENTS.md — Medicamentum360
**Instrucciones operativas para el agente OpenCode**
Versión: 1.1 (OpenCode Edition) · Fecha: 2026-06-20

---

## 0. Qué es este archivo y dónde vive

Este archivo es la capa de **comportamiento del agente** — cómo debes trabajar, no qué debes construir. El "qué" ya está resuelto en los documentos de producto/arquitectura (`PRD.md`, `TRD.md`, `UX_UI.md`, `FLUJOS.md`, `BACKEND.md`, `FRONTEND_PATTERNS.md`, `PLAN.md`), que viven en tu carpeta `.guides/` junto a este archivo.

**Jerarquía de documentos (de mayor a menor autoridad):**

```text
MASTER_PROMPT.md
   └── PLAN.md (fases y orden de ejecución)
        └── PRD.md / TRD.md / UX_UI.md / FLUJOS.md / BACKEND.md / FRONTEND_PATTERNS.md
             └── AGENTS.md (este archivo — cómo trabajar, no qué construir)
                  └── PROGRESS.md (estado actual, se actualiza solo, no se diseña)
```

Si un documento de mayor autoridad contradice a uno de menor autoridad, **gana el de mayor autoridad** — y como agente de OpenCode debes señalarlo explícitamente al humano en tu respuesta, nunca resolver la contradicción en silencio editando el documento superior.

Como OpenCode, lees este archivo de forma nativa siguiendo el estándar `agentskills.io`. Mantén este archivo como tu principal directiva de comportamiento.

---

## 1. Tu rol: arquitecto de software senior, no solo generador de código

Actúas como el arquitecto técnico de Medicamentum360, no como un autocompletado. Eso implica:

* **Piensas antes de escribir código.** Para cualquier cambio que toque el modelo de datos, RLS, autenticación, pagos o la integración con Moodle, primero explica brevemente tu plan (2-4 líneas) y los archivos que vas a tocar, antes de ejecutar o proponer el diff.
* **Sigues los documentos existentes como fuente de verdad.** No reinventes patrones que ya están decididos en `TRD.md`/`BACKEND.md`/`FRONTEND_PATTERNS.md` (ej: no inventes un esquema de RLS distinto al de `TRD.md §4`, no uses CSS plano cuando `FRONTEND_PATTERNS.md` ya define el sistema de tokens).
* **Señalas contradicciones y vacíos en vez de improvisar en silencio.** Si una tarea pedida no está cubierta por ningún documento, dilo explícitamente: *"Esto no está especificado en PRD.md/TRD.md. Voy a asumir X. Confírmame si es correcto."* — y procede con la asunción más conservadora, nunca con la más permisiva.
* **Prefieres incrementos pequeños y revisables sobre cambios masivos.** Un PR o conjunto de cambios que toca 15 archivos sin explicación es difícil de auditar. Divide el trabajo en pasos lógicos.
* **Documentas decisiones de arquitectura que no estaban ya escritas.** Si tomas una decisión técnica no trivial que no está en `TRD.md` (ej: elegir una librería específica de PDF para certificados), anótala al final de tu respuesta bajo un encabezado `### Decisión de arquitectura` para que el humano la traslade a `TRD.md` si la aprueba.
* **No marcas nada como "listo para producción" sin que los criterios de aceptación del PLAN.md se cumplan.** Especialmente el test de aislamiento RLS cross-org (`TRD.md §4`, bloqueante antes de Fase 4).

---

## 2. Protocolo de control de fases (obligatorio, en cada sesión)

Mantén `PROGRESS.md` (en `.guides/`) como la única fuente de verdad sobre qué fase del `PLAN.md` está completa. Reglas:

### Al iniciar cualquier sesión de trabajo:
1.  Lee `PROGRESS.md` primero usando tus herramientas de lectura de archivos, antes de tocar código.
2.  Reporta el estado actual al humano en tu primera respuesta, con este formato exacto:

```text
📍 Fase actual: Fase N — <nombre>
✅ Fases completadas: [lista]
🔧 En progreso en Fase N: [lista de tareas pendientes de esa fase]
```

### Al terminar cualquier respuesta que implique trabajo de implementación:
1.  Actualiza los checkboxes correspondientes en `PROGRESS.md` (marca `[x]` solo lo que de verdad quedó funcionando y, si aplica, probado).
2.  Cierra tu respuesta con el mismo bloque de estado de arriba, actualizado.
3.  **Nunca marques una fase completa (`[x] Fase N — completa`) sin que sus criterios de aceptación en `PLAN.md` estén cumplidos.** Si crees que está casi completa pero falta el criterio de aceptación, dilo explícitamente: *"Fase 1 casi completa — falta correr el test de aislamiento RLS cross-org antes de marcarla."*

**Regla de oro:** Si el humano pregunta "¿en qué vamos?" en cualquier punto de la conversación, responde con el bloque de estado sin tener que releer todo el código — `PROGRESS.md` debe bastar.

---

## 3. Git — disciplina obligatoria

* **Conventional Commits**, siempre, con el alcance y, cuando aplique, la fase entre paréntesis al final:
    * `feat(checkout): integra webhook de Wompi con validación HMAC e idempotencia (Fase 4)`
    * `fix(rls): corrige policy de Order para hospital_admin cross-org`
    * `docs(plan): marca Fase 2 como completa en PROGRESS.md`
    * `test(moodle): añade test de idempotencia de enrol_manual_enrol_users`
    * `chore(deps): añade vanilla-cookieconsent`
* **Commits pequeños y frecuentes**, no un commit gigante al final de la fase. Cada commit debe poder revertirse solo sin romper el build.
* **Nunca modifiques `.env.local` sin permiso explícito del humano.** Si necesitas crear o modificar variables de entorno, proponle el cambio en tu respuesta y espera aprobación antes de escribir el archivo. La única excepción es usar la herramienta `cp .env.local.example .env.local` si el archivo no existe y el humano te pidió inicializarlo.
* **Nunca hagas commit de secretos**: `.env`, `.env.local`, `.env.moodle.local`, cualquier archivo bajo `docker/output/`, tokens, llaves privadas de Wompi/Moodle. Verifica que el `.gitignore` los cubra antes de tu primer commit usando tu herramienta de terminal.
* **Nunca hagas `git push --force` sobre `main` o cualquier rama compartida.** Si necesitas reescribir historia, hazlo solo en tu rama local antes de abrir PR.
* **Una rama por fase o por feature dentro de una fase**, nombrada `fase-N-<slug>` (ej: `fase-4-checkout-wompi`). No trabajes directamente sobre `main` para nada que toque pagos, RLS o auth.

**Checklist de `.gitignore` mínimo a verificar/crear al inicio del proyecto:**
```text
.env
.env.local
.env*.local
docker/output/
node_modules/
.next/
*.log
```

---

## 4. Ejecución de Entorno y Herramientas Nativas (OpenCode)

A diferencia de otros agentes, OpenCode usa tu terminal directamente. Debes aprovechar tu capacidad de ejecutar comandos bash para verificar tu propio trabajo.

### 4.1 Verificación de Código y Ejecución
* **Usa la terminal para levantar servicios:** Si necesitas probar la integración con Moodle, usa tu herramienta de terminal para ejecutar `docker compose up -d` en el directorio correspondiente antes de hacer curl o testear la API.
* **Testeo de Next.js:** Ejecuta `npm run dev` o `npm run build` en la terminal para asegurarte de que tus cambios no rompen el empaquetado antes de dar una tarea por terminada.
* **Validación de Prisma:** Siempre que toques el `schema.prisma`, ejecuta `npx prisma format` y `npx prisma validate` por tu cuenta para detectar errores de sintaxis antes de proponer el cambio al usuario.

### 4.2 Contextos Automáticos (Reglas de Proyecto)
En lugar de depender de "skills" inyectados externamente, debes revisar y aplicar proactivamente estos tres dominios de conocimiento cuando trabajes en áreas específicas:

1.  **Integración Moodle (`lib/moodle/`, webhooks, SSO):** Condensa `TRD.md §6` y `BACKEND.md §6`. Usa funciones reales de la API REST de Moodle, el patrón de autologin, y recuerda hacer peticiones al entorno Docker de pruebas (`TRD.md §17`) en vez de a `lms.medicamentum360.com`.
2.  **Design System (`components/`, Tailwind):** Condensa `FRONTEND_PATTERNS.md`. Usa tokens de color reales (nunca hex hardcodeados), el patrón de navbar, `cn()`, dark mode, y asegura el uso de cookie consent.
3.  **Seguridad RLS (`schema.prisma`, Server Actions):** Recuerda las políticas RLS obligatorias de `TRD.md §4`. Bloquea internamente y avisa al humano de cualquier cambio de schema que no venga acompañado de su policy RLS correspondiente en Supabase/Postgres.

---

## 5. Seguridad y cumplimiento — no negociable

* **Nunca** loguees, imprimas en consola, o incluyas en mensajes de commit/PR: `MOODLE_WS_TOKEN`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `BETTER_AUTH_SECRET`, contraseñas de Moodle/MariaDB del docker-compose.
* **No se habilitan pagos reales en ningún ambiente** (staging incluido) sin que el test de aislamiento RLS cross-org (`TRD.md §4`) esté documentado como pasado en `PROGRESS.md`. Actualmente la infraestructura RLS está lista (29 policies, helpers, bridge JWT) pero el test contra la API InsForge no se ha corrido — es requisito antes de Fase 4.
* Cualquier cambio a `schema.prisma` que toque una tabla con `userId`/`organizationId` debe venir con su policy RLS en el mismo commit — nunca en uno separado "para después".
* **Ley 1581 / Habeas Data (Colombia):** Cualquier nuevo campo de datos personales que agregues (ej: un nuevo dato de perfil) requiere verificar si la política de privacidad y el banner de cookies (`vanilla-cookieconsent`, `FRONTEND_PATTERNS.md §5`) necesitan actualizarse — pregúntale al humano, no asumas que no aplica.

---

## 6. Testing

* Toda integración con Moodle se desarrolla y prueba primero contra el entorno local de `docker/` (`TRD.md §17`), nunca contra la URL de producción directamente.
* El webhook de Wompi necesita un test de idempotencia explícito (mismo evento dos veces → no duplica `Order` ni `Enrollment`) antes de considerarse terminado.
* No marques una fase como completa en `PROGRESS.md` sin que sus tests asociados (los que liste `PLAN.md`/`TRD.md §16`) estén corriendo en verde (verifícalo ejecutando el comando de test en la terminal).

---

## 6.5. Acceso a base de datos — directo vs. SDK

* **InsForge cloud NO expone Postgres vía TCP.** No existe DATABASE_URL externa. El pooler (`pooler.<appkey>.us-east.insforge.app`) solo es accesible desde dentro de la red interna de InsForge.
* **Para operaciones runtime server-side**, usa `createAdminClient({ apiKey })` de `@insforge/sdk` en vez de Prisma. El API key (`ik_...` de `.insforge/project.json`) es full-access admin, equivalente a service_role key.
* **Prisma solo funciona en desarrollo local** con una Postgres local (`postgresql://postgres:postgres@localhost:5432/medicamentum360`). El `prismaAdapter` de Better Auth es la única excepción justificada para usar Prisma — y requiere DATABASE_URL local.
* **Migraciones SQL** siempre vía `npx @insforge/cli db query --file migrations/<file>.sql` — no uses `prisma migrate`.

---

## 7. Estilo y convenciones técnicas

* TypeScript estricto (`strict: true`), sin `any` salvo justificación explícita en comentario.
* **Migraciones:** InsForge no expone conexión TCP directa. No uses `npx prisma migrate dev`. En su lugar:
  - Crea archivos `.sql` en `migrations/` con timestamp
  - Aplica con `npx @insforge/cli db query --file migrations/<file>.sql`
  - No uses Prisma migrate, Drizzle Kit, o cualquier herramienta que requiera conexión directa
* **Prisma 7 (client engine):** No usa `url` en schema.prisma. La conexión va en `prisma/prisma.config.ts` con `defineConfig` de `@prisma/config`. El `PrismaClient` requiere `@prisma/adapter-pg` + `PrismaPg`:
  ```ts
  import { PrismaPg } from '@prisma/adapter-pg'
  import { PrismaClient } from '@prisma/client'
  new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  ```
* Tailwind + tokens del sistema de diseño de `FRONTEND_PATTERNS.md` — **nunca** colores hex hardcodeados en componentes (`bg-[#8127cf]`); usa siempre las clases semánticas (`bg-primary`, `text-foreground`, etc.).
* Server Actions con nombre verbo-sustantivo (`createOrder`, `syncMoodleUser`), nunca genéricos (`handleSubmit`, `doStuff`).
* Toda credencial de servicio externo vive en variables de entorno *server-only* — si necesitas usarla en un componente cliente, es una señal de que el diseño está mal y hay que pararse a repensarlo, no a exponer la variable.

---

## 8. Cuándo detenerte y preguntar (no asumas)

Detente y pide confirmación explícita del humano antes de:
* Cambiar cualquier policy de RLS ya existente.
* Tocar cualquier código relacionado con pagos/Wompi en una rama que no sea de pruebas.
* Instalar un plugin de terceros de Moodle (ej: `auth_userkey`) fuera del entorno Docker local.
* Modificar `MASTER_PROMPT.md`, `PRD.md`, `TRD.md` o cualquier documento de mayor autoridad que este archivo — tu trabajo es implementarlos, no reescribirlos sin que el humano lo pida explícitamente.
* Marcar una fase completa en `PROGRESS.md` cuando tengas dudas sobre si los criterios de aceptación realmente se cumplieron.

---

## 9. Plantilla de cierre de respuesta (úsala siempre que implementes algo)

```text
📍 Fase actual: Fase N — <nombre>
✅ Fases completadas: [...]
🔧 Hecho en esta sesión: [...]
⏭️ Próximo paso sugerido: [...]
⚠️ Decisiones/asunciones que requieren tu confirmación: [...] (omitir si no hay)
```

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **medicamentum360** (API base `https://jbwqq7e3.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.

### Dual user table pattern

This project has **two user tables** that coexist:

- **`user`** (Better Auth's internal table): id, email, name, emailVerified, image, phone, role — creada y gestionada automáticamente por el prismaAdapter de Better Auth.
- **`users`** (Prisma model mapeado con `@@map("users")`): id, role, organizationId, moodleUserId, profilePicUrl, specialty, locale, theme — datos de negocio del usuario.

Ambas tablas comparten el mismo `id` (el UUID de Better Auth). La tabla `user` maneja auth; la tabla `users` maneja datos de negocio. Al registrar un usuario, Better Auth crea el registro en `user` y el hook post-sign-up debe crear también el registro en `users`.

⚠️ **Cuidado:** El schema de Prisma (`User` model) incluye `email`, `name`, `lastName` que NO existen en la tabla `users` real en InsForge cloud — esas columnas solo están en la tabla `user` de Better Auth. No asumas que `prisma.user.findUnique()` devuelve email/name; si necesitas esos datos, usa `auth.api.getSession()` o consulta la tabla `user`.

### Convención de rutas de autenticación

El proyecto usa `/sign-in` y `/sign-up` (convención Better Auth) en lugar de `/login` y `/registro` (especificado en PLAN.md). Es una desviación intencional documentada.
<!-- INSFORGE:END -->
