import { Class, PrismaClient } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";

class ClassService {
  private readonly prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAllClasses() {
    const today = new Date();
    return this.prisma.class.findMany({
      where: {
        date: {
          gte: today,
        },
      },
    });
  }

  async getClassById(id: number) {
    return this.prisma.class.findUnique({ where: { id } });
  }

  async getClassByUserId(userId: string) {
    return this.prisma.class.findMany({ where: { users: { has: userId } } });
  }

  async createClass(classData: Omit<Class, "id" | "users" | "enrolled">) {
    return this.prisma.class.create({
      data: { ...classData },
    });
  }

  async updateClass(id: number, data: Omit<Class, "id" | "createdById">) {
    const classData = await this.getClassById(id);
    if (!classData) {
      throw new ApiValidationError("Class not found", 404);
    }
    return this.prisma.class.update({ where: { id }, data: data });
  }

  async deleteClass(id: number) {
    const classData = await this.getClassById(id);
    if (!classData) {
      throw new ApiValidationError("Class not found", 404);
    }
    return this.prisma.class.delete({ where: { id } });
  }

  async enrollClass(userId: string, classId: number) {
    const classData = await this.getClassById(classId);
    if (!classData) {
      throw new ApiValidationError("Class not found", 404);
    }
    if (classData.users.includes(userId)) {
      throw new ApiValidationError("Already enrolled in this class", 400);
    }
    if (classData.users.length >= classData.capacity) {
      throw new ApiValidationError("Class is full", 400);
    }
    return this.prisma.class.update({
      where: { id: classId },
      data: { users: { push: userId }, enrolled: { increment: 1 } },
    });
  }

  async unenrollClass(userId: string, classId: number) {
    const classData = await this.getClassById(classId);
    if (!classData) {
      throw new ApiValidationError("Class not found", 404);
    }
    const wasEnrolled = classData.users.includes(userId);
    if (!wasEnrolled) {
      throw new ApiValidationError("Not enrolled in this class", 400);
    }
    const newUsers = classData.users.filter((user) => user !== userId);
    return this.prisma.class.update({
      where: { id: classId },
      data: {
        users: { set: newUsers },
        enrolled: wasEnrolled ? { decrement: 1 } : undefined,
      },
    });
  }
}

export default new ClassService();
