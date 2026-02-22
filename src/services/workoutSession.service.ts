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
  status: SessionStatus;
  notes?: string;
  performances: PerformanceInput[];
};

class WorkoutSessionService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(params: CreateSessionParams) {
    const { userId, routineId, status, notes, performances } = params;

    const routine = await this.prisma.routine.findUnique({
      where: { id: routineId },
      include: { exercises: true },
    });

    if (!routine) {
      throw new Error("Routine not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.workoutSession.create({
        data: {
          userId,
          routineId,
          status,
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
      const completionRatio = Math.min(
        completedExerciseIds.size / totalExercises,
        1
      );

      let pointsAwarded = 0;

      if (status !== "NOT_DONE" && perfData.length > 0) {
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
