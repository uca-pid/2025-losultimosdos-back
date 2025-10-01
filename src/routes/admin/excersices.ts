import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  exerciseCreateSchema,
  exerciseUpdateSchema,
  exerciseIdParamSchema,
} from "../../schemas/excersice.schema";
import ExerciseService from "../../services/excersice.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, muscleGroupId } = req.query as any;
    const items = await ExerciseService.list({
      q: q as string | undefined,
      muscleGroupId: muscleGroupId ? Number(muscleGroupId) : undefined,
    });
    res.json({ total: items.length, items });
  })
);

router.post(
  "/",
  validateBody(exerciseCreateSchema),
  asyncHandler(async (req, res) => {
    const ex = await ExerciseService.create(req.body);
    res.status(201).json({ message: "Exercise created", exercise: ex });
  })
);

router.patch(
  "/:id",
  validateParams(exerciseIdParamSchema),
  validateBody(exerciseUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ex = await ExerciseService.update(id, req.body);
    res.json({ message: "Exercise updated", exercise: ex });
  })
);

router.delete(
  "/:id",
  validateParams(exerciseIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await ExerciseService.remove(id);
    res.json({ message: "Exercise deleted" });
  })
);

export default router;
