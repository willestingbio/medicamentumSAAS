import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Video, Brain, Stethoscope, ArrowRight } from 'lucide-react';

const examples = [
  {
    icon: Stethoscope,
    title: 'Cardiología avanzada',
    desc: 'Casos clínicos interactivos para residentes de cardiología. Interpretación de ECG, manejo de arritmias y protocolos de emergencia.',
    tag: 'Especialidad',
  },
  {
    icon: Brain,
    title: 'Neurocirugía virtual',
    desc: 'Simulaciones de procedimientos neuroquirúrgicos con feedback en tiempo real. Acceso a visualización 3D de anatomía cerebral.',
    tag: 'VR / Simulación',
  },
  {
    icon: Video,
    title: 'Medicina de urgencias',
    desc: 'Curso intensivo de atención trauma y código sepsis. Escenarios simulados para entrenamiento en equipo multidisciplinar.',
    tag: 'Urgencias',
  },
];

export function Ejemplos() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16" data-anim="ejemplos-title">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ejemplos de contenido
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada curso está diseñado con metodología evidence-based y casos clínicos reales
            adaptados al contexto latinoamericano.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto" style={{ perspective: '1000px' }}>
          {examples.map(({ icon: Icon, title, desc, tag }) => (
            <div key={title} data-anim="ejemplo-card">
              <Card className="group card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      {tag}
                    </span>
                  </div>
                  <CardTitle className="text-lg mb-2">{title}</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
                  <a href="#" className="inline-flex items-center text-sm text-primary font-medium hover:underline group-hover:gap-1 transition-all duration-300 ease-out">
                    Ver más <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform duration-300 ease-out" />
                  </a>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
