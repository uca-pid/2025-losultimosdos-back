import { PrismaClient } from "@prisma/client";

class ExercisePerformanceService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async logPerformances(params: {
    userId: string;
    routineId: number;
    performances: { exerciseId: number; weight: number; reps: number }[];
  }) {
    const { userId, routineId, performances } = params;

    if (!performances.length) return [];

    return this.prisma.exercisePerformance.createMany({
      data: performances.map((p) => ({
        userId,
        routineId,
        exerciseId: p.exerciseId,
        weight: p.weight,
        reps: p.reps,
      })),
    });
  }

  /**
   * Devuelve la mejor serie histórica del usuario para cada ejercicio.
   * "Mejor" = mayor peso; si querés, después lo cambiamos a peso x reps.
   */
  async getBestByUserAndExercises(params: {
    userId: string;
    exerciseIds: number[];
  }) {
    const { userId, exerciseIds } = params;
    if (!exerciseIds.length) return [];

    // traemos todas las performances de esos ejercicios para ese usuario
    const rows = await this.prisma.exercisePerformance.findMany({
      where: {
        userId,
        exerciseId: { in: exerciseIds },
      },
      orderBy: [
        { exerciseId: "asc" },
        { weight: "desc" },
        { reps: "desc" },
        { createdAt: "desc" },
      ],
    });

    // nos quedamos con la mejor por exerciseId
    const bestMap = new Map<number, { weight: number; reps: number }>();

    for (const r of rows) {
      if (!bestMap.has(r.exerciseId)) {
        bestMap.set(r.exerciseId, { weight: r.weight, reps: r.reps });
      }
    }

    return Array.from(bestMap.entries()).map(([exerciseId, best]) => ({
      exerciseId,
      weight: best.weight,
      reps: best.reps,
    }));
  }
}

export default new ExercisePerformanceService();
