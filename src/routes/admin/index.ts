import { Router, Request, Response, NextFunction } from "express";
import checkAdminRole from "../../middleware/admin";
import { ClassInput } from "../../types/class";
import { validateBody, validateParams } from "../../middleware/validation";
import {
  classInputSchema,
  classIdParamSchema,
} from "../../schemas/class.schema";
import ClassService from "../../services/class.service";
import { ApiValidationError } from "../../services/api-validation-error";

const router = Router();

router.use(checkAdminRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Admin dashboard" });
});

router.post(
  "/class",
  validateBody(classInputSchema),
  async (req: Request, res: Response) => {
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
  }
);

router.put(
  "/class/:id",
  validateParams(classIdParamSchema),
  validateBody(classInputSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, description, date, time, capacity } = req.body as ClassInput;
    const numberId = parseInt(id);

    try {
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
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/class/:id",
  validateParams(classIdParamSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const numberId = parseInt(id);

    const gymClass = await ClassService.getClassById(numberId);
    if (!gymClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    await ClassService.deleteClass(numberId);
    res.json({ message: "Class deleted successfully" });
  }
);

export default router;
