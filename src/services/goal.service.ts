import { PrismaClient, GoalCategory } from "@prisma/client";
import { ApiValidationError } from "./api-validation-error";
import UserService from "./user.service";

type GoalCreateInput = {
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetValue: number;
  endDate: Date;
  sedeId: number;
  targetClassId?: number | null;
  targetRoutineId?: number | null;
};

type GoalUpdateInput = {
  title?: string;
  description?: string | null;
  targetValue?: number;
  endDate?: Date;
  targetClassId?: number | null;
  targetRoutineId?: number | null;
};

class GoalService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Calculate current value based on goal category
   */
  private async calculateCurrentValue(
    category: GoalCategory,
    sedeId: number,
    targetClassId?: number | null,
    targetRoutineId?: number | null,
    startDate?: Date
  ): Promise<number> {
    const start = startDate || new Date();

    switch (category) {
      case "USER_REGISTRATIONS": {
        // Count users registered in this sede after start date
        const users = await UserService.getUsersBySedeId(sedeId);
        return users.length;
      }

      case "CLASS_ENROLLMENTS": {
        if (!targetClassId) return 0;

        // Count enrollments in the target class
        const classData = await this.prisma.class.findUnique({
          where: { id: targetClassId },
          select: { enrolled: true },
        });

        return classData?.enrolled || 0;
      }

      case "ROUTINE_ASSIGNMENTS": {
        if (!targetRoutineId) return 0;

        // Count users assigned to the target routine
        const routine = await this.prisma.routine.findUnique({
          where: { id: targetRoutineId },
          select: { users: true },
        });

        return routine?.users.length || 0;
      }

      default:
        return 0;
    }
  }

  /**
   * Enrich a goal with calculated currentValue
   */
  private async enrichGoalWithCurrentValue(goal: any) {
    const currentValue = await this.calculateCurrentValue(
      goal.category,
      goal.sedeId,
      goal.targetClassId,
      goal.targetRoutineId,
      goal.startDate
    );

    return {
      ...goal,
      currentValue,
    };
  }

  /**
   * Get all goals for a specific sede
   */
  async getAllGoalsBySedeId(sedeId: number) {
    const goals = await this.prisma.goal.findMany({
      where: { sedeId },
      include: {
        targetClass: {
          select: {
            id: true,
            name: true,
            date: true,
            time: true,
          },
        },
        targetRoutine: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich each goal with calculated currentValue
    return Promise.all(
      goals.map((goal) => this.enrichGoalWithCurrentValue(goal))
    );
  }

  /**
   * Get a specific goal by ID
   */
  async getGoalById(id: number) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        targetClass: {
          select: {
            id: true,
            name: true,
            date: true,
            time: true,
          },
        },
        targetRoutine: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
    });

    if (!goal) {
      return null;
    }

    return this.enrichGoalWithCurrentValue(goal);
  }

  /**
   * Create a new goal
   */
  async createGoal(goalData: GoalCreateInput) {
    const sede = await this.prisma.sede.findUnique({
      where: { id: goalData.sedeId },
    });

    if (!sede) {
      throw new ApiValidationError("Sede not found", 404);
    }

    if (goalData.targetClassId) {
      const classData = await this.prisma.class.findUnique({
        where: { id: goalData.targetClassId },
      });

      if (!classData) {
        throw new ApiValidationError("Target class not found", 404);
      }

      if (classData.sedeId !== goalData.sedeId) {
        throw new ApiValidationError(
          "Target class does not belong to the specified sede",
          400
        );
      }
    }

    if (goalData.targetRoutineId) {
      const routine = await this.prisma.routine.findUnique({
        where: { id: goalData.targetRoutineId },
      });

      if (!routine) {
        throw new ApiValidationError("Target routine not found", 404);
      }

      if (routine.sedeId !== goalData.sedeId) {
        throw new ApiValidationError(
          "Target routine does not belong to the specified sede",
          400
        );
      }
    }

    const goal = await this.prisma.goal.create({
      data: {
        title: goalData.title,
        description: goalData.description,
        category: goalData.category,
        targetValue: goalData.targetValue,
        endDate: goalData.endDate,
        sedeId: goalData.sedeId,
        targetClassId: goalData.targetClassId,
        targetRoutineId: goalData.targetRoutineId,
      },
      include: {
        targetClass: {
          select: {
            id: true,
            name: true,
            date: true,
            time: true,
          },
        },
        targetRoutine: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
    });

    return this.enrichGoalWithCurrentValue(goal);
  }

  /**
   * Update an existing goal
   */
  async updateGoal(id: number, updateData: GoalUpdateInput) {
    const existingGoal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!existingGoal) {
      throw new ApiValidationError("Goal not found", 404);
    }

    if (
      updateData.targetClassId !== undefined &&
      updateData.targetClassId !== null
    ) {
      const classData = await this.prisma.class.findUnique({
        where: { id: updateData.targetClassId },
      });

      if (!classData) {
        throw new ApiValidationError("Target class not found", 404);
      }

      if (classData.sedeId !== existingGoal.sedeId) {
        throw new ApiValidationError(
          "Target class does not belong to the goal's sede",
          400
        );
      }
    }

    if (
      updateData.targetRoutineId !== undefined &&
      updateData.targetRoutineId !== null
    ) {
      const routine = await this.prisma.routine.findUnique({
        where: { id: updateData.targetRoutineId },
      });

      if (!routine) {
        throw new ApiValidationError("Target routine not found", 404);
      }

      if (routine.sedeId !== existingGoal.sedeId) {
        throw new ApiValidationError(
          "Target routine does not belong to the goal's sede",
          400
        );
      }
    }

    const updatedGoal = await this.prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        targetClass: {
          select: {
            id: true,
            name: true,
            date: true,
            time: true,
          },
        },
        targetRoutine: {
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
          },
        },
      },
    });

    return this.enrichGoalWithCurrentValue(updatedGoal);
  }

  /**
   * Delete a goal
   */
  async deleteGoal(id: number) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new ApiValidationError("Goal not found", 404);
    }

    return this.prisma.goal.delete({
      where: { id },
    });
  }
}

export default new GoalService();
