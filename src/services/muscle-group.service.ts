// src/services/muscle-group.service.ts
import { PrismaClient, Prisma } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";

class MuscleGroupService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async list() {
    return this.prisma.muscleGroup.findMany({
      include: {
        _count: { select: { exercises: true } },
      },
    });
  }

  async create(name: string) {
    if (!name || !name.trim()) {
      throw new ApiValidationError("Name is required", 400);
    }

    const formatted = this.capitalize(name);

    try {
      // Verificar si ya existe (case-insensitive)
      const existing = await this.prisma.muscleGroup.findFirst({
        where: { name: { equals: formatted, mode: "insensitive" } },
      });
      if (existing) {
        throw new ApiValidationError("Muscle group already exists", 400);
      }

      return await this.prisma.muscleGroup.create({
        data: { name: formatted },
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiValidationError("Muscle group already exists", 400);
      }
      throw err;
    }
  }

  async update(id: number, name: string) {
    if (!name || !name.trim()) {
      throw new ApiValidationError("Name is required", 400);
    }

    const formatted = this.capitalize(name);

    // Verificar si ya existe otro con ese nombre
    const duplicate = await this.prisma.muscleGroup.findFirst({
      where: {
        name: { equals: formatted, mode: "insensitive" },
        NOT: { id },
      },
    });
    if (duplicate) {
      throw new ApiValidationError("Muscle group already exists", 400);
    }

    try {
      return await this.prisma.muscleGroup.update({
        where: { id },
        data: { name: formatted },
      });
    } catch (err: any) {
      if (err.code === "P2025") {
        throw new ApiValidationError("Muscle group not found", 404);
      }
      throw err;
    }
  }

  async remove(id: number) {
    const mg = await this.prisma.muscleGroup.findUnique({ where: { id } });
    if (!mg) {
      throw new ApiValidationError("Muscle group not found", 404);
    }

    if (mg.name.toLowerCase() === "generico") {
      throw new ApiValidationError("Cannot delete the Generico group", 400);
    }

    // Buscar o crear 'Generico'
    let generic = await this.prisma.muscleGroup.findFirst({
      where: { name: { equals: "Generico", mode: "insensitive" } },
    });
    if (!generic) {
      generic = await this.prisma.muscleGroup.create({ data: { name: "Generico" } });
    }

    // Reasignar ejercicios al grupo 'Generico'
    await this.prisma.exercise.updateMany({
      where: { muscleGroupId: id },
      data: { muscleGroupId: { set: generic.id } },
    });

    // Eliminar el grupo
    await this.prisma.muscleGroup.delete({ where: { id } });
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
}

export default new MuscleGroupService();
