# FLUJOS — Medicamentum360
**Flujos de usuario — happy path, variantes y edge cases**
Versión: 1.0 · Fecha: 2026-06-22

> **Relación con otros documentos:** este documento describe los flujos de usuario de extremo a extremo. La especificación visual de cada pantalla está en `UX_UI.md`. La implementación técnica (Server Actions, Route Handlers, webhooks) está en `BACKEND.md`. La arquitectura de datos está en `TRD.md`.

---

## Índice

1. Registro de usuario
2. Registro con invitación de organización
3. Login
4. Recuperación de contraseña
5. Compra de producto (curso o VR)
6. Post-pago → acceso a curso en Moodle
7. Acceso a experiencia VR
8. Carrito — guest merge al hacer login
9. Generación y descarga de certificado
10. Invitar empleados (hospital_admin)
11. Creación de producto por super_admin
12. Vinculación con Moodle desde el panel admin

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

## 6. Post-pago → acceso a curso en Moodle

**Actor:** usuario que acaba de comprar un curso.

**Happy path:**
1. Webhook de Wompi confirma pago → `enrol_manual_enrol_users` inscribe al usuario en Moodle.
2. `Enrollment` creado en DB: `progressPct: 0`, `status: "not_started"`.
3. Usuario en `/dashboard` → Mis Cursos → ve el nuevo curso con barra de progreso en 0%.
4. "Empezar curso" → `POST /api/moodle/autologin` → genera autologin token de un solo uso.
5. Redirect a `lms.medicamentum360.com/login/token.php?token=...&wantsurl=/course/view.php?id=42`.
6. Moodle valida token → sesión iniciada → usuario ve el curso directamente.

**Edge cases:**
- Inscripción en Moodle falla después del pago exitoso → registrar error en log. Job de reintento automático (3 intentos con backoff exponencial). El usuario puede ver su compra en historial pero el curso aparece como "En proceso de activación" con tooltip explicativo.
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

**Trigger:** Moodle reporta `progressPct = 100` vía sync (cron o webhook) → `Enrollment.status = "completed"`.

**Happy path:**
1. En `/dashboard` → Mis Certificados → aparece el curso completado con botón "Generar certificado".
2. Click → `generateCertificate(enrollmentId)` (Server Action):
   - Verifica que el `Enrollment` existe, `status = "completed"`, y `userId` coincide.
   - Genera PDF (plantilla con nombre, curso, fecha, QR de verificación).
   - Sube a InsForge Storage `certificates/` con URL firmada.
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

## 11. Creación de producto (super_admin)

**Actor:** usuario con rol `super_admin`.

**Happy path:**
1. `super_admin` va a `/admin/products` → "Nuevo producto".
2. Llena información general: título, descripción. El slug se genera automáticamente y puede editarlo.
3. Sube imagen de portada: drag & drop o click → preview + crop inline → upload a InsForge Storage.
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
- Publicar curso sin `moodleCourseId` → advertencia bloqueante: "Este curso no está vinculado a Moodle. Los usuarios no podrán acceder al contenido. ¿Seguro que quieres publicar?" Con opción de cancelar y vincular primero.

---

## 12. Vinculación con Moodle desde el panel admin

**Actor:** `super_admin` creando o editando un curso.

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

