# FLUJOS — Medicamentum360
**Flujos de usuario — happy path, variantes y edge cases**
Versión: 2.1 · Fecha: 2026-06-26 · Añade compra en lote, gestión de empleados, reembolsos y soporte; corrige 2 contradicciones internas post-Course Builder

> **Relación con otros documentos:** este documento describe los flujos de usuario de extremo a extremo. La especificación visual de cada pantalla está en `UX_UI.md`. La implementación técnica (Server Actions, Route Handlers, webhooks) está en `BACKEND.md`. La arquitectura de datos está en `TRD.md`.

---

## Índice

1. Registro de usuario
2. Registro con invitación de organización
3. Login
4. Recuperación de contraseña
5. Compra de producto (curso o VR)
5.1 Compra corporativa en lote (hospital_admin)
6. Post-pago → acceso a curso en Moodle
7. Acceso a experiencia VR
8. Carrito — guest merge al hacer login
9. Generación y descarga de certificado
10. Invitar empleados (hospital_admin)
10.1 Cambiar rol y remover empleado (hospital_admin)
10.2 Reportes de progreso de la organización
11. Creación de producto por super_admin
12. Vinculación con Moodle desde el panel admin (legacy)
13. Creación de curso completo en el Course Builder
14. Consumo de un curso por el estudiante (lecciones, drip, quizzes)
15. Subida y reemplazo de video de lección
16. Onboarding de vendor y revisión editorial
17. Venta de un producto de vendor — comisión y payout
18. Suspensión o baja de un vendor
19. Reembolso o cancelación de una orden
20. Soporte y disputas del estudiante

---

## 1. Registro de usuario

**Actor:** visitante no autenticado.

**Happy path:**
1. Usuario llega a `/sign-up` (desde "Entrar" → "¿No tienes cuenta?" o desde CTA del landing).
2. Elige "Continuar con Google" → OAuth 2.0 → Better Auth crea sesión → hook post-signup crea cuenta espejo en Moodle vía `core_user_create_users` → redirige a `/dashboard`.
3. O bien llena el formulario manual: Nombre, Apellidos, Email, Password, Confirmar password, checkbox T&C.
4. Validación en tiempo real: fortaleza de password (`@zxcvbn-ts/core`), formato de email.
5. Submit → Server Action `registerUser()`:
   - Crea `User` en DB.
   - Dispara hook: crea cuenta espejo en Moodle, persiste `moodleUserId`.
   - Envía email de verificación (Brevo).
6. Pantalla "Verifica tu correo" — el usuario no puede acceder al dashboard hasta verificar.
7. Usuario hace clic en el enlace del email → `GET /api/auth/verify-email?token=...` → Better Auth valida → `emailVerified: true` → redirige a `/dashboard`.

**Edge cases:**
- Email ya registrado → mensaje de error inline "Ya existe una cuenta con este email. ¿Quieres iniciar sesión?"
- Fallo al crear cuenta espejo en Moodle → registro en Medicamentum360 no se revierte (no es bloqueante); se registra el error en log y se reintenta en background job.
- Token de verificación expirado → pantalla con botón "Reenviar email de verificación".
- Rate limit alcanzado (> N registros por IP en X minutos) → error 429 con mensaje claro.

---

## 2. Registro con invitación de organización

**Actor:** empleado invitado por un `hospital_admin`.

**Happy path:**
1. Empleado recibe enlace compartido por su `hospital_admin`: `https://medicamentum360.com/sign-up?org_code=HOSP123XYZ`.
2. Next.js detecta `org_code` en los parámetros, llama a Server Action `getOrgDetails(orgCode)` antes de renderizar el formulario.
3. Se muestra badge `OrgBadge`: "Serás añadido como empleado de Hospital San Pablo".
4. Empleado completa el registro (igual que flujo 1, pasos 3-7).
5. Post-registro: `linkUserToOrganization(orgCode)` → vincula `User.organizationId`, marca `OrganizationInvitation.accepted = true` si existe.
6. El empleado queda con `role: student` y `organizationId` de su hospital.

**Edge cases:**
- `org_code` inválido o no encontrado → mensaje de error "Código de invitación inválido" + formulario bloqueado.
- `org_code` de una invitación individual con `email` específico: verificar que el email registrado coincide. Si no coincide → error "Este código de invitación es para otro correo".
- Invitación expirada (`expiresAt < now`) → mensaje "Este código de invitación ha expirado. Pide a tu administrador que genere uno nuevo."
- El empleado ya tenía cuenta → redirigir a `/sign-in?org_code=HOSP123XYZ` para que el login ejecute también `linkUserToOrganization`.

---

## 3. Login

**Actor:** usuario registrado.

**Happy path:**
1. Usuario va a `/sign-in` (directo o vía redirect desde ruta protegida).
2. Ingresa email + password → Better Auth valida → crea sesión → redirige a `redirect_to` (si existe) o a `/dashboard`.
3. O bien "Iniciar sesión con Google" → OAuth → igual que el registro pero sin crear usuario nuevo si ya existe.

**Edge cases:**
- Credenciales incorrectas → mensaje de error genérico "Email o contraseña incorrectos" (no revelar cuál). Contador de intentos fallidos en Redis.
- N intentos fallidos (ej. 5) → bloqueo temporal de cuenta (ej. 15 minutos) + email de alerta al usuario.
- Cuenta no verificada → mensaje "Por favor verifica tu correo antes de iniciar sesión" + enlace "Reenviar email".
- Sesión expirada en ruta protegida → `middleware.ts` captura, redirige a `/sign-in?redirect_to=/ruta-original`. Post-login, retoma la navegación.
- `redirect_to` con `org_code` → después del login, ejecutar `linkUserToOrganization` si hay un `org_code` en la URL.

---

## 4. Recuperación de contraseña

**Happy path:**
1. Usuario en `/sign-in` → "¿Olvidaste tu contraseña?".
2. Pantalla `/forgot-password`: ingresa email → `requestPasswordReset(email)` → Brevo envía email con enlace de restablecimiento.
3. Usuario hace clic → `/reset-password?token=...` → formulario nueva password + confirmar.
4. `resetPassword(token, newPassword)` → Better Auth valida token + actualiza hash → redirige a `/sign-in` con toast "Contraseña actualizada".

