import { PrismaClient, Routine, RoutineExercise } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";

type REItem = {
  exerciseId: number;
  sets?: number | null;
  reps?: number | null;
  restTime?: number | null;
};

class RoutineService {
  private readonly prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }
  list() {
    return this.prisma.routine.findMany({
      include: {
        exercises: {
          include: { exercise: { include: { muscleGroup: true } } },
        },
      },
    });
  }

  async getById(id: number) {
    const exists = await this.prisma.routine.findUnique({ where: { id } });
    if (!exists) throw new ApiValidationError("Routine not found", 404);
    return await this.prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: { include: { muscleGroup: true } } },
        },
      },
    });
  }

  async create(
    data: Omit<Routine, "id"> & { exercises: Omit<RoutineExercise, "id">[] }
  ) {
    const routine = await this.prisma.routine.create({
      data: {
        name: data.name,
        description: data.description,
        level: data.level,
        duration: data.duration,
        icon: data.icon,
      },
    });

    const exercises = await this.prisma.routineExercise.createMany({
      data: data.exercises.map((e) => ({
        routineId: routine.id,
        exerciseId: e.exerciseId,
        sets: e.sets ?? null,
        reps: e.reps ?? null,
        restTime: e.restTime ?? null,
      })),
    });

    return {
      ...routine,
      exercises,
    };
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string | null;
      level?: string | null;
      duration?: number | null;
      icon?: string | null;
      replaceExercises?: boolean;
      exercises?: REItem[];
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.routine.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) throw new ApiValidationError("Routine not found", 404);

      const r = await tx.routine.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          level: data.level as any,
          duration: data.duration,
          icon: data.icon,
        },
      });

      if (data.replaceExercises) {
        if (!data.exercises?.length)
          throw new ApiValidationError(
            "Routine must have at least one exercise",
            400
          );
        const ids = data.exercises.map((e) => e.exerciseId);
        const found = await tx.exercise.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        });
        if (found.length !== ids.length)
          throw new ApiValidationError("Some exerciseId do not exist", 400);

        await tx.routineExercise.deleteMany({ where: { routineId: id } });
        await tx.routineExercise.createMany({
          data: data.exercises.map((e) => ({
            routineId: id,
            exerciseId: e.exerciseId,
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            restTime: e.restTime ?? null,
          })),
        });
      }

      return tx.routine.findUnique({
        where: { id: r.id },
        include: {
          exercises: {
            include: { exercise: { include: { muscleGroup: true } } },
          },
        },
      });
    });
  }

  async addExercise(routineId: number, item: REItem) {
    // valida
    const [r, e] = await Promise.all([
      this.prisma.routine.findUnique({
        where: { id: routineId },
        select: { id: true },
      }),
      this.prisma.exercise.findUnique({
        where: { id: item.exerciseId },
        select: { id: true },
      }),
    ]);
    if (!r) throw new ApiValidationError("Routine not found", 404);
    if (!e) throw new ApiValidationError("exerciseId invalid", 400);

    return this.prisma.routineExercise.create({
      data: {
        routineId,
        exerciseId: item.exerciseId,
        sets: item.sets ?? null,
        reps: item.reps ?? null,
        restTime: item.restTime ?? null,
      },
      include: { exercise: { include: { muscleGroup: true } } },
    });
  }

  async updateRoutineExercise(
    routineId: number,
    reId: number,
    data: {
      sets?: number | null;
      reps?: number | null;
      restTime?: number | null;
    }
  ) {
    const current = await this.prisma.routineExercise.findUnique({
      where: { id: reId },
    });
    if (!current || current.routineId !== routineId)
      throw new ApiValidationError("Routine exercise not found", 404);

    return this.prisma.routineExercise.update({
      where: { id: reId },
      data: {
        sets: data.sets ?? null,
        reps: data.reps ?? null,
        restTime: data.restTime ?? null,
      },
      include: { exercise: { include: { muscleGroup: true } } },
    });
  }

  async removeRoutineExercise(routineId: number, reId: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.routineExercise.findUnique({
        where: { id: reId },
      });
      if (!current || current.routineId !== routineId)
        throw new ApiValidationError("Routine exercise not found", 404);

      const count = await tx.routineExercise.count({ where: { routineId } });
      if (count <= 1)
        throw new ApiValidationError(
          "Routine cannot be left without exercises",
          400
        );

      await tx.routineExercise.delete({ where: { id: reId } });
    });
  }

  async remove(id: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.routineExercise.deleteMany({ where: { routineId: id } });
      try {
        await tx.routine.delete({ where: { id } });
      } catch (e: any) {
        if (e?.code === "P2025")
          throw new ApiValidationError("Routine not found", 404);
        throw e;
      }
    });
  }
}

export default new RoutineService();
