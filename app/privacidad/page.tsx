export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-foreground mb-6 text-3xl font-bold">Política de Privacidad</h1>
      <p className="text-muted-foreground mb-4">Última actualización: 2026-06-20</p>
      <section className="space-y-4 text-sm leading-relaxed">
        <p>
          En Medicamentum360, comprometidos con la protección de datos personales según la Ley 1581 de 2012
          (Colombia) y el Decreto 1377 de 2013, informamos a nuestros usuarios el tratamiento que damos a
          sus datos personales.
        </p>
        <h2 className="text-foreground text-lg font-semibold">1. Datos que recopilamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Información de registro: nombre, correo electrónico, documento de identidad (NIT/CC).</li>
          <li>Información de perfil: especialidad médica, preferencias de idioma y tema.</li>
          <li>Datos de navegación: cookies de sesión y analítica (previo consentimiento).</li>
          <li>Datos de pago: procesados a través de Wompi; no almacenamos información de tarjetas.</li>
        </ul>
        <h2 className="text-foreground text-lg font-semibold">2. Finalidad del tratamiento</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Gestión de cuentas y acceso a la plataforma.</li>
          <li>Procesamiento de pagos y generación de facturación electrónica.</li>
          <li>Inscripción automática en cursos Moodle.</li>
          <li>Envío de certificados y notificaciones de progreso.</li>
        </ul>
        <h2 className="text-foreground text-lg font-semibold">3. Derechos del titular</h2>
        <p>Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a
        privacidad@medicamentum360.com.</p>
      </section>
    </main>
  );
}
