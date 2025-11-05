// src/routes/admin/goals.ts
import { Router } from "express";
import checkAdminRole from "../../middleware/admin";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody, validateParams } from "../../middleware/validation";

import {
  goalCreateSchema,
  goalUpdateSchema,
  goalIdParamSchema,
} from "../../schemas/goal.schema";
import GoalService from "../../services/goal.service";

const router = Router();
router.use(checkAdminRole);

// POST /admin/goals
router.post(
  "/",
  validateBody(goalCreateSchema),
  asyncHandler(async (req, res) => {
    const goal = await GoalService.create(req.body);
    res.json({ message: "Goal created", goal });
  })
);

// PATCH /admin/goals/:id
router.patch(
  "/:id",
  validateParams(goalIdParamSchema),
  validateBody(goalUpdateSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const goal = await GoalService.update(Number(id), req.body);
    res.json({ message: "Goal updated", goal });
  })
);

// DELETE /admin/goals/:id
router.delete(
  "/:id",
  validateParams(goalIdParamSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    await GoalService.remove(Number(id));
    res.json({ message: "Goal deleted" });
  })
);

export default router;
