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

  async remove(id: number) {
    try {
      await this.prisma.exercise.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === "P2003")
        throw new ApiValidationError(
          "Cannot delete: exercise is used in routines",
          409
        );
      if (e?.code === "P2025")
        throw new ApiValidationError("Exercise not found", 404);
      throw e;
    }
  }
}

export default new ExerciseService();
