import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { ApiValidationError } from "../../services/api-validation-error";
import checkUserRole from "../../middleware/user";
import { ClassEnrollment } from "../../types/class";
import { validateBody } from "../../middleware/validation";
import { classEnrollmentSchema } from "../../schemas/class.schema";
import ClassService from "../../services/class.service";
import UserService from "../../services/user.service";
import { asyncHandler } from "../../middleware/asyncHandler";
import RoutineService from "../../services/routine.service";
import BadgeService from "../../services/badge.service";
import { PointEventType } from "@prisma/client";
import ExercisePerformanceService from "../../services/exercisePerformance.service";
import PointsService from "../../services/points.service";

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
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const updatedClass = await ClassService.enrollClass(userId, classId);
    res.json({ message: "Enrolled successfully", class: updatedClass });
  })
);

router.post(
  "/unenroll",
  validateBody(classEnrollmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { classId } = req.body as ClassEnrollment;
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const updatedClass = await ClassService.unenrollClass(userId, classId);
    res.json({ message: "Unenrolled successfully", class: updatedClass });
  })
);

router.get(
  "/my-classes",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }
    const classes = await ClassService.getClassByUserId(userId);
    res.json({ classes });
  })
);

router.get(
  "/badges",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const user = await UserService.getUserById(userId);
    const badges = await BadgeService.getUserBadges(userId, user.sedeId);

    res.json({ items: badges });
  })
);

router.post(
  "/badges/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const user = await UserService.getUserById(userId);
    const newlyEarnedBadges = await BadgeService.evaluateAndReturnNew(
      userId,
      user.sedeId
    );

    res.json({ items: newlyEarnedBadges });
  })
);

router.get(
  "/routines",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }
    const routines = await RoutineService.getByUserId(userId);
    res.json({ routines });
  })
);

router.post(
  "/routines/:id/complete",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const routineId = Number(req.params.id);
    const { performances } = req.body as {
      performances: { exerciseId: number; weight: number; reps: number }[];
    };

    if (!Array.isArray(performances) || performances.length === 0) {
      return res.status(400).json({ error: "No performances provided" });
    }

    await ExercisePerformanceService.logPerformances({
      userId,
      routineId,
      performances,
    });

    const routine = await RoutineService.getById(routineId);
    if (!routine) {
      return res.status(404).json({ error: "Routine not found" });
    }

    const totalExercises = routine.exercises.length || 1;

    const completedExerciseIds = Array.from(
      new Set(performances.map((p) => p.exerciseId))
    );
    const completedCount = completedExerciseIds.length;
    const completionRatio = Math.min(
      Math.max(completedCount / totalExercises, 0),
      1
    );

    const duration = routine.duration ?? 30;
    const basePointsPer10Min = 20;
    const baseByDuration = (duration / 10) * basePointsPer10Min;

    const pointsAwarded = Math.round(baseByDuration * completionRatio);

    if (pointsAwarded !== 0) {
      await PointsService.registerEvent({
        userId,
        sedeId: routine.sedeId,
        type: PointEventType.ROUTINE_COMPLETE,
        routineId: routine.id,
        customPoints: pointsAwarded,
      });
    }

    res.status(201).json({
      ok: true,
      pointsAwarded,
      completionRatio,
      completedCount,
      totalExercises,
    });
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
