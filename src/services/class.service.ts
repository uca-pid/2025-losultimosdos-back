import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
class ClassService {
  constructor(private readonly prisma: PrismaClient) {}

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

  //   async getClassByUserId(userId: string) {
  //     return this.prisma.class.findMany({ where: { users: { has: userId } } });
  //   }

  //   async createClass(classData: ClassInput) {
  //     return this.prisma.class.create({ data: classData });
  //   }
}

export default new ClassService(prisma);
