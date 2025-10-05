import { Router, Request, Response } from "express";
import { User } from "@clerk/express";
import { asyncHandler } from "../../middleware/asyncHandler";
import UserService from "../../services/user.service";
import { ApiValidationError } from "../../services/api-validation-error";
import ClassService from "../../services/class.service";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const users = await UserService.getUsers();
      const sanitizedUsers = users.data.map((user: User) =>
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

export default router;
