import { PrismaClient } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";

class ExerciseService {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }

  list(filters?: { q?: string; muscleGroupId?: number }) {
    const { q, muscleGroupId } = filters || {};
    return this.prisma.exercise.findMany({
      where: {
        AND: [
          q ? { name: { contains: q, mode: "insensitive" } } : {},
          muscleGroupId ? { muscleGroupId } : {},
        ],
      },
      orderBy: { id: "desc" },
      include: { muscleGroup: true },
    });
  }

  async create(data: {
    name: string;
    muscleGroupId: number;
    equipment?: string | null;
    videoUrl?: string | null;
  }) {
    const mg = await this.prisma.muscleGroup.findUnique({
      where: { id: data.muscleGroupId },
    });
    if (!mg) throw new ApiValidationError("muscleGroupId invalid", 400);
    return this.prisma.exercise.create({ data });
  }

  async update(
    id: number,
    data: {
      name?: string;
      muscleGroupId?: number;
      equipment?: string | null;
      videoUrl?: string | null;
    }
  ) {
    if (data.muscleGroupId) {
      const mg = await this.prisma.muscleGroup.findUnique({
        where: { id: data.muscleGroupId },
      });
      if (!mg) throw new ApiValidationError("muscleGroupId invalid", 400);
    }
    try {
      return await this.prisma.exercise.update({ where: { id }, data });
    } catch (e: any) {
      if (e?.code === "P2025")
        throw new ApiValidationError("Exercise not found", 404);
      throw e;
    }
  }

  async getExerciseUsage(id: number) {
    const routines = await this.prisma.routine.findMany({
      where: {
        exercises: {
          some: {
            exerciseId: id,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    return routines;
  }

  async remove(id: number) {
    try {
      // First check if exercise exists
      const exercise = await this.prisma.exercise.findUnique({
        where: { id },
        include: { muscleGroup: true },
      });

      if (!exercise) {
        throw new ApiValidationError("Exercise not found", 404);
      }

      // Check if exercise is used in any routines
      const routines = await this.getExerciseUsage(id);
      if (routines.length > 0) {
        const routineNames = routines.map((r) => r.name).join(", ");
        throw new ApiValidationError(
          `Cannot delete exercise "${exercise.name}": It is currently used in the following routines: ${routineNames}`,
          409
        );
      }

      await this.prisma.exercise.delete({ where: { id } });
    } catch (e: any) {
      if (e instanceof ApiValidationError) throw e;
      throw new ApiValidationError("Failed to delete exercise", 500);
    }
  }
}

export default new ExerciseService();
