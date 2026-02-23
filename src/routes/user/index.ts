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
import {
  PointEventType,
  PrismaClient,
  ChallengeFrequency,
} from "@prisma/client";
import ExercisePerformanceService from "../../services/exercisePerformance.service";
import PointsService from "../../services/points.service";
import ChallengeService from "../../services/challenge.service";
import ActivityService from "../../services/activity.service";
import WorkoutSessionService from "../../services/workoutSession.service";
import { createWorkoutSessionSchema } from "../../schemas/workoutSession.schema";

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

    const data = await ClassService.enrollClass(userId, classId);
    res.json({
      message: "Enrolled successfully",
      class: data.updated,
      pointsAwarded: data.pointsAwarded,
    });
  }),
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
  }),
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
  }),
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
  }),
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
      user.sedeId,
    );

    res.json({ items: newlyEarnedBadges });
  }),
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
  }),
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
      new Set(performances.map((p) => p.exerciseId)),
    );
    const completedCount = completedExerciseIds.length;
    const completionRatio = Math.min(
      Math.max(completedCount / totalExercises, 0),
      1,
    );

    const duration = routine.duration ?? 30;
    const basePointsPer10Min = 20;
    const baseByDuration = (duration / 10) * basePointsPer10Min;

    const pointsAwarded = Math.round(baseByDuration * completionRatio);
    let finalPointsAwarded = pointsAwarded;
    if (pointsAwarded !== 0) {
      const event = await PointsService.registerEvent({
        userId,
        sedeId: routine.sedeId,
        type: PointEventType.ROUTINE_COMPLETE,
        routineId: routine.id,
        customPoints: pointsAwarded,
      });
      finalPointsAwarded = event.points;
    }

    res.status(201).json({
      ok: true,
      pointsAwarded: finalPointsAwarded,
      completionRatio,
      completedCount,
      totalExercises,
    });
  }),
);

router.post(
  "/challenges/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const user = await UserService.getUserById(userId);
    const newlyCompleted = await ChallengeService.evaluateAndReturnNew(
      userId,
      user.sedeId,
    );

    res.json({ items: newlyCompleted });
  }),
);

router.get(
  "/training-days",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const now = new Date();
    const yearParam = req.query.year;
    const monthParam = req.query.month;

    const year = yearParam ? Number(yearParam) : now.getFullYear();
    const month = monthParam ? Number(monthParam) : now.getMonth() + 1; // 1–12

    if (Number.isNaN(year) || Number.isNaN(month)) {
      throw new ApiValidationError("Invalid year or month", 400);
    }

    const result = await ActivityService.getTrainingDays({
      userId,
      year,
      month,
    });

    res.json(result); // { year, month, trainingDays: ["YYYY-MM-DD", ...] }
  }),
);

router.get(
  "/challenges",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const rawFrequency = String(req.query.frequency ?? "daily").toUpperCase();
    if (!["DAILY", "WEEKLY"].includes(rawFrequency)) {
      throw new ApiValidationError("Invalid frequency", 400);
    }
    const frequency = rawFrequency as ChallengeFrequency;

    const sedeIdParam = req.query.sedeId;
    const sedeId = sedeIdParam ? Number(sedeIdParam) : undefined;
    if (sedeIdParam && Number.isNaN(sedeId)) {
      throw new ApiValidationError("Invalid sedeId", 400);
    }

    const challenges = await ChallengeService.listForUser({
      userId,
      sedeId,
      frequency,
    });

    res.json({ challenges });
  }),
);

// ── Workout Sessions ─────────────────────────────────────

router.post(
  "/workout-sessions",
  validateBody(createWorkoutSessionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { routineId, notes, performances } = req.body as {
      routineId: number;
      notes?: string;
      performances: {
        exerciseId: number;
        sets: { reps: number; weight: number; comment?: string }[];
      }[];
    };

    const result = await WorkoutSessionService.create({
      userId,
      routineId,
      notes,
      performances,
    });

    res.status(201).json(result);
  }),
);

router.get(
  "/workout-sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const routineId = req.query.routineId
      ? Number(req.query.routineId)
      : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await WorkoutSessionService.listByUser(userId, {
      routineId,
      page,
      limit,
    });

    res.json(result);
  }),
);

router.get(
  "/workout-sessions/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = Number(req.params.id);
    const session = await WorkoutSessionService.getById(sessionId);

    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  }),
);

// ── Exercise Progress ────────────────────────────────────

router.get(
  "/exercises/:id/progress",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const exerciseId = Number(req.params.id);
    const progress = await ExercisePerformanceService.getProgressByExercise({
      userId,
      exerciseId,
    });

    res.json({ items: progress });
  }),
);

router.get(
  "/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuth(req);
    if (!auth.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = req.params;
    if (auth.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const user = await UserService.getUserById(userId);
    res.json(user);
  }),
);

export default router;
