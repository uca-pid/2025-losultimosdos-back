import { Router, Request, Response } from "express";
import { ClassInput } from "../../types/class";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  classInputSchema,
  classIdParamSchema,
  enrollmentSchema,
} from "../../schemas/class.schema";
import ClassService from "../../services/class.service";
import { ApiValidationError } from "../../services/api-validation-error";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.post(
  "/",
  validateBody(classInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, date, time, capacity } = req.body as ClassInput;
    const dateTime = new Date(`${date}`);

    const { userId } = req.auth;
    const newClass = await ClassService.createClass({
      name,
      description,
      date: dateTime,
      time,
      capacity,
      createdById: userId,
    });
    res.json({ message: "Class created successfully", class: newClass });
  })
);

router.put(
  "/:id",
  validateParams(classIdParamSchema),
  validateBody(classInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, date, time, capacity } = req.body as ClassInput;
    const numberId = parseInt(id);

    const gymClass = await ClassService.getClassById(numberId);
    if (!gymClass) {
      throw new ApiValidationError("Class not found", 404);
    }

    const dateTime = new Date(`${date}`);
    const updatedClass = await ClassService.updateClass(numberId, {
      name,
      description,
      date: dateTime,
      time,
      capacity,
      enrolled: gymClass.enrolled,
      users: gymClass.users,
    });

    res.json({
      message: "Class updated successfully",
      class: updatedClass,
    });
  })
);

router.delete(
  "/:id",
  validateParams(classIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);

    const gymClass = await ClassService.getClassById(numberId);
    if (!gymClass) {
      throw new ApiValidationError("Class not found", 404);
    }

    await ClassService.deleteClass(numberId);
    res.json({ message: "Class deleted successfully" });
  })
);

router.post(
  "/:id/enroll",
  validateParams(classIdParamSchema),
  validateBody(enrollmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };

    const updatedClass = await ClassService.enrollClass(userId, parseInt(id));
    res.json({ message: "Class enrolled successfully", class: updatedClass });
  })
);

router.post(
  "/:id/unenroll",
  validateParams(classIdParamSchema),
  validateBody(enrollmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };

    const updatedClass = await ClassService.unenrollClass(userId, parseInt(id));
    res.json({ message: "Class unenrolled successfully", class: updatedClass });
  })
);

export default router;
