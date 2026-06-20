# UI/UX — Medicamentum360
**Especificación de interfaz y experiencia de usuario**
Versión: 1.0 · Fecha: 2026-06-19

---

## 1. Sistema de diseño

> **Fuente de implementación:** la barra de navegación, el toggle de dark/light, el banner de cookies y los tokens de color de este documento están especificados a nivel de comportamiento/wireframe aquí; el **código real adaptado a Next.js + Tailwind + ShadCN**, extraído y verificado directamente del repositorio [wasp-lang/open-saas](https://github.com/wasp-lang/open-saas), vive en `FRONTEND_PATTERNS.md`. Empieza por ahí antes de implementar el NavBar o el selector de tema desde cero.

| Token | Valor / regla |
|---|---|
| Color primario (marca) | `#8127cf` → `hsl(272 68% 48%)` (ver `FRONTEND_PATTERNS.md §1` para el set completo de variables CSS) |
| Modo | Claro / Oscuro, toggle persistido en `localStorage`, sincronizado con `/configuracion` |
| Tipografía | Sans-serif moderna, jerarquía clara (display / heading / body / caption) |
| Iconografía | Material Design icons (consistente con `dark_mode`/`light_brightness_5` ya definidos) |
| Transiciones globales | `transition: all 0.3s ease` para cambios de estado de barra y componentes |
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

**Visitante:**
```
[Logo]   Nosotros  Ejemplos  Blog  Productos        [🌙/☀️] [Entrar]
```
**Visitante autenticado en sesión activa:** "Entrar" → avatar + nombre.

**Autenticado, fuera de marketplace:**
```
[Logo]   Mi Aprendizaje   Marketplace        [🛒3] [⚙️] [Avatar ▾]
```
**Autenticado, en `/productos`:**
```
[Logo]   Mi Aprendizaje   Marketplace   [🔍 buscar...]   [🛒3] [⚙️] [Avatar ▾]
```

Estados a implementar: default, scrolled (píldora), hidden (al bajar en marketplace), mobile (hamburguesa).

### 3.2 Landing

Orden de secciones: Hero → Nosotros → Ejemplos → Blog (carrusel) → Footer.
- Hero: fondo con partículas sutiles o gradiente animado (no debe afectar Lighthouse performance — usar CSS/Canvas ligero, no librerías pesadas).
- Blog: carrusel con auto-scroll, pausa al hover, navegación por teclado (flechas) y swipe táctil.
- Footer: legal, redes, contacto, selector ES/EN, banner de cookies (capa superpuesta, no parte del footer en sí).

### 3.3 Marketplace

```
[Barra con buscador]
[Tabs: VR | Cursos | Automatizaciones]  [Precio ▾] [Ordenar ▾]
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ chip    │ │ chip    │ │ chip    │ │ chip    │
│ título  │ │ título  │ │ título  │ │ título  │
│ ★★★★☆ 24│ │ ★★★★★ 8 │ │ ...     │ │ ...     │
│ $precio │ │ $precio │ │ ...     │ │ ...     │
│[+carrito hover]                            │
└────────┘ └────────┘ └────────┘ └────────┘
```
- Skeleton de tarjeta mientras carga (mismo layout, bloques grises animados).
- Estado "sin resultados": ilustración + texto + sugerencias de categorías alternativas.
- Paginación o infinite scroll (decisión técnica en TRD, aquí solo el patrón visual: scroll continuo con skeleton al final).

### 3.4 Detalle de producto

```
┌─────────────────────────────┬───────────────────┐
│  Breadcrumb                  │  Nombre            │
│  [Carrusel / Video / 3D R3F] │  $precio (+IVA)    │
│  Descripción                 │  ★★★★☆ (24)        │
│  Temario / módulos           │  Cantidad [- 1 +]  │
│  Requisitos / audiencia      │  [Comprar ahora]   │
│  Reseñas (avatar+comentario) │  [Agregar carrito] │
│  Productos relacionados      │  Garantía/reembolso│
└─────────────────────────────┴───────────────────┘
```
- Columna derecha: `position: sticky` dentro del viewport mientras la izquierda scrollea.
- VR: visor 3D con controles de rotación/zoom, carga lazy, fallback a imagen estática si WebXR no es compatible con el dispositivo.
- Compartir: botón con íconos WhatsApp/email, genera enlace directo.

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
- Validación en tiempo real (fortaleza de password con indicador visual, formato de email).
- Login: mismo layout, campos reducidos + "recordar contraseña" + "¿olvidaste tu contraseña?".

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

## 6. Responsividad

- Mobile-first; breakpoints estándar (sm/md/lg/xl).
- Carrito → bottom sheet en móvil.
- Dashboard/Configuración: el grid 2×2 colapsa a 1 columna en móvil, manteniendo el orden de prioridad (Mis Cursos / Perfil primero).
- Marketplace y dashboard deben validarse específicamente en resolución de **tablet** (iPads institucionales hospitalarios) — caso de uso explícito del documento de producto.

## 7. Componentes reutilizables

- `CategoryChip` (color por tipo: VR / Curso / Automatización).
- `RatingStars` (lectura y, en reseñas, escritura).
- `CartBadge` (contador animado, `aria-live`).
- `ProgressBar` (usado en Mis Cursos y reportes `hospital_admin`).
- `CertificateModal` (preview + descarga + compartir LinkedIn).
- `EmptyState` (ilustración + texto + CTA, parametrizable).
- `SkeletonCard` (marketplace y dashboard).
