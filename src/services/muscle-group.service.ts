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
    return await prisma.muscleGroup.create({ data: { name } });
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
    return await prisma.muscleGroup.delete({ where: { id } });
  },
};