**Edge cases:**
- Email no registrado → respuesta idéntica al caso de email registrado (no revelar si el email existe).
- Token expirado → mensaje "Este enlace ha expirado. Solicita uno nuevo." + botón de reenvío.

---

## 5. Compra de producto

**Actor:** usuario autenticado.

**Happy path (carrito → checkout):**
1. Usuario en marketplace o detalle de producto → "Agregar al carrito".
   - Si ya estaba en localStorage (guest) y acaba de hacer login → merge automático al hacer login (flujo 8).
2. Ícono del carrito (badge +1) → usuario abre el popover del carrito.
3. Puede ajustar cantidades o eliminar ítems.
4. "Comprar ahora" → navega a `/checkout`.
5. Checkout muestra resumen, campos de facturación (nombre, email, tipo doc + número), widget Wompi embebido.
6. Usuario completa el pago en Wompi → Wompi dispara `POST /api/webhooks/wompi`.
7. Webhook handler (ver `BACKEND.md §3`): valida HMAC, verifica idempotencia, actualiza `Order.status = paid`, inscribe en Moodle, envía email de confirmación.
8. Pantalla de éxito: resumen de compra + botón "Ir a Mis Cursos" → `/dashboard`.

**Happy path (comprar ahora, sin carrito previo):**
1. Usuario en detalle de producto → "Comprar ahora" → agrega automáticamente al carrito + navega a `/checkout`.

**Edge cases:**
- Usuario no autenticado en "Comprar ahora" o "Agregar al carrito" → redirigir a `/sign-in?redirect_to=/checkout` (carrito persiste en localStorage). Post-login, merge del carrito + navegar a `/checkout`.
- Producto que el usuario ya compró en el carrito → aviso inline "Ya tienes acceso a este curso" (no permite comprarlo de nuevo).
- Pago fallido en Wompi → `Order.status = failed`. Pantalla de error con opción "Reintentar pago".
- Webhook duplicado (mismo `wompiTransactionId`) → verificar idempotencia: si ya existe `Order` con ese ID y `status = paid`, ignorar silenciosamente.
- Cupo agotado (`capacity = 0`) → botón "Comprar" deshabilitado, texto "Sin cupos disponibles". Si ocurre entre que el usuario agrega al carrito y hace checkout → error en checkout con opción de eliminar el producto del carrito.

---

## 5.1 Compra corporativa en lote (hospital_admin) — NUEVO

**Actor:** `hospital_admin` comprando cupos para su organización, no para sí mismo.

> Este flujo resuelve un hueco detectado en auditoría: `EmployeeAssignment` existe en el schema desde la Fase 4 (ver `PROGRESS.md`), pero nunca hubo un checkout que realmente comprara "N cupos para mi organización" en vez de 1 acceso individual. Ver el modelo completo en `TRD.md §3.1`.

**Happy path:**
1. `hospital_admin` en el detalle de un producto (curso) ve, además del flujo normal de "Comprar ahora", un toggle "Comprar para mi organización" — visible solo si el usuario tiene `role: hospital_admin`.
2. Al activarlo, el selector de cantidad pasa de "1" a un campo numérico libre: "¿Para cuántos empleados?" (mínimo 1).
3. El precio total se recalcula como `precio_unitario × cantidad` (sin descuento automático por volumen en esta fase — eso queda anotado como mejora futura, ver `TRD.md §22`).
4. Checkout idéntico al flujo 5, pero la `Order` resultante se crea con `organizationId` poblado y `quantity: N` en vez de un único `userId` comprador.
5. Tras el pago confirmado (mismo webhook de Wompi, mismo HMAC+idempotencia del flujo 5) — **a diferencia de una compra individual, aquí NO se crea ningún `Enrollment` automáticamente.** Los N cupos quedan disponibles sin asignar.
6. El `hospital_admin` recibe email de confirmación de compra + es redirigido a `/org/employees` con un banner: "Compraste N cupos de '[Curso]'. Asígnalos a tus empleados a continuación." en vez de la pantalla de éxito genérica del flujo 5.
7. Desde `/org/employees`, cada empleado de la lista muestra un botón "Asignar curso" (o un selector múltiple si hay varios cupos de distintos cursos) → `assignCourseToEmployee(userId, courseId)` crea el `EmployeeAssignment` + el `Enrollment` correspondiente para ese empleado específico.
8. El contador de "cupos disponibles sin asignar" baja en tiempo real a medida que se asignan.

**Edge cases:**
- `hospital_admin` intenta asignar más cupos de los comprados → bloqueado con mensaje "Ya asignaste todos los cupos disponibles de este curso. Compra más para seguir asignando."
- Un empleado ya tenía acceso individual al mismo curso (lo compró con su propia tarjeta antes) → al intentar asignarle un cupo de la organización, aviso "Este empleado ya tiene acceso a este curso por cuenta propia. ¿Asignar el cupo de todas formas para que quede registrado como beneficio de la organización?" — se permite, pero se avisa, igual criterio que otros edge cases similares ya documentados en el sistema (ej. flujo 12).
- El hospital compra cupos pero nunca los asigna → los cupos quedan "disponibles" indefinidamente, sin expiración automática en esta fase (anotado como mejora futura si el negocio decide que los cupos deben caducar).
- Reembolso de una compra en lote después de asignar algunos cupos → ver `FLUJOS.md §19` (reembolsos), que cubre explícitamente este caso como uno de los más delicados de resolver.

---

## 6. Post-pago → acceso a curso

**Actor:** usuario que acaba de comprar un curso.

> **Arquitectura híbrida (julio 2026):** Postgres es la fuente de verdad del contenido del curso. Moodle es un mirror. El estudiante consume desde el reproductor propio de Medicamentum360. El acceso a Moodle es opcional (vía botón "Continuar en Moodle"), no la ruta primaria. Ver `TRD.md §19.1`.

