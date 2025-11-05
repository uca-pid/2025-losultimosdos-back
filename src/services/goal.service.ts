
import { PrismaClient, Goal as PrismaGoal } from "@prisma/client";
import ClassService from "./class.service";
import RoutineService from "./routine.service";
import { ApiValidationError } from "./api-validation-error";
import { GoalCreateInput, GoalUpdateInput } from "../schemas/goal.schema";


class GoalService {
  private readonly prisma: PrismaClient;

constructor() {
    this.prisma = new PrismaClient();
  }

  async list(filters?: { active?: boolean }) {
    const { active } = filters || {};
    const now = new Date();

    const where: any = {};
    if (active === true) {
      where.endDate = { gt: now };
    } else if (active === false) {
      where.endDate = { lte: now };
    }

    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: { endDate: "asc" },
    });

    return this.withComputedProgress(goals);
  }


  private async withComputedProgress(goals: PrismaGoal[]) {
    if (goals.length === 0) return [];

    const now = new Date();

    const classGoals = goals.filter(
      (g) => g.type === "CLASS" && g.classId !== null
    );
    const routineGoals = goals.filter(
      (g) => g.type === "ROUTINE" && g.routineId !== null
    );
    const memberGoals = goals.filter((g) => g.type === "MEMBERS");

    let classCountsById = new Map<number, number>();
    if (classGoals.length > 0) {
      const classStats = await ClassService.listNamesWithEnrollCount(false);

      for (const item of classStats as any[]) {
        const id = item.id as number;
        const count =
          (item.enrolled as number) ??
          (item.enrollments as number) ??
          (item.count as number) ??
          0;
        classCountsById.set(id, count);
      }
    }
    let routineCountsById = new Map<number, number>();
    if (routineGoals.length > 0) {
      const routineStats = await RoutineService.listNamesWithUsersCountSQL();

      for (const item of routineStats as any[]) {
        const id = item.id as number;
        const count =
          (item.usersCount as number) ??
          (item.count as number) ??
          0;
        routineCountsById.set(id, count);
      }
    }

    // 3) Si quisieras metas de MEMBERS basadas en basic/premium:
    //    podrías usar clerk o tu tabla dailyUserCount.
    //    Por ahora lo dejamos como TODO.
    const membersCurrentValue = async (goal: PrismaGoal): Promise<number> => {
      // TODO: usar dailyUserCount o directamente Clerk
      // según goal.membersScope (TOTAL/BASIC/PREMIUM)
      return 0;
    };

    const result = [];
    for (const goal of goals) {
      let currentValue = 0;

      if (goal.type === "CLASS" && goal.classId) {
        currentValue = classCountsById.get(goal.classId) ?? 0;
      } else if (goal.type === "ROUTINE" && goal.routineId) {
        currentValue = routineCountsById.get(goal.routineId) ?? 0;
      } else if (goal.type === "MEMBERS") {
        currentValue = await membersCurrentValue(goal);
      }

      const progress =
        goal.targetValue > 0
          ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
          : 0;

      const isCompleted = progress >= 100;
      const isExpired = goal.endDate.getTime() <= now.getTime();

      // Regla simple:
      // - completed se enciende si el progreso llegó a 100
      //   (podés ajustarlo para que dependa también de endDate)
      const effectiveCompleted = goal.completed || isCompleted;

      result.push({
        ...goal,
        progress,
        completed: effectiveCompleted,
        currentValue,
      });
    }

    return result;
  }

  async getById(id: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new ApiValidationError("Goal not found", 404);
    return goal;
  }

  async create(data: GoalCreateInput) {

    if (data.type === "CLASS" && data.classId) {
      const cls = await this.prisma.class.findUnique({
        where: { id: data.classId },
        select: { id: true },
      });
      if (!cls) throw new ApiValidationError("Class not found", 400);
    }

    if (data.type === "ROUTINE" && data.routineId) {
      const routine = await this.prisma.routine.findUnique({
        where: { id: data.routineId },
        select: { id: true },
      });
      if (!routine) throw new ApiValidationError("Routine not found", 400);
    }

    const goal = await this.prisma.goal.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        membersScope: data.membersScope ?? null,
        classId: data.classId ?? null,
        routineId: data.routineId ?? null,
        targetValue: data.targetValue,
        progress: data.progress ?? 0,
        endDate: data.endDate,
        completed: data.completed ?? false,
      },
    });

    return goal;
  }

  async update(id: number, data: GoalUpdateInput) {
    const existing = await this.prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new ApiValidationError("Goal not found", 404);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        type: data.type ?? existing.type,
        membersScope:
          data.membersScope !== undefined ? data.membersScope : existing.membersScope,
        classId: data.classId !== undefined ? data.classId : existing.classId,
        routineId:
          data.routineId !== undefined ? data.routineId : existing.routineId,
        targetValue: data.targetValue ?? existing.targetValue,
        progress: data.progress ?? existing.progress,
        endDate: data.endDate ?? existing.endDate,
        completed: data.completed ?? existing.completed,
      },
    });

    return goal;
  }

  async remove(id: number) {
    try {
      await this.prisma.goal.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === "P2025") throw new ApiValidationError("Goal not found", 404);
      throw e;
    }
  }
}

export default new GoalService();
