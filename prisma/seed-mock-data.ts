import {
  PrismaClient,
  Level,
  GoalCategory,
  Sede,
  MuscleGroup,
  Exercise,
  Routine,
  Class,
} from "@prisma/client";

const prisma = new PrismaClient();

const muscleGroups = [
  { name: "Generico" },
  { name: "Pecho" },
  { name: "Espalda" },
  { name: "Piernas" },
  { name: "Hombros" },
  { name: "Bíceps" },
  { name: "Tríceps" },
  { name: "Abdominales" },
  { name: "Glúteos" },
  { name: "Cardio" },
];

const exercisesByMuscleGroup = {
  Pecho: [
    {
      name: "Press de banca",
      equipment: "Barra",
    },
    {
      name: "Press inclinado con mancuernas",
      equipment: "Mancuernas",
    },
    {
      name: "Aperturas con mancuernas",
      equipment: "Mancuernas",
    },
    {
      name: "Flexiones",
      equipment: "Sin equipo",
    },
    {
      name: "Fondos en paralelas",
      equipment: "Paralelas",
    },
  ],
  Espalda: [
    {
      name: "Dominadas",
      equipment: "Barra de dominadas",
    },
    {
      name: "Remo con barra",
      equipment: "Barra",
    },
    {
      name: "Remo con mancuerna",
      equipment: "Mancuernas",
    },
    {
      name: "Peso muerto",
      equipment: "Barra",
    },
    {
      name: "Jalón al pecho",
      equipment: "Polea alta",
    },
  ],
  Piernas: [
    {
      name: "Sentadillas",
      equipment: "Barra",
    },
    {
      name: "Prensa de piernas",
      equipment: "Máquina",
    },
    {
      name: "Curl de piernas",
      equipment: "Máquina",
    },
    {
      name: "Extensión de cuádriceps",
      equipment: "Máquina",
    },
    {
      name: "Zancadas",
      equipment: "Mancuernas",
    },
  ],
  Hombros: [
    {
      name: "Press militar",
      equipment: "Barra",
    },
    {
      name: "Elevaciones laterales",
      equipment: "Mancuernas",
    },
    {
      name: "Elevaciones frontales",
      equipment: "Mancuernas",
    },
    {
      name: "Pájaros",
      equipment: "Mancuernas",
    },
    {
      name: "Press Arnold",
      equipment: "Mancuernas",
    },
  ],
  Bíceps: [
    {
      name: "Curl con barra",
      equipment: "Barra",
    },
    {
      name: "Curl con mancuernas",
      equipment: "Mancuernas",
    },
    {
      name: "Curl martillo",
      equipment: "Mancuernas",
    },
    {
      name: "Curl en banco Scott",
      equipment: "Banco Scott",
    },
  ],
  Tríceps: [
    {
      name: "Press francés",
      equipment: "Barra",
    },
    {
      name: "Extensiones con polea",
      equipment: "Polea",
    },
    {
      name: "Patada de tríceps",
      equipment: "Mancuernas",
    },
    {
      name: "Fondos para tríceps",
      equipment: "Banco",
    },
  ],
  Abdominales: [
    {
      name: "Crunches",
      equipment: "Sin equipo",
    },
    {
      name: "Plancha",
      equipment: "Sin equipo",
    },
    {
      name: "Elevación de piernas",
      equipment: "Sin equipo",
    },
    {
      name: "Bicicleta abdominal",
      equipment: "Sin equipo",
    },
    {
      name: "Russian twists",
      equipment: "Sin equipo",
    },
  ],
  Glúteos: [
    {
      name: "Hip thrust",
      equipment: "Barra",
    },
    {
      name: "Patada de glúteo",
      equipment: "Polea",
    },
    {
      name: "Puente de glúteos",
      equipment: "Sin equipo",
    },
    {
      name: "Peso muerto rumano",
      equipment: "Barra",
    },
  ],
  Cardio: [
    {
      name: "Cinta de correr",
      equipment: "Cinta",
    },
    {
      name: "Bicicleta estática",
      equipment: "Bicicleta",
    },
    {
      name: "Elíptica",
      equipment: "Elíptica",
    },
    {
      name: "Burpees",
      equipment: "Sin equipo",
    },
    {
      name: "Saltos de cuerda",
      equipment: "Cuerda",
    },
  ],
};

