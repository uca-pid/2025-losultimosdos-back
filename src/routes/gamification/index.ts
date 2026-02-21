import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { asyncHandler } from "../../middleware/asyncHandler";
import { ApiValidationError } from "../../services/api-validation-error";

const router = Router();

router.get(
  "/level-status",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const user = await clerkClient.users.getUser(userId);
    const lastAcknowledgedLevel =
      (user.publicMetadata.lastAcknowledgedLevel as number) ?? 0;

    res.json({ lastAcknowledgedLevel });
  })
);

router.put(
  "/acknowledge-level",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new ApiValidationError("Unauthorized", 401);
    }

    const { level } = req.body as { level: number };

    if (typeof level !== "number" || !Number.isInteger(level) || level < 0) {
      throw new ApiValidationError(
        "level must be a non-negative integer",
        400
      );
    }

    const user = await clerkClient.users.getUser(userId);

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        lastAcknowledgedLevel: level,
      },
    });

    res.json({ lastAcknowledgedLevel: level });
  })
);

export default router;
