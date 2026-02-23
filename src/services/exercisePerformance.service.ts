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

  async getBestByUserAndExercises(params: {
    userId: string;
    exerciseIds: number[];
  }) {
    const { userId, exerciseIds } = params;
    if (!exerciseIds.length) return [];

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

  async getProgressByExercise(params: {
    userId: string;
    exerciseId: number;
  }) {
    const { userId, exerciseId } = params;

    const rows = await this.prisma.exercisePerformance.findMany({
      where: { userId, exerciseId },
      orderBy: { createdAt: "asc" },
      select: {
        weight: true,
        reps: true,
        setNumber: true,
        createdAt: true,
        sessionId: true,
      },
    });

    if (!rows.length) return [];

    const grouped = new Map<
      string,
      { date: string; sets: { weight: number; reps: number }[] }
    >();

    for (const r of rows) {
      const key = r.sessionId
        ? `s-${r.sessionId}`
        : r.createdAt.toISOString().slice(0, 10);

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: r.createdAt.toISOString().slice(0, 10),
          sets: [],
        });
      }
      grouped.get(key)!.sets.push({ weight: r.weight, reps: r.reps });
    }

    return Array.from(grouped.values()).map((g) => {
      const maxWeight = Math.max(...g.sets.map((s) => s.weight));
      const totalVolume = g.sets.reduce(
        (acc, s) => acc + s.weight * s.reps,
        0
      );
      return {
        date: g.date,
        maxWeight,
        totalVolume: Math.round(totalVolume),
        sets: g.sets.length,
      };
    });
  }
}

export default new ExercisePerformanceService();
