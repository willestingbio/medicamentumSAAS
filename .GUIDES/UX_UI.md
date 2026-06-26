# UI/UX — Medicamentum360
**Especificación de interfaz y experiencia de usuario**
Versión: 2.0 · Fecha: 2026-06-24 · Añade Course Builder y Marketplace Multi-Vendor

> **Cambio v2.0:** se añaden las pantallas del Course Builder (§3.10-3.12), el onboarding y panel de vendor (§3.13), y la bandeja de revisión + payouts de `super_admin` (§3.14). Todas siguen el mismo sistema de diseño descrito en §1 — ningún componente nuevo introduce un patrón visual, de color o de interacción distinto al ya establecido.

---

## 1. Sistema de diseño

> **Fuente de implementación:** la barra de navegación, el toggle de dark/light, el banner de cookies y los tokens de color de este documento están especificados a nivel de comportamiento/wireframe aquí; el **código real adaptado a Next.js + Tailwind + ShadCN**, extraído y verificado directamente del repositorio [wasp-lang/open-saas](https://github.com/wasp-lang/open-saas), vive en `FRONTEND_PATTERNS.md`. Empieza por ahí antes de implementar el NavBar o el selector de tema desde cero.

| Token | Valor / regla |
|---|---|
| Color primario (marca) | `#8127cf` → `hsl(272 68% 48%)` (ver `FRONTEND_PATTERNS.md §1` para el set completo de variables CSS) |
| Modo | Claro / Oscuro, toggle persistido en `localStorage`, sincronizado con `/configuracion` |
| Tipografía | Sans-serif moderna, jerarquía clara (display / heading / body / caption) |
| Iconografía | Material Design icons (consistente con `dark_mode`/`light_brightness_5` ya definidos) |
| Transiciones globales | Propiedades específicas: `transition-transform`, `transition-[padding]`, `transition-colors` — nunca `transition-all`. Duraciones 160-300ms. |
| Bordes | Redondeados consistentes (radius medio-alto, look "OpenSaaS") |
| Sombra | Suave, usada en barra contraída y popovers (no sombras duras) |

> Backlog de diseño: paleta derivada completa (tonos sobre `#8127cf` para estados hover/active/disabled), escala tipográfica y espaciado deben quedar fijados en `DESIGN.md` si aún no están — este documento asume que `DESIGN.md` es la fuente de verdad visual y este archivo es la capa de comportamiento/interacción.

## 2. Patrones de interacción globales

- **Barra de navegación con scroll-aware behavior:**
  - Landing: full-width → píldora centrada con blur al hacer scroll.
  - Marketplace: además, se oculta al bajar y reaparece al subir (slideUp/slideDown).
  - Siempre `position: sticky`, `z-index` alto.
- **Hover estilo Apple:** underline animado desde el centro, o shift sutil de color — nunca saltos bruscos.
- **Scroll reveal:** fade-in + slide-up para secciones de contenido (Nosotros, tarjetas).
- **Carga:** skeleton screens en listas (marketplace, dashboard), nunca spinners genéricos.
- **Popover vs modal vs página:** el carrito es **popover** (no modal, no página); el registro/login son **páginas** (no modal); la vista previa de certificado es **modal**.

## 3. Especificación por pantalla

### 3.1 Barra de navegación

**Visitante (fuera de marketplace):**
```
[Logo]   Nosotros  Ejemplos  Blog  Productos        [🌙/☀️] [Entrar]
```
**Visitante (en `/productos`):**
```
[Logo]   Nosotros  Ejemplos  Blog  Productos   [🔍 buscar...]   [🌙/☀️] [Entrar]
```
**Autenticado, fuera de marketplace:**
```
[Logo]   Mi Aprendizaje   Marketplace        [🛒3] [⚙️] [Avatar ▾]
```
**Autenticado, en `/productos`:**
```
[Logo]   Mi Aprendizaje   Marketplace   [🔍 buscar...]   [🛒3] [⚙️] [Avatar ▾]
```
**Autenticado con perfil de vendor activo (`Vendor.status: active`):**
```
[Logo]   Mi Aprendizaje   Marketplace   Mi Panel de Creador        [🛒3] [⚙️] [Avatar ▾]
```
"Mi Panel de Creador" lleva a `/instructor` (§3.11). Si el usuario tiene `Vendor.status` distinto de `active` (`pending_kyc`/`pending_review`), el item del menú se llama "Completar mi perfil de creador" y lleva directo al paso pendiente del onboarding (§3.13) — nunca lo oculta, porque dejar el flujo a medias sin recordatorio es la causa más común de abandono en onboarding de creadores (patrón confirmado en plataformas como Kajabi/Teachable, que siempre muestran el estado de configuración pendiente).

- **Search bar:** solo visible en `/productos`. 180px default, expande a full-width al hover/focus via CSS `group-focus-within` (sin JS adicional). Transición 300ms ease-out. El valor se sincroniza con `?search=` query param.
- **Entrar button:** siempre visible cuando no hay sesión (sin skeleton/parpadeo). `memo()` en NavBar para evitar re-renders innecesarios.
- **Transiciones:** propiedades específicas (`transform`, `padding`) — no `transition-all`.
- **Logo:** scroll suave al tope con `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- Estados: default, scrolled (píldora), hidden (al bajar en marketplace), mobile (hamburguesa + Sheet).
- Mobile menu: CSS transitions (no keyframes) — interruptibles, retargets al cerrar.

### 3.2 Landing

Orden de secciones: Hero → Nosotros → Ejemplos → Blog (carrusel) → Footer.

**Transiciones entre rutas:**
- `PageTransition` envuelve `<main>` en `layout.tsx`. Exit 150ms + enter 250ms (`opacity` + `translateY(4px)`). Easing: `cubic-bezier(0.23, 1, 0.32, 1)`.

**Animaciones GSAP ScrollTrigger (landing):**
- **Hero:** parallax — contenido se desplaza `y: -30` y opaca a 0.7 al hacer scroll (scrub: 1s).
- **Nosotros:** iconos hacen `scale 0→1` + `rotation -10→0` con `back.out(1.5)`, stagger 80ms. Se activa cuando el 88% del icono entra en viewport.
- **Ejemplos:** título fade+slide-up, cards fan-out con `y: 50→0`, `scale: 0.96→1`, stagger 100ms. Trigger: top 80% de la sección.
- **Blog:** título fade+slide-up, cards slide-in con `y: 40→0`, `scale: 0.97→1`, stagger 80ms. Trigger: top 80%.
- Todos los triggers son `once: true` (se animan solo la primera vez).

**Reveal CSS (fallback):**
- `ScrollReveal` component: IntersectionObserver con `rootMargin: -80px`. Aplica `animate-reveal-up` (350ms). Se usa para secciones que no necesitan animación GSAP.
- Footer: legal, redes, contacto, selector ES/EN, banner de cookies (capa superpuesta, no parte del footer en sí).

### 3.3 Marketplace

```
[Barra con buscador]                          ← solo en /productos, en NavBar
[Tabs: Todos | VR | Cursos | Automatizaciones] [Precio ▾ custom dropdown]
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ chip    │ │ chip    │ │ chip    │ │ chip    │
│ título  │ │ título  │ │ título  │ │ título  │
│ por: Vendor X · ★★★★☆ 24                    │  ← solo si vendorId != null
│ $precio │ │ $precio │ │ ...     │ │ ...     │
│[+carrito hover]                            │
└────────┘ └────────┘ └────────┘ └────────┘
[Skeleton cards...]                           ← infinite scroll
```

- **Filtros:** tabs de categoría (Todos/VR/Cursos/Automatizaciones) — select nativo en móvil.
- **Sort:** custom dropdown (no select nativo) — opciones: "Más recientes", "Precio bajo", "Precio alto", "Descuento".
- **Infinite scroll:** IntersectionObserver con `rootMargin: 200px`, 8 productos por página. Skeleton loading al final.
- **Búsqueda:** se sincroniza con `?search=` del NavBar. Meilisearch si está disponible, fallback a DB.
- **Skeleton de tarjeta** mientras carga (mismo layout, bloques grises animados).
- **Estado "sin resultados":** ilustración + texto + sugerencias de categorías alternativas.
- **Data:** productos reales de Prisma (seed script con 9 productos de ejemplo).
- **Atribución de vendor (nuevo):** si `Product.vendorId != null`, la tarjeta muestra `"por: {Vendor.displayName}"` en texto pequeño (`text-muted-foreground`) bajo el título, igual de discreto que el rating — no compite visualmente con el nombre del producto. Clic en el nombre del vendor lleva a `/marketplace/creador/[vendorSlug]`, una página simple con su bio y el resto de su catálogo (mismo grid de tarjetas que el marketplace general, filtrado por `vendorId`).

### 3.4 Detalle de producto

```
┌─────────────────────────────┬───────────────────┐
│  Breadcrumb                  │  Nombre            │
│  [Carrusel / Video / 3D R3F] │  por: Vendor X      │  ← solo si aplica
│  Descripción                 │  $precio (+IVA)    │
│  Temario (módulos colapsables)│  ★★★★☆ (24)        │
│   ▸ Módulo 1 (3 lecciones)    │  Cantidad [- 1 +]  │
│     ▸ Lección 1.1 ▶ Vista previa│ [Comprar ahora]  │
│     · Lección 1.2 🔒          │  [Agregar carrito] │
│   ▸ Módulo 2 (5 lecciones) 🔒  │  Garantía/reembolso│
│  Requisitos / audiencia      │                    │
│  Reseñas (avatar+comentario) │                    │
│  Productos relacionados      │                    │
└─────────────────────────────┴───────────────────┘
```
- Columna derecha: `position: sticky` dentro del viewport mientras la izquierda scrollea.
- VR: visor 3D con controles de rotación/zoom, carga lazy, fallback a imagen estática si WebXR no es compatible con el dispositivo.
- Compartir: botón con íconos WhatsApp/email, genera enlace directo.
- **RSC streaming:** en VPS, requiere `proxy_buffering off` en Nginx (`DEPLOY.md§6`).
- **Temario expandible (nuevo, para cursos con `contentSource: native`):** acordeón de módulos (componente ShadCN `accordion`, ya inventariado en `FRONTEND_PATTERNS.md §6`). Cada lección lista su tipo con un ícono (▶ video, 📄 texto, ✏️ quiz, 📎 recurso) y su duración si es video. Lecciones con `isPreview: true` muestran "Vista previa" en vez de candado y son reproducibles sin comprar — siguiendo el patrón estándar de Udemy/Skillshare/Kajabi de dejar ver 1-2 lecciones gratis para reducir la fricción de compra.
- **Módulos con drip (`releaseAfterDays`):** se muestran con un ícono de candado + texto "Se desbloquea tras N días de inscripción" en vez de bloquear visualmente todo el módulo — el estudiante debe poder ver *qué* va a aprender aunque no pueda accederlo todavía.

### 3.5 Carrito (popover)

Especificación exacta:
- Ancho: 420–480px · Alto máx: 70vh · `transform-origin: top right` · escala 0.85→1 + fade.
- Cierra con click-outside o `Escape`.
- Lista interna scrolleable; footer fijo (subtotal + CTA) fuera del scroll.
- Ítem: `[miniatura] nombre — [- qty +] $precio [🗑]`.
- Aviso inline "Ya tienes acceso a este curso" reemplaza los controles de cantidad/eliminar para ese ítem.
- Vacío: ilustración pequeña + "Tu carrito está vacío" + enlace al marketplace.
- Móvil: bottom sheet ancho completo, mismo comportamiento de scroll/footer fijo.

### 3.6 Registro / Login

```
┌───────────────────┬─────────────────────┐
│  Carrusel          │  [Google OAuth]      │
│  explicativo       │  — o —                │
│  (autoplay,        │  Nombre / Apellidos   │
│  pausa on hover)   │  Email / Password     │
│                    │  Confirmar password    │
│                    │  ☐ Acepto T&C          │
│                    │  [Crear cuenta]         │
│                    │  ¿Ya tienes cuenta? →   │
└───────────────────┴─────────────────────┘
```

**Flujo de invitación por organización (`?org_code=...`):**
- Cuando el usuario llega a `/sign-up?org_code=HOSP123`, se muestra un badge con el nombre de la organización (ej: "Serás añadido como empleado de Hospital XYZ").
- Se valida el `org_code` via Server Action `getOrgDetails()` antes de mostrar el formulario.
- Si el código es inválido, se muestra error y se bloquea el registro.
- Post-registro, se ejecuta `linkUserToOrganization(orgCode)` que vincula el usuario a la organización y marca la invitación como aceptada.
- El badge se muestra encima del formulario de Google OAuth, usando un componente `<Building2>` de lucide-react con fondo `bg-primary/10`.

- Validación en tiempo real (fortaleza de password con indicador visual, formato de email).
- Login: mismo layout, campos reducidos + "recordar contraseña" + "¿olvidaste tu contraseña?".

### 3.6.1 Panel de empleados (`/org/employees`)

Solo accesible para `hospital_admin` y `super_admin` (protegido por `middleware.ts`).

```
┌─────────────────────────────────────────────┐
│  Gestión de empleados                        │
│  Invita empleados a tu organización          │
├─────────────────────────────────────────────┤
│  Código de invitación                        │
│  ┌──────────────────────────┐ [Copiar]       │
│  │ HOSP123XYZ               │                │
│  └──────────────────────────┘                │
│  Comparte este código:                       │
│  /sign-up?org_code=HOSP123XYZ                │
├─────────────────────────────────────────────┤
│  Invitar empleado                            │
│  [correo@hospital.com          ] [Invitar]   │
├─────────────────────────────────────────────┤
│  Empleados (3)                               │
│  [Avatar] Juan Pérez        [Administrador]  │
│  [Avatar] María García      [Estudiante]     │
│  [Avatar] Carlos López      [Estudiante]     │
├─────────────────────────────────────────────┤
│  Invitaciones (2)                            │
│  [Clock] ana@hospital.com    Expira 25/06    │
│  [Check] luis@hospital.com   Aceptada        │
└─────────────────────────────────────────────┘
```

- El código de invitación se copia al portapapeles con feedback visual ("Copiado").
- Las invitaciones muestran estado: pendiente (reloj), aceptada (check verde), expirada (gris).
- Se puede eliminar invitaciones pendientes.

### 3.7 Dashboard (`/dashboard`)

Grid 2×2, columnas izquierdas más anchas:
```
┌───────────────────────┬──────────────┐
│ Mis Cursos             │ Calendario    │
│ [Todos|Progreso|       │ (mes/semana)  │
│  Completados|No inic.] │               │
│ [▭ progreso 60%]       │               │
├───────────────────────┼──────────────┤
│ Mis Certificados       │ Agenda del día│
│ [Descargar PDF] [👁]    │ - evento 1    │
│                        │ - evento 2    │
└───────────────────────┴──────────────┘
```
- Modal de preview de certificado antes de descargar.
- "Continúa donde lo dejaste" como bloque destacado opcional encima del grid.

### 3.8 Configuración (`/configuracion`)

Grid 2×2 simétrico al dashboard:
```
┌───────────────────────┬──────────────────┐
│ Perfil                 │ Preferencias       │
│ [foto + cropper]       │ Dark/Light/Sistema │
│ Nombre/Apellidos/Email │ Idioma ES/EN       │
│ Cambiar contraseña     │ Notificaciones     │
│ Cargo/especialidad     │ Eliminar cuenta    │
├───────────────────────┼──────────────────┤
│ Historial de compras   │ Integraciones      │
│ (facturas PDF)         │ Google Cal/Account │
└───────────────────────┴──────────────────┘
```

### 3.9 Checkout

```
Resumen del pedido
  - Producto A     $xx
  - Producto B     $xx
Subtotal           $xx
IVA                $xx
Total              $xx

Datos de facturación
  Nombre / Email / [NIT | CC]

[Widget Wompi embebido]
[Confirmar y pagar]
```
- Post-pago: pantalla de éxito con resumen + acceso inmediato al producto.
- Política de reembolso visible antes de confirmar.

### 3.10 Reproductor de lección (`/dashboard/cursos/[slug]/[leccionId]`)

Pantalla nueva — donde el estudiante consume el contenido de un curso `contentSource: native`.

```
┌─────────────────────────────────┬───────────────────┐
│  [Reproductor de video HLS]      │  Temario del curso │
│  ▶ ⏸ 🔊 ⚙️ ⛶  00:42 / 12:30      │  ▸ Módulo 1 ✓✓✓     │
│                                   │    ✓ Lección 1.1    │
│  Título de la lección            │    ● Lección 1.2 ←  │
│  Descripción / recursos          │    · Lección 1.3    │
│  [Marcar como completada]        │  ▸ Módulo 2 🔒       │
│  [← Anterior]      [Siguiente →] │    (en 5 días)       │
└─────────────────────────────────┴───────────────────┘
```
- Reproductor: HLS.js (o `<video>` nativo si el navegador soporta HLS nativamente, como Safari) consumiendo el manifiesto firmado de Cloudflare Stream — nunca una URL de video sin firmar.
- El video se marca completado automáticamente al llegar al 90% de su duración (patrón estándar de la industria), pero el estudiante también puede forzar "Marcar como completada" para lecciones de texto/recurso.
- Sidebar del temario: `position: sticky`, mismo patrón que la columna derecha de detalle de producto. Estado por lección: ✓ completada, ● actual, · pendiente, 🔒 bloqueada por drip.
- Lección tipo quiz: en vez de reproductor, muestra el componente de Quiz (§3.10.1).
- Navegación "Anterior/Siguiente" respeta el orden real de `Module.order`/`Lesson.order`, saltando módulos bloqueados con un aviso en vez de un botón roto.

#### 3.10.1 Componente de Quiz

```
┌───────────────────────────────────┐
│  Pregunta 3 de 8                  │
│  ¿Cuál es la dosis máxima de...?  │
│                                    │
│  ○ Opción A                       │
│  ● Opción B  (seleccionada)       │
│  ○ Opción C                       │
│  ○ Opción D                       │
│                                    │
│  [← Anterior]      [Siguiente →]  │
└───────────────────────────────────┘
```
- Al enviar el quiz completo: pantalla de resultado con `scorePct`, indicador de aprobado/no aprobado contra `Course.passingScorePct`, y revisión pregunta por pregunta mostrando la opción correcta + `explanation` si existe (refuerza el aprendizaje, no solo califica).
- Si `Quiz.maxAttempts` se alcanzó y no aprobó: mensaje claro "Has usado tus N intentos. Contacta a soporte si crees que hay un error" — nunca un bloqueo silencioso.
- `timeLimitSec`: si existe, contador visible en la esquina superior; al llegar a 0 se autoenvía con las respuestas dadas hasta el momento.

### 3.11 Panel de instructor / Course Builder (`/instructor`)

Pantalla nueva — accesible para `super_admin` y para cualquier `Vendor.status: active`. Es el corazón del pedido del usuario ("una página donde se pueda crear los cursos, super completo").

**Vista general (`/instructor`):**
```
┌─────────────────────────────────────────────┐
│  Mis cursos                    [+ Nuevo curso]│
├─────────────────────────────────────────────┤
│  [portada] Curso A      Publicado    👁 1.2k  │
│            3 módulos · 12 lecciones           │
│            [Editar] [Ver estadísticas]        │
├─────────────────────────────────────────────┤
│  [portada] Curso B      Borrador              │
│            Pendiente: agregar video a 2 lecc. │
│            [Continuar editando]               │
└─────────────────────────────────────────────┘
```
- Igual estructura visual que `/admin/products` ya existente (tabla/lista + estado + acciones) — reutiliza el mismo patrón de tarjeta, no inventa uno nuevo.
- Estado "Borrador" muestra explícitamente qué falta para publicar (igual filosofía que las advertencias bloqueantes ya definidas en `FLUJOS.md §11`), no solo "incompleto".

**Editor de curso (`/instructor/courses/[id]`):** layout de tres columnas, patrón estándar de cualquier course builder (Kajabi, Teachable, Podia — confirmado por la investigación de mercado de junio 2026):

```
┌──────────────┬─────────────────────────┬──────────────┐
│ Módulos       │  Editor de la lección    │ Vista previa │
│ ▸ Módulo 1    │  seleccionada            │ (móvil/      │
│   • Lección 1 │                          │  escritorio) │
│   • Lección 2 │  [Tabs: Video|Texto|     │              │
│   + Lección   │   Quiz|Recurso según el  │ [▶ reproducir│
│ ▸ Módulo 2    │   tipo de la lección]    │  como         │
│   🔒 drip: 5d │                          │  estudiante]  │
│ + Módulo       │  [Guardar cambios]       │              │
└──────────────┴─────────────────────────┴──────────────┘
```
- **Columna izquierda:** árbol de módulos/lecciones, drag & drop para reordenar (mismo patrón de animación que el resto del sistema — `transform`/`opacity` únicamente, nunca reflow de `height`/`margin` durante el arrastre, ver `FRONTEND_PATTERNS.md §9.6`). Click derecho o menú `⋮` por ítem: duplicar, eliminar, mover a otro módulo.
- **Columna central:** editor contextual según el tipo de lección activa:
  - **Video:** dropzone grande, barra de progreso de subida real (no falsa) mientras sube directo a Cloudflare Stream, estado "Procesando..." tras subir, miniatura + duración cuando está `ready`. Botón "Reemplazar video" borra el anterior en Stream antes de iniciar la nueva subida.
  - **Texto:** editor enriquecido (negrita, listas, imágenes inline, encabezados) — componente tipo `Tiptap` o similar, contenido saneado antes de persistir.
  - **Quiz:** editor de preguntas (§3.12).
  - **Recurso:** dropzone para PDF/slides, mismo patrón de upload que la portada de producto.
- **Columna derecha:** vista previa en vivo de cómo lo verá el estudiante — reduce el riesgo de publicar contenido mal formateado sin que el instructor se dé cuenta.
- **Guardado:** autosave con debounce de 2s en campos de texto (toast discreto "Guardado" en la esquina, nunca bloqueante), guardado explícito inmediato en cambios estructurales (agregar/eliminar/reordenar).

### 3.12 Editor de Quiz

```
┌─────────────────────────────────────────┐
│  Pregunta 1                        [🗑]  │
│  [Tipo: Opción única ▾]                  │
│  ┌─────────────────────────────────┐     │
│  │ Escribe la pregunta...           │     │
│  └─────────────────────────────────┘     │
│  ○ [Opción A.....................] [🗑]   │
│  ●  [Opción B (correcta)..........] [🗑]  │
│  ○ [Opción C.....................] [🗑]   │
│  [+ Agregar opción]                       │
│  [Explicación (opcional, se muestra      │
│   tras responder)..................]     │
├─────────────────────────────────────────┤
│  [+ Agregar pregunta]                     │
├─────────────────────────────────────────┤
│  Configuración del quiz                   │
│  Intentos máximos: [Ilimitado ▾]          │
│  Tiempo límite: [Sin límite ▾]            │
│  ☑ Mezclar orden de preguntas              │
└─────────────────────────────────────────┘
```
- Marcar una opción como correcta (radio para opción única, checkbox para múltiple) deselecciona automáticamente las demás si el tipo es `single_choice` — evita el estado inválido de "0 o 2+ correctas" en una pregunta de opción única.
- Validación antes de publicar el curso: cada `Quiz` debe tener al menos 1 pregunta, y cada pregunta al menos 1 opción marcada correcta — si no, mismo patrón de advertencia bloqueante ya usado en `FLUJOS.md §11` para "publicar sin imagen de portada".

### 3.13 Onboarding de vendor (`/vender`)

Pantalla nueva — flujo de "quiero vender en el marketplace", para instructores externos y estudios VR. Mismo layout de wizard paso a paso que ya usa el registro (`UX_UI.md §3.6`), no un patrón nuevo.

```
Paso 1 — Cuéntanos sobre ti
  Nombre público / Bio / Tipo de contenido (Cursos | VR | Ambos)
  [Continuar]

Paso 2 — Datos fiscales y de pago
  Tipo de documento [NIT|CC] / Número
  Certificado bancario (sube PDF) [dropzone]
  Banco / Tipo de cuenta / Número de cuenta
  ⚠ Estos datos se almacenan cifrados y solo se usan para pagarte
  [Enviar para revisión]

Paso 3 — En revisión
  "Tu perfil de creador está en revisión. Te avisamos por correo
   en un máximo de 48 horas."
  [Volver al marketplace]
```
- Igual que el resto de la plataforma: nunca un solo botón de "Enviar" gigante sin contexto — cada paso explica brevemente por qué se pide ese dato (confianza, igual criterio que el resto del UX del producto).
- Tras aprobación (`Vendor.status: active`), el usuario recibe email (Brevo) con enlace directo a `/instructor` para crear su primer producto.
- Si `Vendor.status: pending_review` y el usuario vuelve a `/vender`, ve un estado de seguimiento simple en vez del formulario otra vez (mismo patrón que "Invitaciones" en `UX_UI.md §3.6.1`: pendiente/aceptada/rechazada).

### 3.14 Bandeja de revisión y payouts (`/admin/review-queue`, `/admin/payouts`)

Pantallas nuevas — solo `super_admin`.

```
/admin/review-queue
┌─────────────────────────────────────────────┐
│  Productos pendientes de revisión (4)        │
├─────────────────────────────────────────────┤
│  [portada] "Curso de RCP avanzado"           │
│            por: Clínica San Rafael            │
│            ⚠ Falta: 1 lección sin video       │
│            [Vista previa] [Aprobar] [Rechazar]│
└─────────────────────────────────────────────┘

/admin/payouts
┌─────────────────────────────────────────────┐
│  Lote: Mayo 2026 — 6 vendors — $4.2M COP      │
│  [Revisar lote]                               │
├─────────────────────────────────────────────┤
│  Clínica San Rafael    Bruto $800k  Neto $640k│
│  Estudio VR Aumenta    Bruto $1.2M  Neto $960k│
│  [Aprobar y enviar lote]                      │
└─────────────────────────────────────────────┘
```
- "Vista previa" en la bandeja de revisión abre el curso completo en modo lectura, exactamente como lo vería un estudiante — el revisor nunca aprueba a ciegas basado solo en metadatos.
- "Rechazar" requiere un motivo de texto libre, que se envía al vendor por email — nunca un rechazo silencioso.
- El lote de payouts muestra el desglose bruto/comisión/neto por vendor antes de aprobar — transparencia total, ningún número oculto.

## 4. Estados (transversales a todas las pantallas)

| Estado | Tratamiento |
|---|---|
| Loading | Skeleton screens, nunca spinner aislado |
| Vacío | Ilustración + mensaje + CTA de recuperación |
| Error | Mensaje claro + acción de reintento; nunca solo "Algo salió mal" |
| Éxito | Confirmación visual explícita (checkout, registro, certificado generado) |

## 5. Accesibilidad

- Contraste mínimo WCAG AA en ambos modos (claro/oscuro).
- Navegación 100% por teclado en: barra, carrusel de blog, popover de carrito, formularios.
- `alt` descriptivo en todas las imágenes de producto y certificados.
- Roles ARIA: `role="navigation"`, `aria-label` en menú, `aria-modal` en popover/modal, `aria-live` en badge del carrito al actualizarse.
- **Course Builder:** el árbol de módulos/lecciones (§3.11) debe ser reordenable por teclado además de drag & drop (patrón `aria-grabbed`/`aria-dropeffect` o equivalente moderno con `role="application"` + atajos `Alt+↑`/`Alt+↓` para mover el ítem enfocado) — el drag & drop por mouse no puede ser la única vía.
- **Reproductor de lección (§3.10):** controles de video con `aria-label` en cada botón, subtítulos cuando existan (ver roadmap `TRD.md §21`), y el quiz totalmente operable con teclado (flechas o Tab entre opciones, Enter para seleccionar).

## 6. Responsividad

- Mobile-first; breakpoints estándar (sm/md/lg/xl).
- Carrito → bottom sheet en móvil.
- Dashboard/Configuración: el grid 2×2 colapsa a 1 columna en móvil, manteniendo el orden de prioridad (Mis Cursos / Perfil primero).
- Marketplace y dashboard deben validarse específicamente en resolución de **tablet** (iPads institucionales hospitalarios) — caso de uso explícito del documento de producto.
- **Editor de curso (§3.11):** el layout de 3 columnas es de escritorio. En tablet, colapsa a 2 columnas (módulos + editor, vista previa accesible vía botón flotante "Ver preview" que abre modal). En móvil, el Course Builder se reduce a una vista de solo lectura con enlace "Edita esto desde una pantalla más grande" — crear/editar contenido extenso en móvil es una mala experiencia objetiva, no tiene sentido forzarla.
- **Reproductor de lección (§3.10):** en móvil, el sidebar del temario pasa a un drawer deslizable desde abajo (mismo patrón que el carrito en bottom sheet), no permanece visible junto al video.

## 7. Componentes reutilizables

- `CategoryChip` (color por tipo: VR / Curso / Automatización).
- `RatingStars` (lectura y, en reseñas, escritura).
- `CartBadge` (contador animado, `aria-live`).
- `ProgressBar` (usado en Mis Cursos y reportes `hospital_admin`).
- `CertificateModal` (preview + descarga + compartir LinkedIn).
- `EmptyState` (ilustración + texto + CTA, parametrizable).
- `SkeletonCard` (marketplace y dashboard).
- `VideoUploadDropzone` (nuevo — Course Builder, barra de progreso real de subida a Cloudflare Stream + estado de procesamiento).
- `LessonTree` (nuevo — árbol de módulos/lecciones reordenable, usado en Course Builder).
- `QuizPlayer` (nuevo — componente de toma de quiz, reutilizado entre el reproductor de lección del estudiante y la vista previa del instructor).
- `QuizEditor` (nuevo — editor de preguntas/opciones, Course Builder).
- `VendorBadge` (nuevo — "por: {nombre}" en tarjetas de marketplace y detalle de producto).
- `ReviewQueueCard` (nuevo — tarjeta de producto pendiente en `/admin/review-queue`, con vista previa/aprobar/rechazar).
