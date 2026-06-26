import { ProductType } from '@prisma/client';

// Use the same Prisma singleton as the app
import { prisma } from '../lib/prisma';

// ===== USERS (direct insert + hashPassword) =====

async function seedUsers() {
  const { hashPassword } = await import('better-auth/crypto');

  const users = [
    { email: 'admin@medicamentum360.com', password: 'Admin123!', name: 'Super Admin', role: 'super_admin' as const },
    { email: 'vendor@medicamentum360.com', password: 'Vendor123!', name: 'Vendor Demo', role: 'student' as const },
    { email: 'estudiante@medicamentum360.com', password: 'Estudiante123!', name: 'Estudiante Demo', role: 'student' as const },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⏭  Usuario existe: ${u.email}`);
      continue;
    }

    const hashedPassword = await hashPassword(u.password);

    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        emailVerified: true,
      },
    });

    await prisma.account.create({
      data: {
        accountId: u.email,
        providerId: 'credential',
        userId: user.id,
        password: hashedPassword,
      },
    });

    console.log(`  ✅ Usuario creado: ${u.email} (${u.role})`);
  }
}

// ===== VENDOR =====

async function seedVendor() {
  const vendorUser = await prisma.user.findUnique({
    where: { email: 'vendor@medicamentum360.com' },
  });

  if (!vendorUser) {
    console.log('  ⚠  Usuario vendor no encontrado, saltando Vendor');
    return;
  }

  const existing = await prisma.vendor.findUnique({ where: { userId: vendorUser.id } });
  if (existing) {
    console.log('  ⏭  Vendor existe');
    return existing;
  }

  const vendor = await prisma.vendor.create({
    data: {
      userId: vendorUser.id,
      displayName: 'Vendor Demo',
      slug: 'vendor-demo',
      bio: 'Instructor médico independiente especializado en farmacología clínica y emergencias.',
      status: 'active',
      commissionPct: 20,
      approvedAt: new Date(),
    },
  });

  console.log('  ✅ Vendor creado');
  return vendor;
}

// ===== PRODUCTS WITH COURSE BUILDER DATA =====

async function seedCourses(vendorId?: string) {
  interface CourseSeed {
    type: ProductType;
    title: string;
    slug: string;
    description: string;
    priceCents: number;
    discountCents: number | null;
    published: boolean;
    vendorId?: string;
    reviewStatus?: string;
    courseData: {
      estimatedHours: number;
      passingScorePct: number;
      language: string;
      modules: {
        title: string;
        order: number;
        releaseAfterDays?: number;
        lessons: {
          type: string;
          title: string;
          order: number;
          isPreview: boolean;
          textContent?: string;
          resourceLabel?: string;
        }[];
      }[];
    };
  }

  const courses: CourseSeed[] = [
    // Curso 1: Nativo completo con quiz (super_admin)
    {
      type: 'course',
      title: 'Farmacología Clínica Avanzada',
      slug: 'farmacologia-clinica-avanzada',
      description: 'Curso completo de farmacología clínica con módulos interactivos, video-lecciones, casos de estudio y evaluación con quiz.',
      priceCents: 250000,
      discountCents: 200000,
      published: true,
      reviewStatus: 'approved',
      courseData: {
        estimatedHours: 40,
        passingScorePct: 70,
        language: 'es',
        modules: [
          {
            title: 'Módulo 1: Farmacocinética',
            order: 0,
            lessons: [
              { type: 'video', title: 'Absorción y biodisponibilidad', order: 0, isPreview: true },
              { type: 'text', title: 'Distribución y unión a proteínas', order: 1, isPreview: false, textContent: '<h2>Distribución de fármacos</h2><p>La distribución es el proceso por el cual un fármaco difunde desde el espacio intravascular hasta los tejidos.</p>' },
              { type: 'quiz', title: 'Evaluación: Farmacocinética', order: 2, isPreview: false },
              { type: 'resource', title: 'Guía rápida de parámetros PK', order: 3, isPreview: false, resourceLabel: 'PDF: Tablas farmacocinéticas' },
            ],
          },
          {
            title: 'Módulo 2: Farmacodinamia',
            order: 1,
            lessons: [
              { type: 'video', title: 'Mecanismos de acción', order: 0, isPreview: false },
              { type: 'quiz', title: 'Evaluación: Farmacodinamia', order: 1, isPreview: false },
            ],
          },
          {
            title: 'Módulo 3: Interacciones (drip 7 días)',
            order: 2,
            releaseAfterDays: 7,
            lessons: [
              { type: 'video', title: 'Interacciones fármaco-fármaco', order: 0, isPreview: false },
              { type: 'text', title: 'Interacciones con alimentos', order: 1, isPreview: false, textContent: '<p>Muchos fármacos ven alterada su absorción por los alimentos. La administración con o sin comidas puede ser crítica.</p>' },
            ],
          },
        ],
      },
    },

    // Curso 2: Cardio (native, sin drip)
    {
      type: 'course',
      title: 'Cardiología Clínica',
      slug: 'cardiologia-clinica',
      description: 'Diagnóstico y manejo de patologías cardiovasculares frecuentes en el ámbito hospitalario.',
      priceCents: 180000,
      discountCents: null,
      published: true,
      reviewStatus: 'approved',
      courseData: {
        estimatedHours: 30,
        passingScorePct: 70,
        language: 'es',
        modules: [
          {
            title: 'Fundamentos',
            order: 0,
            lessons: [
              { type: 'video', title: 'Anatomía cardíaca funcional', order: 0, isPreview: true },
              { type: 'text', title: 'Electrocardiograma normal', order: 1, isPreview: false, textContent: '<p>El ECG normal consta de onda P, complejo QRS y onda T. Cada una representa una fase del ciclo cardíaco.</p>' },
            ],
          },
        ],
      },
    },

    // Curso 3: Vendor — pertenece al vendor externo
    {
      type: 'course',
      title: 'Manejo del Dolor en Urgencias',
      slug: 'manejo-dolor-urgencias',
      description: 'Protocolos actualizados para el manejo del dolor agudo en servicios de urgencias. Por: Vendor Demo.',
      priceCents: 120000,
      discountCents: null,
      published: true,
      vendorId: vendorId || undefined,
      reviewStatus: 'approved',
      courseData: {
        estimatedHours: 15,
        passingScorePct: 80,
        language: 'es',
        modules: [
          {
            title: 'Evaluación del dolor',
            order: 0,
            lessons: [
              { type: 'video', title: 'Escalas de valoración', order: 0, isPreview: true },
              { type: 'quiz', title: 'Caso clínico: Dolor torácico', order: 1, isPreview: false },
            ],
          },
          {
            title: 'Farmacología del dolor',
            order: 1,
            lessons: [
              { type: 'text', title: 'Opioides: guía de uso seguro', order: 0, isPreview: false, textContent: '<h2>Uso seguro de opioides</h2><p>Los opioides requieren precauciones estrictas: inicio con dosis bajas, titulación lenta, y monitoreo de depresión respiratoria.</p>' },
            ],
          },
        ],
      },
    },

    // Curso 4: Automatización IA (tipo ai_automation con course)
    {
      type: 'ai_automation',
      title: 'Automatización de Farmacia Hospitalaria',
      slug: 'automatizacion-farmacia',
      description: 'Sistema de automatización para dispensación de medicamentos. Reduce errores y optimiza inventario.',
      priceCents: 450000,
      discountCents: 400000,
      published: true,
      reviewStatus: 'approved',
      courseData: {
        estimatedHours: 10,
        passingScorePct: 0,
        language: 'es',
        modules: [
          {
            title: 'Configuración del sistema',
            order: 0,
            lessons: [
              { type: 'video', title: 'Instalación y puesta en marcha', order: 0, isPreview: true },
              { type: 'resource', title: 'Manual de usuario', order: 1, isPreview: false, resourceLabel: 'PDF: Manual completo' },
            ],
          },
        ],
      },
    },

    // Curso 5: VR con contenido didáctico
    {
      type: 'vr_experience',
      title: 'Anatomía Humana 3D Interactiva',
      slug: 'anatomia-humana-3d',
      description: 'Exploración inmersiva del cuerpo humano con modelos anatómicos de alta fidelidad para estudiantes de medicina.',
      priceCents: 200000,
      discountCents: null,
      published: true,
      reviewStatus: 'approved',
      courseData: {
        estimatedHours: 25,
        passingScorePct: 60,
        language: 'es',
        modules: [
          {
            title: 'Sistema Cardiovascular',
            order: 0,
            lessons: [
              { type: 'video', title: 'Tour 3D del corazón', order: 0, isPreview: true },
              { type: 'quiz', title: 'Identificación de estructuras', order: 1, isPreview: false },
            ],
          },
        ],
      },
    },
  ];

  for (const c of courses) {
    const existing = await prisma.product.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(`  ⏭  Curso existe: ${c.title}`);
      continue;
    }

    await prisma.product.create({
      data: {
        type: c.type,
        title: c.title,
        slug: c.slug,
        description: c.description,
        priceCents: c.priceCents,
        discountCents: c.discountCents,
        published: c.published,
        vendorId: c.vendorId ?? null,
        reviewStatus: (c.reviewStatus ?? 'approved') as any,
        course: {
          create: {
            contentSource: 'native',
            estimatedHours: c.courseData.estimatedHours,
            passingScorePct: c.courseData.passingScorePct,
            language: c.courseData.language,
            modules: {
              create: c.courseData.modules.map((mod) => ({
                title: mod.title,
                order: mod.order,
                releaseAfterDays: mod.releaseAfterDays,
                lessons: {
                  create: mod.lessons.map((l) => ({
                    type: l.type as any,
                    title: l.title,
                    order: l.order,
                    isPreview: l.isPreview,
                    ...(l.textContent && { textContent: l.textContent }),
                    ...(l.resourceLabel && { resourceLabel: l.resourceLabel }),
                    ...(l.type === 'quiz' && {
                      quiz: {
                        create: {
                          shuffleQuestions: true,
                          maxAttempts: 2,
                          timeLimitSec: 900,
                          questions: {
                            create: [
                              {
                                type: 'single_choice',
                                prompt: l.title.includes('Farmacocinética')
                                  ? '¿Cuál de los siguientes factores NO afecta la absorción de un fármaco por vía oral?'
                                  : l.title.includes('Farmacodinamia')
                                  ? 'La eficacia de un fármaco se refiere a:'
                                  : l.title.includes('Dolor torácico')
                                  ? '¿Cuál es la primera escala a aplicar al evaluar dolor agudo en paciente consciente?'
                                  : '¿Cuál de las siguientes estructuras NO forma parte del sistema cardiovascular?',
                                order: 0,
                                explanation: 'Revisa el material del módulo correspondiente.',
                                options: {
                                  create: l.title.includes('Farmacocinética')
                                    ? [
                                        { label: 'Motilidad gastrointestinal', isCorrect: false, order: 0 },
                                        { label: 'pH gástrico', isCorrect: false, order: 1 },
                                        { label: 'Grupo sanguíneo del paciente', isCorrect: true, order: 2 },
                                        { label: 'Flujo sanguíneo mesentérico', isCorrect: false, order: 3 },
                                      ]
                                    : l.title.includes('Farmacodinamia')
                                    ? [
                                        { label: 'La dosis necesaria para producir efecto', isCorrect: false, order: 0 },
                                        { label: 'La capacidad máxima de producir un efecto terapéutico', isCorrect: true, order: 1 },
                                        { label: 'La velocidad de eliminación', isCorrect: false, order: 2 },
                                        { label: 'El tiempo de absorción', isCorrect: false, order: 3 },
                                      ]
                                    : l.title.includes('Dolor torácico')
                                    ? [
                                        { label: 'Escala Visual Analógica (EVA)', isCorrect: true, order: 0 },
                                        { label: 'Escala de Glasgow', isCorrect: false, order: 1 },
                                        { label: 'Índice de Barthel', isCorrect: false, order: 2 },
                                        { label: 'Escala de Norton', isCorrect: false, order: 3 },
                                      ]
                                    : [
                                        { label: 'Ventrículo izquierdo', isCorrect: false, order: 0 },
                                        { label: 'Válvula mitral', isCorrect: false, order: 1 },
                                        { label: 'Alvéolo pulmonar', isCorrect: true, order: 2 },
                                        { label: 'Arteria aorta', isCorrect: false, order: 3 },
                                      ],
                                },
                              },
                              {
                                type: 'true_false',
                                prompt: l.title.includes('Farmacocinética')
                                  ? 'La biodisponibilidad IV es del 100%'
                                  : l.title.includes('Farmacodinamia')
                                  ? 'Un antagonista competitivo desplaza la curva dosis-respuesta a la derecha'
                                  : l.title.includes('Dolor torácico')
                                  ? 'El dolor es siempre un signo objetivo medible'
                                  : 'El corazón tiene cuatro cámaras',
                                order: 1,
                                explanation: l.title.includes('Dolor torácico')
                                  ? 'El dolor es subjetivo: "el dolor es lo que el paciente dice que es".'
                                  : l.title.includes('cardiovascular')
                                  ? 'Correcto: dos aurículas y dos ventrículos.'
                                  : l.title.includes('Farmacodinamia')
                                  ? 'Correcto. El antagonista compite por el mismo receptor.'
                                  : 'Por definición, la vía IV evita el primer paso hepático.',
                                options: {
                                  create: l.title.includes('Dolor torácico')
                                    ? [
                                        { label: 'Verdadero', isCorrect: false, order: 0 },
                                        { label: 'Falso', isCorrect: true, order: 1 },
                                      ]
                                    : [
                                        { label: 'Verdadero', isCorrect: true, order: 0 },
                                        { label: 'Falso', isCorrect: false, order: 1 },
                                      ],
                                },
                              },
                            ],
                          },
                        },
                      },
                    }),
                  })),
                },
              })),
            },
          },
        },
      },
    });

    const totalLessons = c.courseData.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    console.log(`  ✅ ${c.title} (${c.courseData.modules.length} mód, ${totalLessons} lecc)`);
  }
}

// ===== MAIN =====

async function main() {
  console.log('\n🌱 Medicamentum360 — Seed de desarrollo\n');

  console.log('📧 Usuarios:');
  await seedUsers();

  console.log('\n🏪 Vendor:');
  const vendor = await seedVendor();

  console.log('\n📚 Cursos:');
  await seedCourses(vendor?.id);

  console.log('\n✅ Seed completado.\n');
  console.log('Credenciales de prueba:');
  console.log('  super_admin:  admin@medicamentum360.com / Admin123!');
  console.log('  vendor:       vendor@medicamentum360.com / Vendor123!');
  console.log('  estudiante:   estudiante@medicamentum360.com / Estudiante123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
