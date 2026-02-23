import { Router, Request, Response } from "express";
import { User } from "@clerk/express";
import { asyncHandler } from "../../middleware/asyncHandler";
import UserService from "../../services/user.service";
import { ApiValidationError } from "../../services/api-validation-error";
import ClassService from "../../services/class.service";
import WorkoutSessionService from "../../services/workoutSession.service";
import ExercisePerformanceService from "../../services/exercisePerformance.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const sedeId = Number(_req.query.sedeId);

      let users: User[] = [];
      if (sedeId) {
        users = await UserService.getUsersBySedeId(sedeId);
      } else {
        const usersResponse = await UserService.getUsers();
        users = usersResponse.data;
      }
      const sanitizedUsers = users.map((user: User) =>
        UserService.sanitizeUser(user)
      );
      res.json({
        message: "Users retrieved successfully",
        users: sanitizedUsers,
      });
    } catch (error) {
      throw new ApiValidationError("Failed to fetch users from Clerk", 500);
    }
  })
);

router.get(
  "/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await UserService.getUserById(userId);
      res.json({
        message: "User retrieved successfully",
        user,
      });
    } catch (error) {
      throw new ApiValidationError("Failed to fetch user from Clerk", 404);
    }
  })
);

router.put(
  "/:userId/role",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;
    const user = await UserService.updateUserRole(userId, role);
    res.json({
      message: "User role updated successfully",
      user,
    });
  })
);

router.get(
  "/:userId/classes",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const classes = await ClassService.getClassByUserId(userId);
      res.json({
        message: "User classes retrieved successfully",
        classes,
      });
    } catch (error) {
      throw new ApiValidationError("Failed to fetch user classes", 500);
    }
  })
);

router.get(
  "/:userId/workout-sessions",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const routineId = req.query.routineId
      ? Number(req.query.routineId)
      : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (routineId !== undefined && Number.isNaN(routineId)) {
      throw new ApiValidationError("Invalid routineId", 400);
    }
    if (Number.isNaN(page) || page < 1) {
      throw new ApiValidationError("Invalid page", 400);
    }
    if (Number.isNaN(limit) || limit < 1) {
      throw new ApiValidationError("Invalid limit", 400);
    }

    const sessions = await WorkoutSessionService.listByUser(userId, {
      routineId,
      page,
      limit,
    });

    res.json(sessions);
  })
);

router.get(
  "/:userId/exercises/:id/progress",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, id } = req.params;
    const exerciseId = Number(id);
    if (Number.isNaN(exerciseId)) {
      throw new ApiValidationError("Invalid exerciseId", 400);
    }

    const progress = await ExercisePerformanceService.getProgressByExercise({
      userId,
      exerciseId,
    });

    res.json({ items: progress });
  })
);

router.put(
  "/:userId/plan",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { plan } = req.body;
    const user = await UserService.updateUserPlan(userId, plan);
    res.json({
      message: "User plan updated successfully",
      user: UserService.sanitizeUser(user),
    });
  })
);

router.put(
  "/:userId/sede",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { sedeId } = req.body;
    const user = await UserService.updateUserSede(userId, sedeId);
    res.json({
      message: "User sede updated successfully",
      user: UserService.sanitizeUser(user),
    });
  })
);

export default router;