**Happy path:**
1. Webhook de Wompi confirma pago → crea `Enrollment` en DB: `progressPct: 0`, `status: "not_started"`.
2. Para cursos con `moodleCourseId` (todos los cursos nativos reciben uno automáticamente), el mismo webhook también ejecuta `enrol_manual_enrol_users` para reflejar la inscripción en Moodle — esto es una operación fire-and-forget, no bloquea la entrega del curso.
3. Usuario en `/dashboard` → Mis Cursos → ve el nuevo curso con barra de progreso en 0%.
4. "Empezar curso" → navega a `/dashboard/cursos/[slug]` con el reproductor HLS propio de Medicamentum360 (ver flujo 14).
5. El progreso se calcula en tiempo real desde `LessonCompletion` en Postgres, sin depender de sincronización con Moodle.
6. Opcionalmente, el estudiante puede usar el botón "Continuar en Moodle" → `POST /api/moodle/autologin` → genera autologin token de un solo uso → redirect a Moodle. Esta ruta existe para compatibilidad SSO/institucional pero no es la ruta primaria de consumo.

**Edge cases:**
- Inscripción en Moodle falla después del pago exitoso → registrar error en log. Job de reintento automático (3 intentos con backoff exponencial). Esto **no bloquea** el acceso al curso desde Medicamentum360 — el estudiante puede consumir el contenido normalmente aunque el mirror de Moodle esté temporalmente desincronizado.
- Token de autologin expirado (el usuario tardó en hacer clic) → generar nuevo token en el siguiente clic (no es un error que el usuario vea).
- Usuario accede a `/dashboard` justo después del pago, antes de que llegue el webhook → skeleton loader + polling cada 5s durante máximo 30s, luego mensaje "Tu acceso se está activando, recarga en unos minutos".

---

## 7. Acceso a experiencia VR

**Actor:** usuario que compró una experiencia VR.

**Diferencias respecto al flujo de cursos:**
- No hay `moodleCourseId` → no hay inscripción en Moodle post-pago.
- El webhook de Wompi activa una "VR key" (código de redención) asignada al usuario.
- El usuario ve en `/dashboard` → Mis Experiencias VR → botón "Ver instrucciones de acceso" o "Copiar código".
- El código le permite activar la experiencia en Meta Quest u otro dispositivo fuera del navegador.
- El visor 3D (React Three Fiber) en la página de detalle del producto es solo demostrativo — no es el contenido completo.

---

## 8. Carrito guest → merge al hacer login

**Actor:** visitante que agrega productos antes de registrarse o iniciar sesión.

**Happy path:**
1. Visitante agrega productos al carrito → se persisten en `localStorage` con `guestToken` (UUID generado en cliente).
2. Visitante hace clic en "Comprar ahora" → redirige a `/sign-in?redirect_to=/checkout`.
3. Post-login: middleware o page handler detecta que hay ítems en `localStorage`.
4. `mergeGuestCart(guestToken, userId)` → copia ítems del carrito anónimo al carrito del usuario en DB, respetando duplicados y el flag "ya tiene acceso".
5. `localStorage` del carrito se limpia.
6. Usuario llega al checkout con sus productos ya cargados.

**Edge cases:**
- El usuario ya tenía un carrito en DB con ítems distintos → merge de ambos (unión, no reemplazo). Ítems duplicados se consolidan en uno solo.
- El usuario ya tiene acceso a uno de los productos del carrito guest → ese ítem se descarta del merge, con toast informativo.

---

## 9. Generación y descarga de certificado

**Actor:** estudiante que completó un curso.

**Trigger:**
- **Cursos nativos** (default): `Enrollment.status = "completed"` se calcula en tiempo real en Postgres al completar la última lección/quiz obligatorio (ver flujo 14, paso 6). Sin dependencia de Moodle.
- **Cursos `moodle_legacy`**: el progreso se sincroniza desde Moodle vía el cron de sync (`lib/moodle/sync.ts`) → `Enrollment.status = "completed"` → mismo flujo de certificación que los nativos.

Una vez `Enrollment.status = "completed"`, el resto del flujo es idéntico:

**Happy path:**
1. En `/dashboard` → Mis Certificados → aparece el curso completado con botón "Generar certificado".
2. Click → `generateCertificate(enrollmentId)` (Server Action):
   - Verifica que el `Enrollment` existe, `status = "completed"`, y `userId` coincide.
   - Genera PDF (plantilla con nombre, curso, fecha, QR de verificación).
   - Sube a Cloudflare R2 `certificates/` con URL firmada.
   - Crea registro `Certificate` en DB con `pdfUrl` y `issuedAt`.
3. `CertificateModal` se abre: preview del certificado + "Descargar PDF" + "Compartir en LinkedIn".
4. "Descargar PDF" → fetch de la URL firmada + descarga en el navegador.
5. "Compartir en LinkedIn" → genera URL de LinkedIn Certificate con campos pre-rellenados.

**Edge cases:**
- El certificado ya fue generado anteriormente → "Generar" se reemplaza por "Ver certificado" (no se regenera, se recupera el existente).
- Fallo al generar el PDF → mensaje de error + retry. No se crea el `Certificate` en DB si falla el upload a Storage.

---

## 10. Invitar empleados (hospital_admin)

**Actor:** usuario con rol `hospital_admin`.

**Happy path — código de invitación:**
1. `hospital_admin` va a `/org/employees`.
2. La página muestra su `Organization.orgCode` único (generado al crear la organización).
3. Hace clic en "Copiar código" → copia `https://medicamentum360.com/sign-up?org_code=HOSP123XYZ` al portapapeles → toast "¡Enlace copiado!".
4. Comparte el enlace con sus empleados por cualquier canal externo.
5. Empleado se registra con el enlace → flujo 2.

**Happy path — invitación por email:**
1. `hospital_admin` ingresa email del empleado en el campo "Invitar empleado" → "Invitar".
2. `createInvitation(email, orgId)` (Server Action, solo `hospital_admin`/`super_admin`):
   - Crea `OrganizationInvitation` con `expiresAt = now + 7 días`.
   - Envía email (Brevo) al empleado con enlace `?org_code=...`.
3. Invitación aparece en la lista con estado "Pendiente" + fecha de expiración.
4. El admin puede eliminar invitaciones pendientes.

**Edge cases:**
- Email ya pertenece a un usuario de la plataforma → `linkUserToOrganization` directo (sin email de invitación) + aparece en la lista de empleados.
- Email ya pertenece a un empleado de OTRA organización → error "Este usuario ya pertenece a otra organización".
- Invitación duplicada (mismo email, misma organización, ya pendiente) → no crear duplicado, mostrar "Ya existe una invitación pendiente para este correo".

