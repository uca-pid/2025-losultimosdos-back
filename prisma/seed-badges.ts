import { PrismaClient, BadgeMetric } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const badges = [
    // 🎯 PUNTOS TOTALES
    {
      code: "POINTS_100",
      name: "Bronce: 100 puntos",
      description: "Alcanzaste 100 puntos totales entrenando en GymCloud.",
      icon: "🥉",
      metric: BadgeMetric.TOTAL_POINTS,
      threshold: 100,
    },
    {
      code: "POINTS_500",
      name: "Plata: 500 puntos",
      description: "Superaste los 500 puntos. Nada te frena.",
      icon: "🥈",
      metric: BadgeMetric.TOTAL_POINTS,
      threshold: 500,
    },
    {
      code: "POINTS_1000",
      name: "Oro: 1000 puntos",
      description: "1000 puntos. Sos leyenda del gym.",
      icon: "🥇",
      metric: BadgeMetric.TOTAL_POINTS,
      threshold: 1000,
    },

    // 📚 CLASES
    {
      code: "CLASSES_5",
      name: "Calentando motores",
      description: "Te anotaste a 5 clases.",
      icon: "🔥",
      metric: BadgeMetric.CLASS_ENROLL_COUNT,
      threshold: 5,
    },
    {
      code: "CLASSES_10",
      name: "Constancia total",
      description: "Te anotaste a 10 clases.",
      icon: "💪",
      metric: BadgeMetric.CLASS_ENROLL_COUNT,
      threshold: 10,
    },
    {
      code: "CLASSES_20",
      name: "Fan de las clases",
      description: "20 clases reservadas. Vivís en el gimnasio.",
      icon: "🏋️‍♀️",
      metric: BadgeMetric.CLASS_ENROLL_COUNT,
      threshold: 20,
    },

    // 📋 RUTINAS COMPLETADAS
    {
      code: "ROUTINES_3",
      name: "Rutinas en marcha",
      description: "Completaste 3 rutinas.",
      icon: "📋",
      metric: BadgeMetric.ROUTINE_COMPLETE_COUNT,
      threshold: 3,
    },
    {
      code: "ROUTINES_10",
      name: "Modo disciplina",
      description: "10 rutinas completadas. Esto ya es hábito.",
      icon: "⏱️",
      metric: BadgeMetric.ROUTINE_COMPLETE_COUNT,
      threshold: 10,
    },
    {
      code: "ROUTINES_25",
      name: "Máquina de rutinas",
      description: "25 rutinas completadas. Imparable.",
      icon: "🚀",
      metric: BadgeMetric.ROUTINE_COMPLETE_COUNT,
      threshold: 25,
    },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        description: b.description,
        icon: b.icon,
        metric: b.metric,
        threshold: b.threshold,
      },
      create: b,
    });
  }

  console.log("✅ Badges seed ejecutado correctamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
