import { Router, Request, Response } from "express";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validation";
import {
  goalCreateSchema,
  goalUpdateSchema,
  goalIdParamSchema,
  goalSedeQuerySchema,
} from "../../schemas/goal.schema";
import GoalService from "../../services/goal.service";
import { asyncHandler } from "../../middleware/asyncHandler";
import { GoalCategory } from "@prisma/client";

const router = Router();

router.post(
  "/",
  validateBody(goalCreateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      title,
      description,
      category,
      targetValue,
      endDate,
      sedeId,
      targetClassId,
      targetRoutineId,
    } = req.body as {
      title: string;
      description?: string;
      category: GoalCategory;
      targetValue: number;
      endDate: Date;
      sedeId: number;
      targetClassId?: number;
      targetRoutineId?: number;
    };

    const newGoal = await GoalService.createGoal({
      title,
      description,
      category,
      targetValue,
      endDate,
      sedeId,
      targetClassId,
      targetRoutineId,
    });

    res.status(201).json({
      message: "Goal created successfully",
      goal: newGoal,
    });
  })
);

router.get(
  "/",
  validateQuery(goalSedeQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { sedeId } = req.query as { sedeId: string };
    const sedeIdNum = parseInt(sedeId);

    const goals = await GoalService.getAllGoalsBySedeId(sedeIdNum);

    res.json({
      goals,
      total: goals.length,
    });
  })
);

router.get(
  "/:id",
  validateParams(goalIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);

    const goal = await GoalService.getGoalById(numberId);

    if (!goal) {
      return res.status(404).json({
        error: "Goal not found",
        statusCode: 404,
      });
    }

    res.json({ goal });
  })
);

router.put(
  "/:id",
  validateParams(goalIdParamSchema),
  validateBody(goalUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);
    const updateData = req.body;

    const updatedGoal = await GoalService.updateGoal(numberId, updateData);

    res.json({
      message: "Goal updated successfully",
      goal: updatedGoal,
    });
  })
);

router.delete(
  "/:id",
  validateParams(goalIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);

    await GoalService.deleteGoal(numberId);

    res.status(204).send();
  })
);

export default router;