---

## 10.1 Cambiar rol y remover empleado (hospital_admin)

**Actor:** usuario con rol `hospital_admin`, sobre otro empleado de su misma organización.

> Este flujo resuelve un hueco real detectado en auditoría: hasta ahora el panel de empleados solo permitía invitar — no había forma de revocar acceso a alguien que dejó el hospital, lo que dejaba a ex-empleados con acceso indefinido a cursos pagados por la organización.

**Happy path — cambiar rol:**
1. En `/org/employees`, el `hospital_admin` cambia el dropdown de rol de un empleado (`Estudiante` ↔ `Administrador`).
2. `updateEmployeeRole(userId, newRole)` (Server Action): valida que quien ejecuta es `hospital_admin`/`super_admin` de la misma `organizationId` que el empleado objetivo, y que **no** es el propio usuario cambiándose a sí mismo.
3. Si el cambio es de `Administrador` → `Estudiante` y es el único administrador de la organización: la acción se rechaza con mensaje "Debes asignar otro administrador antes de quitarte este rol a ti mismo o a el último administrador" — una organización nunca puede quedar sin nadie que la administre.
4. Cambio aplicado al instante, toast "Rol actualizado".

**Happy path — remover empleado:**
1. `hospital_admin` abre el menú `⋮` de un empleado → "Remover de la organización" → diálogo de confirmación explícito (`UX_UI.md §3.6.1`) detallando qué pierde el empleado.
2. Confirma → `removeEmployeeFromOrganization(userId)` (Server Action):
   - Verifica ownership (misma organización, ejecutor es admin).
   - Pone `User.organizationId = null` (el usuario no se elimina de la plataforma — conserva su cuenta y cualquier compra hecha con su propio dinero).
   - Marca como inactivos/revocados los `EmployeeAssignment` de esa organización asociados a ese usuario (ver `BACKEND.md §19` para el modelo) — esto es lo que efectivamente le quita el acceso a los cursos que la organización le había asignado.
   - Si el empleado tenía sesión activa, su próximo acceso a una ruta de curso de la organización falla la verificación de `EmployeeAssignment` activo → se le redirige con mensaje "Ya no tienes acceso a este curso a través de tu organización."
3. El empleado desaparece de la lista de `/org/employees`; el `hospital_admin` ve toast "Empleado removido".

**Edge cases:**
- Intentar remover al único `hospital_admin` de la organización (incluso si lo intenta otro admin) → mismo bloqueo que el cambio de rol: debe haber siempre al menos un administrador activo.
- El empleado removido había generado certificados con cursos comprados por la organización → los certificados ya emitidos **se mantienen** (son un logro personal del empleado, no se revocan retroactivamente); solo se pierde el acceso a contenido no completado.
- `super_admin` también puede ejecutar este flujo sobre cualquier organización, para casos de soporte donde el `hospital_admin` no puede o no debe hacerlo él mismo (ej. disputa entre el hospital y un ex-empleado).

---

## 10.2 Reportes de progreso de la organización

**Actor:** `hospital_admin` (o `super_admin` viendo cualquier organización desde el panel admin).

**Happy path:**
1. Desde `/org/employees`, enlace "Ver reportes de progreso" → `/org/reports`.
2. `getOrganizationProgressReport(organizationId, courseId?)` (Server Action) trae, para cada `EmployeeAssignment` activo de la organización, el `Enrollment.progressPct` correspondiente.
3. Tabla empleado × curso × progreso (`UX_UI.md §3.6.2`), con resumen agregado (completados / promedio).
4. "Exportar CSV" → genera el archivo en el cliente a partir de los mismos datos ya cargados (no requiere una Server Action nueva ni golpear la base de datos otra vez).

**Edge cases:**
- Organización sin compras (`EmployeeAssignment` vacío) → `EmptyState` con CTA "Explorar marketplace".
- Empleado removido de la organización después de tener progreso → su fila desaparece del reporte en vivo (el reporte refleja el estado actual de membresía, no un histórico); si se necesita el histórico para auditoría, queda fuera del alcance de esta fase — anotar como mejora futura si un hospital lo pide explícitamente.

---

## 11. Creación de producto (super_admin)

**Actor:** usuario con rol `super_admin`.

**Happy path:**
1. `super_admin` va a `/admin/products` → "Nuevo producto".
2. Llena información general: título, descripción. El slug se genera automáticamente y puede editarlo.
3. Sube imagen de portada: drag & drop o click → preview + crop inline → upload a Cloudflare R2.
4. Selecciona tipo: Curso / VR / Automatización.
5. Configura metadatos del tipo (sección condicional — ver flujo 12 para Moodle).
6. Configura precio + cupo en la columna derecha.
7. "Guardar borrador" → `createProduct(data, published: false)` → persiste en DB, NO indexa en Meilisearch.
8. Revisa el resultado → "Publicar producto" → `publishProduct(id)` → `published: true` + indexa en Meilisearch + invalida caché ISR del marketplace.
9. El producto aparece en el marketplace.

**Edge cases:**
- Upload de imagen falla → mensaje de error inline en el dropzone, el formulario no bloquea.
- Slug ya existe → error inline "Esta URL ya está en uso. Elige otro slug."
- Publicar sin imagen de portada → advertencia (no bloqueante): "Este producto no tiene imagen de portada. ¿Continuar?"
- **Publicar curso `contentSource: moodle_legacy` sin `moodleCourseId`** → advertencia bloqueante: "Este curso no está vinculado a Moodle. Los usuarios no podrán acceder al contenido. ¿Seguro que quieres publicar?" Con opción de cancelar y vincular primero. **Esta validación no aplica a cursos `contentSource: native`** (el default desde la Fase 6.5) — esos se validan contra las reglas de contenido propio del Course Builder (módulo sin lecciones, video no listo, quiz sin respuesta correcta), ver `FLUJOS.md §13`. Al crear un curso nuevo desde `/admin/products`, el sistema debe decidir automáticamente `contentSource: native` salvo que el admin elija explícitamente "Vincular con Moodle" (flujo 12) — nunca dejar la elección ambigua ni mostrar ambos bloques de validación a la vez.

