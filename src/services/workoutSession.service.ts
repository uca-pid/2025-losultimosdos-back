import {
  PrismaClient,
  SessionStatus,
  PointEventType,
} from "@prisma/client";
import PointsService from "./points.service";

type PerformanceInput = {
  exerciseId: number;
  sets: { reps: number; weight: number; comment?: string }[];
};

type CreateSessionParams = {
  userId: string;
  routineId: number;
  status?: SessionStatus;
  notes?: string;
  performances: PerformanceInput[];
};

class WorkoutSessionService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(params: CreateSessionParams) {
    const { userId, routineId, notes, performances } = params;

    const routine = await this.prisma.routine.findUnique({
      where: { id: routineId },
      include: { exercises: true },
    });

    if (!routine) {
      throw new Error("Routine not found");
    }

    const requiredSetsByExerciseId = routine.exercises.reduce(
      (acc, routineExercise) => {
        const requiredSets = Math.max(routineExercise.sets ?? 1, 1);
        const current = acc.get(routineExercise.exerciseId) ?? 0;
        acc.set(routineExercise.exerciseId, current + requiredSets);
        return acc;
      },
      new Map<number, number>()
    );

    const loggedSetsByExerciseId = performances.reduce((acc, performance) => {
      const current = acc.get(performance.exerciseId) ?? 0;
      acc.set(performance.exerciseId, current + performance.sets.length);
      return acc;
    }, new Map<number, number>());

    const totalRequiredSets = Array.from(requiredSetsByExerciseId.values()).reduce(
      (sum, setCount) => sum + setCount,
      0
    );

    const completedRequiredSets = Array.from(
      requiredSetsByExerciseId.entries()
    ).reduce((sum, [exerciseId, requiredSets]) => {
      const loggedSets = loggedSetsByExerciseId.get(exerciseId) ?? 0;
      return sum + Math.min(loggedSets, requiredSets);
    }, 0);

    const totalLoggedSets = Array.from(loggedSetsByExerciseId.values()).reduce(
      (sum, setCount) => sum + setCount,
      0
    );

    const completionRatio =
      totalRequiredSets > 0
        ? Math.min(completedRequiredSets / totalRequiredSets, 1)
        : 0;

    let sessionStatus: SessionStatus = "NOT_DONE";
    if (totalRequiredSets > 0 && completedRequiredSets >= totalRequiredSets) {
      sessionStatus = "COMPLETED";
    } else if (totalLoggedSets > 0) {
      sessionStatus = "PARTIAL";
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.workoutSession.create({
        data: {
          userId,
          routineId,
          status: sessionStatus,
          notes,
        },
      });

      const perfData = performances.flatMap((p) =>
        p.sets.map((s, idx) => ({
          userId,
          routineId,
          exerciseId: p.exerciseId,
          weight: s.weight,
          reps: s.reps,
          setNumber: idx + 1,
          comment: s.comment ?? null,
          sessionId: session.id,
        }))
      );

      if (perfData.length > 0) {
        await tx.exercisePerformance.createMany({ data: perfData });
      }

      const totalExercises = routine.exercises.length || 1;
      const completedExerciseIds = new Set(
        performances
          .filter((p) => p.sets.length > 0)
          .map((p) => p.exerciseId)
      );

      let pointsAwarded = 0;

      if (sessionStatus !== "NOT_DONE" && perfData.length > 0) {
        const duration = routine.duration ?? 30;
        const basePointsPer10Min = 20;
        const baseByDuration = (duration / 10) * basePointsPer10Min;
        const rawPoints = Math.round(baseByDuration * completionRatio);

        if (rawPoints > 0) {
          const event = await PointsService.registerEvent({
            userId,
            sedeId: routine.sedeId,
            type: PointEventType.ROUTINE_COMPLETE,
            routineId: routine.id,
            customPoints: rawPoints,
          });
          pointsAwarded = event.points;
        }
      }

      return {
        session,
        pointsAwarded,
        completionRatio,
        completedCount: completedExerciseIds.size,
        totalExercises,
      };
    });
  }

  async listByUser(
    userId: string,
    options?: { routineId?: number; page?: number; limit?: number }
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: { userId: string; routineId?: number } = { userId };
    if (options?.routineId) {
      where.routineId = options.routineId;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.workoutSession.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          routine: { select: { id: true, name: true, icon: true } },
          performances: {
            include: {
              exercise: {
                select: { id: true, name: true, muscleGroupId: true },
              },
            },
            orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
          },
        },
      }),
      this.prisma.workoutSession.count({ where }),
    ]);

    return {
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(sessionId: number) {
    return this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        routine: {
          select: { id: true, name: true, icon: true, level: true },
        },
        performances: {
          include: {
            exercise: {
              include: { muscleGroup: true },
            },
          },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });
  }
}

export default new WorkoutSessionService();
