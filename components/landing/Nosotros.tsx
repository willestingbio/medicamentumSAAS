import { Users, Award, Globe } from 'lucide-react';

export function Nosotros() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Transformando la formación médica
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Medicamentum360 nació para resolver un problema real: la falta de herramientas
            de formación médica que se integren con los sistemas hospitalarios y cumplan
            con los estándares de datos sensibles en salud.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: Users,
              title: 'Enfoque multidisciplinario',
              desc: 'Médicos, enfermeras, personal administrativo y directivos hospitalarios.',
            },
            {
              icon: Award,
              title: 'Estándares clínicos',
              desc: 'Contenido validado por sociedades médicas colombianas e internacionales.',
            },
            {
              icon: Globe,
              title: 'Accesible desde cualquier lugar',
              desc: 'Plataforma web responsive, optimizada para tablets hospitalarias.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-6">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="size-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}