---

## 12. Vinculación con Moodle desde el panel admin (legacy)

**Actor:** `super_admin` creando o editando un curso.

> **Nota v2.0:** este flujo queda vigente solo para cursos `contentSource: moodle_legacy` — casos donde se decide a propósito que el contenido siga viviendo en la interfaz nativa de Moodle (por ejemplo, reporting corporativo de un hospital que ya integra con Moodle). **Para crear un curso nuevo, el flujo principal es el §13 (Course Builder)**, que no requiere ninguno de los pasos siguientes.

**Opción A — Vincular a curso existente:**
1. En la sección "Vinculación con Moodle" → selecciona "Vincular a curso existente".
2. Escribe el nombre del curso en el buscador → `searchMoodleCourses(query)` (Server Action proxy a Moodle API).
3. Dropdown muestra resultados con ID + nombre. Selecciona el correcto.
4. Campo "moodleCourseId" queda con el valor seleccionado.
5. Al guardar, el `Product.moodleCourseId` se persiste. En la tabla de admin aparece "✓ ID: [N]".

**Opción B — Crear nuevo curso en Moodle:**
1. Selecciona "Crear nuevo curso en Moodle desde aquí".
2. Llena nombre del curso + selecciona categoría Moodle (dropdown cargado desde `getMoodleCategories()`).
3. Clic en "Crear curso y vincular automáticamente".
4. `createMoodleCourse(data)` (Server Action) → llama a `core_course_create_courses` en Moodle API → devuelve `courseId`.
5. `moodleCourseId` se persiste automáticamente en el formulario.
6. Toast: "Curso creado en Moodle con ID [N]. Recuerda añadir el contenido en [lms.medicamentum360.com →]".
7. Enlace al curso en Moodle para que el admin vaya a configurar los módulos.

**Opción C — Vincular después:**
1. Selecciona "Vincular después".
2. El producto se guarda con `moodleCourseId = null`.
3. En la tabla de admin: "⚠ Pendiente".
4. El admin puede editar el producto más tarde y completar la vinculación.

**Edge cases (Opción A y B):**
- Moodle no responde (timeout) → mensaje de error "No se pudo conectar con Moodle. Verifica la configuración o inténtalo más tarde." El formulario no bloquea — el admin puede guardar el producto con la opción C.
- `MOODLE_WS_TOKEN` inválido o sin permisos → error 403 desde Moodle → mensaje "Error de autenticación con Moodle. Contacta al equipo técnico."
- Curso de Moodle ya vinculado a otro producto → advertencia "Este curso de Moodle ya está vinculado al producto [Nombre]. ¿Quieres vincularlo también aquí?" (se permite, pero se avisa).

---

## 13. Creación de curso completo en el Course Builder

**Actor:** `super_admin` o `Vendor.status: active`.

**Happy path:**
1. Desde `/instructor` (o `/admin/products` para `super_admin`), clic en "Nuevo curso" → completa los datos básicos del `Product` (título, descripción, categoría = Curso, precio, cupo) igual que el flujo 11.
2. Al guardar, se crea automáticamente un `Course` vacío (`contentSource: native`) vinculado al `Product` → redirige directo al editor (`/instructor/courses/[id]`).
3. Crea el primer módulo → "Módulo 1: Introducción" (título editable inline).
4. Dentro del módulo, agrega lecciones una por una, eligiendo el tipo: Video / Texto / Quiz / Recurso.
   - **Video:** arrastra el archivo → sube directo a Cloudflare Stream (flujo 15) → estado "Procesando..." → "Listo" cuando Cloudflare confirma.
   - **Texto:** escribe directamente en el editor enriquecido.
   - **Quiz:** agrega preguntas y opciones, marca la(s) correcta(s), opcionalmente añade explicación.
   - **Recurso:** sube un PDF/slide descargable.
5. Reordena módulos/lecciones con drag & drop según necesite — el orden se persiste automáticamente.
6. Marca 1-2 lecciones introductorias como "Vista previa" (`isPreview: true`) para que el marketplace las muestre gratis.
7. Opcionalmente configura drip: "Módulo 2 se desbloquea a los 7 días de inscripción".
8. Configura `passingScorePct` (default 70%) y si el curso emite certificado al completarse.
9. Vista previa en vivo (columna derecha) durante todo el proceso — verifica que se vea bien antes de enviar a revisión/publicar.
10. **Si es `super_admin`:** botón "Publicar" → mismas validaciones del flujo 11 (slug, portada) + nuevas validaciones de contenido (ver edge cases) → `published: true` directo.
11. **Si es `vendor`:** botón "Enviar para revisión" → `reviewStatus: pending_review` → entra a la bandeja de `/admin/review-queue` (flujo 16, paso de aprobación).

**Edge cases:**
- Intentar publicar/enviar a revisión con un módulo sin lecciones → advertencia bloqueante "El módulo '[nombre]' no tiene lecciones. Elimínalo o agrega contenido."
- Intentar publicar con una lección de video que sigue en estado "Procesando" o "Error" → advertencia bloqueante "La lección '[nombre]' no tiene un video listo para reproducir."
- Intentar publicar un quiz sin preguntas, o con una pregunta sin ninguna opción marcada como correcta → advertencia bloqueante con el nombre exacto de la lección afectada (no un error genérico).
- El instructor cierra el navegador a mitad de edición → el autosave de campos de texto (debounce 2s) y el guardado inmediato de cambios estructurales garantizan que no se pierda trabajo más allá de los últimos 2 segundos de tecleo.
- Dos pestañas del mismo instructor editando el mismo curso a la vez → último guardado gana (mismo patrón de "last-write-wins" ya aceptado en el resto del sistema); no se implementa lock optimista en esta fase — si se vuelve un problema real, se revisita.

> **Regla de arquitectura:** el Course Builder es el **único** lugar donde se crea y edita contenido de cursos. Moodle recibe un shell mirror del curso (vía `createMoodleCourse` en `vendor-products.ts`) y mirrors de inscripción (`enrol_manual_enrol_users`), pero el contenido **nunca** se edita desde Moodle. La dirección es Postgres → Moodle, no bidireccional.

