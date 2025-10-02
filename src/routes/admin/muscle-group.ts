import { Router } from "express";
import checkAdminRole from "../../middleware/admin";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  mgCreateSchema,
  mgIdParamSchema,
  mgUpdateSchema,
} from "../../schemas/muscle-group.schema";
import MuscleGroupService from "../../services/muscle-group.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await MuscleGroupService.list();
    res.json({ total: items.length, items });
  })
);

router.post(
  "/",
  validateBody(mgCreateSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const mg = await MuscleGroupService.create(name);
    res.status(201).json({ message: "Muscle group created", muscleGroup: mg });
  })
);

router.put(
  "/:id",
  validateParams(mgIdParamSchema),
  validateBody(mgUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body;
    const mg = await MuscleGroupService.update(id, name);
    res.json({ message: "Muscle group updated", muscleGroup: mg });
  })
);

router.delete(
  "/:id",
  validateParams(mgIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await MuscleGroupService.remove(id);
    res.json({ message: "Muscle group deleted" });
  })
);

export default router;
