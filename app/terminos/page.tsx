export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-foreground mb-6 text-3xl font-bold">Términos y Condiciones</h1>
      <p className="text-muted-foreground mb-4">Última actualización: 2026-06-20</p>
      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-foreground text-lg font-semibold">1. Aceptación de términos</h2>
        <p>Al registrarte y utilizar Medicamentum360, aceptas estos términos en su totalidad.</p>
        <h2 className="text-foreground text-lg font-semibold">2. Uso de la plataforma</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>El acceso a cursos y contenido adquirido es personal e intransferible.</li>
          <li>No está permitido compartir credenciales de acceso.</li>
          <li>El contenido VR y simulaciones son para uso educativo exclusivamente.</li>
        </ul>
        <h2 className="text-foreground text-lg font-semibold">3. Pagos y reembolsos</h2>
        <p>Los pagos se procesan a través de Wompi. Las solicitudes de reembolso deben gestionarse dentro
        de los primeros 7 días posteriores a la compra, siempre que el progreso del curso sea menor al 10%.</p>
        <h2 className="text-foreground text-lg font-semibold">4. Responsabilidad</h2>
        <p>Medicamentum360 no se responsabiliza por decisiones clínicas tomadas basándose en el contenido
        educativo de la plataforma. El contenido es referencial y no sustituye la formación médica formal.</p>
      </section>
    </main>
  );
}
