import { PrismaClient } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";
const prisma = new PrismaClient();

export default {
  list: async () => {
    return await prisma.muscleGroup.findMany();
  },
  create: async (name: string) => {
    if (!name) throw new ApiValidationError("Name is required", 400);

    const exists = await prisma.muscleGroup.findUnique({ where: { name } });
    if (exists)
      throw new ApiValidationError("Muscle group already exists", 400);
    return await prisma.muscleGroup.create({
      data: { name: name.charAt(0).toUpperCase() + name.slice(1) },
    });
  },
  update: async (id: number, name: string) => {
    if (!name) throw new ApiValidationError("Name is required", 400);

    const exists = await prisma.muscleGroup.findUnique({ where: { name } });
    if (exists && exists.id !== id)
      throw new ApiValidationError("Muscle group already exists", 400);
    return await prisma.muscleGroup.update({ where: { id }, data: { name } });
  },
  remove: async (id: number) => {
    const exists = await prisma.muscleGroup.findUnique({ where: { id } });
    if (!exists) throw new ApiValidationError("Muscle group not found", 404);

    if (exists.name.toLowerCase() === "generico") {
      throw new ApiValidationError("Cannot delete the Generico group", 400);
    }

    let genericGroup = await prisma.muscleGroup.findFirst({
      where: { name: { equals: "Generico", mode: "insensitive" } },
    });

    if (!genericGroup) {
      genericGroup = await prisma.muscleGroup.create({
        data: { name: "Generico" },
      });
    }

    await prisma.exercise.updateMany({
      where: { muscleGroupId: id },
      data: { muscleGroupId: genericGroup.id },
    });

    return await prisma.muscleGroup.delete({ where: { id } });
  },
};
