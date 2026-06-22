import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

const products: { type: ProductType; title: string; slug: string; description: string; priceCents: number; discountCents: number | null; coverImageUrl: string | null; moodleCourseId: number | null; vrAssetUrl: string | null; capacity: number | null; published: boolean }[] = [
  {
    type: 'course',
    title: 'Cardiología Avanzada',
    slug: 'cardiologia-avanzada',
    description: 'Casos clínicos interactivos para residentes de cardiología. Interpretación de ECG, manejo de arritmias y protocolos de emergencia. Incluye más de 50 casos clínicos con retroalimentación inmediata y acceso a una biblioteca de electrocardiogramas anotados.',
    priceCents: 150000,
    discountCents: null,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 30,
    published: true,
  },
  {
    type: 'vr_experience',
    title: 'Neurocirugía Virtual',
    slug: 'neurocirugia-virtual',
    description: 'Simulaciones de procedimientos neuroquirúrgicos con feedback en tiempo real. Visualización 3D de anatomía cerebral con modelos de alta fidelidad. Acceso a sala de operaciones virtual.',
    priceCents: 250000,
    discountCents: 200000,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 15,
    published: true,
  },
  {
    type: 'course',
    title: 'Medicina de Urgencias',
    slug: 'medicina-urgencias',
    description: 'Curso intensivo de atención trauma y código sepsis. Escenarios simulados para entrenamiento en equipo multidisciplinar. Incluye protocolos ATLS y soporte vital avanzado.',
    priceCents: 120000,
    discountCents: null,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 50,
    published: true,
  },
  {
    type: 'ai_automation',
    title: 'Automatización de Admisión Hospitalaria',
    slug: 'automatizacion-admision',
    description: 'Reduce hasta un 40% del tiempo administrativo en procesos de admisión y scheduling con inteligencia artificial. Incluye chatbot de triaje y optimización de agendas.',
    priceCents: 350000,
    discountCents: 300000,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: null,
    published: true,
  },
  {
    type: 'course',
    title: 'Enfermería Critical Care',
    slug: 'enfermeria-critical-care',
    description: 'Formación especializada en cuidados intensivos. Manejo de ventilación mecánica, hemodinamia y sedación. Certificación en soporte vital avanzado para enfermería.',
    priceCents: 180000,
    discountCents: null,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 40,
    published: true,
  },
  {
    type: 'vr_experience',
    title: 'Anatomía Humana 3D',
    slug: 'anatomia-humana-3d',
    description: 'Exploración inmersiva del cuerpo humano con modelos anatómicos de alta fidelidad. Ideal para estudiantes de medicina. Incluye sistemas cardiovascular, nervioso y musculoesquelético.',
    priceCents: 200000,
    discountCents: null,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 25,
    published: true,
  },
  {
    type: 'course',
    title: 'Pediatría Hospitalaria',
    slug: 'pediatria-hospitalaria',
    description: 'Manejo clínico de pacientes pediátricos hospitalizados. From respiratory distress to febrile seizures, with interactive case studies and simulation scenarios.',
    priceCents: 160000,
    discountCents: 140000,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 35,
    published: true,
  },
  {
    type: 'ai_automation',
    title: 'Chatbot de Triaje IA',
    slug: 'chatbot-triaje-ia',
    description: 'Asistente de inteligencia artificial para triaje telefónico. Clasifica pacientes por nivel de urgencia antes de llegar al hospital. Reduce tiempos de espera en un 30%.',
    priceCents: 280000,
    discountCents: null,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: null,
    published: true,
  },
  {
    type: 'vr_experience',
    title: 'Cirugía Laparoscópica VR',
    slug: 'cirugia-laparoscopica-vr',
    description: 'Entrenamiento en cirugía minimamente invasiva con retroalimentación háptica. Simulación de procedimientos de colecistectomía, apendicectomía y más.',
    priceCents: 300000,
    discountCents: 250000,
    coverImageUrl: null,
    moodleCourseId: null,
    vrAssetUrl: null,
    capacity: 10,
    published: true,
  },
];

async function main() {
  console.log('Seeding products...');

  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (!existing) {
      await prisma.product.create({ data: product });
      console.log(`  Created: ${product.title}`);
    } else {
      console.log(`  Skipped (exists): ${product.title}`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
