import { Router, Request, Response, NextFunction } from "express";
import checkUserRole from "../../middleware/user";
import { ClassEnrollment } from "../../types/class";
import { validateBody } from "../../middleware/validation";
import { classEnrollmentSchema } from "../../schemas/class.schema";
import ClassService from "../../services/class.service";

const router = Router();

router.use(checkUserRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "User dashboard" });
});

router.post(
  "/enroll",
  validateBody(classEnrollmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    try {
      const updatedClass = await ClassService.enrollClass(userId, classId);

      res.json({ message: "Enrolled successfully", class: updatedClass });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/unenroll",
  validateBody(classEnrollmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    try {
      const updatedClass = await ClassService.unenrollClass(userId, classId);
      res.json({ message: "Unenrolled successfully", class: updatedClass });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/my-classes",
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.auth;

    try {
      const classes = await ClassService.getClassByUserId(userId);
      res.json({ classes });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