const sedes = [
  {
    name: "Recoleta",
    address: "Av. Pueyrredon 2068",
    latitude: -34.58747,
    longitude: -58.3973,
  },
  {
    name: "Puerto Madero",
    address:
      "Av. Alicia Moreau de Justo 1500 Planta Baja, C1107 Cdad. Autónoma de Buenos Aires",
    latitude: -34.615626521632,
    longitude: -58.36584838892029,
  },
  {
    name: "River",
    address:
      "Estadio Monumental, Avenida Guillermo Udaondo, Buenos Aires, Comuna 13, Autonomous City of Buenos Aires, C1424BCL, Argentina",
    latitude: -34.54523060237755,
    longitude: -58.44966888427735,
  },
];

const routineTemplates = [
  {
    name: "Rutina Full Body Principiante",
    description:
      "Rutina completa para trabajar todo el cuerpo, ideal para principiantes",
    level: Level.Beginner,
    duration: 45,
    icon: "activity",
  },
  {
    name: "Rutina Push-Pull-Legs",
    description: "Rutina dividida en 3 días: empuje, tirón y piernas",
    level: Level.Intermediate,
    duration: 60,
    icon: "dumbbell",
  },
  {
    name: "Rutina Hipertrofia Avanzada",
    description: "Rutina intensiva para ganancia de masa muscular",
    level: Level.Advanced,
    duration: 90,
    icon: "flame",
  },
  {
    name: "Rutina Cardio y Core",
    description:
      "Enfocada en trabajo cardiovascular y fortalecimiento del core",
    level: Level.Beginner,
    duration: 30,
    icon: "timer",
  },
  {
    name: "Rutina Upper Body",
    description: "Enfocada en el tren superior del cuerpo",
    level: Level.Intermediate,
    duration: 50,
    icon: "activity",
  },
  {
    name: "Rutina Lower Body",
    description: "Enfocada en el tren inferior y glúteos",
    level: Level.Intermediate,
    duration: 55,
    icon: "heart",
  },
];

const classTemplates = [
  {
    name: "Yoga Matutino",
    description: "Sesión de yoga para comenzar el día con energía",
  },
  {
    name: "Spinning Intensivo",
    description: "Clase de spinning de alta intensidad",
  },
  {
    name: "CrossFit",
    description: "Entrenamiento funcional de alta intensidad",
  },
  { name: "Pilates", description: "Fortalecimiento del core y flexibilidad" },
  { name: "Zumba", description: "Baile fitness divertido y energético" },
  {
    name: "Boxing",
    description: "Entrenamiento de boxeo para todos los niveles",
  },
  { name: "Funcional", description: "Entrenamiento funcional variado" },
  { name: "Stretching", description: "Clase de estiramiento y recuperación" },
];

const goalTemplates = [
  {
    title: "Alcanzar 100 registros nuevos",
    description: "Meta de registros de usuarios para este mes",
    category: GoalCategory.USER_REGISTRATIONS,
    targetValue: 100,
  },
  {
    title: "500 inscripciones a clases",
    description: "Meta de inscripciones totales a clases grupales",
    category: GoalCategory.CLASS_ENROLLMENTS,
    targetValue: 500,
  },
  {
    title: "200 asignaciones de rutinas",
    description: "Meta de rutinas asignadas a usuarios",
    category: GoalCategory.ROUTINE_ASSIGNMENTS,
    targetValue: 200,
  },
];

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomDate = (daysFromNow: number, daysRange: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow + getRandomInt(0, daysRange));
  return date;
};

