import { Router, Request, Response } from "express";
import checkUserRole from "../../middleware/user";
import { ClassEnrollment } from "../../types/class";
import { validateBody } from "../../middleware/validation";
import { classEnrollmentSchema } from "../../schemas/class.schema";
import ClassService from "../../services/class.service";
import UserService from "../../services/user.service";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.use(checkUserRole);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "User dashboard" });
});

router.post(
  "/enroll",
  validateBody(classEnrollmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    const updatedClass = await ClassService.enrollClass(userId, classId);
    res.json({ message: "Enrolled successfully", class: updatedClass });
  })
);

router.post(
  "/unenroll",
  validateBody(classEnrollmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = req.auth;

    const updatedClass = await ClassService.unenrollClass(userId, classId);
    res.json({ message: "Unenrolled successfully", class: updatedClass });
  })
);

router.get(
  "/my-classes",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.auth;
    const classes = await ClassService.getClassByUserId(userId);
    res.json({ classes });
  })
);

router.get(
  "/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await UserService.getUserById(userId);
    res.json(user);
  })
);

export default router;
