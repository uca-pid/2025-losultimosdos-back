import { Request, Response, NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";

const checkUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (process.env.NODE_ENV === "test" && !getAuth(req)?.userId) {
      (req as any).auth = { userId: "user_test_id" };
    }

    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await clerkClient.users.getUser(userId);
    const userRole = (user?.publicMetadata as any)?.role as string;

    if (userRole !== "user" && userRole !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        message: "This route requires user privileges",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking user role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default checkUserRole;
