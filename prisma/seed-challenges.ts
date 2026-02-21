import { PrismaClient, ChallengeFrequency } from "@prisma/client";

const prisma = new PrismaClient();

async function seedChallenges() {
  console.log("Creating challenges...");

  await prisma.challenge.createMany({
    data: [
      {
        title: "Check-in activo",
        description: "Entrená al menos una vez hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 20,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Media hora asegurada",
        description: "Acumulá al menos 30 minutos de rutina hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día principiante",
        description: "Completá una rutina de nivel Principiante hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día intermedio",
        description: "Completá una rutina de nivel Intermedio hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 30,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día avanzado",
        description: "Completá una rutina de nivel Avanzado hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 40,
        minLevel: 4,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de piernas",
        description: "Entrená piernas al menos una vez hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de pecho",
        description: "Entrená pecho al menos una vez hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de espalda",
        description: "Entrená espalda al menos una vez hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de core",
        description: "Sumá al menos un ejercicio de abdominales hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de cardio",
        description: "Hacé al menos un ejercicio de cardio hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Rutina larga",
        description: "Completá una rutina de más de 60 minutos hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 35,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Día de brazos",
        description: "Entrená bíceps o tríceps al menos una vez hoy.",
        frequency: ChallengeFrequency.DAILY,
        pointsReward: 25,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },

      // WEEKLY
      {
        title: "Semana 3 de 7",
        description: "Entrená al menos 3 días distintos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 60,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Semana 5 de 7",
        description: "Entrená al menos 5 días distintos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 90,
        minLevel: 4,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Principiante constante",
        description:
          "Completá al menos 2 rutinas de nivel Principiante esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 50,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Intermedio en subida",
        description:
          "Completá al menos 2 rutinas de nivel Intermedio esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 60,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Avanzado total",
        description:
          "Completá al menos 1 rutina de nivel Avanzado esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 70,
        minLevel: 4,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Largo aliento",
        description:
          "Completá al menos 2 rutinas de más de 60 minutos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 70,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Semana de piernas",
        description:
          "Entrená piernas al menos en 2 días distintos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 60,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Semana de core",
        description:
          "Entrená abdominales al menos en 2 días distintos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 60,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Semana de cardio",
        description: "Sumá cardio al menos en 2 días distintos esta semana.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 60,
        minLevel: 3,
        sedeId: null,
        isActive: true,
      },
      {
        title: "Semana equilibrada",
        description:
          "Entrená al menos 3 días esta semana usando rutinas de 2 niveles diferentes.",
        frequency: ChallengeFrequency.WEEKLY,
        pointsReward: 80,
        minLevel: 4,
        sedeId: null,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log("Challenges seeded");
}

seedChallenges()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
