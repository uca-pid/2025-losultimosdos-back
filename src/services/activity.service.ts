// src/services/activity.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ActivityService {

  async getTrainingDays(args: {
    userId: string;
    year: number;
    month: number; // 1–12
  }) {
    const { userId, year, month } = args;

    if (!year || !month || Number.isNaN(year) || Number.isNaN(month)) {
      throw new Error("Invalid year or month");
    }
    if (month < 1 || month > 12) {
      throw new Error("Month must be between 1 and 12");
    }

    // rango [primer día del mes, primer día del mes siguiente)
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, month, 1, 0, 0, 0, 0);

    const performances = await prisma.exercisePerformance.findMany({
      where: {
        userId,
        createdAt: {
          gte: from,
          lt: to,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const daysSet = new Set<string>();

    for (const perf of performances) {
      // toISOString → "YYYY-MM-DDTHH:MM:SSZ"
      const iso = perf.createdAt.toISOString();
      const dayKey = iso.slice(0, 10); // "YYYY-MM-DD"
      daysSet.add(dayKey);
    }

    const trainingDays = Array.from(daysSet).sort();

    return {
      year,
      month,
      trainingDays,
    };
  }
}

export default new ActivityService();