const main = async () => {
  console.log("🌱 Starting database seeding...");

  try {
    // Clean existing data (except DailyUserCount)
    console.log("🧹 Cleaning existing data...");
    await prisma.goal.deleteMany({});
    await prisma.routineExercise.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.routine.deleteMany({});
    await prisma.exercise.deleteMany({});
    await prisma.muscleGroup.deleteMany({});
    await prisma.sede.deleteMany({});

    // Create Sedes
    console.log("📍 Creating sedes...");
    const createdSedes: Sede[] = [];
    for (const sede of sedes) {
      const created = await prisma.sede.create({
        data: sede,
      });
      createdSedes.push(created);
      console.log(`  ✓ Created sede: ${created.name}`);
    }

    // Create Muscle Groups
    console.log("💪 Creating muscle groups...");
    const createdMuscleGroups: MuscleGroup[] = [];
    for (const group of muscleGroups) {
      const created = await prisma.muscleGroup.create({
        data: group,
      });
      createdMuscleGroups.push(created);
      console.log(`  ✓ Created muscle group: ${created.name}`);
    }

    // Create Exercises
    console.log("🏋️ Creating exercises...");
    const createdExercises: { [key: string]: Exercise[] } = {};
    for (const muscleGroup of createdMuscleGroups) {
      const exercises =
        exercisesByMuscleGroup[
          muscleGroup.name as keyof typeof exercisesByMuscleGroup
        ];
      if (exercises) {
        createdExercises[muscleGroup.name] = [];
        for (const exercise of exercises) {
          const created = await prisma.exercise.create({
            data: {
              ...exercise,
              muscleGroupId: muscleGroup.id,
            },
          });
          createdExercises[muscleGroup.name].push(created);
          console.log(
            `  ✓ Created exercise: ${created.name} (${muscleGroup.name})`
          );
        }
      }
    }

    // Create Routines with Exercises
    console.log("📋 Creating routines...");
    const createdRoutines: Routine[] = [];
    for (const sede of createdSedes) {
      for (const routineTemplate of routineTemplates) {
        const routine = await prisma.routine.create({
          data: {
            ...routineTemplate,
            sedeId: sede.id,
          },
        });
        createdRoutines.push(routine);
        console.log(`  ✓ Created routine: ${routine.name} at ${sede.name}`);

        // Add exercises to routine
        const numExercises = getRandomInt(4, 8);
        const allExercises = Object.values(createdExercises).flat();
        const selectedExercises = allExercises
          .sort(() => Math.random() - 0.5)
          .slice(0, numExercises);

        for (const exercise of selectedExercises) {
          await prisma.routineExercise.create({
            data: {
              routineId: routine.id,
              exerciseId: exercise.id,
              sets: getRandomInt(3, 5),
              reps: getRandomInt(8, 15),
              restTime: getRandomInt(30, 90),
            },
          });
        }
        console.log(`    ↳ Added ${numExercises} exercises to routine`);
      }
    }

    // Create Classes
    console.log("📅 Creating classes...");
    const createdClasses: Class[] = [];
    for (const sede of createdSedes) {
      for (let i = 0; i < 20; i++) {
        const classTemplate =
          classTemplates[getRandomInt(0, classTemplates.length - 1)];
        const date = getRandomDate(1, 30);
        const hours = getRandomInt(6, 20);
        const minutes = getRandomInt(0, 3) * 15; // 0, 15, 30, 45
        const time = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;

        const classObj = await prisma.class.create({
          data: {
            name: classTemplate.name,
            description: classTemplate.description,
            date: date,
            time: time,
            capacity: getRandomInt(15, 30),
            enrolled: getRandomInt(0, 15),
            createdById: "system",
            sedeId: sede.id,
          },
        });
        createdClasses.push(classObj);
      }
      console.log(`  ✓ Created 20 classes at ${sede.name}`);
    }

    // Create Goals
    console.log("🎯 Creating goals...");
    for (const sede of createdSedes) {
      for (const goalTemplate of goalTemplates) {
        const startDate = getRandomDate(-30, 0);
        const endDate = getRandomDate(30, 60);

        let targetClassId: number | null = null;
        let targetRoutineId: number | null = null;

        // Assign specific class or routine if applicable
        if (
          goalTemplate.category === GoalCategory.CLASS_ENROLLMENTS &&
          createdClasses.length > 0
        ) {
          const sedeClasses = createdClasses.filter(
            (c) => c.sedeId === sede.id
          );
          if (sedeClasses.length > 0) {
            targetClassId =
              sedeClasses[getRandomInt(0, sedeClasses.length - 1)].id;
          }
        } else if (
          goalTemplate.category === GoalCategory.ROUTINE_ASSIGNMENTS &&
          createdRoutines.length > 0
        ) {
          const sedeRoutines = createdRoutines.filter(
            (r) => r.sedeId === sede.id
          );
          if (sedeRoutines.length > 0) {
            targetRoutineId =
              sedeRoutines[getRandomInt(0, sedeRoutines.length - 1)].id;
          }
        }

        const goal = await prisma.goal.create({
          data: {
            title: goalTemplate.title,
            description: goalTemplate.description,
            category: goalTemplate.category,
            targetValue: goalTemplate.targetValue,
            currentValue: getRandomInt(
              0,
              Math.floor(goalTemplate.targetValue * 0.7)
            ),
            startDate: startDate,
            endDate: endDate,
            sedeId: sede.id,
            targetClassId,
            targetRoutineId,
          },
        });
        console.log(`  ✓ Created goal: ${goal.title} at ${sede.name}`);
      }
    }

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Sedes: ${createdSedes.length}`);
    console.log(`  - Muscle Groups: ${createdMuscleGroups.length}`);
    console.log(
      `  - Exercises: ${Object.values(createdExercises).flat().length}`
    );
    console.log(`  - Routines: ${createdRoutines.length}`);
    console.log(`  - Classes: ${createdClasses.length}`);
    console.log(`  - Goals: ${createdSedes.length * goalTemplates.length}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
