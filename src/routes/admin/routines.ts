import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  routineCreateSchema,
  routineUpdateSchema,
  routineIdParamSchema,
  routineExerciseIdParamSchema,
  routineAssignSchema,
  userIdParamSchema,
} from "../../schemas/routine.schema";
import RoutineService from "../../services/routine.service";
import { ApiValidationError } from "../../services/api-validation-error";

const router = Router();

router.get(
  "/:id",
  validateParams(routineIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const r = await RoutineService.getById(id);
    if (!r) throw new ApiValidationError("Routine not found", 404);
    res.json(r);
  })
);

router.post(
  "/",
  validateBody(routineCreateSchema),
  asyncHandler(async (req, res) => {
    const routine = await RoutineService.create(req.body);
    res.status(201).json({ message: "Routine created", routine });
  })
);

router.put(
  "/:id",
  validateParams(routineIdParamSchema),
  validateBody(routineUpdateSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const routine = await RoutineService.update(id, req.body);
    res.json({ message: "Routine updated", routine });
  })
);

router.delete(
  "/:id",
  validateParams(routineIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await RoutineService.remove(id);
    res.json({ message: "Routine deleted" });
  })
);

router.post(
  "/:id/exercises",
  validateParams(routineIdParamSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const item = await RoutineService.addExercise(id, req.body);
    res.status(201).json({ message: "Exercise added to routine", item });
  })
);

router.patch(
  "/:id/exercises/:reId",
  validateParams(routineExerciseIdParamSchema),
  asyncHandler(async (req, res) => {
    const { id, reId } = req.params as any;
    const item = await RoutineService.updateRoutineExercise(
      Number(id),
      Number(reId),
      req.body
    );
    res.json({ message: "Routine exercise updated", item });
  })
);

router.delete(
  "/:id/exercises/:reId",
  validateParams(routineExerciseIdParamSchema),
  asyncHandler(async (req, res) => {
    const { id, reId } = req.params as any;
    await RoutineService.removeRoutineExercise(Number(id), Number(reId));
    res.json({ message: "Routine exercise removed" });
  })
);

router.post(
  "/:id/assign",
  validateParams(routineIdParamSchema),
  validateBody(routineAssignSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const { userId } = req.body as any;
    await RoutineService.assign(Number(id), userId);
    res.json({ message: "Routine assigned" });
  })
);

router.post(
  "/:id/unassign",
  validateParams(routineIdParamSchema),
  validateBody(routineAssignSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const { userId } = req.body;
    await RoutineService.unassign(Number(id), userId);
    res.json({ message: "Routine unassigned" });
  })
);

export default router;