---

## 14. Consumo de un curso por el estudiante (lecciones, drip, quizzes)

**Actor:** estudiante con `Enrollment` activo en un curso `contentSource: native`.

> **Arquitectura híbrida:** el estudiante **siempre** consume el contenido desde el reproductor propio de Medicamentum360 (`/dashboard/cursos/[slug]/[leccionId]`), no desde Moodle. El shell de Moodle existe para compatibilidad SSO/institucional pero no es la ruta primaria de consumo. El progreso se calcula en tiempo real desde `LessonCompletion` en Postgres.

**Happy path:**
1. Desde `/dashboard` → Mis Cursos → clic en el curso → entra directo a la primera lección no completada (o la primera del curso si no ha empezado).
2. Ve el video (o lee el texto, o descarga el recurso) en el reproductor de lección (`UX_UI.md §3.10`).
3. Al llegar al 90% del video, o al hacer clic explícito en "Marcar como completada", se registra `LessonCompletion` → `Enrollment.progressPct` se recalcula al instante.
4. "Siguiente" avanza a la lección siguiente en el orden del curso. Si la siguiente está en un módulo bloqueado por drip, muestra "Esta lección se desbloquea el [fecha]" en vez de un enlace roto.
5. Al llegar a una lección tipo quiz: responde las preguntas, envía → `QuizAttempt` se crea con `scorePct` calculado server-side (nunca confiar en un cálculo hecho en el cliente, para evitar manipulación) → ve el resultado con revisión pregunta por pregunta.
6. Al completar el 100% de las lecciones del curso (y aprobar todos los quizzes obligatorios, si los hay) → `Enrollment.status = "completed"` → dispara la misma lógica de certificado del flujo 9, sin esperar ningún cron de sincronización con Moodle.

**Edge cases:**
- Estudiante intenta saltarse directamente a una lección posterior sin completar las anteriores → permitido (no se fuerza linealidad estricta, mismo criterio flexible que la mayoría de plataformas de e-learning), salvo que esté bloqueada por drip.
- Quiz con `maxAttempts` agotado y no aprobado → ver `UX_UI.md §3.10.1`, mensaje claro con sugerencia de contactar soporte.
- Video que falla al cargar (problema de red del estudiante, no de Cloudflare) → mensaje de error con botón "Reintentar", nunca una pantalla en blanco.
- El token de reproducción firmado expira mientras el estudiante mira el video (sesión muy larga) → el reproductor detecta el error 403 del manifiesto y pide automáticamente un token nuevo sin interrumpir la reproducción visible (se renueva en segundo plano antes de que el actual expire, con margen de algunos minutos).

---

## 15. Subida y reemplazo de video de lección

**Actor:** `super_admin` o `vendor` editando una lección de tipo Video.

**Happy path:**
1. En el editor de lección (`UX_UI.md §3.11`), arrastra el archivo de video al dropzone.
2. El cliente llama a `getVideoUploadUrl(lessonId, duración_estimada)` (Server Action) → recibe una URL de subida directa de Cloudflare Stream.
3. El navegador sube el archivo **directo a Cloudflare**, sin pasar por el servidor de Medicamentum360 — barra de progreso real basada en el evento `progress` del `XMLHttpRequest`/`fetch` de la subida.
4. Al terminar la subida, la lección muestra "Procesando video..." (Cloudflare transcodifica a HLS adaptativo en segundo plano).
5. Cloudflare llama al webhook `POST /api/webhooks/cloudflare-stream` cuando termina → la lección pasa a "Listo" con miniatura y duración visibles.
6. El instructor puede previsualizar el video reproduciéndolo directamente en la columna de vista previa, exactamente como lo vería un estudiante.

**Edge cases:**
- El instructor sube un video y luego sube otro para reemplazarlo antes de que el primero termine de procesar → se cancela el seguimiento del primero, se borra de Cloudflare (`deleteStreamVideo`) para no acumular costo de storage huérfano, y se sigue el progreso del nuevo.
- El video falla en el procesamiento de Cloudflare (archivo corrupto, formato no soportado) → el webhook recibe `status.state: "error"` → la lección muestra "Error al procesar este video. Intenta subir un archivo distinto (formatos soportados: MP4, MOV)" + se notifica por email si el instructor ya cerró la pestaña.
- Conexión a internet se corta a mitad de la subida → el cliente detecta el fallo de la petición de subida (no del webhook) y permite reintentar sin tener que volver a pedir una nueva `uploadURL` si todavía no expiró (Cloudflare mantiene la URL de direct upload válida durante una ventana de tiempo razonable).
- Video muy largo (ej. 3+ horas, fuera de lo esperado para una lección) → `maxDurationSeconds` configurado en la creación de la URL de subida rechaza el archivo con un mensaje claro de límite — el límite por defecto se documenta en `BACKEND.md §16` y puede ajustarse según el caso de uso real del catálogo.

---

## 16. Onboarding de vendor y revisión editorial

**Actor:** instructor médico independiente o estudio de VR que quiere vender en el marketplace.

**Happy path:**
1. Usuario autenticado va a `/vender` → completa Paso 1 (nombre público, bio, tipo de contenido) → `registerAsVendor()` crea `Vendor` con `status: pending_kyc`.
2. Paso 2: sube certificado bancario, completa datos fiscales y de cuenta → `submitVendorKyc()` cifra los datos bancarios (`BACKEND.md §18.1`) y pasa `Vendor.status` a `pending_review`.
3. El equipo de Medicamentum360 recibe notificación (Brevo) de un vendor nuevo pendiente de revisión.
4. `super_admin` revisa los datos del vendor (identidad, coherencia de la documentación) en un panel simple de aprobación de vendors (extensión natural de `/admin/review-queue`) → `approveVendor()` → `Vendor.status: active`.
5. El vendor recibe email de bienvenida con enlace a `/instructor` → crea su primer producto (curso o experiencia VR) siguiendo el flujo 13 (cursos) o el flujo de creación de producto VR equivalente (mismo formulario de `/admin/products` pero scoped a su `vendorId`).
6. Al terminar de construir su producto, en vez de "Publicar" usa "Enviar para revisión" → `reviewStatus: pending_review`.
7. `super_admin` revisa el producto completo en `/admin/review-queue` (vista previa real, no solo metadatos) → "Aprobar" → `reviewStatus: approved` + el vendor puede ahora decidir publicarlo (`published: true`) cuando quiera, sin pasar por revisión otra vez salvo que edite contenido sustancial después.

**Edge cases:**
- KYC rechazado (documentación inconsistente, datos bancarios no verificables) → `Vendor.status` puede pasar a `suspended` con un motivo de texto libre enviado por email; el usuario puede volver a `/vender` y reenviar datos corregidos, lo que lo regresa a `pending_review`.
- Vendor pendiente de revisión intenta crear un producto antes de ser aprobado → se le permite *crear y editar en borrador* (para no bloquear su trabajo), pero el botón "Enviar para revisión" está deshabilitado con el mensaje "Tu perfil de creador debe ser aprobado primero" hasta que `Vendor.status: active`.
- Producto rechazado en revisión editorial → `reviewStatus: rejected` + motivo obligatorio enviado al vendor por email → el vendor edita y puede reenviar (`pending_review` de nuevo).
- Un mismo usuario con `role: hospital_admin` también se registra como `Vendor` → ambos roles son independientes y coexisten sin conflicto (el `Vendor` no hereda permisos de `hospital_admin` ni viceversa) — se documenta explícitamente porque es un caso real esperado (ej. un hospital que además quiere vender formación propia a otros hospitales).

---

## 17. Venta de un producto de vendor — comisión y payout

**Actor:** estudiante comprando un producto de un `vendor`; `super_admin` aprobando el pago al vendor.

**Happy path:**
1. Estudiante compra un producto con `vendorId` no nulo — el flujo de checkout es **idéntico** al flujo 5 (mismo Wompi, mismo webhook, mismo `Order`); el estudiante no percibe ninguna diferencia entre comprar un producto propio de Medicamentum360 o de un vendor externo.
2. A fin de mes (o el periodo configurado), un cron job ejecuta `generateMonthlyPayoutBatch()` → crea un `Payout` por cada vendor con ventas en el periodo, calculando bruto/comisión/neto.
3. `super_admin` revisa el lote en `/admin/payouts` (`UX_UI.md §3.14`) — verifica los montos, puede marcar un payout específico en disputa como `failed` con motivo si hay un reclamo pendiente (ej. una orden reembolsada que no debería contar).
4. `super_admin` aprueba el lote → `approveAndSendPayout()` por cada `Payout` aprobado → desencripta los datos bancarios del vendor, llama a la API de transferencias de Wompi (`WOMPI_VENDOR_PAYOUT_KEY`) → `Payout.status: processing` → `paid` al confirmar la transferencia.
5. El vendor ve el historial de sus payouts (solo lectura) en su propio panel (`/instructor/payouts` o sección de `/vender`), con el desglose bruto/comisión/neto de cada periodo — transparencia total, sin necesidad de pedirlo por soporte.

**Edge cases:**
- Una orden del periodo es reembolsada (ej. cliente pide devolución) después de generado el `Payout` pero antes de pagarlo → `super_admin` debe poder ajustar manualmente el lote antes de aprobar (restar esa orden del bruto) — el sistema no recalcula automáticamente para evitar sorpresas; se documenta como ajuste manual explícito en esta fase.
- La transferencia bancaria vía Wompi falla (cuenta inválida, banco rechaza) → `Payout.status: failed` con el motivo devuelto por Wompi, nunca se reintenta automáticamente; el vendor es notificado para corregir sus datos bancarios.
- Vendor con ventas pero `Vendor.status: suspended` a mitad de periodo → sus ventas previas a la suspensión sí generan payout (no se penaliza retroactivamente); las ventas de productos suyos después de la suspensión no deberían poder ocurrir porque sus productos se despublican al suspenderlo (ver flujo 18).

---

## 18. Suspensión o baja de un vendor

**Actor:** `super_admin`.

**Happy path:**
1. Por incumplimiento (contenido de baja calidad reportado, fraude, solicitud propia del vendor) → `super_admin` cambia `Vendor.status` a `suspended` desde un panel de gestión de vendors.
2. Todos los productos de ese vendor (`Product.vendorId = vendor.id`) se despublican automáticamente (`published: false`) y se retiran de la indexación de Meilisearch — no se eliminan, para no perder el historial de quienes ya compraron.
3. Los estudiantes que ya tenían `Enrollment` activo en cursos de ese vendor **mantienen su acceso** — la suspensión afecta nuevas ventas, no el acceso ya pagado (principio básico de protección al consumidor, y evita disputas de reembolso masivas).
4. Cualquier `Payout` pendiente de periodos anteriores a la suspensión se procesa normalmente.

**Edge cases:**
- El vendor pide reactivación tras una suspensión → vuelve a `pending_review`, requiere aprobación explícita de `super_admin` (no se reactiva automáticamente, ni siquiera si la suspensión fue a petición propia del vendor).
- Vendor suspendido por fraude de pago (no por calidad de contenido) → además de la suspensión, se documenta como caso para revisar manualmente si corresponde retener algún `Payout` pendiente — fuera del alcance de automatizar en esta fase, requiere intervención humana caso por caso.

---

## 19. Reembolso o cancelación de una orden — NUEVO

> Hueco crítico detectado en auditoría: `UX_UI.md §3.4` y `§3.9` muestran "política de reembolso visible" y "garantía/reembolso" en el detalle de producto y checkout, pero hasta ahora no existía ningún flujo, Server Action ni pantalla que ejecutara un reembolso real. Mostrar una promesa en la UI sin tener cómo cumplirla es peor que no mostrarla.

**Actor:** estudiante solicitando reembolso; `super_admin` procesándolo.

**Política de negocio asumida (a confirmar con el equipo, no soy quien decide esto):** ventana de reembolso de 7 días desde la compra, **solo si el progreso del curso es menor al 20%** — mismo criterio que usan la mayoría de plataformas de e-learning (Udemy, Platzi) para evitar abuso de "completar el curso y luego pedir el dinero de vuelta". Si el equipo de negocio decide otra política, este es el único lugar donde hay que ajustarla.

**Happy path:**
1. Estudiante en `/orders` (historial de compras) ve un botón "Solicitar reembolso" junto a una orden elegible (dentro de la ventana de 7 días y bajo el 20% de progreso).
2. Clic → modal con motivo (dropdown: "No es lo que esperaba" / "Problema técnico" / "Compra duplicada o por error" / "Otro" + campo de texto libre) → "Enviar solicitud".
3. `requestRefund(orderId, reason)` (Server Action):
   - Verifica elegibilidad (ventana de tiempo + progreso) server-side — nunca confiar en que el botón solo aparece cuando es elegible, igual criterio de "nunca confiar en el cliente" ya usado para el cálculo de quizzes (`FLUJOS.md §14`).
   - Crea `RefundRequest` con `status: pending`, vinculado a la `Order`.
   - Notifica (Brevo) al equipo de soporte/`super_admin`.
4. Estudiante ve su solicitud en `/orders` con estado "Reembolso solicitado — en revisión".
5. `super_admin` revisa la solicitud en `/admin/refunds` (bandeja simple, mismo patrón visual que `/admin/review-queue`) → "Aprobar" o "Rechazar" con motivo.
6. **Si aprueba:** `processRefund(refundRequestId)` llama a la API de reembolsos de Wompi (Wompi sí soporta reversar una transacción aprobada, a diferencia de los payouts a vendors que son transferencias nuevas) → `Order.status: refunded` → se revoca el `Enrollment`/`EmployeeAssignment` asociado (mismo mecanismo que remover un empleado, `BACKEND.md §7`) → email de confirmación al estudiante.
7. **Si rechaza:** `RefundRequest.status: rejected` con motivo → email al estudiante explicando por qué, con la opción de contactar soporte si no está de acuerdo (ver flujo 20).

**Edge cases:**
- Orden de un producto comprado por una organización (`Order.organizationId` no nulo, ver `FLUJOS.md §5.1`) → el reembolso solo puede solicitarlo el `hospital_admin`, no un empleado individual con un cupo asignado — es la organización quien pagó y quien tiene el derecho de pedir el dinero de vuelta. El estudiante individual con un cupo asignado no ve el botón de reembolso en absoluto para ese tipo de orden.
- Reembolso parcial de una compra en lote (ej. el hospital compró 10 cupos, solo asignó 3, quiere reembolso de los 7 sin usar) → **no soportado en esta fase** — el reembolso es de la orden completa o nada. Si el negocio necesita reembolsos parciales por cupo, es una mejora a evaluar después, no algo que deba improvisarse en el primer ciclo de este feature.
- Progreso por encima del 20% pero el estudiante alega un problema técnico real (ej. el video nunca cargó) → el dropdown de motivo "Problema técnico" no se autoaprueba — siempre pasa por revisión humana de `super_admin`, que puede aprobar fuera de la política estándar si el reclamo es legítimo (criterio humano, no automatizado, para casos límite).
- Producto VR comprado (sin progreso medible de la misma forma que un curso) → la elegibilidad se basa solo en la ventana de tiempo (7 días), sin el criterio de progreso — el "20% completado" no aplica a una experiencia VR redimida con un código de un solo uso. Si el código VR ya fue redimido, el reembolso pasa automáticamente a revisión manual obligatoria (no autoaprobable), porque la experiencia pudo haberse "consumido" igual sin que el sistema lo mida.
- Doble solicitud de reembolso sobre la misma orden → bloqueado mientras haya una `RefundRequest` con `status: pending` o `approved` para esa orden.

---

## 20. Soporte y disputas del estudiante — NUEVO

> Hueco detectado en auditoría: varios edge cases del propio documento dicen "contacta a soporte" (ej. quiz sin intentos restantes, `FLUJOS.md §14`) sin que exista ningún canal de soporte real definido. Se documenta aquí el canal mínimo viable — no un sistema de tickets completo, que sería sobre-construir para el tamaño actual del producto.

**Decisión de alcance (a validar con el equipo):** en esta fase, "soporte" significa un formulario de contacto simple que crea un registro y dispara un email — no un sistema de tickets con estados, SLA, ni chat en vivo. Si el volumen de soporte crece, esto se revisita como una fase propia (candidato natural para `PLAN.md` Fase 9 — Operaciones).

**Happy path:**
1. Cualquier usuario autenticado tiene acceso a `/soporte` (enlace en el footer y en el menú de `[Avatar ▾]`).
2. Formulario simple: categoría (dropdown: "Problema con un pago" / "Problema técnico con un curso" / "Pregunta sobre certificado" / "Otro"), asunto, descripción, y — si la categoría es "Problema con un pago" o "Problema técnico con un curso" — un selector opcional de cuál orden/curso, para que el equipo de soporte tenga contexto sin que el usuario tenga que explicarlo desde cero.
3. `createSupportTicket(data)` (Server Action): crea `SupportTicket` con `status: open`, envía email (Brevo) al equipo de soporte con todo el contexto (incluyendo `userId`, `organizationId` si aplica, y el detalle de la orden/curso si se seleccionó).
4. Usuario ve confirmación: "Recibimos tu mensaje. Te respondemos a [su email] en menos de 48 horas." — mismo SLA conservador que el de aprobación de vendors (`FLUJOS.md §16`), por consistencia de expectativas en toda la plataforma.
5. El equipo responde **por email directamente** (no hay bandeja in-app de respuestas en esta fase) — el `SupportTicket` en DB existe principalmente para que `super_admin` tenga visibilidad agregada de cuántos tickets hay y de qué tipo, no para gestionar la conversación completa dentro de la plataforma.

**Edge cases:**
- Usuario no autenticado con un problema (ej. no puede completar el registro) → `/soporte` es accesible sin sesión, pero pide email manualmente en vez de tomarlo de la sesión.
- Mismo usuario crea muchos tickets en poco tiempo (spam o frustración genuina) → mismo rate limiting ya usado para otras Server Actions públicas (`lib/rate-limit.ts`), sin bloquear por completo — un usuario genuinamente frustrado con varios problemas reales no debe quedar sin poder escribir.
- Ticket de categoría "Problema con un pago" → además del email al equipo de soporte, se incluye automáticamente un enlace directo a la orden en el panel admin, para que quien responda no tenga que buscarla manualmente.



